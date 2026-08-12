import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    if (auth.error === 'CONFIG_ERROR') {
      return res.status(503).json({
        error: 'CONFIG_ERROR',
        message: 'Diagnostics server configuration is missing',
      });
    }
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  // Validação de Service Role
  let serviceRoleStatusVal: 'valid' | 'invalid_anon' | 'missing' = 'missing';
  if (serviceKey) {
    const parts = serviceKey.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        serviceRoleStatusVal = payload.role === 'service_role' ? 'valid' : 'invalid_anon';
      } catch {
        serviceRoleStatusVal = 'invalid_anon';
      }
    } else {
      serviceRoleStatusVal = 'invalid_anon';
    }
  }

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return res.status(200).json({
      api: { status: 'healthy' },
      supabase: { status: 'not_configured' },
      serviceRole: { status: serviceRoleStatusVal },
      lastEvents: { analytics: null, recommendation: null, feedback: null },
      apiStatus: 'healthy',
      supabaseStatus: 'not_configured',
      serviceRoleStatus: serviceRoleStatusVal,
      lastAnalyticsEvent: null,
      lastClickEvent: null,
      lastFeedback: null,
      timestamp: new Date().toISOString(),
    });
  }

  const activeKey = serviceKey || anonKey;

  try {
    const supabase = createClient(supabaseUrl, activeKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Consulta último evento de analytics
    const { data: lastEventData, error: eventErr } = await supabase
      .from('widget_analytics_events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Consulta último clique/recomendação no launcher/widget
    const { data: lastClickData } = await supabase
      .from('widget_analytics_events')
      .select('*')
      .in('event_name', ['size_recommended', 'recommendation_viewed', 'launcher_clicked', 'widget_opened'])
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Consulta último feedback
    const { data: lastFeedbackData, error: feedbackErr } = await supabase
      .from('widget_feedback_responses')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isSupabaseHealthy = !eventErr && !feedbackErr;
    const sbStatus = isSupabaseHealthy ? 'healthy' : 'unhealthy';

    const analyticsTs = lastEventData ? lastEventData.occurred_at : null;
    const recTs = lastClickData ? lastClickData.occurred_at : null;
    const feedbackTs = lastFeedbackData ? lastFeedbackData.submitted_at : null;

    return res.status(200).json({
      api: { status: 'healthy' },
      supabase: { status: sbStatus },
      serviceRole: { status: serviceRoleStatusVal },
      lastEvents: {
        analytics: analyticsTs,
        recommendation: recTs,
        feedback: feedbackTs,
      },
      apiStatus: 'healthy',
      supabaseStatus: sbStatus,
      serviceRoleStatus: serviceRoleStatusVal,
      lastAnalyticsEvent: lastEventData
        ? {
            eventId: lastEventData.event_id,
            eventName: lastEventData.event_name,
            productTypeName: lastEventData.product_type_name,
            sourceDomain: lastEventData.source_domain,
            occurredAt: lastEventData.occurred_at,
          }
        : null,
      lastClickEvent: lastClickData
        ? {
            eventId: lastClickData.event_id,
            eventName: lastClickData.event_name,
            sourceDomain: lastClickData.source_domain,
            occurredAt: lastClickData.occurred_at,
          }
        : null,
      lastFeedback: lastFeedbackData
        ? {
            id: lastFeedbackData.id,
            adequacyResponse: lastFeedbackData.adequacy_response,
            easeRating: lastFeedbackData.ease_rating,
            comment: lastFeedbackData.comment,
            submittedAt: lastFeedbackData.submitted_at,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Diagnostics API Error]:', err);
    return res.status(200).json({
      api: { status: 'healthy' },
      supabase: { status: 'unhealthy' },
      serviceRole: { status: serviceRoleStatusVal },
      lastEvents: { analytics: null, recommendation: null, feedback: null },
      apiStatus: 'healthy',
      supabaseStatus: 'unhealthy',
      serviceRoleStatus: serviceRoleStatusVal,
      error: err?.message || 'DB_CONNECTION_ERROR',
      lastAnalyticsEvent: null,
      lastClickEvent: null,
      lastFeedback: null,
      timestamp: new Date().toISOString(),
    });
  }
}
