import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerAnalyticsSummary } from '../../src/types/zhaya.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_REGEX = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_ENGAGEMENT_SECONDS = 31_536_000; // 1 ano acumulado por visitante/lista.

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isAnalyticsMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return code === '42P01'
    || code === 'PGRST202'
    || msg.includes('best_seller_analytics_events')
    || msg.includes('best_seller_visitor_sessions')
    || msg.includes('upsert_best_seller_visitor_session')
    || msg.includes('could not find the table')
    || msg.includes('could not find the function')
    || msg.includes('schema cache');
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

function emptyHours() {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0 }));
}

function emptySummary(listId: string, configured: boolean, products: Array<{ id: string; name: string; clicks?: number }> = []): BestSellerAnalyticsSummary {
  return {
    configured,
    engagementConfigured: configured,
    listId,
    pageViews: 0,
    uniqueVisitors: 0,
    totalClicks: products.reduce((sum, p) => sum + (typeof p.clicks === 'number' ? p.clicks : 0), 0),
    totalPlays: 0,
    averageEngagementSeconds: 0,
    totalEngagementSeconds: 0,
    devices: [],
    locations: [],
    hourlyVisitors: emptyHours(),
    products: products.map((p) => ({ productId: p.id, name: p.name, clicks: typeof p.clicks === 'number' ? p.clicks : 0, plays: 0 })),
  };
}

function getHourInTimezone(value: string | null | undefined, timezone: string): number | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Sao_Paulo',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null;
  }
}

