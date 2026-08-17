import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { PublicBestSellerList, PublicBestSellerProduct } from '../../src/types/zhaya.js';

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

function normalizeSizeList(input: any): string[] {
  const source = Array.isArray(input) ? input : input === undefined || input === null ? [] : [input];
  const items = source
    .flatMap((value: any) => String(value).split(/[,;\n]+/g))
    .map((value: string) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(items));
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

    // Busca a lista única ativa
    const { data: activeList, error: listError } = await supabase
      .from('best_seller_lists')
      .select('*')
      .eq('active', true)
      .order('list_date', { ascending: false })
      .limit(1)
      .maybeSingle();

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

    const formattedProducts: PublicBestSellerProduct[] = (productsData || []).map((p) => {
      const rawImageUrls = Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [];
      const imageUrls = rawImageUrls.length > 0 ? rawImageUrls : (p.image_url ? [p.image_url] : []);

      return {
        id: p.id,
        position: p.position,
        name: p.name,
        category: p.category,
        imageUrl: p.image_url,
        imageUrls,
        productUrl: p.product_url || null,
        originalPrice: p.original_price !== null && p.original_price !== undefined ? Number(p.original_price) : null,
        promotionalPrice: p.promotional_price !== null && p.promotional_price !== undefined ? Number(p.promotional_price) : null,
        soldQuantity: p.show_sold_quantity ? p.sold_quantity ?? null : null,
        showSoldQuantity: Boolean(p.show_sold_quantity),
        availableQuantity: p.available_quantity ?? null,
        sizes: normalizeSizeList(p.sizes),
        outOfStockSizes: normalizeSizeList(p.out_of_stock_sizes),
        colors: Array.isArray(p.colors) ? p.colors : [],
        installmentsCount: p.installments_count ?? null,
        installmentValue: p.installment_value !== null && p.installment_value !== undefined ? Number(p.installment_value) : null,
        badgeEnabled: Boolean(p.badge_enabled),
        badgeText: p.badge_enabled ? p.badge_text || null : null,
        badgeColor: p.badge_color || '#FFFFFF',
        rankColor: p.rank_color || '#FFFFFF',
      };
    });

    const responseList: PublicBestSellerList = {
      id: activeList.id,
      title: activeList.title,
      logoUrl: activeList.logo_url || null,
      subtitle: activeList.subtitle || null,
      ctaText: activeList.cta_text || null,
      listDate: activeList.list_date,
      timerEnabled: Boolean(activeList.timer_enabled),
      timerEnd: activeList.timer_enabled ? activeList.timer_end || null : null,
      timezone: activeList.timezone || 'America/Sao_Paulo',
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
