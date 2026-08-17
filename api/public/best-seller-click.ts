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

    if (!productId || typeof productId !== 'string' || !UUID_REGEX.test(productId.trim())) {
      return res.status(400).json({ success: false, message: 'ID do produto inválido.' });
    }

    const cleanProductId = productId.trim();
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

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[Public BestSellerClick API] Erro ao registrar clique:', err?.message || err);
    // Retorna 200 resiliente para não quebrar a navegação do cliente
    return res.status(200).json({ success: true, error: 'SILENT_ERROR' });
  }
}
