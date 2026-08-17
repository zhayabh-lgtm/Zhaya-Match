import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import { keepOnlyLibraryImages, syncBestSellerProductLibrary } from './product-library.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatItem(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'Produto',
    imageUrl: row.image_url || null,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    mediaItems: keepOnlyLibraryImages(Array.isArray(row.media_items) ? row.media_items : []),
    productUrl: row.product_url || null,
    originalPrice: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    promotionalPrice: row.promotional_price !== null && row.promotional_price !== undefined ? Number(row.promotional_price) : null,
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    installmentsCount: row.installments_count ?? null,
    installmentValue: row.installment_value !== null && row.installment_value !== undefined ? Number(row.installment_value) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Service Role não configurado.' });
  }

  if (req.method === 'GET') {
    // Backfill transparente: produtos antigos passam a entrar na biblioteca na primeira abertura.
    // Vídeos são filtrados pelo helper e nunca são copiados para a biblioteca.
    try {
      const { data: unlinkedProducts } = await supabase
        .from('best_seller_products')
        .select('id, library_product_id, name, category, media_items, image_url, image_urls, product_url, original_price, promotional_price, sizes, colors, installments_count, installment_value')
        .is('library_product_id', null)
        .limit(150);

      for (const product of unlinkedProducts || []) {
        const legacyImages = Array.isArray(product.media_items) && product.media_items.length > 0
          ? product.media_items
          : [product.image_url, ...(Array.isArray(product.image_urls) ? product.image_urls : [])]
              .filter(Boolean)
              .map((url: string, index: number) => ({ id: `backfill-image-${index + 1}`, type: 'image', url, source: 'url' }));
        const libraryId = await syncBestSellerProductLibrary(supabase, {
          name: product.name,
          category: product.category,
          mediaItems: legacyImages,
          productUrl: product.product_url || null,
          originalPrice: product.original_price !== null && product.original_price !== undefined ? Number(product.original_price) : null,
          promotionalPrice: product.promotional_price !== null && product.promotional_price !== undefined ? Number(product.promotional_price) : null,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
          installmentsCount: product.installments_count ?? null,
          installmentValue: product.installment_value !== null && product.installment_value !== undefined ? Number(product.installment_value) : null,
        });
        if (libraryId) {
          await supabase.from('best_seller_products').update({ library_product_id: libraryId }).eq('id', product.id);
        }
      }
    } catch (backfillError: any) {
      console.warn('[BestSeller Product Library] Backfill ignorado:', backfillError?.message || backfillError);
    }

    const { data, error } = await supabase
      .from('best_seller_product_library')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      const lower = String(error.message || '').toLowerCase();
      if (lower.includes('best_seller_product_library') || lower.includes('schema cache') || String(error.code || '') === '42P01') {
        return res.status(200).json({ success: true, items: [], tableConfigured: false });
      }
      return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
    }

    return res.status(200).json({ success: true, items: (data || []).map(formatItem), tableConfigured: true });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const id = req.query?.id || url.searchParams.get('id') || req.body?.id;
    if (!id) return res.status(400).json({ success: false, message: 'ID do produto salvo é obrigatório.' });

    const { error } = await supabase.from('best_seller_product_library').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
