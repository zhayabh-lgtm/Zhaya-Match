import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerList } from '../../src/types/zhaya.js';
import { generateLiveSlug } from '../../src/lib/slugGenerator.js';

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


function normalizeBestSellerSlug(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildBestSellerSlug(title: string): string {
  const base = String(title || 'lista')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'lista';
  return `${base}-${generateLiveSlug(8).toLowerCase()}`;
}

function normalizeHexColor(value: unknown, fallback = '#FFFFFF'): string {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^#[0-9A-F]{6}$/.test(raw) ? raw : fallback;
}

const VIDEO_MARKER = '__ZHAYA_VIDEO_9X16__';
const VIDEO_AUTOPLAY_ON = '__ZHAYA_AUTOPLAY_1__';
const VIDEO_LOOP_ON = '__ZHAYA_LOOP_1__';
const VIDEO_CONTROLS_ON = '__ZHAYA_CONTROLS_1__';
const VIDEO_INTERNAL_MARKERS = new Set([VIDEO_MARKER, VIDEO_AUTOPLAY_ON, VIDEO_LOOP_ON, VIDEO_CONTROLS_ON]);

function duplicateColorsWithVideoState(row: any): string[] {
  const raw = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  const clean = raw.filter((v: string) => v && !VIDEO_INTERNAL_MARKERS.has(v));
  const isVideo = row?.item_type === 'video' || raw.includes(VIDEO_MARKER) || String(row?.category || '').toLowerCase() === 'vídeo';
  const autoplay = row?.video_autoplay !== undefined && row?.video_autoplay !== null ? Boolean(row.video_autoplay) : raw.includes(VIDEO_AUTOPLAY_ON);
  const loop = row?.video_loop !== undefined && row?.video_loop !== null ? row.video_loop !== false : raw.includes(VIDEO_LOOP_ON);
  const controls = row?.video_controls !== undefined && row?.video_controls !== null ? row.video_controls !== false : raw.includes(VIDEO_CONTROLS_ON);
  if (isVideo) {
    clean.push(VIDEO_MARKER);
    if (autoplay) clean.push(VIDEO_AUTOPLAY_ON);
    if (loop) clean.push(VIDEO_LOOP_ON);
    if (controls) clean.push(VIDEO_CONTROLS_ON);
  }
  return Array.from(new Set(clean));
}


function normalizeGiftImageSize(value: unknown, fallback = 48): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(80, Math.max(36, Math.round(parsed)));
}

function readOrganizedDefaults(config: any): { title: string | null; fallbackHighlights: boolean } {
  const defaults = config && typeof config === 'object' && config.organizedDefaults && typeof config.organizedDefaults === 'object'
    ? config.organizedDefaults
    : {};
  return {
    title: String(defaults.title || '').trim().slice(0, 160) || null,
    fallbackHighlights: defaults.fallbackHighlights !== false,
  };
}

function mergeOrganizedDefaults(config: any, title: unknown, fallbackHighlights: unknown): any {
  const base = config && typeof config === 'object' ? { ...config } : { enabled: false, rules: [] };
  if (!Array.isArray(base.rules)) base.rules = [];
  if (typeof base.enabled !== 'boolean') base.enabled = false;
  const current = readOrganizedDefaults(base);
  base.organizedDefaults = {
    title: title !== undefined ? (String(title || '').trim().slice(0, 160) || null) : current.title,
    fallbackHighlights: fallbackHighlights !== undefined ? Boolean(fallbackHighlights) : current.fallbackHighlights,
  };
  return base;
}

function isValidSafeUrl(urlStr: unknown): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/');
}

function normalizeOpacity(value: unknown, fallback = 0.22): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(0.9, Math.max(0, Math.round(parsed * 100) / 100));
}

