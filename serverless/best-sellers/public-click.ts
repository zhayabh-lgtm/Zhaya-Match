import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

function cleanHeader(value: unknown, max = 120): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let cleaned = value.trim();
  try { cleaned = decodeURIComponent(cleaned); } catch { /* noop */ }
  return cleaned.slice(0, max);
}

function detectDeviceType(userAgentRaw: unknown): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const ua = String(userAgentRaw || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|kindle|silk|playbook/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return 'tablet';
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const productId = body.productId || body.id;
    const listId = typeof body.listId === 'string' ? body.listId.trim() : '';
    const visitorId = typeof body.visitorId === 'string' ? body.visitorId.trim() : '';

    if (!productId || typeof productId !== 'string' || !UUID_REGEX.test(productId.trim())) {
      return res.status(400).json({ success: false, message: 'ID do produto inválido.' });
    }

    const cleanProductId = productId.trim();
    const deviceType = detectDeviceType(req.headers?.['user-agent']);
    // Desktop é usado apenas internamente pela equipe e não entra nas métricas/counters públicos.
    if (deviceType === 'desktop') {
      return res.status(200).json({ success: true, recorded: false, ignoredDevice: 'desktop' });
    }
    const supabase = getSupabaseClient();

    if (!supabase) {
      // Resposta resiliente se Supabase não configurado
      return res.status(200).json({ success: true, recorded: false });
    }

    // 1. Tenta incrementar via RPC atômica
    const { error: rpcError } = await supabase.rpc('increment_best_seller_product_clicks', {
      product_id: cleanProductId,
    });

    if (rpcError) {
      // 2. Fallback resiliente se a RPC ainda não tiver sido criada no banco
      const { data: prodData } = await supabase
        .from('best_seller_products')
        .select('id, clicks')
        .eq('id', cleanProductId)
        .maybeSingle();

      if (prodData) {
        const currentClicks = typeof prodData.clicks === 'number' ? prodData.clicks : 0;
        await supabase
          .from('best_seller_products')
          .update({ clicks: currentClicks + 1 })
          .eq('id', cleanProductId);
      }
    }

    // Analytics detalhado é adicional. Se a tabela ainda não existir, o clique
    // principal acima continua funcionando normalmente.
    if (visitorId && VISITOR_REGEX.test(visitorId)) {
      const { data: productRef } = await supabase
        .from('best_seller_products')
        .select('list_id')
        .eq('id', cleanProductId)
        .maybeSingle();
      const analyticsListId = productRef?.list_id || (listId && UUID_REGEX.test(listId) ? listId : null);
      const referrer = typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.trim().slice(0, 500) : null;
      if (analyticsListId) await supabase.from('best_seller_analytics_events').insert({
        list_id: analyticsListId,
        product_id: cleanProductId,
        event_type: 'product_click',
        visitor_id: visitorId,
        device_type: deviceType,
        country_code: cleanHeader(req.headers?.['x-vercel-ip-country'], 8),
        region: cleanHeader(req.headers?.['x-vercel-ip-country-region'], 80),
        city: cleanHeader(req.headers?.['x-vercel-ip-city'], 120),
        referrer,
      }).then(({ error }) => {
        if (error && String(error.code || '') !== '42P01') {
          console.warn('[Public BestSellerClick API] Analytics não registrado:', error.message);
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Public BestSellerClick API] Erro ao registrar clique:', err?.message || err);
    // Retorna 200 resiliente para não quebrar a navegação do cliente
    return res.status(200).json({ success: true, error: 'SILENT_ERROR' });
  }
}
