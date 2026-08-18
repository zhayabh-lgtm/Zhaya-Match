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

        const totalClicks = listProducts.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

        const formattedList: BestSellerList = {
          id: listData.id,
          slug: listData.slug || undefined,
          title: listData.title,
          logoUrl: listData.logo_url || null,
          subtitle: listData.subtitle || null,
          ctaText: listData.cta_text || null,
          showDate: listData.show_date !== false,
          showRanking: listData.show_ranking !== false,
          rankColor: listData.rank_color || '#FFFFFF',
          sizeColor: listData.size_color || '#FFFFFF',
          backgroundVideoUrl: listData.background_video_url || null,
          backgroundVideoPath: listData.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(listData.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(listData.background_video_blur),
          listDate: listData.list_date,
          active: Boolean(listData.active),
          timerEnabled: Boolean(listData.timer_enabled),
          timerEnd: listData.timer_end || null,
          timerLooping: Boolean(listData.timer_looping),
          timerDurationMinutes: listData.timer_duration_minutes ?? null,
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

      const formattedLists: BestSellerList[] = (listsData || []).map((row) => {
        const prods = Array.isArray(row.best_seller_products) ? row.best_seller_products : [];
        const totalClicks = prods.reduce((sum: number, p: any) => sum + (typeof p?.clicks === 'number' ? p.clicks : 0), 0);

        return {
          id: row.id,
          slug: row.slug || undefined,
          title: row.title,
          logoUrl: row.logo_url || null,
          subtitle: row.subtitle || null,
          ctaText: row.cta_text || null,
          showDate: row.show_date !== false,
          showRanking: row.show_ranking !== false,
          rankColor: row.rank_color || '#FFFFFF',
          sizeColor: row.size_color || '#FFFFFF',
          backgroundVideoUrl: row.background_video_url || null,
          backgroundVideoPath: row.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(row.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(row.background_video_blur),
          listDate: row.list_date,
          active: Boolean(row.active),
          timerEnabled: Boolean(row.timer_enabled),
          timerEnd: row.timer_end || null,
          timerLooping: Boolean(row.timer_looping),
          timerDurationMinutes: row.timer_duration_minutes ?? null,
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
        const targetTitle = body.newTitle ? String(body.newTitle).trim() : `${srcList.title} (Cópia)`;

        // Cria nova lista (sempre inativa por segurança ao duplicar)
        const { data: newListData, error: createListErr } = await supabase
          .from('best_seller_lists')
          .insert({
            title: targetTitle,
            slug: buildBestSellerSlug(targetTitle),
            logo_url: srcList.logo_url || null,
            subtitle: srcList.subtitle || null,
            cta_text: srcList.cta_text || null,
            show_date: srcList.show_date !== false,
            show_ranking: srcList.show_ranking !== false,
            rank_color: srcList.rank_color || '#FFFFFF',
            size_color: srcList.size_color || '#FFFFFF',
            background_video_url: srcList.background_video_url || null,
            background_video_path: srcList.background_video_path || null,
            background_video_opacity: normalizeOpacity(srcList.background_video_opacity),
            background_video_blur: normalizeBlur(srcList.background_video_blur),
            list_date: targetDate,
            active: false,
            timer_enabled: false,
            timer_end: null,
            timer_looping: false,
            timer_duration_minutes: null,
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
            colors: p.colors || [],
            installments_count: p.installments_count ?? null,
            installment_value: p.installment_value ?? null,
            badge_enabled: Boolean(p.badge_enabled),
            badge_text: p.badge_text || null,
            badge_color: p.badge_color || '#FFFFFF',
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
          showDate: newListData.show_date !== false,
          showRanking: newListData.show_ranking !== false,
          rankColor: newListData.rank_color || '#FFFFFF',
          sizeColor: newListData.size_color || '#FFFFFF',
          backgroundVideoUrl: newListData.background_video_url || null,
          backgroundVideoPath: newListData.background_video_path || null,
          backgroundVideoOpacity: normalizeOpacity(newListData.background_video_opacity),
          backgroundVideoBlur: normalizeBlur(newListData.background_video_blur),
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
      const title = (body.title || 'Mais Vendidos do Dia').trim();
      const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
      const subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      const ctaText = body.ctaText ? String(body.ctaText).trim() : null;
      const showDate = body.showDate !== false;
      const showRanking = body.showRanking !== false;
      const rankColor = normalizeHexColor(body.rankColor);
      const sizeColor = normalizeHexColor(body.sizeColor);
      const backgroundVideoUrl = body.backgroundVideoUrl ? String(body.backgroundVideoUrl).trim() : null;
      const backgroundVideoPath = body.backgroundVideoPath && String(body.backgroundVideoPath).startsWith('bestsellers/') ? String(body.backgroundVideoPath).trim() : null;
      const backgroundVideoOpacity = normalizeOpacity(body.backgroundVideoOpacity);
      const backgroundVideoBlur = normalizeBlur(body.backgroundVideoBlur);
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

      if (!title) {
        return res.status(400).json({ success: false, message: 'O título da lista é obrigatório.' });
      }
      if (!listDate) {
        return res.status(400).json({ success: false, message: 'A data da lista é obrigatória.' });
      }
      if (backgroundVideoUrl && !isValidSafeUrl(backgroundVideoUrl)) {
        return res.status(400).json({ success: false, message: 'URL do vídeo de fundo é inválida ou insegura.' });
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
          slug: buildBestSellerSlug(title),
          logo_url: logoUrl,
          subtitle,
          cta_text: ctaText,
          show_date: showDate,
          show_ranking: showRanking,
          rank_color: rankColor,
          size_color: sizeColor,
          background_video_url: backgroundVideoUrl,
          background_video_path: backgroundVideoPath,
          background_video_opacity: backgroundVideoOpacity,
          background_video_blur: backgroundVideoBlur,
          list_date: listDate,
          active,
          timer_enabled: timerEnabled,
          timer_end: timerEnd,
          timer_looping: timerLooping,
          timer_duration_minutes: timerDurationMinutes,
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
        showDate: data.show_date !== false,
        showRanking: data.show_ranking !== false,
        rankColor: data.rank_color || '#FFFFFF',
        sizeColor: data.size_color || '#FFFFFF',
        backgroundVideoUrl: data.background_video_url || null,
        backgroundVideoPath: data.background_video_path || null,
        backgroundVideoOpacity: normalizeOpacity(data.background_video_opacity),
        backgroundVideoBlur: normalizeBlur(data.background_video_blur),
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ?? null,
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
      if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl ? String(body.logoUrl).trim() : null;
      if (body.subtitle !== undefined) updates.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      if (body.ctaText !== undefined) updates.cta_text = body.ctaText ? String(body.ctaText).trim() : null;
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
      if (body.listDate !== undefined) updates.list_date = body.listDate;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
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

      const updated: BestSellerList = {
        id: data.id,
        slug: data.slug || undefined,
        title: data.title,
        logoUrl: data.logo_url || null,
        subtitle: data.subtitle || null,
        ctaText: data.cta_text || null,
        showDate: data.show_date !== false,
        showRanking: data.show_ranking !== false,
        rankColor: data.rank_color || '#FFFFFF',
        sizeColor: data.size_color || '#FFFFFF',
        backgroundVideoUrl: data.background_video_url || null,
        backgroundVideoPath: data.background_video_path || null,
        backgroundVideoOpacity: normalizeOpacity(data.background_video_opacity),
        backgroundVideoBlur: normalizeBlur(data.background_video_blur),
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ?? null,
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
