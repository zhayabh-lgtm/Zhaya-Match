import { ProductType } from '../types/zhaya';

export interface ProductDetectionResult {
  detectedProduct: string;
  idSku: string;
  category: string;
  sourceUsed:
    | '1_gtm_explicit_tags'
    | '2_datalayer_ecommerce_category'
    | '2_datalayer_ecommerce_name'
    | '3_json_ld_category'
    | '3_json_ld_name'
    | '4_page_title'
    | '5_url_slug'
    | 'none';
  selectedType: ProductType | null;
  selectedTypeName: string;
  matchedRule: string;
  confidence: 'high' | 'medium-high' | 'medium' | 'none';
  availableSources: {
    dataLayer: boolean;
    ecommerceDataLayer: boolean;
    customVariable: boolean;
    jsonLdProduct: boolean;
    h1Heading: boolean;
    documentTitle: boolean;
    urlSlug: boolean;
  };
  manualFallbackAvailable: boolean;
}

export interface DetectionInput {
  productTypes: ProductType[];
  customTitle?: string;
  customUrl?: string;
  customH1?: string;
  customDataLayer?: any[];
  customJsonLd?: any;
}

function normalizeStr(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeTag(tag: string | undefined | null): string {
  if (!tag) return '';
  return normalizeStr(tag);
}

export function runProductDetection(input: DetectionInput): ProductDetectionResult {
  const activeTypes = (input.productTypes || []).filter((pt) => pt.active !== false);

  const doc = typeof document !== 'undefined' ? document : null;
  const win = typeof window !== 'undefined' ? window : null;

  // 1. Data Layer detection
  const dataLayer: any[] = input.customDataLayer || (win as any)?.dataLayer || [];
  const hasDataLayer = Array.isArray(dataLayer) && dataLayer.length > 0;

  let explicitTags: string[] = [];
  let ecommerceItems: any[] = [];

  if (hasDataLayer) {
    for (const entry of dataLayer) {
      if (entry && typeof entry === 'object') {
        if (Array.isArray(entry.zhayaTags)) {
          explicitTags.push(...entry.zhayaTags.map(normalizeTag));
        } else if (typeof entry.zhayaTag === 'string') {
          explicitTags.push(normalizeTag(entry.zhayaTag));
        }

        if (entry.ecommerce) {
          if (Array.isArray(entry.ecommerce.items)) {
            ecommerceItems.push(...entry.ecommerce.items);
          } else if (entry.ecommerce.detail?.products && Array.isArray(entry.ecommerce.detail.products)) {
            ecommerceItems.push(...entry.ecommerce.detail.products);
          }
        }
      }
    }
  }

  // 2. JSON-LD Products
  let jsonLdProducts: any[] = [];
  if (input.customJsonLd) {
    jsonLdProducts = Array.isArray(input.customJsonLd) ? input.customJsonLd : [input.customJsonLd];
  } else if (doc) {
    try {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach((s) => {
        try {
          const parsed = JSON.parse(s.textContent || '');
          if (parsed['@type'] === 'Product') jsonLdProducts.push(parsed);
          else if (Array.isArray(parsed['@graph'])) {
            parsed['@graph'].forEach((item: any) => {
              if (item['@type'] === 'Product') jsonLdProducts.push(item);
            });
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  // 3. Page Title & H1
  const pageTitles: string[] = [];
  if (input.customTitle) pageTitles.push(input.customTitle);
  if (input.customH1) pageTitles.push(input.customH1);
  if (doc) {
    if (doc.title) pageTitles.push(doc.title);
    const h1 = doc.querySelector('h1');
    if (h1?.textContent) pageTitles.push(h1.textContent);
  }

  // 4. URL / Slug
  let urlSlug = '';
  if (input.customUrl) {
    try {
      urlSlug = new URL(input.customUrl).pathname;
    } catch {
      urlSlug = input.customUrl;
    }
  } else if (win?.location) {
    urlSlug = win.location.pathname;
  }

  const availableSources = {
    dataLayer: hasDataLayer,
    ecommerceDataLayer: ecommerceItems.length > 0,
    customVariable: explicitTags.length > 0,
    jsonLdProduct: jsonLdProducts.length > 0,
    h1Heading: Boolean(doc?.querySelector('h1')?.textContent || input.customH1),
    documentTitle: Boolean(doc?.title || input.customTitle),
    urlSlug: Boolean(urlSlug),
  };

  const manualFallbackAvailable = activeTypes.length > 0;

  function findTypeInText(text: string | undefined | null, sourceName: string) {
    if (!text) return null;
    const normText = normalizeStr(text);
    if (!normText) return null;

    for (const pt of activeTypes) {
      const ptNameNorm = normalizeStr(pt.name);
      const tags = (pt.storeTags || []).map(normalizeTag).filter(Boolean);

      for (const tag of tags) {
        if (tag && normText.includes(tag)) {
          return { type: pt, matchedRule: tag, source: sourceName };
        }
      }

      if (ptNameNorm && ptNameNorm.length >= 3 && normText.includes(ptNameNorm)) {
        return { type: pt, matchedRule: ptNameNorm, source: sourceName };
      }
    }
    return null;
  }

  // Match 1: Explicit tags
  if (explicitTags.length > 0) {
    for (const expTag of explicitTags) {
      for (const pt of activeTypes) {
        const ptTags = (pt.storeTags || []).map(normalizeTag).filter(Boolean);
        if (ptTags.includes(expTag) || normalizeStr(pt.name) === expTag) {
          return {
            detectedProduct: expTag,
            idSku: 'N/A',
            category: pt.category || 'Geral',
            sourceUsed: '1_gtm_explicit_tags',
            selectedType: pt,
            selectedTypeName: pt.name,
            matchedRule: expTag,
            confidence: 'high',
            availableSources,
            manualFallbackAvailable,
          };
        }
      }
    }
  }

  // Match 2: Ecommerce DataLayer
  if (ecommerceItems.length > 0) {
    for (const item of ecommerceItems) {
      const catMatch = findTypeInText(item.item_category || item.category, '2_datalayer_ecommerce_category');
      if (catMatch) {
        return {
          detectedProduct: item.item_name || item.name || 'Item Ecommerce',
          idSku: item.item_id || item.id || item.sku || 'N/A',
          category: item.item_category || catMatch.type.category || 'Geral',
          sourceUsed: '2_datalayer_ecommerce_category',
          selectedType: catMatch.type,
          selectedTypeName: catMatch.type.name,
          matchedRule: catMatch.matchedRule,
          confidence: 'high',
          availableSources,
          manualFallbackAvailable,
        };
      }

      const nameMatch = findTypeInText(item.item_name || item.name, '2_datalayer_ecommerce_name');
      if (nameMatch) {
        return {
          detectedProduct: item.item_name || item.name || 'Item Ecommerce',
          idSku: item.item_id || item.id || item.sku || 'N/A',
          category: nameMatch.type.category || 'Geral',
          sourceUsed: '2_datalayer_ecommerce_name',
          selectedType: nameMatch.type,
          selectedTypeName: nameMatch.type.name,
          matchedRule: nameMatch.matchedRule,
          confidence: 'high',
          availableSources,
          manualFallbackAvailable,
        };
      }
    }
  }

  // Match 3: JSON-LD Product
  if (jsonLdProducts.length > 0) {
    for (const pSchema of jsonLdProducts) {
      const jlCatMatch = findTypeInText(pSchema.category, '3_json_ld_category');
      if (jlCatMatch) {
        return {
          detectedProduct: pSchema.name || 'Produto JSON-LD',
          idSku: pSchema.sku || 'N/A',
          category: pSchema.category || jlCatMatch.type.category || 'Geral',
          sourceUsed: '3_json_ld_category',
          selectedType: jlCatMatch.type,
          selectedTypeName: jlCatMatch.type.name,
          matchedRule: jlCatMatch.matchedRule,
          confidence: 'high',
          availableSources,
          manualFallbackAvailable,
        };
      }

      const jlNameMatch = findTypeInText(pSchema.name, '3_json_ld_name');
      if (jlNameMatch) {
        return {
          detectedProduct: pSchema.name || 'Produto JSON-LD',
          idSku: pSchema.sku || 'N/A',
          category: jlNameMatch.type.category || 'Geral',
          sourceUsed: '3_json_ld_name',
          selectedType: jlNameMatch.type,
          selectedTypeName: jlNameMatch.type.name,
          matchedRule: jlNameMatch.matchedRule,
          confidence: 'high',
          availableSources,
          manualFallbackAvailable,
        };
      }
    }
  }

  // Match 4: Page title / H1
  for (const pTitle of pageTitles) {
    const titleMatch = findTypeInText(pTitle, '4_page_title');
    if (titleMatch) {
      return {
        detectedProduct: pTitle,
        idSku: 'N/A',
        category: titleMatch.type.category || 'Geral',
        sourceUsed: '4_page_title',
        selectedType: titleMatch.type,
        selectedTypeName: titleMatch.type.name,
        matchedRule: titleMatch.matchedRule,
        confidence: 'medium-high',
        availableSources,
        manualFallbackAvailable,
      };
    }
  }

  // Match 5: URL Slug
  if (urlSlug) {
    const slugMatch = findTypeInText(urlSlug, '5_url_slug');
    if (slugMatch) {
      return {
        detectedProduct: urlSlug,
        idSku: 'N/A',
        category: slugMatch.type.category || 'Geral',
        sourceUsed: '5_url_slug',
        selectedType: slugMatch.type,
        selectedTypeName: slugMatch.type.name,
        matchedRule: slugMatch.matchedRule,
        confidence: 'medium',
        availableSources,
        manualFallbackAvailable,
      };
    }
  }

  // No match found
  return {
    detectedProduct: pageTitles[0] || urlSlug || 'Nenhum produto identificado',
    idSku: 'N/A',
    category: 'N/A',
    sourceUsed: 'none',
    selectedType: null,
    selectedTypeName: 'Nenhum (Fallback Manual Habilitado)',
    matchedRule: 'none',
    confidence: 'none',
    availableSources,
    manualFallbackAvailable,
  };
}
