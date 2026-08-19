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
const VIDEO_INTERNAL_MARKERS = new Set([VIDEO_MARKER, VIDEO_AUTOPLAY_ON, VIDEO_LOOP_ON, VIDEO_CONTROLS_ON]);

function visibleProductColors(input: any): string[] {
  const source = Array.isArray(input) ? input : [];
  return source
    .map((value: any) => String(value))
    .filter((value: string) => value && !VIDEO_INTERNAL_MARKERS.has(value));
}

function readVideoFlags(row: any) {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  const legacy = colors.includes(VIDEO_MARKER) || String(row?.category || '').toLowerCase() === 'vídeo';
  return {
    itemType: row?.item_type === 'video' || legacy ? 'video' as const : 'product' as const,
    autoplay: colors.includes(VIDEO_AUTOPLAY_ON) || (row?.video_autoplay !== undefined && row?.video_autoplay !== null ? Boolean(row.video_autoplay) : false),
    loop: colors.includes(VIDEO_LOOP_ON) || (row?.video_loop !== undefined && row?.video_loop !== null ? row.video_loop !== false : false),
    controls: colors.includes(VIDEO_CONTROLS_ON) || (row?.video_controls !== undefined && row?.video_controls !== null ? row.video_controls !== false : false),
    title: row?.video_title || (legacy && row?.name !== 'Vídeo destaque' ? row?.name || null : null),
  };
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

    const formattedProducts: PublicBestSellerProduct[] = (productsData || []).map((p) => {
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
        position: p.position,
        name: p.name,
        category: p.category,
        imageUrl: p.image_url || null,
        imageUrls,
        mediaItems: normalizePublicMediaItems(p.media_items, p.image_url, p.image_urls),
        videoAutoplay: readVideoFlags(p).autoplay,
        videoLoop: readVideoFlags(p).loop,
        videoControls: readVideoFlags(p).controls,
        videoTitle: readVideoFlags(p).title,
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
      };
    });

    const responseList: PublicBestSellerList = {
      id: activeList.id,
      slug: activeList.slug || undefined,
      title: activeList.title,
      logoUrl: activeList.logo_url || null,
      subtitle: activeList.subtitle || null,
      ctaText: activeList.cta_text || null,
      showDate: activeList.show_date !== false,
      showRanking: activeList.show_ranking !== false,
      rankColor: activeList.rank_color || '#FFFFFF',
      sizeColor: activeList.size_color || '#FFFFFF',
      backgroundVideoUrl: activeList.background_video_url || null,
      backgroundVideoOpacity: normalizeOpacity(activeList.background_video_opacity),
      backgroundVideoBlur: normalizeBlur(activeList.background_video_blur),
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
      timerEnabled: Boolean(activeList.timer_enabled),
      timerEnd: activeList.timer_enabled && !activeList.timer_looping ? activeList.timer_end || null : null,
      timerLooping: Boolean(activeList.timer_enabled && activeList.timer_looping),
      timerDurationMinutes:
        activeList.timer_enabled && activeList.timer_looping && activeList.timer_duration_minutes
          ? Number(activeList.timer_duration_minutes)
          : null,
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
