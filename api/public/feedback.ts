import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const VALID_ADEQUACY = new Set(['Sim', 'Não', 'Ainda não sei']);

function cleanText(value: unknown, maxLength = 1000): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl || !isValidServiceRoleKey(serviceRoleKey)) {
    return res.status(503).json({
      success: false,
      error: 'SERVER_CONFIGURATION_ERROR',
      message: 'Service Role Key ausente ou inválida.',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
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

    const rating = Number(easeRating);
    if (!VALID_ADEQUACY.has(adequacyResponse) || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'A resposta de adequação ou avaliação é inválida.',
      });
    }

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
      is_test: Boolean(body.is_test),
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
