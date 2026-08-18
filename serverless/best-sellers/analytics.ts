import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerAnalyticsSummary } from '../../src/types/zhaya.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return code === '42P01' || msg.includes('best_seller_analytics_events') || msg.includes('could not find the table') || msg.includes('schema cache');
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

function emptySummary(listId: string, configured: boolean, products: Array<{ id: string; name: string; clicks?: number }> = []): BestSellerAnalyticsSummary {
  return {
    configured,
    listId,
    pageViews: 0,
    uniqueVisitors: 0,
    totalClicks: products.reduce((sum, p) => sum + (typeof p.clicks === 'number' ? p.clicks : 0), 0),
    totalPlays: 0,
    devices: [],
    locations: [],
    products: products.map((p) => ({ productId: p.id, name: p.name, clicks: typeof p.clicks === 'number' ? p.clicks : 0, plays: 0 })),
  };
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

      if (!['page_view', 'product_play'].includes(eventType)) {
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
        if (isTableMissingError(error)) return res.status(200).json({ success: true, recorded: false, configured: false });
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
      const { data: productsData } = await supabase
        .from('best_seller_products')
        .select('id, name, clicks')
        .eq('list_id', listId)
        .order('position', { ascending: true });

      const products = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name || 'Produto',
        clicks: typeof p.clicks === 'number' ? p.clicks : Number(p.clicks || 0),
      }));

      const { data: eventsData, error: eventsError } = await supabase
        .from('best_seller_analytics_events')
        .select('event_type, visitor_id, device_type, country_code, region, city, product_id, created_at')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
        .limit(20000);

      if (eventsError) {
        if (isTableMissingError(eventsError)) {
          return res.status(200).json({ success: true, analytics: emptySummary(listId, false, products) });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: eventsError.message });
      }

      const events = eventsData || [];
      const pageViews = events.filter((event: any) => event.event_type === 'page_view');
      const plays = events.filter((event: any) => event.event_type === 'product_play');
      const uniqueVisitors = new Set(pageViews.map((event: any) => event.visitor_id).filter(Boolean)).size;

      const deviceMap = new Map<string, number>();
      for (const event of pageViews) {
        const key = String((event as any).device_type || 'unknown');
        deviceMap.set(key, (deviceMap.get(key) || 0) + 1);
      }
      const devices = Array.from(deviceMap.entries())
        .map(([deviceType, count]) => ({ deviceType, count }))
        .sort((a, b) => b.count - a.count);

      const locationMap = new Map<string, { countryCode: string | null; region: string | null; city: string | null; count: number }>();
      for (const event of pageViews) {
        const countryCode = (event as any).country_code || null;
        const region = (event as any).region || null;
        const city = (event as any).city || null;
        const key = `${countryCode || ''}|${region || ''}|${city || ''}`;
        const current = locationMap.get(key) || { countryCode, region, city, count: 0 };
        current.count += 1;
        locationMap.set(key, current);
      }
      const locations = Array.from(locationMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);

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
        listId,
        pageViews: pageViews.length,
        uniqueVisitors,
        totalClicks: productRows.reduce((sum, product) => sum + product.clicks, 0),
        totalPlays: plays.length,
        devices,
        locations,
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
