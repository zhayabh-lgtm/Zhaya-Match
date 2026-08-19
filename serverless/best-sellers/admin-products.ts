import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerProduct } from '../../src/types/zhaya.js';

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
    msg.includes('relation "best_seller_products" does not exist') ||
    msg.includes('relation "public.best_seller_products" does not exist') ||
    msg.includes('could not find the table')
  );
}

function isVideoSchemaCompatibilityError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  const mentionsVideoColumn =
    msg.includes('item_type') ||
    msg.includes('video_autoplay') ||
    msg.includes('video_loop') ||
    msg.includes('video_controls') ||
    msg.includes('video_title');
  return mentionsVideoColumn && (msg.includes('schema cache') || msg.includes('column') || code === '42703' || code === 'PGRST204');
}

const VIDEO_MARKER = '__ZHAYA_VIDEO_9X16__';
const VIDEO_AUTOPLAY_ON = '__ZHAYA_AUTOPLAY_1__';
const VIDEO_LOOP_ON = '__ZHAYA_LOOP_1__';
const VIDEO_CONTROLS_ON = '__ZHAYA_CONTROLS_1__';

function videoLegacyMarkers(autoplay: any, loop: any, controls: any): string[] {
  const markers = [VIDEO_MARKER];
  if (Boolean(autoplay)) markers.push(VIDEO_AUTOPLAY_ON);
  if (loop !== false) markers.push(VIDEO_LOOP_ON);
  if (controls !== false) markers.push(VIDEO_CONTROLS_ON);
  return markers;
}

const VIDEO_INTERNAL_MARKERS = new Set([VIDEO_MARKER, VIDEO_AUTOPLAY_ON, VIDEO_LOOP_ON, VIDEO_CONTROLS_ON]);

function visibleProductColors(input: any): string[] {
  const source = Array.isArray(input) ? input : [];
  return source
    .map((value: any) => String(value))
    .filter((value: string) => value && !VIDEO_INTERNAL_MARKERS.has(value));
}

function colorsWithLegacyVideoState(input: any, itemType: 'product' | 'video', autoplay: any, loop: any, controls: any): string[] {
  const colors = visibleProductColors(input);
  if (itemType === 'video') colors.push(VIDEO_MARKER);
  if (Boolean(autoplay)) colors.push(VIDEO_AUTOPLAY_ON);
  if (loop !== false) colors.push(VIDEO_LOOP_ON);
  if (controls !== false) colors.push(VIDEO_CONTROLS_ON);
  return Array.from(new Set(colors));
}

function stripUnsupportedVideoSchemaField(payload: Record<string, any>, error: any, fallbackColors: string[]): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const fields = ['item_type', 'video_autoplay', 'video_loop', 'video_controls', 'video_title'];
  let changed = false;
  let needsLegacyFlags = false;

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field) && msg.includes(field)) {
      delete payload[field];
      changed = true;
      if (field.startsWith('video_')) needsLegacyFlags = true;
    }
  }

  if (needsLegacyFlags) payload.colors = fallbackColors;
  return changed;
}

function isLegacyVideoBlockRow(row: any): boolean {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  return colors.includes(VIDEO_MARKER) || String(row?.category || '').toLowerCase() === 'vídeo';
}

function readVideoFlags(row: any) {
  const colors = Array.isArray(row?.colors) ? row.colors.map((v: any) => String(v)) : [];
  const legacy = isLegacyVideoBlockRow(row);
  return {
    itemType: row?.item_type === 'video' || legacy ? 'video' as const : 'product' as const,
    autoplay: colors.includes(VIDEO_AUTOPLAY_ON) || (row?.video_autoplay !== undefined && row?.video_autoplay !== null ? Boolean(row.video_autoplay) : false),
    loop: colors.includes(VIDEO_LOOP_ON) || (row?.video_loop !== undefined && row?.video_loop !== null ? row.video_loop !== false : false),
    controls: colors.includes(VIDEO_CONTROLS_ON) || (row?.video_controls !== undefined && row?.video_controls !== null ? row.video_controls !== false : false),
    title: row?.video_title || (legacy && row?.name !== 'Vídeo destaque' ? row?.name || null : null),
  };
}

// Sanitização simples contra tags XSS
function sanitizeText(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}

function readProductDescription(row: any): string | null {
  if (readVideoFlags(row).itemType === 'video') return null;
  const value = sanitizeText(String(row?.category || '')).slice(0, 220);
  return value && value.toLowerCase() !== 'produto' ? value : null;
}

function parsePriceInput(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    return isNaN(val) || val < 0 ? null : Math.round(val * 100) / 100;
  }
  let str = String(val).trim().replace(/^R\$\s*/i, '').trim();
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function normalizeSizeList(input: any): string[] {
  const source = Array.isArray(input) ? input : input === undefined || input === null ? [] : [input];
  const items = source
    .flatMap((value: any) => String(value).split(/[,;\n]+/g))
    .map((value: string) => sanitizeText(value))
    .filter(Boolean);
  return Array.from(new Set(items));
}

function parseInstallmentsCount(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const parsed = Number(val);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 36) return null;
  return parsed;
}

function normalizeHexColor(value: any, fallback = '#FFFFFF'): string {
  const clean = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^#[0-9A-F]{6}$/.test(clean) ? clean : fallback;
}

function normalizeGiftImageSize(value: any, fallback = 48): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(80, Math.max(36, Math.round(parsed)));
}

// Validação de URL segura (rejeita javascript:, data:, etc.)
function isValidSafeUrl(urlStr: any): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return false;
  }
  // Aceita URLs http:// ou https:// válidas ou caminhos relativos /
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return true;
  }
  return false;
}


