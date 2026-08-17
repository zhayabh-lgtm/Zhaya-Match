import type { BestSellerMediaItem } from '../../src/types/zhaya.js';

export type StableProductLibraryInput = {
  libraryProductId?: string | null;
  name: string;
  category?: string | null;
  mediaItems?: BestSellerMediaItem[] | any[];
  productUrl?: string | null;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  sizes?: string[];
  colors?: string[];
  installmentsCount?: number | null;
  installmentValue?: number | null;
};

export function keepOnlyLibraryImages(items: any[]): any[] {
  const source = Array.isArray(items) ? items : [];
  const seen = new Set<string>();
  const result: any[] = [];

  for (const item of source) {
    if (!item || item.type !== 'image') continue;
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `image-${result.length + 1}`,
      type: 'image',
      url,
      storagePath: typeof item.storagePath === 'string' ? item.storagePath : null,
      source: item.storagePath ? 'upload' : 'url',
    });
  }
  return result;
}

export async function syncBestSellerProductLibrary(
  supabase: any,
  input: StableProductLibraryInput,
): Promise<string | null> {
  const images = keepOnlyLibraryImages(input.mediaItems || []);
  const imageUrls = images.map((item) => item.url);
  const payload = {
    name: String(input.name || '').trim(),
    category: String(input.category || 'Produto').trim() || 'Produto',
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
    media_items: images,
    product_url: input.productUrl || null,
    original_price: input.originalPrice ?? null,
    promotional_price: input.promotionalPrice ?? null,
    sizes: Array.isArray(input.sizes) ? input.sizes : [],
    colors: Array.isArray(input.colors) ? input.colors : [],
    installments_count: input.installmentsCount ?? null,
    installment_value: input.installmentValue ?? null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) return input.libraryProductId || null;

  try {
    if (input.libraryProductId) {
      const { data, error } = await supabase
        .from('best_seller_product_library')
        .update(payload)
        .eq('id', input.libraryProductId)
        .select('id')
        .maybeSingle();
      if (!error && data?.id) return data.id;
    }

    const { data, error } = await supabase
      .from('best_seller_product_library')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('[BestSeller Product Library] Não foi possível sincronizar produto:', error.message || error);
      return input.libraryProductId || null;
    }
    return data?.id || null;
  } catch (error: any) {
    console.warn('[BestSeller Product Library] Erro ao sincronizar:', error?.message || error);
    return input.libraryProductId || null;
  }
}
