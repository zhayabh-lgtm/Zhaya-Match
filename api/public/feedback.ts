import { createClient } from '@supabase/supabase-js';

const VALID_ADEQUACY = new Set(['Sim', 'Não', 'Ainda não sei']);

function cleanText(value: unknown, maxLength = 1000): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export default async function handler(req: any, res: any) {
  const requestOrigin =
    typeof req.headers?.origin === 'string'
      ? req.headers.origin
      : '*';

  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_NOT_CONFIGURED',
    });
  }

  // Validação de segurança se chave de service role estiver configurada
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const parts = process.env.SUPABASE_SERVICE_ROLE_KEY.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload.role === 'anon') {
          console.error('[Feedback API] SUPABASE_SERVICE_ROLE_KEY está configurada com uma chave anon em vez da service role!');
        }
      } catch {}
    }
  }

  const body = req.body || {};
  const {
    visitorId,
    sessionId,
    productTypeId,
    recommendationStatus,
    recommendedSize,
    alternateSize,
    adequacyResponse,
    easeRating,
    comment,
    configVersion,
  } = body;

  if (!adequacyResponse || !VALID_ADEQUACY.has(adequacyResponse)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ADEQUACY_RESPONSE',
    });
  }

  const rating = Number(easeRating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_EASE_RATING',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = {
      visitor_id: cleanText(visitorId, 200),
      session_id: cleanText(sessionId, 200),
      product_type_id: cleanText(productTypeId, 200),
      recommendation_status: cleanText(recommendationStatus, 100),
      recommended_size: cleanText(recommendedSize, 100),
      alternate_size: cleanText(alternateSize, 100),
      adequacy_response: adequacyResponse,
      ease_rating: rating,
      comment: cleanText(comment, 1000),
      config_version: typeof configVersion === 'number' ? configVersion : null,
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('widget_feedback_responses')
      .insert(payload);

    if (error) {
      console.error('[Feedback API] Erro no Supabase:', error.message);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback gravado com sucesso.',
    });
  } catch (err: any) {
    console.error('[Feedback API] Exceção:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
}
