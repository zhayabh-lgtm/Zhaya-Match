import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { PublicBestSellerList, PublicBestSellerProduct } from '../../src/types/zhaya.js';
import { getBestSellerUiText } from '../../src/lib/bestSellerI18n.js';
import { detectBestSellerCategoryKey } from '../../src/lib/bestSellerCategories.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === '42P01' ||
    msg.includes('relation "best_seller_lists" does not exist') ||
    msg.includes('relation "public.best_seller_lists" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}


function readDetectedCountryCode(req: any): string | null {
  // Vercel é a fonte principal. Os fallbacks mantêm a mesma experiência caso
  // o domínio passe por Cloudflare/proxy compatível no futuro.
  const raw =
    req?.headers?.['x-vercel-ip-country'] ||
    req?.headers?.['cf-ipcountry'] ||
    req?.headers?.['x-country-code'] ||
    '';
  const code = String(Array.isArray(raw) ? raw[0] : raw).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function normalizeSizeList(input: any): string[] {
  const source = Array.isArray(input) ? input : input === undefined || input === null ? [] : [input];
  const items = source
    .flatMap((value: any) => String(value).split(/[,;\n]+/g))
    .map((value: string) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
}


function isSafeUrl(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/');
}

function normalizePublicMediaItems(raw: any, imageUrl: any, imageUrls: any) {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const items: Array<{ id: string; type: 'image' | 'video'; url: string; posterUrl?: string | null }> = [];
  for (let i = 0; i < source.length && items.length < 16; i += 1) {
    const item = source[i] || {};
    const type: 'image' | 'video' = item.type === 'video' ? 'video' : 'image';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url || !isSafeUrl(url)) continue;
    const key = `${type}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const posterUrl = type === 'video' && typeof item.posterUrl === 'string' && isSafeUrl(item.posterUrl)
      ? item.posterUrl.trim()
      : null;
    items.push({ id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `media-${i + 1}`, type, url, posterUrl });
  }
  if (items.length > 0) return items;

  const legacy = [imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]
    .map((v) => typeof v === 'string' ? v.trim() : '')
    .filter((v) => v && isSafeUrl(v));
  return Array.from(new Set(legacy)).map((url, i) => ({ id: `legacy-image-${i + 1}`, type: 'image' as const, url }));
}


const VIDEO_MARKER = '__ZHAYA_VIDEO_9X16__';
const VIDEO_AUTOPLAY_ON = '__ZHAYA_AUTOPLAY_1__';
const VIDEO_LOOP_ON = '__ZHAYA_LOOP_1__';
const VIDEO_CONTROLS_ON = '__ZHAYA_CONTROLS_1__';
const TIMER_SEPARATE_ON = '__ZHAYA_TIMER_SEPARATE_1__';
const BENEFITS_MARKER = '__ZHAYA_BENEFITS_BLOCK__';
const REDIRECT_MARKER = '__ZHAYA_REDIRECT_PRODUCT__';
const ORGANIZED_FAVORITE_MARKER = '__ZHAYA_ORGANIZED_FAVORITE__';
const BENEFIT_PREFIX = '__ZHAYA_BENEFIT__:';
const VIDEO_INTERNAL_MARKERS = new Set([VIDEO_MARKER, VIDEO_AUTOPLAY_ON, VIDEO_LOOP_ON, VIDEO_CONTROLS_ON, TIMER_SEPARATE_ON, BENEFITS_MARKER, REDIRECT_MARKER, ORGANIZED_FAVORITE_MARKER]);

function visibleProductColors(input: any): string[] {
  const source = Array.isArray(input) ? input : [];
  return source
    .map((value: any) => String(value))
    .filter((value: string) => value && !VIDEO_INTERNAL_MARKERS.has(value) && !value.startsWith(BENEFIT_PREFIX));
}

function isBenefitsBlockRow(row: any): boolean {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  return colors.includes(BENEFITS_MARKER) || String(row?.category || '').toLowerCase() === 'benefícios';
}

function readDisplayGroup(row: any): 'main' | 'redirect' {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  return colors.includes(REDIRECT_MARKER) ? 'redirect' : 'main';
}

function readOrganizedFavorite(row: any): boolean {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  return colors.includes(ORGANIZED_FAVORITE_MARKER);
}

function automaticDiscountLabel(originalPrice: number | null | undefined, promotionalPrice: number | null | undefined): string | null {
  const original = Number(originalPrice);
  const promotional = Number(promotionalPrice);
  if (!Number.isFinite(original) || !Number.isFinite(promotional) || original <= 0 || promotional < 0 || promotional >= original) return null;
  const percent = Math.max(1, Math.min(99, Math.round(((original - promotional) / original) * 100)));
  return `-${percent}%`;
}

function readBenefits(row: any): string[] {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  return colors
    .filter((value: string) => value.startsWith(BENEFIT_PREFIX))
    .map((value: string) => value.slice(BENEFIT_PREFIX.length).trim())
    .filter(Boolean)
    .slice(0, 10);
}

function readVideoFlags(row: any) {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  const legacy = colors.includes(VIDEO_MARKER) || String(row?.category || '').toLowerCase() === 'vídeo';
  return {
    itemType: isBenefitsBlockRow(row) ? 'benefits' as const : (row?.item_type === 'video' || legacy ? 'video' as const : 'product' as const),
    autoplay: colors.includes(VIDEO_AUTOPLAY_ON) || (row?.video_autoplay !== undefined && row?.video_autoplay !== null ? Boolean(row.video_autoplay) : false),
    loop: colors.includes(VIDEO_LOOP_ON) || (row?.video_loop !== undefined && row?.video_loop !== null ? row.video_loop !== false : false),
    controls: colors.includes(VIDEO_CONTROLS_ON) || (row?.video_controls !== undefined && row?.video_controls !== null ? row.video_controls !== false : false),
    title: row?.video_title || (legacy && row?.name !== 'Vídeo destaque' ? row?.name || null : null),
  };
}

function readProductDescription(row: any): string | null {
  if (readVideoFlags(row).itemType !== 'product') return null;
  const value = String(row?.category || '').trim().slice(0, 220);
  return value && value.toLowerCase() !== 'produto' ? value : null;
}

function normalizeOpacity(value: any, fallback = 0.22): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(0.9, Math.max(0, Math.round(parsed * 100) / 100));
}

function normalizeBlur(value: any, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(30, Math.max(0, Math.round(parsed * 10) / 10));
}

function normalizeGiftImageSize(value: unknown, fallback = 48): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(80, Math.max(36, Math.round(parsed)));
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(200).json({
        success: true,
        list: null,
        note: 'Supabase credentials not configured.',
      });
    }

    const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const requestedSlug = String(req.query?.slug || requestUrl.searchParams.get('slug') || '').trim();

    // Com slug, cada lista possui um link público independente. Sem slug,
    // preserva /mais-vendidos como atalho para a lista marcada como padrão (active).
    let activeList: any = null;
    let listError: any = null;

    if (requestedSlug) {
      const result = await supabase
        .from('best_seller_lists')
        .select('*')
        .eq('slug', requestedSlug)
        .maybeSingle();
      activeList = result.data;
      listError = result.error;
    } else {
      const result = await supabase
        .from('best_seller_lists')
        .select('*')
        .eq('active', true)
        .order('list_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      activeList = result.data;
      listError = result.error;
    }

    if (listError) {
      if (isTableMissingError(listError)) {
        return res.status(200).json({ success: true, list: null });
      }
      console.warn('[Public BestSellers API] Erro ao consultar lista ativa:', listError.message);
      return res.status(200).json({ success: true, list: null });
    }

    if (!activeList) {
      return res.status(200).json({
        success: true,
        list: null,
      });
    }

    // Busca os produtos ordenados por posição
    const { data: productsData, error: prodsError } = await supabase
      .from('best_seller_products')
      .select('*')
      .eq('list_id', activeList.id)
      .order('position', { ascending: true });

    if (prodsError) {
      console.warn('[Public BestSellers API] Erro ao consultar produtos:', prodsError.message);
    }

    let formattedProducts: PublicBestSellerProduct[] = (productsData || []).map((p) => {
      const rawImageUrls = Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [];
      const imageUrls = rawImageUrls.length > 0 ? rawImageUrls : (p.image_url ? [p.image_url] : []);

      const useListBadge = Boolean(p.badge_use_list_default);
      const effectiveBadgeEnabled = useListBadge ? Boolean(activeList.default_badge_enabled) : Boolean(p.badge_enabled);
      const effectiveBadgeText = useListBadge
        ? (activeList.default_badge_enabled ? activeList.default_badge_text || null : null)
        : (p.badge_enabled ? p.badge_text || null : null);
      const effectiveBadgeColor = useListBadge ? (activeList.default_badge_color || '#FFFFFF') : (p.badge_color || '#FFFFFF');

      const giftMode = ['inherit', 'off', 'custom'].includes(String(p.gift_mode)) ? String(p.gift_mode) : 'inherit';
      const useListGift = giftMode === 'inherit';
      const effectiveGiftEnabled = giftMode === 'off'
        ? false
        : giftMode === 'custom'
          ? Boolean(p.gift_image_url)
          : Boolean(activeList.gift_enabled && activeList.gift_image_url);
      const effectiveGiftImageUrl = effectiveGiftEnabled
        ? (useListGift ? activeList.gift_image_url || null : p.gift_image_url || null)
        : null;
      const effectiveGiftTitle = effectiveGiftEnabled
        ? (useListGift ? activeList.gift_title || null : p.gift_title || null)
        : null;
      const effectiveGiftLabel = effectiveGiftEnabled
        ? (useListGift ? activeList.gift_label ?? null : p.gift_label ?? null)
        : null;
      const effectiveGiftTextColor = useListGift
        ? (activeList.gift_text_color || '#FFFFFF')
        : (p.gift_text_color || '#FFFFFF');
      const effectiveGiftImageSize = useListGift
        ? normalizeGiftImageSize(activeList.gift_image_size)
        : normalizeGiftImageSize(p.gift_image_size);

      return {
        id: p.id,
        itemType: readVideoFlags(p).itemType,
        displayGroup: readDisplayGroup(p),
        organizedFavorite: readOrganizedFavorite(p),
        position: p.position,
        name: p.name,
        category: p.category,
        description: readProductDescription(p),
        imageUrl: p.image_url || null,
        imageUrls,
        mediaItems: normalizePublicMediaItems(p.media_items, p.image_url, p.image_urls),
        videoAutoplay: readVideoFlags(p).autoplay,
        videoLoop: readVideoFlags(p).loop,
        videoControls: readVideoFlags(p).controls,
        videoTitle: readVideoFlags(p).title,
        benefits: readBenefits(p),
        productUrl: p.product_url || null,
        originalPrice: p.original_price !== null && p.original_price !== undefined ? Number(p.original_price) : null,
        promotionalPrice: p.promotional_price !== null && p.promotional_price !== undefined ? Number(p.promotional_price) : null,
        soldQuantity: p.show_sold_quantity ? p.sold_quantity ?? null : null,
        showSoldQuantity: Boolean(p.show_sold_quantity),
        availableQuantity: p.available_quantity ?? null,
        sizes: normalizeSizeList(p.sizes),
        outOfStockSizes: normalizeSizeList(p.out_of_stock_sizes),
        colors: visibleProductColors(p.colors),
        installmentsCount: p.installments_count ?? null,
        installmentValue: p.installment_value !== null && p.installment_value !== undefined ? Number(p.installment_value) : null,
        badgeEnabled: effectiveBadgeEnabled,
        badgeText: effectiveBadgeText,
        badgeColor: effectiveBadgeColor,
        giftEnabled: effectiveGiftEnabled,
        giftImageUrl: effectiveGiftImageUrl,
        giftTitle: effectiveGiftTitle,
        giftLabel: effectiveGiftLabel,
        giftTextColor: effectiveGiftTextColor,
        giftImageSize: effectiveGiftImageSize,
        timerEnabled: Boolean(p.timer_enabled),
        timerEnd: p.timer_enabled && !p.timer_looping ? p.timer_end || null : null,
        timerLooping: Boolean(p.timer_enabled && p.timer_looping),
        timerDurationMinutes: p.timer_enabled && p.timer_looping && p.timer_duration_minutes ? Number(p.timer_duration_minutes) : null,
        timerColor: p.timer_color || '#FFFFFF',
        timerSeparate: Array.isArray(p.colors) && p.colors.map((v: any) => String(v)).includes(TIMER_SEPARATE_ON),
      };
    });


    // Internacionalização manual por país. O país vem dos headers da Vercel;
    // nenhuma taxa de câmbio externa é consultada em tempo real.
    const detectedCountryCode = readDetectedCountryCode(req);
    const internationalConfig = activeList.international_config && typeof activeList.international_config === 'object'
      ? activeList.international_config
      : null;
    const rules = internationalConfig && Array.isArray(internationalConfig.rules) ? internationalConfig.rules : [];
    const countryRule = internationalConfig?.enabled && detectedCountryCode
      ? rules.find((rule: any) => Boolean(rule?.enabled) && String(rule?.countryCode || '').trim().toUpperCase() === detectedCountryCode)
      : null;

    // Regras comerciais e de conteúdo resolvidas por mercado.
    // Conteúdo editorial continua sendo traduzido manualmente no painel;
    // textos nativos da interface são traduzidos no front pelo uiLocale.
    let publicTitle = activeList.title;
    let publicSubtitle = activeList.subtitle || null;
    let publicCtaText = activeList.cta_text || null;
    let footerCtaEnabled = Boolean(activeList.footer_cta_enabled);
    let footerCtaText = String(activeList.footer_cta_text || '').trim().slice(0, 80) || null;
    let footerCtaUrl = isSafeUrl(activeList.footer_cta_url) && /^https?:\/\//i.test(String(activeList.footer_cta_url || '').trim())
      ? String(activeList.footer_cta_url).trim().slice(0, 2000)
      : null;
    let currencyCode = 'BRL';
    let currencyLocale = 'pt-BR';
    let uiLocale = 'pt-BR';
    let approximateConversion = false;
    let approximateLabel: string | null = null;
    let showPrices = true;
    let showInstallments = true;
    let showCta = true;
    let showFooterCta = true;
    let showBenefits = true;
    let showSoldQuantity = true;
    let showAvailableQuantity = true;
    let showSizes = true;
    let showColors = true;
    let showBadges = true;
    let showGift = true;
    let showProductTimers = true;
    let buttonDestination: 'product' | 'whatsapp' | 'custom' | 'form' = 'product';
    let formTitle: string | null = null;
    let formMessage: string | null = null;
    let redirectMode = false;
    let redirectMessage: string | null = null;
    let redirectShowPromotions = false;
    let redirectShowTimers = false;
    let redirectAutoDiscountBadge = true;
    let organizedTitle: string | null = null;
    let organizedSubtitle: string | null = null;
    let categoryTranslations: Record<string, string> = {};

    // Mantém o comportamento anterior: com Internacional ligado, benefícios
    // brasileiros nunca vazam para um país estrangeiro sem regra própria.
    if (internationalConfig?.enabled && detectedCountryCode && detectedCountryCode !== 'BR') {
      showBenefits = false;
    }

    if (countryRule) {
      const rate = Number(countryRule.currencyRate);
      const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
      currencyCode = String(countryRule.currencyCode || 'BRL').trim().toUpperCase().slice(0, 8) || 'BRL';
      currencyLocale = String(countryRule.locale || 'pt-BR').trim().slice(0, 32) || 'pt-BR';
      uiLocale = currencyLocale;
      approximateConversion = Boolean(countryRule.approximateConversion);
      approximateLabel = approximateConversion
        ? (String(countryRule.approximateLabel || '').trim().slice(0, 80) || null)
        : null;
      publicTitle = String(countryRule.title || '').trim() || publicTitle;
      publicSubtitle = String(countryRule.subtitle || '').trim() || publicSubtitle;
      publicCtaText = String(countryRule.ctaText || '').trim() || publicCtaText;
      footerCtaText = String(countryRule.footerCtaText || '').trim().slice(0, 80) || footerCtaText;
      if (String(countryRule.footerCtaUrl || '').trim()) {
        const countryFooterUrl = String(countryRule.footerCtaUrl || '').trim().slice(0, 2000);
        if (isSafeUrl(countryFooterUrl) && /^https?:\/\//i.test(countryFooterUrl)) footerCtaUrl = countryFooterUrl;
      }

      // Parcelamento e benefícios são brasileiros por padrão. Podem ser
      // reativados manualmente para um mercado específico quando fizer sentido.
      showPrices = countryRule.showPrices !== false;
      showInstallments = countryRule.showInstallments !== undefined
        ? Boolean(countryRule.showInstallments)
        : detectedCountryCode === 'BR';
      showCta = countryRule.showCta !== false;
      showFooterCta = countryRule.showFooterCta !== false;
      showBenefits = countryRule.showBenefits !== undefined
        ? Boolean(countryRule.showBenefits)
        : detectedCountryCode === 'BR';
      showSoldQuantity = countryRule.showSoldQuantity !== false;
      showAvailableQuantity = countryRule.showAvailableQuantity !== false;
      showSizes = countryRule.showSizes !== false;
      showColors = countryRule.showColors !== false;
      showBadges = countryRule.showBadges !== false;
      showGift = countryRule.showGift !== false;
      showProductTimers = countryRule.showProductTimers !== false;

      const translations = countryRule.productTranslations && typeof countryRule.productTranslations === 'object'
        ? countryRule.productTranslations
        : {};
      const destination = ['product', 'whatsapp', 'custom', 'form'].includes(String(countryRule.buttonDestination))
        ? String(countryRule.buttonDestination) as 'product' | 'whatsapp' | 'custom' | 'form'
        : 'product';
      buttonDestination = destination;
      formTitle = String(countryRule.formTitle || '').trim().slice(0, 160) || null;
      formMessage = String(countryRule.formMessage || '').trim().slice(0, 900) || null;
      redirectMode = Boolean(countryRule.redirectProducts && detectedCountryCode && detectedCountryCode !== 'BR');
      redirectMessage = redirectMode
        ? (String(countryRule.redirectMessage || '').trim().slice(0, 1200) || null)
        : null;
      redirectShowPromotions = Boolean(countryRule.redirectShowPromotions);
      redirectShowTimers = redirectShowPromotions && Boolean(countryRule.redirectShowTimers);
      redirectAutoDiscountBadge = countryRule.redirectAutoDiscountBadge !== false;
      organizedTitle = String(countryRule.organizedTitle || '').trim().slice(0, 160) || null;
      organizedSubtitle = String(countryRule.organizedSubtitle || '').trim().slice(0, 300) || null;
      if (countryRule.categoryTranslations && typeof countryRule.categoryTranslations === 'object') {
        categoryTranslations = Object.fromEntries(
          Object.entries(countryRule.categoryTranslations)
            .map(([key, value]) => [String(key).slice(0, 60), String(value || '').trim().slice(0, 80)] as const)
            .filter(([, value]) => Boolean(value))
        );
      }
      if (destination === 'form' && !String(countryRule.ctaText || '').trim()) {
        publicCtaText = getBestSellerUiText(uiLocale).formOpenCta;
      }
      const whatsappNumber = String(countryRule.whatsappNumber || '').replace(/\D+/g, '');
      const whatsappMessage = String(countryRule.whatsappMessage || '').trim().slice(0, 400);
      const customUrl = isSafeUrl(countryRule.customUrl) ? String(countryRule.customUrl).trim() : null;

      formattedProducts = formattedProducts.map((product) => {
        const stableCategoryKey = product.autoCategoryKey || detectBestSellerCategoryKey(product);
        const translation: any = translations[product.id] || {};
        const converted = (value: number | null | undefined) => value === null || value === undefined ? value : Math.round(value * safeRate * 100) / 100;
        const has = (key: string) => Object.prototype.hasOwnProperty.call(translation, key);
        const translatedList = (key: string, fallback: string[] | undefined): string[] | undefined => {
          if (!has(key)) return fallback;
          if (!Array.isArray(translation[key])) return [];
          return translation[key].map((value: any) => String(value || '').trim()).filter(Boolean).slice(0, 30);
        };

        let productUrl = product.productUrl;
        if (destination === 'whatsapp' && whatsappNumber) {
          const translatedName = String(translation.name || product.name).trim() || product.name;
          const msg = whatsappMessage || `${translatedName} - ${product.productUrl || ''}`.trim();
          productUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
        } else if (destination === 'custom' && customUrl) {
          productUrl = customUrl;
        } else if (destination === 'form') {
          // No fluxo internacional por formulário, a página do produto não é exposta
          // como destino do CTA. O produto é identificado pelo ID do card clicado.
          productUrl = null;
        }

        const translatedDescription = has('description')
          ? (String(translation.description || '').trim() || null)
          : product.description;
        const translatedVideoDescription = product.itemType === 'video' && has('description')
          ? (String(translation.description || '').trim() || product.category)
          : product.category;

        return {
          ...product,
          autoCategoryKey: stableCategoryKey,
          name: String(translation.name || product.name).trim() || product.name,
          category: translatedVideoDescription,
          description: product.itemType === 'video' ? product.description : translatedDescription,
          videoTitle: has('videoTitle') ? (String(translation.videoTitle || '').trim() || null) : product.videoTitle,
          benefits: translatedList('benefits', product.benefits),
          badgeText: has('badgeText') ? (String(translation.badgeText || '').trim() || null) : product.badgeText,
          giftTitle: has('giftTitle') ? (String(translation.giftTitle || '').trim() || null) : product.giftTitle,
          giftLabel: has('giftLabel') ? (String(translation.giftLabel || '').trim() || null) : product.giftLabel,
          colors: translatedList('colors', product.colors) || [],
          sizes: translatedList('sizes', product.sizes) || [],
          outOfStockSizes: translatedList('outOfStockSizes', product.outOfStockSizes) || [],
          productUrl,
          originalPrice: converted(product.originalPrice) as number | null | undefined,
          promotionalPrice: converted(product.promotionalPrice) as number | null | undefined,
          installmentValue: converted(product.installmentValue) as number | null | undefined,
        };
      });
    }

    // Produtos da área Redirecionar nunca aparecem na experiência brasileira/normal.
    // Quando o mercado ativa o redirecionamento, ocorre o inverso: apenas esses
    // produtos são exibidos e a página entra em modo limpo.
    formattedProducts = formattedProducts
      .map((product) => ({ ...product, autoCategoryKey: product.autoCategoryKey || detectBestSellerCategoryKey(product) }))
      .filter((product) => redirectMode ? product.displayGroup === 'redirect' : product.displayGroup !== 'redirect');

    // O catálogo Redirecionar é neutro por padrão: sem promoção, badge ou timer.
    // Cada mercado pode habilitar promoção explicitamente. Quando habilitada,
    // o badge de desconto é calculado a partir dos preços, sem texto manual.
    if (redirectMode) {
      formattedProducts = formattedProducts.map((product) => {
        if (product.itemType === 'video' || product.itemType === 'benefits') return product;
        const validDiscount = automaticDiscountLabel(product.originalPrice, product.promotionalPrice);
        if (!redirectShowPromotions || !validDiscount) {
          return {
            ...product,
            originalPrice: product.originalPrice ?? product.promotionalPrice ?? null,
            promotionalPrice: null,
            badgeEnabled: false,
            badgeText: null,
            timerEnabled: false,
            timerEnd: null,
            timerLooping: false,
            timerDurationMinutes: null,
          };
        }
        return {
          ...product,
          badgeEnabled: Boolean(redirectAutoDiscountBadge),
          badgeText: redirectAutoDiscountBadge ? validDiscount : null,
          badgeColor: '#FFFFFF',
          timerEnabled: redirectShowTimers ? Boolean(product.timerEnabled) : false,
          timerEnd: redirectShowTimers ? product.timerEnd : null,
          timerLooping: redirectShowTimers ? Boolean(product.timerLooping) : false,
          timerDurationMinutes: redirectShowTimers ? product.timerDurationMinutes : null,
        };
      });
      showProductTimers = redirectShowTimers;
      showBadges = redirectShowPromotions && redirectAutoDiscountBadge && showBadges;
    }

    if (!showBenefits || redirectMode) {
      formattedProducts = formattedProducts.filter((product) => product.itemType !== 'benefits');
    }

    const responseList: PublicBestSellerList = {
      id: activeList.id,
      slug: activeList.slug || undefined,
      title: redirectMode ? '' : publicTitle,
      logoUrl: redirectMode ? null : (activeList.logo_url || null),
      subtitle: redirectMode ? null : publicSubtitle,
      ctaText: publicCtaText,
      footerCtaEnabled: redirectMode ? false : Boolean(footerCtaEnabled && showFooterCta && footerCtaText && footerCtaUrl),
      experienceMode: activeList.experience_mode === 'organized' ? 'organized' : 'traditional',
      organizedIntroCount: Math.min(12, Math.max(1, Number(activeList.organized_intro_count) || 3)),
      organizedTitle: organizedTitle || null,
      organizedSubtitle: organizedSubtitle || null,
      categoryTranslations,
      footerCtaText,
      footerCtaUrl,
      showDate: redirectMode ? false : activeList.show_date !== false,
      showRanking: redirectMode ? false : activeList.show_ranking !== false,
      rankColor: activeList.rank_color || '#FFFFFF',
      sizeColor: activeList.size_color || '#FFFFFF',
      backgroundVideoUrl: redirectMode ? null : (activeList.background_video_url || null),
      backgroundVideoOpacity: redirectMode ? 0 : normalizeOpacity(activeList.background_video_opacity),
      backgroundVideoBlur: redirectMode ? 0 : normalizeBlur(activeList.background_video_blur),
      defaultBadgeEnabled: Boolean(activeList.default_badge_enabled),
      defaultBadgeText: activeList.default_badge_text || null,
      defaultBadgeColor: activeList.default_badge_color || '#FFFFFF',
      giftEnabled: Boolean(activeList.gift_enabled && activeList.gift_image_url),
      giftImageUrl: activeList.gift_enabled ? activeList.gift_image_url || null : null,
      giftTitle: activeList.gift_enabled ? activeList.gift_title || null : null,
      giftLabel: activeList.gift_enabled ? activeList.gift_label ?? null : null,
      giftTextColor: activeList.gift_text_color || '#FFFFFF',
      giftImageSize: normalizeGiftImageSize(activeList.gift_image_size),
      listDate: activeList.list_date,
      timerEnabled: redirectMode ? false : Boolean(activeList.timer_enabled),
      timerEnd: !redirectMode && activeList.timer_enabled && !activeList.timer_looping ? activeList.timer_end || null : null,
      timerLooping: !redirectMode && Boolean(activeList.timer_enabled && activeList.timer_looping),
      timerDurationMinutes:
        !redirectMode && activeList.timer_enabled && activeList.timer_looping && activeList.timer_duration_minutes
          ? Number(activeList.timer_duration_minutes)
          : null,
      timezone: activeList.timezone || 'America/Sao_Paulo',
      detectedCountryCode,
      uiLocale,
      showPrices,
      showInstallments,
      showCta,
      showBenefits,
      showSoldQuantity,
      showAvailableQuantity,
      showSizes,
      showColors,
      showBadges,
      showGift,
      showProductTimers,
      currencyCode,
      currencyLocale,
      approximateConversion,
      approximateLabel,
      buttonDestination,
      formTitle,
      formMessage,
      redirectMode,
      redirectMessage,
      products: formattedProducts,
    };

    return res.status(200).json({
      success: true,
      list: responseList,
    });
  } catch (err: any) {
    console.error('[Public BestSellers API] Exceção:', err);
    return res.status(200).json({
      success: true,
      list: null,
    });
  }
}
