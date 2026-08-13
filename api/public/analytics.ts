import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const ALLOWED_EVENTS = new Set([
  'launcher_viewed',
  'launcher_clicked',
  'widget_opened',
  'flow_started',
  'product_type_selected',
  'measurements_started',
  'recommendation_processing_started',
  'recommendation_generated',
  'recommendation_result_viewed',
  'recommendation_not_found',
  'measurement_help_opened',
  'feedback_started',
  'feedback_submitted',
  'feedback_skipped',
  'widget_closed',
]);

function cleanText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') return null;

  const cleaned = value.trim();

  if (!cleaned) return null;

  return cleaned.slice(0, maxLength);
}

function getSourceDomain(req: any, providedDomain: unknown): string | null {
  const origin =
    typeof req.headers?.origin === 'string'
      ? req.headers.origin
      : null;

  const referer =
    typeof req.headers?.referer === 'string'
      ? req.headers.referer
      : null;

  const source = origin || referer;

  if (source) {
    try {
      return new URL(source).hostname.slice(0, 200);
    } catch {
      // Continua para o domínio enviado pelo widget
    }
  }

  return cleanText(providedDomain, 200);
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

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey || !isValidServiceRoleKey(supabaseKey)) {
    console.error('[Analytics API] SUPABASE_SERVICE_ROLE_KEY está ausente ou possui formato inválido!');
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_NOT_CONFIGURED',
    });
  }

  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'INVALID_JSON',
      });
    }
  }

  body = body || {};

  const eventId = cleanText(body.eventId, 150);
  const eventName = cleanText(body.eventName, 100);
  const sessionId = cleanText(body.sessionId, 150);

  if (!eventId || eventId.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_EVENT_ID',
    });
  }

  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_EVENT_NAME',
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_SESSION_ID',
    });
  }

  const allowedStatuses = new Set([
    'recommended',
    'between_sizes',
    'not_found',
  ]);

  const recommendationStatus =
    typeof body.recommendationStatus === 'string' &&
    allowedStatuses.has(body.recommendationStatus)
      ? body.recommendationStatus
      : null;

  const pagePath =
    cleanText(body.pagePath, 200)?.split('?')[0] || '/';

  const configVersion =
    typeof body.configVersion === 'number' &&
    Number.isFinite(body.configVersion)
      ? Math.trunc(body.configVersion)
      : 1;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const record = {
    event_id: eventId,
    event_name: eventName,
    visitor_id: cleanText(body.visitorId, 150),
    session_id: sessionId,
    product_type_id: cleanText(body.productTypeId, 150),
    product_type_name: cleanText(body.productTypeName, 150),
    product_category: cleanText(body.productCategory, 100),
    recommendation_status: recommendationStatus,
    source_domain: getSourceDomain(req, body.sourceDomain),
    page_path: pagePath,
    device_type: body.deviceType === 'mobile' ? 'mobile' : 'desktop',
    config_version: configVersion,
    is_test: Boolean(body.is_test),
    metadata: {},
    occurred_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('widget_analytics_events')
    .upsert(record, {
      onConflict: 'event_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[Analytics API] Erro ao salvar evento no Supabase:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return res.status(500).json({
      success: false,
      error: 'ANALYTICS_INSERT_FAILED',
    });
  }

  return res.status(200).json({
    success: true,
  });
}