function buildUniqueFallbackSessions(pageViews: any[]) {
  const byVisitor = new Map<string, any>();
  const sorted = [...pageViews].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  for (const event of sorted) {
    const visitorId = String(event?.visitor_id || '');
    if (!visitorId || byVisitor.has(visitorId)) continue;
    byVisitor.set(visitorId, {
      visitor_id: visitorId,
      device_type: event?.device_type || 'unknown',
      country_code: event?.country_code || null,
      region: event?.region || null,
      city: event?.city || null,
      first_seen_at: event?.created_at || null,
      last_seen_at: event?.created_at || null,
      engaged_seconds: 0,
    });
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
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const eventType = String(body.eventType || '').trim();
      const listId = String(body.listId || '').trim();
      const productId = body.productId ? String(body.productId).trim() : null;
      const visitorId = String(body.visitorId || '').trim();

      if (!['page_view', 'product_play', 'engagement'].includes(eventType)) {
        return res.status(400).json({ success: false, message: 'Evento inválido.' });
      }
      if (!UUID_REGEX.test(listId)) {
        return res.status(400).json({ success: false, message: 'Lista inválida.' });
      }
      if (eventType === 'product_play' && (!productId || !UUID_REGEX.test(productId))) {
        return res.status(400).json({ success: false, message: 'Produto inválido.' });
      }
      if (!VISITOR_REGEX.test(visitorId)) {
        return res.status(400).json({ success: false, message: 'Visitante inválido.' });
      }

      const context = getRequestContext(req);
      const referrer = typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.trim().slice(0, 500) : null;

      // Entrada e tempo usam UMA linha por visitante/lista. O banco usa GREATEST
      // para nunca diminuir o tempo acumulado e a UNIQUE(list_id, visitor_id)
      // impede que reloads contem a mesma pessoa novamente.
      if (eventType === 'page_view' || eventType === 'engagement') {
        const rawSeconds = Number(body.engagedSecondsTotal || 0);
        const engagedSecondsTotal = eventType === 'engagement'
          ? Math.max(0, Math.min(MAX_ENGAGEMENT_SECONDS, Number.isFinite(rawSeconds) ? Math.floor(rawSeconds) : 0))
          : 0;

        const { error } = await supabase.rpc('upsert_best_seller_visitor_session', {
          p_list_id: listId,
          p_visitor_id: visitorId,
          p_engaged_seconds_total: engagedSecondsTotal,
          p_device_type: context.deviceType,
          p_country_code: context.countryCode,
          p_region: context.region,
          p_city: context.city,
          p_referrer: referrer,
        });

        if (error) {
          // Compatibilidade antes do SQL novo: page_view ainda pode cair no
          // analytics antigo, mas engagement simplesmente é ignorado.
          if (isAnalyticsMissingError(error)) {
            if (eventType === 'page_view') {
              const { error: legacyError } = await supabase
                .from('best_seller_analytics_events')
                .insert({
                  list_id: listId,
                  product_id: null,
                  event_type: 'page_view',
                  visitor_id: visitorId,
                  device_type: context.deviceType,
                  country_code: context.countryCode,
                  region: context.region,
                  city: context.city,
                  referrer,
                });
              if (!legacyError) return res.status(200).json({ success: true, recorded: true, configured: false });
            }
            return res.status(200).json({ success: true, recorded: false, configured: false });
          }
          console.warn('[BestSeller Analytics] Falha ao registrar sessão:', error.message);
          return res.status(200).json({ success: true, recorded: false });
        }

        return res.status(200).json({ success: true, recorded: true });
      }

      const { error } = await supabase
        .from('best_seller_analytics_events')
        .insert({
          list_id: listId,
          product_id: productId,
          event_type: eventType,
          visitor_id: visitorId,
          device_type: context.deviceType,
          country_code: context.countryCode,
          region: context.region,
          city: context.city,
          referrer,
        });

      if (error) {
        if (isAnalyticsMissingError(error)) return res.status(200).json({ success: true, recorded: false, configured: false });
        console.warn('[BestSeller Analytics] Falha ao registrar evento:', error.message);
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
    if (!auth.authorized) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
    }

    const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const listId = String(req.query?.listId || requestUrl.searchParams.get('listId') || '').trim();
    if (!UUID_REGEX.test(listId)) return res.status(400).json({ success: false, message: 'Lista inválida.' });

    try {
      const [{ data: productsData }, { data: listRow }] = await Promise.all([
        supabase
          .from('best_seller_products')
          .select('id, name, clicks')
          .eq('list_id', listId)
          .order('position', { ascending: true }),
        supabase
          .from('best_seller_lists')
          .select('timezone')
          .eq('id', listId)
          .maybeSingle(),
      ]);

      const products = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name || 'Produto',
        clicks: typeof p.clicks === 'number' ? p.clicks : Number(p.clicks || 0),
      }));
      const timezone = String((listRow as any)?.timezone || 'America/Sao_Paulo');

      const { data: playEventsData, error: playEventsError } = await supabase
        .from('best_seller_analytics_events')
        .select('visitor_id, product_id, created_at')
        .eq('list_id', listId)
        .eq('event_type', 'product_play')
        .order('created_at', { ascending: false })
        .limit(20000);

      if (playEventsError && !isAnalyticsMissingError(playEventsError)) {
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: playEventsError.message });
      }

      const plays = playEventsData || [];

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('best_seller_visitor_sessions')
        .select('visitor_id, device_type, country_code, region, city, first_seen_at, last_seen_at, engaged_seconds')
        .eq('list_id', listId)
        .order('first_seen_at', { ascending: true })
        .limit(20000);

      let sessions: any[] = sessionsData || [];
      let engagementConfigured = true;

      if (sessionsError) {
        if (!isAnalyticsMissingError(sessionsError)) {
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: sessionsError.message });
        }

        engagementConfigured = false;
        // Antes do SQL novo, mantém os visitantes antigos funcionando e já
        // deduplica por visitor_id em memória.
        const { data: legacyPageViews, error: legacyError } = await supabase
          .from('best_seller_analytics_events')
          .select('visitor_id, device_type, country_code, region, city, created_at')
          .eq('list_id', listId)
          .eq('event_type', 'page_view')
          .order('created_at', { ascending: true })
          .limit(20000);

        if (legacyError) {
          if (isAnalyticsMissingError(legacyError)) {
            return res.status(200).json({ success: true, analytics: emptySummary(listId, false, products) });
          }
          return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: legacyError.message });
        }
        sessions = buildUniqueFallbackSessions(legacyPageViews || []);
      }

      // UMA sessão por visitor_id/lista: mesma pessoa não é contada novamente.
      const pageViews = sessions.length;
      const uniqueVisitors = sessions.length;
      const totalEngagementSeconds = sessions.reduce((sum, session: any) => sum + Math.max(0, Number(session.engaged_seconds || 0)), 0);
      const averageEngagementSeconds = uniqueVisitors > 0 ? Math.round(totalEngagementSeconds / uniqueVisitors) : 0;

      const deviceMap = new Map<string, number>();
      for (const session of sessions) {
        const key = String(session?.device_type || 'unknown');
        deviceMap.set(key, (deviceMap.get(key) || 0) + 1);
      }
      const devices = Array.from(deviceMap.entries())
        .map(([deviceType, count]) => ({ deviceType, count }))
        .sort((a, b) => b.count - a.count);

      const locationMap = new Map<string, { countryCode: string | null; region: string | null; city: string | null; count: number }>();
      for (const session of sessions) {
        const countryCode = session?.country_code || null;
        const region = session?.region || null;
        const city = session?.city || null;
        const key = `${countryCode || ''}|${region || ''}|${city || ''}`;
        const current = locationMap.get(key) || { countryCode, region, city, count: 0 };
        current.count += 1;
        locationMap.set(key, current);
      }
      const locations = Array.from(locationMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

      const hourlyVisitors = emptyHours();
      for (const session of sessions) {
        const hour = getHourInTimezone(session?.first_seen_at, timezone);
        if (hour !== null) hourlyVisitors[hour].visitors += 1;
      }

      const playCounts = new Map<string, number>();
      for (const event of plays) {
        const productId = String((event as any).product_id || '');
        if (productId) playCounts.set(productId, (playCounts.get(productId) || 0) + 1);
      }

      const productRows = products.map((product) => ({
        productId: product.id,
        name: product.name,
        clicks: product.clicks,
        plays: playCounts.get(product.id) || 0,
      }));

      const analytics: BestSellerAnalyticsSummary = {
        configured: true,
        engagementConfigured,
        listId,
        pageViews,
        uniqueVisitors,
        totalClicks: productRows.reduce((sum, product) => sum + product.clicks, 0),
        totalPlays: plays.length,
        averageEngagementSeconds,
        totalEngagementSeconds,
        devices,
        locations,
        hourlyVisitors,
        products: productRows,
      };

      return res.status(200).json({ success: true, analytics });
    } catch (err: any) {
      console.error('[BestSeller Analytics] GET:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao carregar analytics.' });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
