import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerAnalyticsSummary } from '../../src/types/zhaya.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_REGEX = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_ENGAGEMENT_SECONDS = 31_536_000;
const MAX_PRODUCT_SECONDS = 2_592_000; // 30 dias por visitante/produto.

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isAnalyticsMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return code === '42P01' || code === 'PGRST202'
    || msg.includes('best_seller_analytics_events')
    || msg.includes('best_seller_visitor_sessions')
    || msg.includes('best_seller_product_behavior')
    || msg.includes('upsert_best_seller_visitor_session')
    || msg.includes('upsert_best_seller_product_behavior')
    || msg.includes('could not find the table') || msg.includes('could not find the function') || msg.includes('schema cache');
}

function cleanHeader(value: unknown, max = 120): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let cleaned = value.trim();
  try { cleaned = decodeURIComponent(cleaned); } catch { /* keep raw */ }
  return cleaned.slice(0, max);
}

function detectDeviceType(userAgentRaw: unknown): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const ua = String(userAgentRaw || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|kindle|silk|playbook/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return 'tablet';
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function getRequestContext(req: any) {
  return {
    deviceType: detectDeviceType(req.headers?.['user-agent']),
    countryCode: cleanHeader(req.headers?.['x-vercel-ip-country'], 8),
    region: cleanHeader(req.headers?.['x-vercel-ip-country-region'], 80),
    city: cleanHeader(req.headers?.['x-vercel-ip-city'], 120),
  };
}

function emptyHours() { return Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0 })); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
function normalizedSlides(value: any): number[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from(new Set(source.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 0 && v < 64))).sort((a, b) => a - b);
}

function emptySummary(listId: string, configured: boolean, products: Array<{ id: string; name: string; position?: number }> = []): BestSellerAnalyticsSummary {
  return {
    configured,
    engagementConfigured: configured,
    listId,
    pageViews: 0,
    uniqueVisitors: 0,
    totalClicks: 0,
    totalPlays: 0,
    averageEngagementSeconds: 0,
    medianEngagementSeconds: 0,
    totalEngagementSeconds: 0,
    reachedLastProductVisitors: 0,
    reachedLastProductRate: 0,
    viewedAllProductsVisitors: 0,
    viewedAllProductsRate: 0,
    galleryExplorersVisitors: 0,
    galleryExplorersRate: 0,
    videoToClickVisitors: 0,
    videoToClickRate: 0,
    devices: [], locations: [], hourlyVisitors: emptyHours(),
    products: products.map((p) => ({ productId: p.id, name: p.name, position: p.position, clicks: 0, plays: 0, viewers: 0, averageAttentionSeconds: 0, totalAttentionSeconds: 0, galleryCompletedVisitors: 0, galleryCompletedRate: 0, dropOffs: 0 })),
  };
}

function getHourInTimezone(value: string | null | undefined, timezone: string): number | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch { return null; }
}