function normalizeMediaItems(input: any): Array<{ id: string; type: 'image' | 'video'; url: string; storagePath?: string | null; posterUrl?: string | null; posterStoragePath?: string | null; source?: 'upload' | 'url' }> {
  const source = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const result: Array<{ id: string; type: 'image' | 'video'; url: string; storagePath?: string | null; posterUrl?: string | null; posterStoragePath?: string | null; source?: 'upload' | 'url' }> = [];

  for (let index = 0; index < source.length && result.length < 16; index += 1) {
    const item = source[index] || {};
    const type: 'image' | 'video' = item.type === 'video' ? 'video' : 'image';
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url || !isValidSafeUrl(url)) continue;
    const dedupeKey = `${type}:${url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const storagePath = typeof item.storagePath === 'string' && item.storagePath.startsWith('bestsellers/')
      ? item.storagePath.trim()
      : null;
    const posterUrl = type === 'video' && typeof item.posterUrl === 'string' && isValidSafeUrl(item.posterUrl)
      ? item.posterUrl.trim()
      : null;
    const posterStoragePath = type === 'video' && typeof item.posterStoragePath === 'string' && item.posterStoragePath.startsWith('bestsellers/')
      ? item.posterStoragePath.trim()
      : null;

    result.push({
      id: sanitizeText(item.id) || `media-${index + 1}`,
      type,
      url,
      storagePath,
      posterUrl,
      posterStoragePath,
      source: storagePath ? 'upload' : 'url',
    });
  }

  return result;
}

function mediaItemsFromLegacy(imageUrl: any, imageUrls: any): Array<{ id: string; type: 'image'; url: string; storagePath: null; source: 'url' }> {
  const urls = [imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .filter((value) => value && isValidSafeUrl(value));
  return Array.from(new Set(urls)).map((url, index) => ({
    id: `legacy-image-${index + 1}`,
    type: 'image' as const,
    url,
    storagePath: null,
    source: 'url' as const,
  }));
}

function reusableMediaItems(raw: any, imageUrl: any, imageUrls: any) {
  const normalized = normalizeMediaItems(raw);
  return normalized.length > 0 ? normalized : mediaItemsFromLegacy(imageUrl, imageUrls);
}

async function syncProductToLibrary(supabase: any, productRow: any): Promise<string | null> {
  try {
    if (String(productRow?.item_type || 'product') === 'video' || isLegacyVideoBlockRow(productRow)) return productRow?.library_product_id || null;
    const reusableMedia = reusableMediaItems(productRow.media_items, productRow.image_url, productRow.image_urls);
    const imageUrls = reusableMedia.filter((item: any) => item.type === 'image').map((item: any) => item.url);
    const payload: Record<string, any> = {
      name: productRow.name || 'Produto',
      category: productRow.category || 'Produto',
      image_url: imageUrls[0] || null,
      image_urls: imageUrls,
      media_items: reusableMedia,
      product_url: productRow.product_url || null,
      original_price: productRow.original_price ?? null,
      promotional_price: productRow.promotional_price ?? null,
      sizes: Array.isArray(productRow.sizes) ? productRow.sizes : [],
      colors: visibleProductColors(productRow.colors),
      installments_count: productRow.installments_count ?? null,
      installment_value: productRow.installment_value ?? null,
      badge_enabled: Boolean(productRow.badge_enabled),
      badge_text: productRow.badge_text || null,
      badge_color: productRow.badge_color || '#FFFFFF',
      updated_at: new Date().toISOString(),
    };

    let libraryId = productRow.library_product_id || null;
    if (libraryId) {
      const { error } = await supabase.from('best_seller_product_library').update(payload).eq('id', libraryId);
      if (!error) return libraryId;
      if (!isTableMissingError(error)) console.warn('[BestSellerProducts] Falha ao atualizar biblioteca:', error.message);
      return null;
    }

    // Reaproveita um cadastro existente quando o link da loja é idêntico.
    if (payload.product_url) {
      const { data: existing } = await supabase
        .from('best_seller_product_library')
        .select('id')
        .eq('product_url', payload.product_url)
        .limit(1)
        .maybeSingle();
      if (existing?.id) libraryId = existing.id;
    }

    if (libraryId) {
      await supabase.from('best_seller_product_library').update(payload).eq('id', libraryId);
    } else {
      const { data: created, error } = await supabase.from('best_seller_product_library').insert(payload).select('id').single();
      if (error) {
        if (!isTableMissingError(error)) console.warn('[BestSellerProducts] Falha ao salvar biblioteca:', error.message);
        return null;
      }
      libraryId = created.id;
    }

    await supabase.from('best_seller_products').update({ library_product_id: libraryId }).eq('id', productRow.id);
    return libraryId;
  } catch (error: any) {
    console.warn('[BestSellerProducts] Biblioteca indisponível; produto da lista foi salvo normalmente:', error?.message || error);
    return null;
  }
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

  // 2. GET: Listar produtos de uma lista
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const listId = req.query?.listId || url.searchParams.get('listId');

      if (!listId) {
        return res.status(400).json({ error: 'MISSING_LIST_ID', message: 'listId é obrigatório.' });
      }

      const { data, error } = await supabase
        .from('best_seller_products')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(200).json({ products: [], tableConfigured: false });
        }
        return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
      }

      const { data: clickEvents, error: clickEventsError } = await supabase
        .from('best_seller_analytics_events')
        .select('product_id, device_type')
        .eq('list_id', listId)
        .eq('event_type', 'product_click')
        .limit(30000);
      const clickMap = new Map<string, number>();
      if (!clickEventsError) {
        for (const event of clickEvents || []) {
          if (String((event as any)?.device_type || '') === 'desktop') continue;
          const id = String((event as any)?.product_id || '');
          if (id) clickMap.set(id, (clickMap.get(id) || 0) + 1);
        }
      }

      const products: BestSellerProduct[] = (data || []).map((p) => ({
        id: p.id,
        itemType: readVideoFlags(p).itemType,
        libraryProductId: p.library_product_id || null,
        listId: p.list_id,
        position: p.position,
        name: p.name,
        category: p.category,
        description: readProductDescription(p),
        imageUrl: p.image_url,
        imageUrls: Array.isArray(p.image_urls) ? p.image_urls : [],
        mediaItems: normalizeMediaItems(p.media_items).length > 0 ? normalizeMediaItems(p.media_items) : mediaItemsFromLegacy(p.image_url, p.image_urls),
        videoAutoplay: readVideoFlags(p).autoplay,
        videoLoop: readVideoFlags(p).loop,
        videoControls: readVideoFlags(p).controls,
        videoTitle: readVideoFlags(p).title,
        productUrl: p.product_url || null,
        originalPrice: p.original_price !== null && p.original_price !== undefined ? Number(p.original_price) : null,
        promotionalPrice: p.promotional_price !== null && p.promotional_price !== undefined ? Number(p.promotional_price) : null,
        soldQuantity: p.sold_quantity ?? null,
        showSoldQuantity: p.show_sold_quantity ?? true,
        availableQuantity: p.available_quantity ?? null,
        sizes: normalizeSizeList(p.sizes),
        outOfStockSizes: normalizeSizeList(p.out_of_stock_sizes),
        colors: visibleProductColors(p.colors),
        installmentsCount: p.installments_count ?? null,
        installmentValue: p.installment_value !== null && p.installment_value !== undefined ? Number(p.installment_value) : null,
        badgeEnabled: Boolean(p.badge_enabled),
        badgeText: p.badge_text || null,
        badgeColor: p.badge_color || '#FFFFFF',
        badgeUseListDefault: Boolean(p.badge_use_list_default),
        giftMode: ['inherit', 'off', 'custom'].includes(String(p.gift_mode)) ? p.gift_mode : 'inherit',
        giftImageUrl: p.gift_image_url || null,
        giftImagePath: p.gift_image_path || null,
        giftTitle: p.gift_title || null,
        giftLabel: p.gift_label ?? null,
        giftTextColor: p.gift_text_color || '#FFFFFF',
        giftImageSize: normalizeGiftImageSize(p.gift_image_size),
        timerEnabled: Boolean(p.timer_enabled),
        timerEnd: p.timer_end || null,
        timerLooping: Boolean(p.timer_looping),
        timerDurationMinutes: p.timer_duration_minutes ? Number(p.timer_duration_minutes) : null,
        timerColor: p.timer_color || '#FFFFFF',
        clicks: clickEventsError ? (typeof p.clicks === 'number' ? p.clicks : 0) : (clickMap.get(String(p.id)) || 0),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      return res.status(200).json({
        success: true,
        products,
        tableConfigured: true,
      });
    } catch (err: any) {
      console.error('[Admin BestSellerProducts API] GET error:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao buscar produtos.' });
    }
  }

  // 3. POST: Criar produto OU reordenar ranking
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Ação de reordenação em lote
      if (body.action === 'reorder' || Array.isArray(body.productIds)) {
        const { listId, productIds } = body;
        if (!listId || !Array.isArray(productIds) || productIds.length === 0) {
          return res.status(400).json({ success: false, message: 'listId e array de productIds são obrigatórios para reordenação.' });
        }

        // Atualiza a posição de cada produto sequencialmente
        for (let i = 0; i < productIds.length; i++) {
          const prodId = productIds[i];
          const newPos = i + 1;
          const { error: updateErr } = await supabase
            .from('best_seller_products')
            .update({ position: newPos, updated_at: new Date().toISOString() })
            .eq('id', prodId)
            .eq('list_id', listId);

          if (updateErr) {
            console.error('[Admin BestSellerProducts API] Reorder error on item', prodId, updateErr);
          }
        }

        return res.status(200).json({ success: true, message: 'Ordem do ranking atualizada com sucesso.' });
      }

      // Criação individual de produto
      const {
        listId,
        name,
        category,
        description,
        imageUrl,
        imageUrls,
        mediaItems,
        itemType,
        videoAutoplay,
        videoLoop,
        videoControls,
        videoTitle,
        productUrl,
        originalPrice,
        promotionalPrice,
        soldQuantity,
        showSoldQuantity,
        availableQuantity,
        sizes,
        outOfStockSizes,
        colors,
        installmentsCount,
        installmentValue,
        badgeEnabled,
        badgeText,
        badgeColor,
        badgeUseListDefault,
        giftMode,
        giftImageUrl,
        giftImagePath,
        giftTitle,
        giftLabel,
        giftTextColor,
        giftImageSize,
        timerEnabled,
        timerEnd,
        timerLooping,
        timerDurationMinutes,
        timerColor,
      } = body;

      const cleanItemType: 'product' | 'video' = String(itemType || body.item_type) === 'video' ? 'video' : 'product';
      const cleanVideoTitle = videoTitle ? sanitizeText(String(videoTitle)).slice(0, 80) : null;
      const cleanName = sanitizeText(name) || (cleanItemType === 'video' ? (cleanVideoTitle || 'Vídeo destaque') : '');
      const cleanProductDescription = cleanItemType === 'product' && description
        ? sanitizeText(String(description)).slice(0, 220)
        : null;
      // Compatibilidade: a descrição breve do produto usa a coluna category, que já existe
      // em todos os bancos. Assim esta função não exige uma nova migração SQL.
      const cleanCategory = cleanItemType === 'video'
        ? (sanitizeText(category).slice(0, 260) || 'Vídeo')
        : (cleanProductDescription || 'Produto');
      const parsedOriginalPrice = parsePriceInput(originalPrice !== undefined ? originalPrice : body.original_price);
      const parsedPromotionalPrice = parsePriceInput(promotionalPrice !== undefined ? promotionalPrice : body.promotional_price);
      const rawInstallmentsCount = installmentsCount !== undefined ? installmentsCount : body.installments_count;
      const rawInstallmentValue = installmentValue !== undefined ? installmentValue : body.installment_value;
      const parsedInstallmentsCount = parseInstallmentsCount(rawInstallmentsCount);
      const parsedInstallmentValue = parsePriceInput(rawInstallmentValue);
      if ((rawInstallmentsCount !== undefined && rawInstallmentsCount !== null && rawInstallmentsCount !== '') && parsedInstallmentsCount === null) {
        return res.status(400).json({ success: false, message: 'Quantidade de parcelas deve ser um inteiro entre 1 e 36.' });
      }
      if ((rawInstallmentValue !== undefined && rawInstallmentValue !== null && rawInstallmentValue !== '') && parsedInstallmentValue === null) {
        return res.status(400).json({ success: false, message: 'Valor da parcela deve ser um número maior ou igual a zero.' });
      }
      if ((parsedInstallmentsCount === null) !== (parsedInstallmentValue === null)) {
        return res.status(400).json({ success: false, message: 'Informe quantidade de parcelas e valor da parcela juntos.' });
      }
      
      // Galeria unificada: imagens e vídeos compartilham a mesma ordem.
      let cleanMediaItems = normalizeMediaItems(mediaItems);
      if (cleanMediaItems.length === 0) {
        cleanMediaItems = mediaItemsFromLegacy(imageUrl, imageUrls);
      }

      const validImageUrls = cleanMediaItems.filter((item) => item.type === 'image').map((item) => item.url);
      const videoFallback = cleanMediaItems.find((item) => item.type === 'video');
      // Bancos antigos podem ter image_url NOT NULL. Para o bloco 9:16 usamos
      // a capa do vídeo (ou a própria URL) apenas como compatibilidade interna.
      const cleanImageUrl = validImageUrls[0] || (cleanItemType === 'video' ? (videoFallback?.posterUrl || videoFallback?.url || null) : null);
      const cleanProductUrl = productUrl ? String(productUrl).trim() : null;

      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Nome do produto é obrigatório.' });
      }
      if (cleanMediaItems.length === 0) {
        return res.status(400).json({ success: false, message: cleanItemType === 'video' ? 'Adicione um vídeo destaque.' : 'Adicione pelo menos uma imagem ou vídeo ao produto.' });
      }
      if (cleanItemType === 'video' && !cleanMediaItems.some((item) => item.type === 'video')) {
        return res.status(400).json({ success: false, message: 'O bloco de vídeo destaque precisa conter um vídeo.' });
      }
      if (cleanProductUrl && !isValidSafeUrl(cleanProductUrl)) {
        return res.status(400).json({ success: false, message: 'Link do produto contém protocolo inválido/inseguro.' });
      }

      // Validação de quantidades não negativas
      let parsedSold: number | null = null;
      if (soldQuantity !== undefined && soldQuantity !== null && soldQuantity !== '') {
        parsedSold = Number(soldQuantity);
        if (isNaN(parsedSold) || parsedSold < 0) {
          return res.status(400).json({ success: false, message: 'Quantidade vendida deve ser um número maior ou igual a zero.' });
        }
      }

      let parsedAvailable: number | null = null;
      if (availableQuantity !== undefined && availableQuantity !== null && availableQuantity !== '') {
        parsedAvailable = Number(availableQuantity);
        if (isNaN(parsedAvailable) || parsedAvailable < 0) {
          return res.status(400).json({ success: false, message: 'Quantidade disponível deve ser um número maior ou igual a zero.' });
        }
      }

      // Determina a próxima posição se não enviada
      let position = typeof body.position === 'number' && body.position > 0 ? body.position : null;
      if (!position) {
        const { data: existingProds } = await supabase
          .from('best_seller_products')
          .select('position')
          .eq('list_id', listId)
          .order('position', { ascending: false })
          .limit(1);

        const maxPos = existingProds && existingProds.length > 0 ? existingProds[0].position : 0;
        position = maxPos + 1;
      }

      const cleanSizes = normalizeSizeList(sizes);
      const cleanOutOfStockSizes = normalizeSizeList(outOfStockSizes).filter((size) => cleanSizes.includes(size));
      const cleanColors = Array.isArray(colors)
        ? colors.map((c) => sanitizeText(String(c))).filter(Boolean)
        : [];
      const isBadgeActive = Boolean(badgeEnabled);
      const cleanBadgeText = isBadgeActive && badgeText ? sanitizeText(String(badgeText)) : null;
      const cleanBadgeColor = normalizeHexColor(badgeColor);
      const useListBadge = Boolean(badgeUseListDefault);
      const cleanGiftMode = ['inherit', 'off', 'custom'].includes(String(giftMode)) ? String(giftMode) : 'inherit';
      const cleanGiftImageUrl = cleanGiftMode === 'custom' && giftImageUrl && isValidSafeUrl(String(giftImageUrl)) ? String(giftImageUrl).trim() : null;
      const cleanGiftImagePath = cleanGiftMode === 'custom' && giftImagePath && String(giftImagePath).startsWith('bestsellers/') ? String(giftImagePath).trim() : null;
      const cleanGiftTitle = cleanGiftMode === 'custom' && giftTitle ? sanitizeText(String(giftTitle)).slice(0, 50) : null;
      const cleanGiftLabel = cleanGiftMode === 'custom' && giftLabel ? sanitizeText(String(giftLabel)).slice(0, 40) : null;
      const cleanGiftTextColor = normalizeHexColor(giftTextColor);
      const cleanGiftImageSize = normalizeGiftImageSize(giftImageSize);
      if (cleanGiftMode === 'custom' && giftImageUrl && !cleanGiftImageUrl) {
        return res.status(400).json({ success: false, message: 'Imagem do presente é inválida.' });
      }
      const isProductTimerEnabled = Boolean(timerEnabled);
      const isProductTimerLooping = Boolean(isProductTimerEnabled && timerLooping);
      let cleanProductTimerEnd: string | null = null;
      let cleanProductTimerDuration: number | null = null;
      if (isProductTimerEnabled && isProductTimerLooping) {
        const duration = Number(timerDurationMinutes);
        if (!Number.isInteger(duration) || duration < 1 || duration > 10080) {
          return res.status(400).json({ success: false, message: 'Duração do timer do produto deve ficar entre 1 minuto e 7 dias.' });
        }
        cleanProductTimerDuration = duration;
      } else if (isProductTimerEnabled) {
        const parsedTimerEnd = new Date(timerEnd);
        if (!timerEnd || Number.isNaN(parsedTimerEnd.getTime())) {
          return res.status(400).json({ success: false, message: 'Informe uma data e hora válidas para o timer do produto.' });
        }
        cleanProductTimerEnd = parsedTimerEnd.toISOString();
      }
      const cleanProductTimerColor = normalizeHexColor(timerColor);

      const insertPayload: Record<string, any> = {
        list_id: listId,
        video_autoplay: Boolean(videoAutoplay),
        video_loop: videoLoop !== undefined ? Boolean(videoLoop) : true,
        video_controls: videoControls !== undefined ? Boolean(videoControls) : true,
        library_product_id: body.libraryProductId || body.library_product_id || null,
        position,
        name: cleanName,
        category: cleanCategory,
        image_url: cleanImageUrl,
        image_urls: validImageUrls,
        media_items: cleanMediaItems,
        product_url: cleanProductUrl,
        original_price: parsedOriginalPrice,
        promotional_price: parsedPromotionalPrice,
        sold_quantity: parsedSold,
        show_sold_quantity: showSoldQuantity !== undefined ? Boolean(showSoldQuantity) : true,
        available_quantity: parsedAvailable,
        sizes: cleanSizes,
        out_of_stock_sizes: cleanOutOfStockSizes,
        colors: cleanItemType === 'video' ? videoLegacyMarkers(videoAutoplay, videoLoop, videoControls) : cleanColors,
        installments_count: parsedInstallmentsCount,
        installment_value: parsedInstallmentValue,
        badge_enabled: isBadgeActive,
        badge_text: cleanBadgeText,
        badge_color: cleanBadgeColor,
        badge_use_list_default: useListBadge,
        gift_mode: cleanGiftMode,
        gift_image_url: cleanGiftImageUrl,
        gift_image_path: cleanGiftImagePath,
        gift_title: cleanGiftTitle,
        gift_label: cleanGiftLabel,
        gift_text_color: cleanGiftTextColor,
        gift_image_size: cleanGiftImageSize,
        timer_enabled: isProductTimerEnabled,
        timer_end: isProductTimerEnabled && !isProductTimerLooping ? cleanProductTimerEnd : null,
        timer_looping: isProductTimerLooping,
        timer_duration_minutes: isProductTimerLooping ? cleanProductTimerDuration : null,
        timer_color: cleanProductTimerColor,
        clicks: 0,
      };

      // item_type/video_title são opcionais para manter compatibilidade com bancos
      // que ainda não receberam a migração do Vídeo Destaque. Produto normal não
      // precisa gravar item_type='product': esse é o comportamento padrão.
      if (cleanItemType === 'video') {
        insertPayload.item_type = 'video';
        insertPayload.video_title = cleanVideoTitle;
      }

      const legacyVideoColors = colorsWithLegacyVideoState(
        cleanItemType === 'video' ? [] : cleanColors,
        cleanItemType,
        videoAutoplay,
        videoLoop,
        videoControls,
      );

      let { data, error } = await supabase
        .from('best_seller_products')
        .insert(insertPayload)
        .select()
        .single();

      // Compatibilidade progressiva com schemas antigos. O PostgREST informa
      // uma coluna ausente por vez; removemos apenas a coluna incompatível e
      // tentamos novamente. Os flags de vídeo ficam preservados em `colors`
      // como metadados internos quando as colunas video_* não existem.
      if (error && isVideoSchemaCompatibilityError(error)) {
        const compatiblePayload = { ...insertPayload };
        for (let attempt = 0; attempt < 5 && error && isVideoSchemaCompatibilityError(error); attempt += 1) {
          const changed = stripUnsupportedVideoSchemaField(compatiblePayload, error, legacyVideoColors);
          if (!changed) break;
          ({ data, error } = await supabase
            .from('best_seller_products')
            .insert(compatiblePayload)
            .select()
            .single());
        }
      }

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({
            success: false,
            tableConfigured: false,
            error: 'TABLE_NOT_CONFIGURED',
            message: 'Tabela best_seller_products não encontrada no Supabase.',
          });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      const syncedLibraryId = await syncProductToLibrary(supabase, data);

      const created: BestSellerProduct = {
        id: data.id,
        itemType: readVideoFlags(data).itemType,
        libraryProductId: syncedLibraryId || data.library_product_id || null,
        listId: data.list_id,
        position: data.position,
        name: data.name,
        category: data.category,
        description: readProductDescription(data),
        imageUrl: data.image_url,
        imageUrls: Array.isArray(data.image_urls) ? data.image_urls : validImageUrls,
        mediaItems: normalizeMediaItems(data.media_items).length > 0 ? normalizeMediaItems(data.media_items) : cleanMediaItems,
        videoAutoplay: readVideoFlags(data).autoplay,
        videoLoop: readVideoFlags(data).loop,
        videoControls: readVideoFlags(data).controls,
        videoTitle: readVideoFlags(data).title,
        productUrl: data.product_url || null,
        originalPrice: data.original_price !== null && data.original_price !== undefined ? Number(data.original_price) : null,
        promotionalPrice: data.promotional_price !== null && data.promotional_price !== undefined ? Number(data.promotional_price) : null,
        soldQuantity: data.sold_quantity ?? null,
        showSoldQuantity: data.show_sold_quantity ?? true,
        availableQuantity: data.available_quantity ?? null,
        sizes: normalizeSizeList(data.sizes),
        outOfStockSizes: normalizeSizeList(data.out_of_stock_sizes),
        colors: visibleProductColors(data.colors),
        installmentsCount: data.installments_count ?? null,
        installmentValue: data.installment_value !== null && data.installment_value !== undefined ? Number(data.installment_value) : null,
        badgeEnabled: Boolean(data.badge_enabled),
        badgeText: data.badge_text || null,
        badgeColor: data.badge_color || '#FFFFFF',
        badgeUseListDefault: Boolean(data.badge_use_list_default),
        giftMode: ['inherit', 'off', 'custom'].includes(String(data.gift_mode)) ? data.gift_mode : 'inherit',
        giftImageUrl: data.gift_image_url || null,
        giftImagePath: data.gift_image_path || null,
        giftTitle: data.gift_title || null,
        giftLabel: data.gift_label ?? null,
        giftTextColor: data.gift_text_color || '#FFFFFF',
        giftImageSize: normalizeGiftImageSize(data.gift_image_size),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ? Number(data.timer_duration_minutes) : null,
        timerColor: data.timer_color || '#FFFFFF',
        clicks: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return res.status(201).json({
        success: true,
        product: created,
      });
    } catch (err: any) {
      console.error('[Admin BestSellerProducts API] POST error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao criar produto.' });
    }
  }

  // 4. PUT / PATCH: Atualizar produto existente
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const id = body.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do produto é obrigatório para atualização.' });
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) {
        const cleanName = sanitizeText(body.name);
        if (!cleanName) {
          return res.status(400).json({ success: false, message: 'Nome não pode ser vazio.' });
        }
        updates.name = cleanName;
      }

      if (body.category !== undefined) {
        const cleanCat = sanitizeText(body.category);
        if (!cleanCat) {
          return res.status(400).json({ success: false, message: 'Categoria não pode ser vazia.' });
        }
        updates.category = cleanCat;
      }

      if ((body.itemType !== undefined || body.item_type !== undefined) && String(body.itemType ?? body.item_type) === 'video') {
        updates.item_type = 'video';
      }
      if (body.videoAutoplay !== undefined) updates.video_autoplay = Boolean(body.videoAutoplay);
      if (body.videoLoop !== undefined) updates.video_loop = Boolean(body.videoLoop);
      if (body.videoControls !== undefined) updates.video_controls = Boolean(body.videoControls);
      if (body.videoTitle !== undefined) updates.video_title = body.videoTitle ? sanitizeText(String(body.videoTitle)).slice(0, 80) : null;

      if (body.mediaItems !== undefined) {
        const cleanMedia = normalizeMediaItems(body.mediaItems);
        const requestedItemType = String(body.itemType ?? body.item_type ?? updates.item_type ?? 'product') === 'video' ? 'video' : 'product';
        if (cleanMedia.length === 0) {
          return res.status(400).json({ success: false, message: requestedItemType === 'video' ? 'Adicione um vídeo destaque.' : 'Adicione pelo menos uma imagem ou vídeo ao produto.' });
        }
        if (requestedItemType === 'video' && !cleanMedia.some((item) => item.type === 'video')) {
          return res.status(400).json({ success: false, message: 'O bloco de vídeo destaque precisa conter um vídeo.' });
        }
        const imageOnlyUrls = cleanMedia.filter((item) => item.type === 'image').map((item) => item.url);
        const videoFallback = cleanMedia.find((item) => item.type === 'video');
        updates.media_items = cleanMedia;
        updates.image_urls = imageOnlyUrls;
        updates.image_url = imageOnlyUrls[0] || (requestedItemType === 'video' ? (videoFallback?.posterUrl || videoFallback?.url || null) : null);
      } else {
        if (body.imageUrls !== undefined && Array.isArray(body.imageUrls)) {
          const cleanUrls = body.imageUrls
            .map((url: any) => String(url).trim())
            .filter((url: string) => isValidSafeUrl(url));
          updates.image_urls = cleanUrls;
          if (cleanUrls.length > 0 && body.imageUrl === undefined) updates.image_url = cleanUrls[0];
        }
        if (body.imageUrl !== undefined) {
          const cleanImg = body.imageUrl ? String(body.imageUrl).trim() : '';
          if (cleanImg && !isValidSafeUrl(cleanImg)) {
            return res.status(400).json({ success: false, message: 'URL da imagem é inválida ou insegura.' });
          }
          updates.image_url = cleanImg || null;
        }
      }

      if (body.badgeColor !== undefined) {
        updates.badge_color = normalizeHexColor(body.badgeColor);
      }
      if (body.badgeUseListDefault !== undefined) updates.badge_use_list_default = Boolean(body.badgeUseListDefault);
      if (body.giftMode !== undefined) {
        const mode = ['inherit', 'off', 'custom'].includes(String(body.giftMode)) ? String(body.giftMode) : 'inherit';
        updates.gift_mode = mode;
        if (mode !== 'custom') {
          updates.gift_image_url = null;
          updates.gift_image_path = null;
          updates.gift_title = null;
          updates.gift_label = null;
          updates.gift_text_color = '#FFFFFF';
          updates.gift_image_size = 48;
        }
      }
      if (body.giftImageUrl !== undefined) {
        const url = body.giftImageUrl ? String(body.giftImageUrl).trim() : '';
        if (url && !isValidSafeUrl(url)) return res.status(400).json({ success: false, message: 'Imagem do presente é inválida.' });
        updates.gift_image_url = url || null;
      }
      if (body.giftImagePath !== undefined) {
        const path = body.giftImagePath ? String(body.giftImagePath).trim() : '';
        updates.gift_image_path = path.startsWith('bestsellers/') ? path : null;
      }
      if (body.giftTitle !== undefined) updates.gift_title = body.giftTitle ? sanitizeText(String(body.giftTitle)).slice(0, 50) : null;
      if (body.giftLabel !== undefined) updates.gift_label = body.giftLabel ? sanitizeText(String(body.giftLabel)).slice(0, 40) : null;
      if (body.giftTextColor !== undefined) updates.gift_text_color = normalizeHexColor(body.giftTextColor);
      if (body.giftImageSize !== undefined) updates.gift_image_size = normalizeGiftImageSize(body.giftImageSize);

      if (body.timerEnabled !== undefined || body.timerLooping !== undefined || body.timerEnd !== undefined || body.timerDurationMinutes !== undefined || body.timerColor !== undefined) {
        const enabled = body.timerEnabled !== undefined ? Boolean(body.timerEnabled) : undefined;
        const looping = body.timerLooping !== undefined ? Boolean(body.timerLooping) : undefined;
        if (enabled !== undefined) updates.timer_enabled = enabled;
        if (looping !== undefined) updates.timer_looping = Boolean((enabled ?? true) && looping);
        if (body.timerColor !== undefined) updates.timer_color = normalizeHexColor(body.timerColor);

        const effectiveEnabled = enabled !== undefined ? enabled : true;
        const effectiveLooping = looping !== undefined ? looping : false;
        if (enabled === false) {
          updates.timer_end = null;
          updates.timer_looping = false;
          updates.timer_duration_minutes = null;
        } else if (effectiveEnabled && effectiveLooping) {
          const duration = Number(body.timerDurationMinutes);
          if (!Number.isInteger(duration) || duration < 1 || duration > 10080) {
            return res.status(400).json({ success: false, message: 'Duração do timer do produto deve ficar entre 1 minuto e 7 dias.' });
          }
          updates.timer_duration_minutes = duration;
          updates.timer_end = null;
        } else if (effectiveEnabled && (body.timerEnd !== undefined || enabled === true)) {
          const parsedTimerEnd = new Date(body.timerEnd);
          if (!body.timerEnd || Number.isNaN(parsedTimerEnd.getTime())) {
            return res.status(400).json({ success: false, message: 'Informe uma data e hora válidas para o timer do produto.' });
          }
          updates.timer_end = parsedTimerEnd.toISOString();
          updates.timer_duration_minutes = null;
          updates.timer_looping = false;
        }
      }

      if (body.productUrl !== undefined) {
        if (body.productUrl) {
          const cleanPUrl = String(body.productUrl).trim();
          if (!isValidSafeUrl(cleanPUrl)) {
            return res.status(400).json({ success: false, message: 'Link do produto contém protocolo inválido.' });
          }
          updates.product_url = cleanPUrl;
        } else {
          updates.product_url = null;
        }
      }

      if (body.originalPrice !== undefined || body.original_price !== undefined) {
        const val = body.originalPrice !== undefined ? body.originalPrice : body.original_price;
        updates.original_price = parsePriceInput(val);
      }

      if (body.promotionalPrice !== undefined || body.promotional_price !== undefined) {
        const val = body.promotionalPrice !== undefined ? body.promotionalPrice : body.promotional_price;
        updates.promotional_price = parsePriceInput(val);
      }

      if (body.soldQuantity !== undefined) {
        if (body.soldQuantity === null || body.soldQuantity === '') {
          updates.sold_quantity = null;
        } else {
          const num = Number(body.soldQuantity);
          if (isNaN(num) || num < 0) {
            return res.status(400).json({ success: false, message: 'Quantidade vendida não pode ser negativa.' });
          }
          updates.sold_quantity = num;
        }
      }

      if (body.showSoldQuantity !== undefined) {
        updates.show_sold_quantity = Boolean(body.showSoldQuantity);
      }

      if (body.availableQuantity !== undefined) {
        if (body.availableQuantity === null || body.availableQuantity === '') {
          updates.available_quantity = null;
        } else {
          const num = Number(body.availableQuantity);
          if (isNaN(num) || num < 0) {
            return res.status(400).json({ success: false, message: 'Quantidade disponível não pode ser negativa.' });
          }
          updates.available_quantity = num;
        }
      }

      if (body.sizes !== undefined) {
        updates.sizes = normalizeSizeList(body.sizes);
      }

      if (body.outOfStockSizes !== undefined) {
        const knownSizes = body.sizes !== undefined ? normalizeSizeList(body.sizes) : null;
        const out = normalizeSizeList(body.outOfStockSizes);
        updates.out_of_stock_sizes = knownSizes ? out.filter((size) => knownSizes.includes(size)) : out;
      }

      if (body.installmentsCount !== undefined || body.installments_count !== undefined) {
        const raw = body.installmentsCount !== undefined ? body.installmentsCount : body.installments_count;
        if (raw === null || raw === '') updates.installments_count = null;
        else {
          const parsed = parseInstallmentsCount(raw);
          if (parsed === null) return res.status(400).json({ success: false, message: 'Quantidade de parcelas deve ser um inteiro entre 1 e 36.' });
          updates.installments_count = parsed;
        }
      }

      if (body.installmentValue !== undefined || body.installment_value !== undefined) {
        const raw = body.installmentValue !== undefined ? body.installmentValue : body.installment_value;
        updates.installment_value = parsePriceInput(raw);
      }

      if (body.colors !== undefined) {
        updates.colors = Array.isArray(body.colors)
          ? body.colors.map((c: any) => sanitizeText(String(c))).filter(Boolean)
          : [];
      }

      if (body.badgeEnabled !== undefined) {
        const isBadge = Boolean(body.badgeEnabled);
        updates.badge_enabled = isBadge;
        if (!isBadge) {
          updates.badge_text = null;
        } else if (body.badgeText !== undefined) {
          updates.badge_text = body.badgeText ? sanitizeText(String(body.badgeText)) : null;
        }
      } else if (body.badgeText !== undefined) {
        updates.badge_text = body.badgeText ? sanitizeText(String(body.badgeText)) : null;
      }

      if (body.position !== undefined && typeof body.position === 'number') {
        updates.position = body.position;
      }

      const updatingVideoBlock = String(body.itemType ?? body.item_type ?? '') === 'video';
      if (updatingVideoBlock) {
        // Em blocos de vídeo, category funciona como descrição editorial opcional.
        // O marcador em colors mantém a compatibilidade com bancos antigos.
        if (body.category !== undefined) {
          updates.category = sanitizeText(body.category).slice(0, 260) || 'Vídeo';
        } else if (!updates.category) {
          updates.category = 'Vídeo';
        }
        updates.colors = videoLegacyMarkers(body.videoAutoplay, body.videoLoop, body.videoControls);
      }

      if (!updatingVideoBlock && body.description !== undefined) {
        const cleanDescription = body.description
          ? sanitizeText(String(body.description)).slice(0, 220)
          : '';
        updates.category = cleanDescription || 'Produto';
      }

      const requestedItemTypeForCompat: 'product' | 'video' = updatingVideoBlock ? 'video' : 'product';
      const updateBaseColors = Array.isArray(updates.colors)
        ? updates.colors
        : (Array.isArray(body.colors) ? body.colors : []);
      const legacyUpdateColors = colorsWithLegacyVideoState(
        requestedItemTypeForCompat === 'video' ? [] : updateBaseColors,
        requestedItemTypeForCompat,
        body.videoAutoplay,
        body.videoLoop,
        body.videoControls,
      );

      let { data, error } = await supabase
        .from('best_seller_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error && isVideoSchemaCompatibilityError(error)) {
        const compatibleUpdates = { ...updates };
        for (let attempt = 0; attempt < 5 && error && isVideoSchemaCompatibilityError(error); attempt += 1) {
          const changed = stripUnsupportedVideoSchemaField(compatibleUpdates, error, legacyUpdateColors);
          if (!changed) break;
          ({ data, error } = await supabase
            .from('best_seller_products')
            .update(compatibleUpdates)
            .eq('id', id)
            .select()
            .single());
        }
      }

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({ success: false, tableConfigured: false, message: 'Tabela não encontrada.' });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      const syncedLibraryId = await syncProductToLibrary(supabase, data);

      const updated: BestSellerProduct = {
        id: data.id,
        itemType: readVideoFlags(data).itemType,
        libraryProductId: syncedLibraryId || data.library_product_id || null,
        listId: data.list_id,
        position: data.position,
        name: data.name,
        category: data.category,
        description: readProductDescription(data),
        imageUrl: data.image_url,
        imageUrls: Array.isArray(data.image_urls) ? data.image_urls : [],
        mediaItems: normalizeMediaItems(data.media_items).length > 0 ? normalizeMediaItems(data.media_items) : mediaItemsFromLegacy(data.image_url, data.image_urls),
        videoAutoplay: readVideoFlags(data).autoplay,
        videoLoop: readVideoFlags(data).loop,
        videoControls: readVideoFlags(data).controls,
        videoTitle: readVideoFlags(data).title,
        productUrl: data.product_url || null,
        originalPrice: data.original_price !== null && data.original_price !== undefined ? Number(data.original_price) : null,
        promotionalPrice: data.promotional_price !== null && data.promotional_price !== undefined ? Number(data.promotional_price) : null,
        soldQuantity: data.sold_quantity ?? null,
        showSoldQuantity: data.show_sold_quantity ?? true,
        availableQuantity: data.available_quantity ?? null,
        sizes: normalizeSizeList(data.sizes),
        outOfStockSizes: normalizeSizeList(data.out_of_stock_sizes),
        colors: visibleProductColors(data.colors),
        installmentsCount: data.installments_count ?? null,
        installmentValue: data.installment_value !== null && data.installment_value !== undefined ? Number(data.installment_value) : null,
        badgeEnabled: Boolean(data.badge_enabled),
        badgeText: data.badge_text || null,
        badgeColor: data.badge_color || '#FFFFFF',
        badgeUseListDefault: Boolean(data.badge_use_list_default),
        giftMode: ['inherit', 'off', 'custom'].includes(String(data.gift_mode)) ? data.gift_mode : 'inherit',
        giftImageUrl: data.gift_image_url || null,
        giftImagePath: data.gift_image_path || null,
        giftTitle: data.gift_title || null,
        giftLabel: data.gift_label ?? null,
        giftTextColor: data.gift_text_color || '#FFFFFF',
        giftImageSize: normalizeGiftImageSize(data.gift_image_size),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timerLooping: Boolean(data.timer_looping),
        timerDurationMinutes: data.timer_duration_minutes ? Number(data.timer_duration_minutes) : null,
        timerColor: data.timer_color || '#FFFFFF',
        clicks: typeof data.clicks === 'number' ? data.clicks : 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return res.status(200).json({
        success: true,
        product: updated,
      });
    } catch (err: any) {
      console.error('[Admin BestSellerProducts API] PUT error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao atualizar produto.' });
    }
  }

  // 5. DELETE: Excluir produto individual com reordenação sequencial dos restantes
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const id = req.query?.id || url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do produto é obrigatório para exclusão.' });
      }

      // 1. Busca produto para descobrir a list_id
      const { data: prodData } = await supabase
        .from('best_seller_products')
        .select('id, list_id')
        .eq('id', id)
        .maybeSingle();

      const listId = prodData?.list_id;

      // 2. Deleta o produto
      const { error } = await supabase
        .from('best_seller_products')
        .delete()
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({ success: false, tableConfigured: false, message: 'Tabela não encontrada.' });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      // 3. Reordena produtos restantes da mesma lista para manter posições sequenciais 1..N
      if (listId) {
        const { data: remainingProds } = await supabase
          .from('best_seller_products')
          .select('id, position')
          .eq('list_id', listId)
          .order('position', { ascending: true });

        if (remainingProds && remainingProds.length > 0) {
          for (let i = 0; i < remainingProds.length; i++) {
            const expectedPos = i + 1;
            if (remainingProds[i].position !== expectedPos) {
              await supabase
                .from('best_seller_products')
                .update({ position: expectedPos, updated_at: new Date().toISOString() })
                .eq('id', remainingProds[i].id);
            }
          }
        }
      }

      return res.status(200).json({ success: true, message: 'Produto excluído e ranking reordenado com sucesso.' });
    } catch (err: any) {
      console.error('[Admin BestSellerProducts API] DELETE error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao excluir produto.' });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