function normalizeBlur(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(30, Math.max(0, Math.round(parsed * 10) / 10));
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação de Autenticação do Administrador
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      error: 'SUPABASE_NOT_CONFIGURED',
      message: 'Variáveis de ambiente do Supabase (URL e Service Role Key) não configuradas no servidor.',
      tableConfigured: false,
    });
  }

  // 2. GET: Listar todas as listas ou uma específica
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const singleId = req.query?.id || url.searchParams.get('id');

      if (singleId) {
        const { data: listData, error: listError } = await supabase
          .from('best_seller_lists')
          .select('*')
          .eq('id', singleId)
          .maybeSingle();

        if (listError) {
          if (isTableMissingError(listError)) {
            return res.status(200).json({ list: null, tableConfigured: false });
          }
          return res.status(500).json({ error: 'DATABASE_ERROR', message: listError.message });
        }

        if (!listData) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Lista não encontrada.' });
        }

        const { data: productsData } = await supabase
          .from('best_seller_products')
          .select('*')
          .eq('list_id', singleId)
          .order('position', { ascending: true });

        const listProducts = (productsData || []).map((p) => ({
          id: p.id,
          listId: p.list_id,
          position: p.position,
          name: p.name,
          category: p.category,
          imageUrl: p.image_url,
          imageUrls: Array.isArray(p.image_urls) ? p.image_urls : [],
          mediaItems: Array.isArray(p.media_items) ? p.media_items : [],
          productUrl: p.product_url || null,
          originalPrice: p.original_price !== null && p.original_price !== undefined ? Number(p.original_price) : null,
          promotionalPrice: p.promotional_price !== null && p.promotional_price !== undefined ? Number(p.promotional_price) : null,
          soldQuantity: p.sold_quantity ?? null,
          showSoldQuantity: p.show_sold_quantity ?? true,
          availableQuantity: p.available_quantity ?? null,
          sizes: p.sizes || [],
          outOfStockSizes: p.out_of_stock_sizes || [],
          colors: p.colors || [],
          installmentsCount: p.installments_count ?? null,
          installmentValue: p.installment_value !== null && p.installment_value !== undefined ? Number(p.installment_value) : null,
          badgeEnabled: Boolean(p.badge_enabled),
          badgeText: p.badge_text || null,
          badgeColor: p.badge_color || '#FFFFFF',
          clicks: typeof p.clicks === 'number' ? p.clicks : 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));

        const rawTotalClicks = listProducts.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
        const { data: clickEvents, error: clickEventsError } = await supabase
          .from('best_seller_analytics_events')
          .select('device_type')
          .eq('list_id', singleId)
          .eq('event_type', 'product_click')
          .limit(30000);
        const totalClicks = clickEventsError
          ? rawTotalClicks
          : (clickEvents || []).filter((event: any) => String(event?.device_type || '') !== 'desktop').length;

        const formattedList: BestSellerList = {
          id: listData.id,
          slug: listData.slug || undefined,
          title: listData.title,
          logoUrl: listData.logo_url || null,
          subtitle: listData.subtitle || null,
          ctaText: listData.cta_text || null,
          footerCtaEnabled: Boolean(listData.footer_cta_enabled),
          footerCtaText: listData.footer_cta_text || null,
          footerCtaUrl: listData.footer_cta_url || null,
          experienceMode: listData.experience_mode === 'organized' ? 'organized' : 'traditional',
          organizedIntroCount: Math.min(12, Math.max(1, Number(listData.organized_intro_count) || 3)),
          organizedTitle: readOrganizedDefaults(listData.international_config).title,
          organizedFallbackHighlights: readOrganizedDefaults(listData.international_config).fallbackHighlights,
          showDate: listData.show_date !== false,
          showRanking: listData.show_ranking !== false,
          rankColor: listData.rank_color || '#FFFFFF',
          sizeColor: listData.size_color || '#FFFFFF',
          backgroundVideoUrl: listData.background_video_url || null,
          backgroundVideoPath: listData.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(listData.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(listData.background_video_blur),
          defaultBadgeEnabled: Boolean(listData.default_badge_enabled),
          defaultBadgeText: listData.default_badge_text || null,
          defaultBadgeColor: listData.default_badge_color || '#FFFFFF',
          giftEnabled: Boolean(listData.gift_enabled),
          giftImageUrl: listData.gift_image_url || null,
          giftImagePath: listData.gift_image_path || null,
          giftTitle: listData.gift_title || null,
          giftLabel: listData.gift_label ?? null,
          giftTextColor: listData.gift_text_color || '#FFFFFF',
          giftImageSize: normalizeGiftImageSize(listData.gift_image_size),
          listDate: listData.list_date,
          active: Boolean(listData.active),
          timerEnabled: Boolean(listData.timer_enabled),
          timerEnd: listData.timer_end || null,
          timerLooping: Boolean(listData.timer_looping),
          timerDurationMinutes: listData.timer_duration_minutes ?? null,
          liveEnabled: Boolean(listData.live_enabled),
          internationalConfig: listData.international_config && typeof listData.international_config === 'object' ? listData.international_config : null,
          timezone: listData.timezone || 'America/Sao_Paulo',
          createdAt: listData.created_at,
          updatedAt: listData.updated_at,
          createdBy: listData.created_by || null,
          productsCount: listProducts.length,
          totalClicks,
          products: listProducts,
        };

        return res.status(200).json({
          success: true,
          list: formattedList,
          tableConfigured: true,
        });
      }

      // Lista geral
      const { data: listsData, error: listsError } = await supabase
        .from('best_seller_lists')
        .select('*, best_seller_products(id, clicks)')
        .order('list_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (listsError) {
        if (isTableMissingError(listsError)) {
          return res.status(200).json({
            lists: [],
            tableConfigured: false,
            message: 'Tabela best_seller_lists ainda não foi criada no Supabase.',
          });
        }
        return res.status(500).json({ error: 'DATABASE_ERROR', message: listsError.message });
      }

      const { data: allClickEvents, error: allClickEventsError } = await supabase
        .from('best_seller_analytics_events')
        .select('list_id, device_type')
        .eq('event_type', 'product_click')
        .limit(50000);
      const mobileClickMap = new Map<string, number>();
      if (!allClickEventsError) {
        for (const event of allClickEvents || []) {
          if (String((event as any)?.device_type || '') === 'desktop') continue;
          const key = String((event as any)?.list_id || '');
          if (key) mobileClickMap.set(key, (mobileClickMap.get(key) || 0) + 1);
        }
      }

      const formattedLists: BestSellerList[] = (listsData || []).map((row) => {
        const prods = Array.isArray(row.best_seller_products) ? row.best_seller_products : [];
        const rawTotalClicks = prods.reduce((sum: number, p: any) => sum + (typeof p?.clicks === 'number' ? p.clicks : 0), 0);
        const totalClicks = allClickEventsError ? rawTotalClicks : (mobileClickMap.get(String(row.id)) || 0);

        return {
          id: row.id,
          slug: row.slug || undefined,
          title: row.title,
          logoUrl: row.logo_url || null,
          subtitle: row.subtitle || null,
          ctaText: row.cta_text || null,
          footerCtaEnabled: Boolean(row.footer_cta_enabled),
          footerCtaText: row.footer_cta_text || null,
          footerCtaUrl: row.footer_cta_url || null,
          experienceMode: row.experience_mode === 'organized' ? 'organized' : 'traditional',
          organizedIntroCount: Math.min(12, Math.max(1, Number(row.organized_intro_count) || 3)),
          organizedTitle: readOrganizedDefaults(row.international_config).title,
          organizedFallbackHighlights: readOrganizedDefaults(row.international_config).fallbackHighlights,
          showDate: row.show_date !== false,
          showRanking: row.show_ranking !== false,
          rankColor: row.rank_color || '#FFFFFF',
          sizeColor: row.size_color || '#FFFFFF',
          backgroundVideoUrl: row.background_video_url || null,
          backgroundVideoPath: row.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(row.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(row.background_video_blur),
          defaultBadgeEnabled: Boolean(row.default_badge_enabled),
          defaultBadgeText: row.default_badge_text || null,
          defaultBadgeColor: row.default_badge_color || '#FFFFFF',
          giftEnabled: Boolean(row.gift_enabled),
          giftImageUrl: row.gift_image_url || null,
          giftImagePath: row.gift_image_path || null,
          giftTitle: row.gift_title || null,
          giftLabel: row.gift_label ?? null,
          giftTextColor: row.gift_text_color || '#FFFFFF',
          giftImageSize: normalizeGiftImageSize(row.gift_image_size),
          listDate: row.list_date,
          active: Boolean(row.active),
          timerEnabled: Boolean(row.timer_enabled),
          timerEnd: row.timer_end || null,
          timerLooping: Boolean(row.timer_looping),
          timerDurationMinutes: row.timer_duration_minutes ?? null,
          liveEnabled: Boolean(row.live_enabled),
          internationalConfig: row.international_config && typeof row.international_config === 'object' ? row.international_config : null,
          timezone: row.timezone || 'America/Sao_Paulo',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by || null,
          productsCount: prods.length,
          totalClicks,
        };
      });

      return res.status(200).json({
        success: true,
        lists: formattedLists,
        tableConfigured: true,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] GET error:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao buscar listas.' });
    }
  }

  // 3. POST: Criar nova lista
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Ação de Duplicação de Lista (Item 30)
      if (body.action === 'duplicate') {
        const sourceListId = body.sourceListId;
        if (!sourceListId) {
          return res.status(400).json({ success: false, message: 'sourceListId é obrigatório para duplicação.' });
        }

        // Busca lista de origem
        const { data: srcList, error: srcListErr } = await supabase
          .from('best_seller_lists')
          .select('*')
          .eq('id', sourceListId)
          .single();

        if (srcListErr || !srcList) {
          return res.status(404).json({ success: false, message: 'Lista de origem não encontrada.' });
        }

        // Busca produtos da lista de origem
        const { data: srcProds, error: srcProdsErr } = await supabase
          .from('best_seller_products')
          .select('*')
          .eq('list_id', sourceListId)
          .order('position', { ascending: true });

        if (srcProdsErr) {
          return res.status(500).json({ success: false, message: 'Erro ao ler produtos da lista de origem.' });
        }

        const targetDate = body.newListDate || new Date().toISOString().slice(0, 10);
        const sourceTitle = String(srcList.title || '').trim();
        const targetTitle = body.newTitle !== undefined
          ? String(body.newTitle || '').trim()
          : (sourceTitle ? `${sourceTitle} (Cópia)` : '');

        // Cria nova lista (sempre inativa por segurança ao duplicar)
        const { data: newListData, error: createListErr } = await supabase
          .from('best_seller_lists')
          .insert({
            title: targetTitle,
            slug: buildBestSellerSlug(targetTitle),
            logo_url: srcList.logo_url || null,
            subtitle: srcList.subtitle || null,
            cta_text: srcList.cta_text || null,
            footer_cta_enabled: Boolean(srcList.footer_cta_enabled),
            footer_cta_text: srcList.footer_cta_text || null,
            footer_cta_url: srcList.footer_cta_url || null,
            experience_mode: srcList.experience_mode === 'organized' ? 'organized' : 'traditional',
            organized_intro_count: Math.min(12, Math.max(1, Number(srcList.organized_intro_count) || 3)),
            show_date: srcList.show_date !== false,
            show_ranking: srcList.show_ranking !== false,
            rank_color: srcList.rank_color || '#FFFFFF',
            size_color: srcList.size_color || '#FFFFFF',
            background_video_url: srcList.background_video_url || null,
            background_video_path: srcList.background_video_path || null,
            background_video_opacity: normalizeOpacity(srcList.background_video_opacity),
            background_video_blur: normalizeBlur(srcList.background_video_blur),
            default_badge_enabled: Boolean(srcList.default_badge_enabled),
            default_badge_text: srcList.default_badge_text || null,
            default_badge_color: srcList.default_badge_color || '#FFFFFF',
            gift_enabled: Boolean(srcList.gift_enabled),
            gift_image_url: srcList.gift_image_url || null,
            gift_image_path: srcList.gift_image_path || null,
            gift_title: srcList.gift_title || null,
            gift_label: srcList.gift_label ?? null,
            gift_text_color: srcList.gift_text_color || '#FFFFFF',
            gift_image_size: normalizeGiftImageSize(srcList.gift_image_size),
            list_date: targetDate,
            active: false,
            timer_enabled: false,
            timer_end: null,
            timer_looping: false,
            timer_duration_minutes: null,
            live_enabled: Boolean(srcList.live_enabled),
            international_config: srcList.international_config || null,
            timezone: srcList.timezone || 'America/Sao_Paulo',
            created_by: auth.user?.email || null,
          })
          .select()
          .single();

        if (createListErr || !newListData) {
          return res.status(500).json({ success: false, message: createListErr?.message || 'Erro ao criar cópia da lista.' });
        }

        // Copia todos os produtos vinculados ao novo list_id
        if (srcProds && srcProds.length > 0) {
          const prodsToInsert = srcProds.map((p) => ({
            list_id: newListData.id,
            // Não depende das colunas novas item_type/video_*: o estado de vídeo
            // também é carregado nos marcadores internos de colors.
            position: p.position,
            name: p.name,
            category: p.category,
            image_url: p.image_url,
            image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
            media_items: Array.isArray(p.media_items) ? p.media_items : [],
            product_url: p.product_url || null,
            original_price: p.original_price ?? null,
            promotional_price: p.promotional_price ?? null,
            sold_quantity: p.sold_quantity ?? null,
            show_sold_quantity: p.show_sold_quantity ?? true,
            available_quantity: p.available_quantity ?? null,
            sizes: p.sizes || [],
            out_of_stock_sizes: p.out_of_stock_sizes || [],
            colors: duplicateColorsWithVideoState(p),
            installments_count: p.installments_count ?? null,
            installment_value: p.installment_value ?? null,
            badge_enabled: Boolean(p.badge_enabled),
            badge_text: p.badge_text || null,
            badge_color: p.badge_color || '#FFFFFF',
            badge_use_list_default: Boolean(p.badge_use_list_default),
            gift_mode: ['inherit', 'off', 'custom'].includes(String(p.gift_mode)) ? p.gift_mode : 'inherit',
            gift_image_url: p.gift_image_url || null,
            gift_image_path: p.gift_image_path || null,
            gift_title: p.gift_title || null,
            gift_label: p.gift_label ?? null,
            gift_text_color: p.gift_text_color || '#FFFFFF',
            gift_image_size: normalizeGiftImageSize(p.gift_image_size),
            clicks: 0,
          }));

          const { error: insertProdsErr } = await supabase
            .from('best_seller_products')
            .insert(prodsToInsert);

          if (insertProdsErr) {
            console.error('[Admin BestSellers API] Erro ao duplicar produtos da lista:', insertProdsErr);
          }
        }

        const duplicated: BestSellerList = {
          id: newListData.id,
          slug: newListData.slug || undefined,
          title: newListData.title,
          logoUrl: newListData.logo_url || null,
          subtitle: newListData.subtitle || null,
          ctaText: newListData.cta_text || null,
          footerCtaEnabled: Boolean(newListData.footer_cta_enabled),
          footerCtaText: newListData.footer_cta_text || null,
          footerCtaUrl: newListData.footer_cta_url || null,
          experienceMode: newListData.experience_mode === 'organized' ? 'organized' : 'traditional',
          organizedIntroCount: Math.min(12, Math.max(1, Number(newListData.organized_intro_count) || 3)),
          organizedTitle: readOrganizedDefaults(newListData.international_config).title,
          organizedFallbackHighlights: readOrganizedDefaults(newListData.international_config).fallbackHighlights,
          showDate: newListData.show_date !== false,
          showRanking: newListData.show_ranking !== false,
          rankColor: newListData.rank_color || '#FFFFFF',
          sizeColor: newListData.size_color || '#FFFFFF',
          backgroundVideoUrl: newListData.background_video_url || null,
          backgroundVideoPath: newListData.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(newListData.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(newListData.background_video_blur),
          defaultBadgeEnabled: Boolean(newListData.default_badge_enabled),
          defaultBadgeText: newListData.default_badge_text || null,
          defaultBadgeColor: newListData.default_badge_color || '#FFFFFF',
          giftEnabled: Boolean(newListData.gift_enabled),
          giftImageUrl: newListData.gift_image_url || null,
          giftImagePath: newListData.gift_image_path || null,
          giftTitle: newListData.gift_title || null,
          giftLabel: newListData.gift_label ?? null,
          giftTextColor: newListData.gift_text_color || '#FFFFFF',
          giftImageSize: normalizeGiftImageSize(newListData.gift_image_size),
          listDate: newListData.list_date,
          active: false,
          timerEnabled: false,
          timerEnd: null,
          timerLooping: false,
          timerDurationMinutes: null,
          timezone: newListData.timezone,
          createdAt: newListData.created_at,
          updatedAt: newListData.updated_at,
          createdBy: newListData.created_by,
          productsCount: srcProds ? srcProds.length : 0,
          totalClicks: 0,
        };

        return res.status(201).json({
          success: true,
          list: duplicated,
          message: 'Lista duplicada com sucesso.',
        });
      }

      // Criação normal de lista
      const title = String(body.title ?? '').trim();
      const requestedSlug = body.slug !== undefined && body.slug !== null ? normalizeBestSellerSlug(body.slug) : '';
      const slug = requestedSlug || buildBestSellerSlug(title);
      const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
      const subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      const ctaText = body.ctaText ? String(body.ctaText).trim() : null;
      const footerCtaEnabled = Boolean(body.footerCtaEnabled);
      const footerCtaText = footerCtaEnabled && body.footerCtaText ? String(body.footerCtaText).trim().slice(0, 80) : null;
      const footerCtaUrl = footerCtaEnabled && body.footerCtaUrl ? String(body.footerCtaUrl).trim().slice(0, 2000) : null;
      const experienceMode = body.experienceMode === 'organized' ? 'organized' : 'traditional';
      const organizedIntroCount = Math.min(12, Math.max(1, Math.round(Number(body.organizedIntroCount) || 3)));
      const showDate = body.showDate !== false;
      const showRanking = body.showRanking !== false;
      const rankColor = normalizeHexColor(body.rankColor);
      const sizeColor = normalizeHexColor(body.sizeColor);
      const backgroundVideoUrl = body.backgroundVideoUrl ? String(body.backgroundVideoUrl).trim() : null;
      const backgroundVideoPath = body.backgroundVideoPath && String(body.backgroundVideoPath).startsWith('bestsellers/') ? String(body.backgroundVideoPath).trim() : null;
      const backgroundVideoOpacity = normalizeOpacity(body.backgroundVideoOpacity);
      const backgroundVideoBlur = normalizeBlur(body.backgroundVideoBlur);
      const defaultBadgeEnabled = Boolean(body.defaultBadgeEnabled);
      const defaultBadgeText = defaultBadgeEnabled && body.defaultBadgeText ? String(body.defaultBadgeText).trim().slice(0, 40) : null;
      const defaultBadgeColor = normalizeHexColor(body.defaultBadgeColor);
      const giftEnabled = Boolean(body.giftEnabled && body.giftImageUrl);
      const giftImageUrl = body.giftImageUrl ? String(body.giftImageUrl).trim() : null;
      const giftImagePath = body.giftImagePath && String(body.giftImagePath).startsWith('bestsellers/') ? String(body.giftImagePath).trim() : null;
      const giftTitle = giftEnabled && body.giftTitle ? String(body.giftTitle).trim().slice(0, 50) : null;
      const giftLabel = body.giftLabel !== undefined ? (String(body.giftLabel || '').trim().slice(0, 40) || null) : 'Você ganha';
      const giftTextColor = normalizeHexColor(body.giftTextColor);
      const giftImageSize = normalizeGiftImageSize(body.giftImageSize);
      const listDate = body.listDate || new Date().toISOString().slice(0, 10);
      const active = Boolean(body.active);
      const timerEnabled = Boolean(body.timerEnabled);
      const timerLooping = timerEnabled && Boolean(body.timerLooping);
      const rawDurationMinutes = body.timerDurationMinutes;
      const timerDurationMinutes = timerLooping && rawDurationMinutes !== null && rawDurationMinutes !== undefined
        ? Number(rawDurationMinutes)
        : null;
      const timerEnd = timerEnabled && !timerLooping && body.timerEnd ? body.timerEnd : null;
      const timezone = body.timezone || 'America/Sao_Paulo';
      const liveEnabled = Boolean(body.liveEnabled);
      const incomingInternationalConfig = body.internationalConfig && typeof body.internationalConfig === 'object'
        ? body.internationalConfig
        : null;
      const internationalConfig = mergeOrganizedDefaults(
        incomingInternationalConfig,
        body.organizedTitle,
        body.organizedFallbackHighlights,
      );

      if (footerCtaEnabled && (!footerCtaText || !footerCtaUrl)) {
        return res.status(400).json({ success: false, message: 'Preencha o texto e o link do botão final da página.' });
      }
      if (footerCtaUrl && (!isValidSafeUrl(footerCtaUrl) || !/^https?:\/\//i.test(footerCtaUrl))) {
        return res.status(400).json({ success: false, message: 'O link do botão final deve começar com http:// ou https://.' });
      }
      if (!listDate) {
        return res.status(400).json({ success: false, message: 'A data da lista é obrigatória.' });
      }
      if (body.slug !== undefined && String(body.slug || '').trim() && !requestedSlug) {
        return res.status(400).json({ success: false, message: 'O slug informado é inválido.' });
      }
      const { data: existingSlug } = await supabase
        .from('best_seller_lists')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existingSlug) {
        return res.status(409).json({ success: false, message: 'Este slug já está sendo usado por outra lista.' });
      }
      if (backgroundVideoUrl && !isValidSafeUrl(backgroundVideoUrl)) {
        return res.status(400).json({ success: false, message: 'URL do vídeo de fundo é inválida ou insegura.' });
      }
      if (giftImageUrl && !isValidSafeUrl(giftImageUrl)) {
        return res.status(400).json({ success: false, message: 'Imagem do presente é inválida.' });
      }
      if (timerLooping && (!Number.isInteger(timerDurationMinutes) || (timerDurationMinutes as number) < 1 || (timerDurationMinutes as number) > 10080)) {
        return res.status(400).json({
          success: false,
          message: 'A duração do timer em looping deve estar entre 1 minuto e 7 dias.',
        });
      }

      // Regra: se esta lista estiver sendo criada como ativa, desativa todas as outras
      if (active) {
        await supabase
          .from('best_seller_lists')
          .update({ active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase
        .from('best_seller_lists')
        .insert({
          title,
          slug,
          logo_url: logoUrl,
          subtitle,
          cta_text: ctaText,
          footer_cta_enabled: footerCtaEnabled,
          footer_cta_text: footerCtaText,
          footer_cta_url: footerCtaUrl,
          experience_mode: experienceMode,
          organized_intro_count: organizedIntroCount,
          show_date: showDate,
          show_ranking: showRanking,
          rank_color: rankColor,
          size_color: sizeColor,
          background_video_url: backgroundVideoUrl,
          background_video_path: backgroundVideoPath,
          background_video_opacity: backgroundVideoOpacity,
          background_video_blur: backgroundVideoBlur,
          default_badge_enabled: defaultBadgeEnabled,
          default_badge_text: defaultBadgeText,
          default_badge_color: defaultBadgeColor,
          gift_enabled: giftEnabled,
          gift_image_url: giftImageUrl,
          gift_image_path: giftImagePath,
          gift_title: giftTitle,
          gift_label: giftLabel,
          gift_text_color: giftTextColor,
          gift_image_size: giftImageSize,
          list_date: listDate,
          active,
          timer_enabled: timerEnabled,
          timer_end: timerEnd,
          timer_looping: timerLooping,
          timer_duration_minutes: timerDurationMinutes,
          live_enabled: liveEnabled,
          international_config: internationalConfig,
          timezone,
          created_by: auth.user?.email || null,
        })
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({
            success: false,
            tableConfigured: false,
            error: 'TABLE_NOT_CONFIGURED',
            message: 'Tabela best_seller_lists não encontrada. Execute o script SQL no Supabase para criá-la.',
          });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      const created: BestSellerList = {
        id: data.id,
        slug: data.slug || undefined,
        title: data.title,
        logoUrl: data.logo_url || null,
        subtitle: data.subtitle || null,
        ctaText: data.cta_text || null,
        footerCtaEnabled: Boolean(data.footer_cta_enabled),
        footerCtaText: data.footer_cta_text || null,
        footerCtaUrl: data.footer_cta_url || null,
        experienceMode: data.experience_mode === 'organized' ? 'organized' : 'traditional',
        organizedIntroCount: Math.min(12, Math.max(1, Number(data.organized_intro_count) || 3)),
        organizedTitle: readOrganizedDefaults(data.international_config).title,
        organizedFallbackHighlights: readOrganizedDefaults(data.international_config).fallbackHighlights,
        showDate: data.show_date !== false,
        showRanking: data.show_ranking !== false,
        rankColor: data.rank_color || '#FFFFFF',
        sizeColor: data.size_color || '#FFFFFF',
        backgroundVideoUrl: data.background_video_url || null,
        backgroundVideoPath: data.background_video_path || null,
        backgroundVideoOpacity: normalizeOpacity(data.background_video_opacity),
        backgroundVideoBlur: normalizeBlur(data.background_video_blur),
        defaultBadgeEnabled: Boolean(data.default_badge_enabled),
        defaultBadgeText: data.default_badge_text || null,
        defaultBadgeColor: data.default_badge_color || '#FFFFFF',
        giftEnabled: Boolean(data.gift_enabled),
        giftImageUrl: data.gift_image_url || null,
        giftImagePath: data.gift_image_path || null,
        giftTitle: data.gift_title || null,
        giftLabel: data.gift_label ?? null,
        giftTextColor: data.gift_text_color || '#FFFFFF',
        giftImageSize: normalizeGiftImageSize(data.gift_image_size),
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ?? null,
        liveEnabled: Boolean(data.live_enabled),
        internationalConfig: data.international_config && typeof data.international_config === 'object' ? data.international_config : null,
        timezone: data.timezone,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        productsCount: 0,
        totalClicks: 0,
      };

      return res.status(201).json({
        success: true,
        list: created,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] POST error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao criar lista.' });
    }
  }

  // 4. PUT / PATCH: Atualizar lista existente
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const id = body.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da lista é obrigatório para atualização.' });
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.title !== undefined) updates.title = String(body.title).trim();
      if (body.slug !== undefined) {
        const normalizedSlug = normalizeBestSellerSlug(body.slug);
        if (!normalizedSlug) {
          return res.status(400).json({ success: false, message: 'O slug não pode ficar vazio ao editar uma lista existente.' });
        }
        const { data: slugOwner } = await supabase
          .from('best_seller_lists')
          .select('id')
          .eq('slug', normalizedSlug)
          .neq('id', id)
          .maybeSingle();
        if (slugOwner) {
          return res.status(409).json({ success: false, message: 'Este slug já está sendo usado por outra lista.' });
        }
        updates.slug = normalizedSlug;
      }
      if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl ? String(body.logoUrl).trim() : null;
      if (body.subtitle !== undefined) updates.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      if (body.ctaText !== undefined) updates.cta_text = body.ctaText ? String(body.ctaText).trim() : null;
      if (body.footerCtaEnabled !== undefined) updates.footer_cta_enabled = Boolean(body.footerCtaEnabled);
      if (body.footerCtaText !== undefined) updates.footer_cta_text = body.footerCtaText ? String(body.footerCtaText).trim().slice(0, 80) : null;
      if (body.footerCtaUrl !== undefined) {
        const footerUrl = body.footerCtaUrl ? String(body.footerCtaUrl).trim().slice(0, 2000) : '';
        if (footerUrl && (!isValidSafeUrl(footerUrl) || !/^https?:\/\//i.test(footerUrl))) {
          return res.status(400).json({ success: false, message: 'O link do botão final deve começar com http:// ou https://.' });
        }
        updates.footer_cta_url = footerUrl || null;
      }
      if (body.footerCtaEnabled === true) {
        const nextText = body.footerCtaText !== undefined ? String(body.footerCtaText || '').trim() : null;
        const nextUrl = body.footerCtaUrl !== undefined ? String(body.footerCtaUrl || '').trim() : null;
        if ((body.footerCtaText !== undefined && !nextText) || (body.footerCtaUrl !== undefined && !nextUrl)) {
          return res.status(400).json({ success: false, message: 'Preencha o texto e o link do botão final da página.' });
        }
      }
      if (body.experienceMode !== undefined) updates.experience_mode = body.experienceMode === 'organized' ? 'organized' : 'traditional';
      if (body.organizedIntroCount !== undefined) updates.organized_intro_count = Math.min(12, Math.max(1, Math.round(Number(body.organizedIntroCount) || 3)));
      if (body.showDate !== undefined) updates.show_date = Boolean(body.showDate);
      if (body.showRanking !== undefined) updates.show_ranking = Boolean(body.showRanking);
      if (body.rankColor !== undefined) updates.rank_color = normalizeHexColor(body.rankColor);
      if (body.sizeColor !== undefined) updates.size_color = normalizeHexColor(body.sizeColor);
      if (body.backgroundVideoUrl !== undefined) {
        const value = body.backgroundVideoUrl ? String(body.backgroundVideoUrl).trim() : '';
        if (value && !isValidSafeUrl(value)) {
          return res.status(400).json({ success: false, message: 'URL do vídeo de fundo é inválida ou insegura.' });
        }
        updates.background_video_url = value || null;
      }
      if (body.backgroundVideoPath !== undefined) {
        const path = body.backgroundVideoPath ? String(body.backgroundVideoPath).trim() : '';
        updates.background_video_path = path.startsWith('bestsellers/') ? path : null;
      }
      if (body.backgroundVideoOpacity !== undefined) updates.background_video_opacity = normalizeOpacity(body.backgroundVideoOpacity);
      if (body.backgroundVideoBlur !== undefined) updates.background_video_blur = normalizeBlur(body.backgroundVideoBlur);
      if (body.defaultBadgeEnabled !== undefined) updates.default_badge_enabled = Boolean(body.defaultBadgeEnabled);
      if (body.defaultBadgeText !== undefined) updates.default_badge_text = body.defaultBadgeText ? String(body.defaultBadgeText).trim().slice(0, 40) : null;
      if (body.defaultBadgeColor !== undefined) updates.default_badge_color = normalizeHexColor(body.defaultBadgeColor);
      if (body.giftEnabled !== undefined) updates.gift_enabled = Boolean(body.giftEnabled);
      if (body.giftImageUrl !== undefined) {
        const giftUrl = body.giftImageUrl ? String(body.giftImageUrl).trim() : '';
        if (giftUrl && !isValidSafeUrl(giftUrl)) return res.status(400).json({ success: false, message: 'Imagem do presente é inválida.' });
        updates.gift_image_url = giftUrl || null;
        if (!giftUrl) updates.gift_enabled = false;
      }
      if (body.giftImagePath !== undefined) {
        const giftPath = body.giftImagePath ? String(body.giftImagePath).trim() : '';
        updates.gift_image_path = giftPath.startsWith('bestsellers/') ? giftPath : null;
      }
      if (body.giftTitle !== undefined) updates.gift_title = body.giftTitle ? String(body.giftTitle).trim().slice(0, 50) : null;
      if (body.giftLabel !== undefined) updates.gift_label = body.giftLabel ? String(body.giftLabel).trim().slice(0, 40) : null;
      if (body.giftTextColor !== undefined) updates.gift_text_color = normalizeHexColor(body.giftTextColor);
      if (body.giftImageSize !== undefined) updates.gift_image_size = normalizeGiftImageSize(body.giftImageSize);
      if (body.listDate !== undefined) updates.list_date = body.listDate;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.liveEnabled !== undefined) updates.live_enabled = Boolean(body.liveEnabled);
      if (body.internationalConfig !== undefined) {
        updates.international_config = body.internationalConfig && typeof body.internationalConfig === 'object'
          ? body.internationalConfig
          : null;
      }
      if (body.organizedTitle !== undefined || body.organizedFallbackHighlights !== undefined) {
        let baseInternationalConfig = updates.international_config;
        if (baseInternationalConfig === undefined) {
          const { data: currentConfigRow } = await supabase
            .from('best_seller_lists')
            .select('international_config')
            .eq('id', id)
            .maybeSingle();
          baseInternationalConfig = currentConfigRow?.international_config || null;
        }
        updates.international_config = mergeOrganizedDefaults(
          baseInternationalConfig,
          body.organizedTitle,
          body.organizedFallbackHighlights,
        );
      }
      if (
        body.timerEnabled !== undefined ||
        body.timerLooping !== undefined ||
        body.timerDurationMinutes !== undefined ||
        body.timerEnd !== undefined
      ) {
        const nextTimerEnabled = body.timerEnabled !== undefined ? Boolean(body.timerEnabled) : undefined;
        const nextTimerLooping = body.timerLooping !== undefined ? Boolean(body.timerLooping) : undefined;

        if (nextTimerEnabled !== undefined) updates.timer_enabled = nextTimerEnabled;
        if (nextTimerLooping !== undefined) updates.timer_looping = nextTimerLooping;

        const effectiveTimerEnabled = nextTimerEnabled ?? true;
        const effectiveTimerLooping = nextTimerLooping ?? false;

        if (body.timerDurationMinutes !== undefined) {
          const duration = body.timerDurationMinutes === null ? null : Number(body.timerDurationMinutes);
          if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 10080)) {
            return res.status(400).json({
              success: false,
              message: 'A duração do timer em looping deve estar entre 1 minuto e 7 dias.',
            });
          }
          updates.timer_duration_minutes = duration;
        }

        if (nextTimerEnabled === false) {
          updates.timer_end = null;
          updates.timer_looping = false;
          updates.timer_duration_minutes = null;
        } else if (effectiveTimerLooping) {
          updates.timer_end = null;
        } else if (body.timerEnd !== undefined) {
          updates.timer_end = body.timerEnd;
          if (nextTimerLooping === false) updates.timer_duration_minutes = null;
        }
      }

      if (body.active !== undefined) {
        const isActive = Boolean(body.active);
        updates.active = isActive;

        // Se ativando esta lista, desativa atomicamente as outras
        if (isActive) {
          await supabase
            .from('best_seller_lists')
            .update({ active: false })
            .neq('id', id);
        }
      }

      const { data, error } = await supabase
        .from('best_seller_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({
            success: false,
            tableConfigured: false,
            error: 'TABLE_NOT_CONFIGURED',
            message: 'Tabela best_seller_lists não encontrada no Supabase.',
          });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      if (body.applyDefaultBadgeToAll === true && Boolean(data.default_badge_enabled)) {
        const { error: badgeApplyError } = await supabase
          .from('best_seller_products')
          .update({ badge_use_list_default: true, updated_at: new Date().toISOString() })
          .eq('list_id', id);
        if (badgeApplyError) {
          console.warn('[Admin BestSellers API] Não foi possível aplicar badge padrão em todos os produtos:', badgeApplyError.message);
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: 'A vitrine foi salva, mas não foi possível aplicar o padrão de badge em todos os produtos.' });
        }
      }

      if (body.applyDefaultBadgeColorToConfigured === true) {
        const { error: badgeColorApplyError } = await supabase
          .from('best_seller_products')
          .update({ badge_color: data.default_badge_color || '#FFFFFF', updated_at: new Date().toISOString() })
          .eq('list_id', id)
          .eq('badge_enabled', true)
          .eq('badge_use_list_default', false);
        if (badgeColorApplyError) {
          console.warn('[Admin BestSellers API] Não foi possível aplicar a cor padrão às badges configuradas:', badgeColorApplyError.message);
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: 'A vitrine foi salva, mas não foi possível aplicar a cor padrão às badges configuradas.' });
        }
      }

      if (body.applyTimerColorToAll === true) {
        const timerColorForAll = normalizeHexColor(body.timerColorForAll || '#FFFFFF');
        const { error: timerColorApplyError } = await supabase
          .from('best_seller_products')
          .update({ timer_color: timerColorForAll, updated_at: new Date().toISOString() })
          .eq('list_id', id);

        if (timerColorApplyError) {
          console.warn('[Admin BestSellers API] Não foi possível aplicar a cor a todos os timers dos produtos:', timerColorApplyError.message);
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: 'A Vitrine foi salva, mas não foi possível aplicar a cor em todos os timers dos produtos.' });
        }
      }

      if (body.applyTimerToAll === true) {
        const timerUpdates = data.timer_enabled
          ? {
              timer_enabled: true,
              timer_looping: Boolean(data.timer_looping),
              timer_end: data.timer_looping ? null : (data.timer_end || null),
              timer_duration_minutes: data.timer_looping ? (data.timer_duration_minutes || null) : null,
              updated_at: new Date().toISOString(),
            }
          : {
              timer_enabled: false,
              timer_looping: false,
              timer_end: null,
              timer_duration_minutes: null,
              updated_at: new Date().toISOString(),
            };

        const { error: timerApplyError } = await supabase
          .from('best_seller_products')
          .update(timerUpdates)
          .eq('list_id', id);

        if (timerApplyError) {
          console.warn('[Admin BestSellers API] Não foi possível atualizar o timer de todos os produtos:', timerApplyError.message);
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: 'A Vitrine foi salva, mas não foi possível aplicar o timer em todos os produtos.' });
        }
      }

      const updated: BestSellerList = {
        id: data.id,
        slug: data.slug || undefined,
        title: data.title,
        logoUrl: data.logo_url || null,
        subtitle: data.subtitle || null,
        ctaText: data.cta_text || null,
        footerCtaEnabled: Boolean(data.footer_cta_enabled),
        footerCtaText: data.footer_cta_text || null,
        footerCtaUrl: data.footer_cta_url || null,
        experienceMode: data.experience_mode === 'organized' ? 'organized' : 'traditional',
        organizedIntroCount: Math.min(12, Math.max(1, Number(data.organized_intro_count) || 3)),
        organizedTitle: readOrganizedDefaults(data.international_config).title,
        organizedFallbackHighlights: readOrganizedDefaults(data.international_config).fallbackHighlights,
        showDate: data.show_date !== false,
        showRanking: data.show_ranking !== false,
        rankColor: data.rank_color || '#FFFFFF',
        sizeColor: data.size_color || '#FFFFFF',
        backgroundVideoUrl: data.background_video_url || null,
        backgroundVideoPath: data.background_video_path || null,
        backgroundVideoOpacity: normalizeOpacity(data.background_video_opacity),
        backgroundVideoBlur: normalizeBlur(data.background_video_blur),
        defaultBadgeEnabled: Boolean(data.default_badge_enabled),
        defaultBadgeText: data.default_badge_text || null,
        defaultBadgeColor: data.default_badge_color || '#FFFFFF',
        giftEnabled: Boolean(data.gift_enabled),
        giftImageUrl: data.gift_image_url || null,
        giftImagePath: data.gift_image_path || null,
        giftTitle: data.gift_title || null,
        giftLabel: data.gift_label ?? null,
        giftTextColor: data.gift_text_color || '#FFFFFF',
        giftImageSize: normalizeGiftImageSize(data.gift_image_size),
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ?? null,
        liveEnabled: Boolean(data.live_enabled),
        internationalConfig: data.international_config && typeof data.international_config === 'object' ? data.international_config : null,
        timezone: data.timezone,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
      };

      return res.status(200).json({
        success: true,
        list: updated,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] PUT error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao atualizar lista.' });
    }
  }

  // 5. DELETE: Excluir lista (Cascade deletará os produtos)
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const id = req.query?.id || url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da lista é obrigatório para exclusão.' });
      }

      const { error } = await supabase
        .from('best_seller_lists')
        .delete()
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({ success: false, tableConfigured: false, message: 'Tabela não encontrada.' });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      return res.status(200).json({ success: true, message: 'Lista e produtos excluídos com sucesso.' });
    } catch (err: any) {
      console.error('[Admin BestSellers API] DELETE error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao excluir lista.' });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