function buildUniqueFallbackSessions(pageViews: any[]) {
  const byVisitor = new Map<string, any>();
  const sorted = [...pageViews].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  for (const event of sorted) {
    if (String(event?.device_type || '') === 'desktop') continue;
    const visitorId = String(event?.visitor_id || '');
    if (!visitorId || byVisitor.has(visitorId)) continue;
    byVisitor.set(visitorId, { visitor_id: visitorId, device_type: event?.device_type || 'unknown', country_code: event?.country_code || null, region: event?.region || null, city: event?.city || null, first_seen_at: event?.created_at || null, last_seen_at: event?.created_at || null, engaged_seconds: 0 });
  }
  return Array.from(byVisitor.values());
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (req.method === 'POST') return res.status(200).json({ success: true, recorded: false });
    return res.status(500).json({ success: false, error: 'SUPABASE_NOT_CONFIGURED' });
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      body = body || {};
      const eventType = String(body.eventType || '').trim();
      const listId = String(body.listId || '').trim();
      const productId = body.productId ? String(body.productId).trim() : null;
      const visitorId = String(body.visitorId || '').trim();

      if (!['page_view', 'product_play', 'engagement', 'product_behavior'].includes(eventType)) return res.status(400).json({ success: false, message: 'Evento inválido.' });
      if (!UUID_REGEX.test(listId)) return res.status(400).json({ success: false, message: 'Lista inválida.' });
      if ((eventType === 'product_play' || eventType === 'product_behavior') && (!productId || !UUID_REGEX.test(productId))) return res.status(400).json({ success: false, message: 'Produto inválido.' });
      if (!VISITOR_REGEX.test(visitorId)) return res.status(400).json({ success: false, message: 'Visitante inválido.' });

      const context = getRequestContext(req);
      // A Vitrine é pensada para tráfego mobile. Desktop é usado internamente e não entra em nenhuma métrica.
      if (context.deviceType === 'desktop') return res.status(200).json({ success: true, recorded: false, ignoredDevice: 'desktop' });
      const referrer = typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.trim().slice(0, 500) : null;

      if (eventType === 'page_view' || eventType === 'engagement') {
        const rawSeconds = Number(body.engagedSecondsTotal || 0);
        const engagedSecondsTotal = eventType === 'engagement' ? Math.max(0, Math.min(MAX_ENGAGEMENT_SECONDS, Number.isFinite(rawSeconds) ? Math.floor(rawSeconds) : 0)) : 0;
        const { error } = await supabase.rpc('upsert_best_seller_visitor_session', {
          p_list_id: listId, p_visitor_id: visitorId, p_engaged_seconds_total: engagedSecondsTotal,
          p_device_type: context.deviceType, p_country_code: context.countryCode, p_region: context.region, p_city: context.city, p_referrer: referrer,
        });
        if (error) {
          if (isAnalyticsMissingError(error)) return res.status(200).json({ success: true, recorded: false, configured: false });
          console.warn('[BestSeller Analytics] sessão:', error.message);
          return res.status(200).json({ success: true, recorded: false });
        }
        return res.status(200).json({ success: true, recorded: true });
      }

      if (eventType === 'product_behavior') {
        const rawVisible = Number(body.visibleSecondsTotal || 0);
        const visibleSeconds = Math.max(0, Math.min(MAX_PRODUCT_SECONDS, Number.isFinite(rawVisible) ? Math.floor(rawVisible) : 0));
        const slidesSeen = normalizedSlides(body.slidesSeen);
        const slideCount = Math.max(0, Math.min(64, Math.floor(Number(body.slideCount || 0))));
        const { error } = await supabase.rpc('upsert_best_seller_product_behavior', {
          p_list_id: listId,
          p_product_id: productId,
          p_visitor_id: visitorId,
          p_visible_seconds_total: visibleSeconds,
          p_seen: Boolean(body.seen),
          p_slides_seen: slidesSeen,
          p_slide_count: slideCount,
        });
        if (error) {
          if (isAnalyticsMissingError(error)) return res.status(200).json({ success: true, recorded: false, configured: false });
          console.warn('[BestSeller Analytics] comportamento:', error.message);
          return res.status(200).json({ success: true, recorded: false });
        }
        return res.status(200).json({ success: true, recorded: true });
      }

      const { error } = await supabase.from('best_seller_analytics_events').insert({
        list_id: listId, product_id: productId, event_type: eventType, visitor_id: visitorId,
        device_type: context.deviceType, country_code: context.countryCode, region: context.region, city: context.city, referrer,
      });
      if (error) {
        if (isAnalyticsMissingError(error)) return res.status(200).json({ success: true, recorded: false, configured: false });
        console.warn('[BestSeller Analytics] evento:', error.message);
        return res.status(200).json({ success: true, recorded: false });
      }
      return res.status(200).json({ success: true, recorded: true });
    } catch (err: any) {
      console.warn('[BestSeller Analytics] POST:', err?.message || err);
      return res.status(200).json({ success: true, recorded: false });
    }
  }

  if (req.method === 'GET') {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
    const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const listId = String(req.query?.listId || requestUrl.searchParams.get('listId') || '').trim();
    if (!UUID_REGEX.test(listId)) return res.status(400).json({ success: false, message: 'Lista inválida.' });

    try {
      const [{ data: productsData }, { data: listRow }] = await Promise.all([
        supabase.from('best_seller_products').select('id, name, position, colors').eq('list_id', listId).order('position', { ascending: true }),
        supabase.from('best_seller_lists').select('timezone').eq('id', listId).maybeSingle(),
      ]);
      const products = (productsData || [])
        .filter((p: any) => !Array.isArray(p?.colors) || !p.colors.map((value: any) => String(value)).includes('__ZHAYA_VIDEO_9X16__'))
        .map((p: any) => ({ id: p.id, name: p.name || 'Produto', position: Number(p.position || 0) }));
      const timezone = String((listRow as any)?.timezone || 'America/Sao_Paulo');

      const { data: eventsData, error: eventsError } = await supabase
        .from('best_seller_analytics_events')
        .select('event_type, visitor_id, product_id, device_type, country_code, region, city, created_at')
        .eq('list_id', listId)
        .in('event_type', ['product_play', 'product_click'])
        .order('created_at', { ascending: true })
        .limit(30000);
      if (eventsError && !isAnalyticsMissingError(eventsError)) return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: eventsError.message });
      const actionEvents = (eventsData || []).filter((event: any) => String(event?.device_type || '') !== 'desktop');
      const plays = actionEvents.filter((event: any) => event.event_type === 'product_play');
      const clicks = actionEvents.filter((event: any) => event.event_type === 'product_click');

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('best_seller_visitor_sessions')
        .select('visitor_id, device_type, country_code, region, city, first_seen_at, last_seen_at, engaged_seconds')
        .eq('list_id', listId)
        .order('first_seen_at', { ascending: true })
        .limit(30000);
      let sessions: any[] = (sessionsData || []).filter((row: any) => String(row?.device_type || '') !== 'desktop');
      let engagementConfigured = true;
      if (sessionsError) {
        if (!isAnalyticsMissingError(sessionsError)) return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: sessionsError.message });
        engagementConfigured = false;
        const { data: legacyPageViews, error: legacyError } = await supabase
          .from('best_seller_analytics_events').select('visitor_id, device_type, country_code, region, city, created_at')
          .eq('list_id', listId).eq('event_type', 'page_view').order('created_at', { ascending: true }).limit(30000);
        if (legacyError) {
          if (isAnalyticsMissingError(legacyError)) return res.status(200).json({ success: true, analytics: emptySummary(listId, false, products) });
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: legacyError.message });
        }
        sessions = buildUniqueFallbackSessions(legacyPageViews || []);
      }

      const { data: behaviorData, error: behaviorError } = await supabase
        .from('best_seller_product_behavior')
        .select('visitor_id, product_id, seen, visible_seconds, slides_seen, slide_count')
        .eq('list_id', listId)
        .limit(50000);
      const behaviorRows = behaviorError && isAnalyticsMissingError(behaviorError) ? [] : (behaviorData || []);
      if (behaviorError && !isAnalyticsMissingError(behaviorError)) return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: behaviorError.message });

      const uniqueVisitors = sessions.length;
      const engagementValues = sessions.map((s: any) => Math.max(0, Number(s.engaged_seconds || 0)));
      const totalEngagementSeconds = engagementValues.reduce((a, b) => a + b, 0);
      const averageEngagementSeconds = uniqueVisitors ? Math.round(totalEngagementSeconds / uniqueVisitors) : 0;
      const medianEngagementSeconds = median(engagementValues);

      const deviceMap = new Map<string, number>();
      for (const session of sessions) {
        const key = String(session?.device_type || 'unknown');
        deviceMap.set(key, (deviceMap.get(key) || 0) + 1);
      }
      const devices = Array.from(deviceMap.entries()).map(([deviceType, count]) => ({ deviceType, count })).sort((a, b) => b.count - a.count);

      const locationMap = new Map<string, { countryCode: string | null; region: string | null; city: string | null; count: number; clicks: number }>();
      for (const session of sessions) {
        const countryCode = session?.country_code || null; const region = session?.region || null; const city = session?.city || null;
        const key = `${countryCode || ''}|${region || ''}|${city || ''}`;
        const current = locationMap.get(key) || { countryCode, region, city, count: 0, clicks: 0 };
        current.count += 1; locationMap.set(key, current);
      }
      for (const event of clicks) {
        const countryCode = event?.country_code || null; const region = event?.region || null; const city = event?.city || null;
        const key = `${countryCode || ''}|${region || ''}|${city || ''}`;
        const current = locationMap.get(key) || { countryCode, region, city, count: 0, clicks: 0 };
        current.clicks += 1; locationMap.set(key, current);
      }
      const locations = Array.from(locationMap.values()).sort((a, b) => (b.clicks - a.clicks) || (b.count - a.count));

      const hourlyVisitors = emptyHours();
      for (const session of sessions) {
        const hour = getHourInTimezone(session?.first_seen_at, timezone);
        if (hour !== null) hourlyVisitors[hour].visitors += 1;
      }

      const clickCountByProduct = new Map<string, number>();
      clicks.forEach((e: any) => { const id = String(e.product_id || ''); if (id) clickCountByProduct.set(id, (clickCountByProduct.get(id) || 0) + 1); });
      const playVisitorsByProduct = new Map<string, Set<string>>();
      plays.forEach((e: any) => {
        const id = String(e.product_id || ''); const visitor = String(e.visitor_id || ''); if (!id || !visitor) return;
        if (!playVisitorsByProduct.has(id)) playVisitorsByProduct.set(id, new Set());
        playVisitorsByProduct.get(id)!.add(visitor);
      });

      const behaviorByProduct = new Map<string, any[]>();
      const productsSeenByVisitor = new Map<string, Set<string>>();
      const galleryExplorerVisitors = new Set<string>();
      for (const row of behaviorRows as any[]) {
        const productId = String(row.product_id || ''); const visitorId = String(row.visitor_id || '');
        if (!productId || !visitorId) continue;
        if (!behaviorByProduct.has(productId)) behaviorByProduct.set(productId, []);
        behaviorByProduct.get(productId)!.push(row);
        if (row.seen) {
          if (!productsSeenByVisitor.has(visitorId)) productsSeenByVisitor.set(visitorId, new Set());
          productsSeenByVisitor.get(visitorId)!.add(productId);
        }
        if (normalizedSlides(row.slides_seen).length >= 2) galleryExplorerVisitors.add(visitorId);
      }

      const lastProduct = [...products].sort((a, b) => b.position - a.position)[0];
      const reachedLastVisitors = new Set<string>();
      const viewedAllVisitors = new Set<string>();
      const dropOffByProduct = new Map<string, number>();
      productsSeenByVisitor.forEach((set, visitorId) => {
        if (lastProduct && set.has(lastProduct.id)) reachedLastVisitors.add(visitorId);
        if (products.length > 0 && products.every((p) => set.has(p.id))) viewedAllVisitors.add(visitorId);
        let maxProduct: { id: string; position: number } | null = null;
        for (const product of products) if (set.has(product.id) && (!maxProduct || product.position > maxProduct.position)) maxProduct = product;
        if (maxProduct && lastProduct && maxProduct.id !== lastProduct.id) dropOffByProduct.set(maxProduct.id, (dropOffByProduct.get(maxProduct.id) || 0) + 1);
      });

      const playedVisitors = new Set<string>();
      const playTimeByVisitorProduct = new Map<string, number>();
      plays.forEach((event: any) => {
        const visitor = String(event.visitor_id || ''); const product = String(event.product_id || '');
        if (!visitor || !product) return; playedVisitors.add(visitor);
        const key = `${visitor}|${product}`; const time = new Date(event.created_at || 0).getTime();
        if (!playTimeByVisitorProduct.has(key) || time < playTimeByVisitorProduct.get(key)!) playTimeByVisitorProduct.set(key, time);
      });
      const videoToClick = new Set<string>();
      clicks.forEach((event: any) => {
        const visitor = String(event.visitor_id || ''); const product = String(event.product_id || '');
        const key = `${visitor}|${product}`; const playTime = playTimeByVisitorProduct.get(key);
        if (playTime !== undefined && new Date(event.created_at || 0).getTime() >= playTime) videoToClick.add(visitor);
      });

      const productRows = products.map((product) => {
        const rows = behaviorByProduct.get(product.id) || [];
        const viewerRows = rows.filter((r: any) => Boolean(r.seen));
        const viewers = new Set(viewerRows.map((r: any) => String(r.visitor_id))).size;
        const totalAttentionSeconds = rows.reduce((sum: number, r: any) => sum + Math.max(0, Number(r.visible_seconds || 0)), 0);
        const completedVisitors = new Set(rows.filter((r: any) => {
          const count = Math.max(0, Number(r.slide_count || 0));
          return count > 1 && normalizedSlides(r.slides_seen).length >= count;
        }).map((r: any) => String(r.visitor_id))).size;
        return {
          productId: product.id, name: product.name, position: product.position,
          clicks: clickCountByProduct.get(product.id) || 0,
          plays: playVisitorsByProduct.get(product.id)?.size || 0,
          viewers,
          averageAttentionSeconds: viewers ? Math.round(totalAttentionSeconds / viewers) : 0,
          totalAttentionSeconds,
          galleryCompletedVisitors: completedVisitors,
          galleryCompletedRate: pct(completedVisitors, viewers),
          dropOffs: dropOffByProduct.get(product.id) || 0,
        };
      });

      const analytics: BestSellerAnalyticsSummary = {
        configured: true, engagementConfigured, listId,
        pageViews: uniqueVisitors, uniqueVisitors,
        totalClicks: clicks.length,
        totalPlays: playedVisitors.size,
        averageEngagementSeconds, medianEngagementSeconds, totalEngagementSeconds,
        reachedLastProductVisitors: reachedLastVisitors.size, reachedLastProductRate: pct(reachedLastVisitors.size, uniqueVisitors),
        viewedAllProductsVisitors: viewedAllVisitors.size, viewedAllProductsRate: pct(viewedAllVisitors.size, uniqueVisitors),
        galleryExplorersVisitors: galleryExplorerVisitors.size, galleryExplorersRate: pct(galleryExplorerVisitors.size, uniqueVisitors),
        videoToClickVisitors: videoToClick.size, videoToClickRate: pct(videoToClick.size, playedVisitors.size),
        devices, locations, hourlyVisitors, products: productRows,
      };
      return res.status(200).json({ success: true, analytics });
    } catch (err: any) {
      console.error('[BestSeller Analytics] GET:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao carregar analytics.' });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
