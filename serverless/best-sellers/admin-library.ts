import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerLibraryProduct, BestSellerGiftPreset, BestSellerMediaItem, BestSellerProduct } from '../../src/types/zhaya.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isMissingTable(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === '42P01' || msg.includes('best_seller_product_library') || msg.includes('schema cache') || msg.includes('could not find the table');
}

function isMissingGiftTable(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === '42P01' || msg.includes('best_seller_gift_library') || msg.includes('schema cache') || msg.includes('could not find the table');
}

function normalizeGiftSize(value: any): number {
  const n = Number(value || 48);
  return Math.max(36, Math.min(80, Number.isFinite(n) ? n : 48));
}

function mapGift(row: any): BestSellerGiftPreset {
  return {
    id: row.id,
    imageUrl: row.image_url,
    imagePath: row.image_path || null,
    title: row.title || null,
    label: row.label ?? null,
    textColor: row.text_color || '#FFFFFF',
    imageSize: normalizeGiftSize(row.image_size),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function reusableMediaItems(raw: any, imageUrl?: any, imageUrls?: any): BestSellerMediaItem[] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: BestSellerMediaItem[] = [];

  for (let index = 0; index < source.length && out.length < 24; index += 1) {
    const item = source[index] || {};
    const type = item.type === 'video' ? 'video' : 'image';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${type}-${index + 1}`,
      type,
      url,
      storagePath: typeof item.storagePath === 'string' ? item.storagePath : null,
      posterUrl: type === 'video' && typeof item.posterUrl === 'string' ? item.posterUrl : null,
      posterStoragePath: type === 'video' && typeof item.posterStoragePath === 'string' ? item.posterStoragePath : null,
      source: item.storagePath ? 'upload' : 'url',
    });
  }

  if (out.length > 0) return out;
  const legacy = [imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean);
  for (const url of Array.from(new Set(legacy))) {
    out.push({ id: `legacy-image-${out.length + 1}`, type: 'image', url, storagePath: null, source: 'url' });
  }
  return out;
}

function libraryPayloadFromProduct(product: any) {
  const mediaItems = reusableMediaItems(product.media_items, product.image_url, product.image_urls);
  const imageUrls = mediaItems.filter((item) => item.type === 'image').map((item) => item.url);
  return {
    name: product.name || 'Produto',
    category: product.category || 'Produto',
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
    media_items: mediaItems,
    product_url: product.product_url || null,
    original_price: product.original_price ?? null,
    promotional_price: product.promotional_price ?? null,
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    installments_count: product.installments_count ?? null,
    installment_value: product.installment_value ?? null,
    badge_enabled: Boolean(product.badge_enabled),
    badge_text: product.badge_text || null,
    badge_color: product.badge_color || '#FFFFFF',
    updated_at: new Date().toISOString(),
  };
}

function mapLibrary(row: any): BestSellerLibraryProduct {
  const mediaItems = reusableMediaItems(row.media_items, row.image_url, row.image_urls);
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'Produto',
    imageUrl: row.image_url || mediaItems.find((item) => item.type === 'image')?.url || mediaItems.find((item) => item.type === 'video')?.posterUrl || null,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : mediaItems.filter((item) => item.type === 'image').map((item) => item.url),
    mediaItems,
    productUrl: row.product_url || null,
    originalPrice: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    promotionalPrice: row.promotional_price !== null && row.promotional_price !== undefined ? Number(row.promotional_price) : null,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    installmentsCount: row.installments_count ?? null,
    installmentValue: row.installment_value !== null && row.installment_value !== undefined ? Number(row.installment_value) : null,
    badgeEnabled: Boolean(row.badge_enabled),
    badgeText: row.badge_text || null,
    badgeColor: row.badge_color || '#FFFFFF',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row: any): BestSellerProduct {
  const mediaItems = Array.isArray(row.media_items) ? row.media_items : [];
  return {
    id: row.id,
    libraryProductId: row.library_product_id || null,
    listId: row.list_id,
    position: row.position,
    name: row.name,
    category: row.category || 'Produto',
    imageUrl: row.image_url || null,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    mediaItems,
    productUrl: row.product_url || null,
    originalPrice: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    promotionalPrice: row.promotional_price !== null && row.promotional_price !== undefined ? Number(row.promotional_price) : null,
    soldQuantity: row.sold_quantity ?? null,
    showSoldQuantity: row.show_sold_quantity ?? true,
    availableQuantity: row.available_quantity ?? null,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    outOfStockSizes: Array.isArray(row.out_of_stock_sizes) ? row.out_of_stock_sizes : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    installmentsCount: row.installments_count ?? null,
    installmentValue: row.installment_value !== null && row.installment_value !== undefined ? Number(row.installment_value) : null,
    badgeEnabled: Boolean(row.badge_enabled),
    badgeText: row.badge_text || null,
    badgeColor: row.badge_color || '#FFFFFF',
    timerEnabled: Boolean(row.timer_enabled),
    timerEnd: row.timer_end || null,
    timerLooping: Boolean(row.timer_looping),
    timerDurationMinutes: row.timer_duration_minutes ? Number(row.timer_duration_minutes) : null,
    timerColor: row.timer_color || '#FFFFFF',
    clicks: typeof row.clicks === 'number' ? row.clicks : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncExistingProducts(supabase: any) {
  const [{ data: rows, error: productsError }, { data: libraryRows, error: libraryError }] = await Promise.all([
    supabase.from('best_seller_products').select('*').is('library_product_id', null).order('updated_at', { ascending: false }),
    supabase.from('best_seller_product_library').select('*'),
  ]);
  if (productsError) throw productsError;
  if (libraryError) throw libraryError;

  const existingByKey = new Map<string, string>();
  for (const row of libraryRows || []) {
    const firstImage = (Array.isArray(row.image_urls) ? row.image_urls[0] : null) || row.image_url || '';
    const key = row.product_url ? `url:${String(row.product_url).trim().toLowerCase()}` : `name:${String(row.name || '').trim().toLowerCase()}|img:${firstImage}`;
    existingByKey.set(key, row.id);
  }

  let imported = 0;
  let linked = 0;
  for (const product of rows || []) {
    const payload = libraryPayloadFromProduct(product);
    const firstImage = payload.image_urls[0] || '';
    const key = payload.product_url ? `url:${String(payload.product_url).trim().toLowerCase()}` : `name:${String(payload.name).trim().toLowerCase()}|img:${firstImage}`;
    let libraryId = existingByKey.get(key) || null;
    if (!libraryId) {
      const { data: created, error } = await supabase.from('best_seller_product_library').insert(payload).select('id').single();
      if (error) throw error;
      libraryId = created.id;
      existingByKey.set(key, libraryId);
      imported += 1;
    }
    const { error: linkError } = await supabase.from('best_seller_products').update({ library_product_id: libraryId }).eq('id', product.id);
    if (!linkError) linked += 1;
  }
  return { imported, linked };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito.' });
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Service Role não configurado.' });

  try {
    if (req.method === 'GET') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
      const kind = String(req.query?.kind || requestUrl.searchParams.get('kind') || 'products');
      if (kind === 'gifts') {
        const { data, error } = await supabase.from('best_seller_gift_library').select('*').order('updated_at', { ascending: false }).limit(250);
        if (error) {
          if (isMissingGiftTable(error)) return res.status(200).json({ success: true, configured: false, gifts: [], message: 'Execute o SQL da Biblioteca de Presentes no Supabase.' });
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
        }
        return res.status(200).json({ success: true, configured: true, gifts: (data || []).map(mapGift) });
      }

      const { data, error } = await supabase.from('best_seller_product_library').select('*').order('updated_at', { ascending: false }).limit(500);
      if (error) {
        if (isMissingTable(error)) return res.status(200).json({ success: true, configured: false, products: [] });
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }
      return res.status(200).json({ success: true, configured: true, products: (data || []).map(mapLibrary) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = String(body.action || '');

      if (action === 'save-gift') {
        const gift = body.gift || {};
        const imageUrl = String(gift.imageUrl || '').trim();
        if (!imageUrl) return res.status(400).json({ success: false, message: 'A imagem do presente é obrigatória.' });
        const payload = {
          image_url: imageUrl,
          image_path: gift.imagePath ? String(gift.imagePath) : null,
          title: gift.title ? String(gift.title).trim() : null,
          label: gift.label !== undefined && gift.label !== null ? String(gift.label).trim() : null,
          text_color: /^#[0-9a-f]{6}$/i.test(String(gift.textColor || '')) ? String(gift.textColor) : '#FFFFFF',
          image_size: normalizeGiftSize(gift.imageSize),
          updated_at: new Date().toISOString(),
        };

        const { data: existing, error: findError } = await supabase.from('best_seller_gift_library').select('id').eq('image_url', imageUrl).limit(1).maybeSingle();
        if (findError) {
          if (isMissingGiftTable(findError)) return res.status(400).json({ success: false, configured: false, message: 'Execute o SQL da Biblioteca de Presentes no Supabase.' });
          throw findError;
        }
        let saved: any = null;
        if (existing?.id) {
          const { data, error } = await supabase.from('best_seller_gift_library').update(payload).eq('id', existing.id).select().single();
          if (error) throw error;
          saved = data;
        } else {
          const { data, error } = await supabase.from('best_seller_gift_library').insert(payload).select().single();
          if (error) {
            if (isMissingGiftTable(error)) return res.status(400).json({ success: false, configured: false, message: 'Execute o SQL da Biblioteca de Presentes no Supabase.' });
            throw error;
          }
          saved = data;
        }
        return res.status(200).json({ success: true, configured: true, gift: mapGift(saved) });
      }

      if (action === 'sync-existing') {
        try {
          const result = await syncExistingProducts(supabase);
          return res.status(200).json({ success: true, ...result });
        } catch (error: any) {
          if (isMissingTable(error)) return res.status(400).json({ success: false, configured: false, message: 'Execute o SQL da Biblioteca de Produtos no Supabase.' });
          throw error;
        }
      }

      if (action === 'add-to-list') {
        const listId = String(body.listId || '');
        const libraryProductId = String(body.libraryProductId || '');
        if (!listId || !libraryProductId) return res.status(400).json({ success: false, message: 'Lista e produto salvo são obrigatórios.' });

        const { data: library, error: libraryError } = await supabase.from('best_seller_product_library').select('*').eq('id', libraryProductId).maybeSingle();
        if (libraryError) throw libraryError;
        if (!library) return res.status(404).json({ success: false, message: 'Produto salvo não encontrado.' });

        const { data: duplicate } = await supabase.from('best_seller_products').select('id').eq('list_id', listId).eq('library_product_id', libraryProductId).maybeSingle();
        if (duplicate) return res.status(409).json({ success: false, message: 'Esse produto já está nesta lista.' });

        const { data: last } = await supabase.from('best_seller_products').select('position').eq('list_id', listId).order('position', { ascending: false }).limit(1);
        const position = (last?.[0]?.position || 0) + 1;
        const mediaItems = reusableMediaItems(library.media_items, library.image_url, library.image_urls);
        const imageUrls = mediaItems.filter((item) => item.type === 'image').map((item) => item.url);

        const { data: created, error: createError } = await supabase.from('best_seller_products').insert({
          list_id: listId,
          library_product_id: library.id,
          position,
          name: library.name,
          category: library.category || 'Produto',
          image_url: imageUrls[0] || null,
          image_urls: imageUrls,
          media_items: mediaItems,
          product_url: library.product_url || null,
          original_price: library.original_price ?? null,
          promotional_price: library.promotional_price ?? null,
          sold_quantity: null,
          show_sold_quantity: true,
          available_quantity: null,
          sizes: Array.isArray(library.sizes) ? library.sizes : [],
          out_of_stock_sizes: [],
          colors: Array.isArray(library.colors) ? library.colors : [],
          installments_count: library.installments_count ?? null,
          installment_value: library.installment_value ?? null,
          badge_enabled: Boolean(library.badge_enabled),
          badge_text: library.badge_text || null,
          badge_color: library.badge_color || '#FFFFFF',
          timer_enabled: false,
          timer_end: null,
          timer_looping: false,
          timer_duration_minutes: null,
          timer_color: '#FFFFFF',
          clicks: 0,
        }).select().single();
        if (createError) throw createError;
        return res.status(201).json({ success: true, product: mapProduct(created) });
      }

      return res.status(400).json({ success: false, message: 'Ação da biblioteca inválida.' });
    }

    if (req.method === 'DELETE') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
      const id = String(req.query?.id || requestUrl.searchParams.get('id') || '');
      if (!id) return res.status(400).json({ success: false, message: 'ID é obrigatório.' });
      const { error } = await supabase.from('best_seller_product_library').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  } catch (error: any) {
    console.error('[BestSellers Library]', error);
    return res.status(500).json({ success: false, error: 'LIBRARY_ERROR', message: error?.message || 'Falha na biblioteca de produtos.' });
  }
}
