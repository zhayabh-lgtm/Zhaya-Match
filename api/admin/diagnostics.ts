import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import {
  verifyServerSupabaseKey,
  verifyFrontendSupabaseKey,
} from '../../src/lib/supabaseKeyValidator.js';

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  // 1. Validação de Chaves Supabase
  const serviceKeyVal = await verifyServerSupabaseKey(supabaseUrl, serviceKey);
  const anonKeyVal = await verifyFrontendSupabaseKey(supabaseUrl, anonKey);

  // Normalização de status legado para manter compatibilidade com testes existentes
  const serviceRoleStatusVal = serviceKeyVal.isValid ? 'valid' : 'invalid_anon';

  // 2. Query ou verificação de evento por ID
  const verifyId =
    req.query?.verifyEventId ||
    (req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams.get('verifyEventId') : null);

  const verifyFeedbackId =
    req.query?.verifyFeedbackId ||
    (req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams.get('verifyFeedbackId') : null);

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return res.status(200).json({
      api: { status: 'healthy' },
      supabase: { status: 'not_configured' },
      serviceRole: serviceKeyVal,
      anonKey: anonKeyVal,
      verifiedEvent: false,
      verifiedFeedback: false,
      lastEvents: { analytics: null, recommendation: null, feedback: null },
      apiStatus: 'healthy',
      supabaseStatus: 'not_configured',
      serviceRoleStatus: serviceRoleStatusVal,
      timestamp: new Date().toISOString(),
    });
  }

  const activeKey = serviceKey || anonKey;

  try {
    const supabase = createClient(supabaseUrl, activeKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verificação de tabelas essenciais do banco
    const requiredTables = [
      'app_settings',
      'popup_settings',
      'text_settings',
      'product_types',
      'widget_analytics_events',
      'widget_feedback_responses',
      'system_activity_status',
    ];

    const tablesStatus: Record<string, boolean> = {};
    for (const tbl of requiredTables) {
      try {
        const { error: tErr } = await supabase.from(tbl).select('*', { count: 'exact', head: true }).limit(1);
        tablesStatus[tbl] = !tErr;
      } catch {
        tablesStatus[tbl] = false;
      }
    }

    // Verificação de existência da RPC publish_all_config
    let rpcAvailable = false;
    try {
      // Teste de chamada sem efetivar alterações
      const { error: rpcErr } = await supabase.rpc('publish_all_config', {
        p_app_settings: null,
        p_popup_settings: null,
        p_text_settings: null,
        p_product_types: [],
      });
      // Se der erro de validação ou payload mas reconhecer a RPC, a RPC existe
      rpcAvailable = !rpcErr || rpcErr.code !== '42883'; // 42883 = undefined_function
    } catch {
      rpcAvailable = false;
    }

    // Consulta do evento solicitado para confirmação REAL no banco
    let verifiedEvent = false;
    if (verifyId) {
      const { data: foundEvt } = await supabase
        .from('widget_analytics_events')
        .select('event_id')
        .eq('event_id', verifyId)
        .maybeSingle();
      verifiedEvent = !!foundEvt;
    }

    // Consulta de feedback solicitado para confirmação REAL no banco
    let verifiedFeedback = false;
    if (verifyFeedbackId) {
      const { data: foundFb } = await supabase
        .from('widget_feedback_responses')
        .select('id, session_id')
        .or(`id.eq.${verifyFeedbackId},session_id.eq.${verifyFeedbackId}`)
        .maybeSingle();
      verifiedFeedback = !!foundFb;
    }

    // 1. Consulta último evento de analytics real
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

    const isSupabaseHealthy = !eventErr && !feedbackErr && serviceKeyVal.isValid;
    const sbStatus = isSupabaseHealthy ? 'healthy' : 'unhealthy';

    const analyticsTs = lastEventData ? lastEventData.occurred_at : null;
    const recTs = lastClickData ? lastClickData.occurred_at : null;
    const feedbackTs = lastFeedbackData ? lastFeedbackData.submitted_at : null;

    return res.status(200).json({
      api: { status: 'healthy' },
      supabase: { status: sbStatus },
      serviceRole: serviceKeyVal,
      anonKey: anonKeyVal,
      tables: tablesStatus,
      rpcPublication: { available: rpcAvailable },
      verifiedEvent,
      verifiedEventId: verifyId || null,
      verifiedFeedback,
      verifiedFeedbackId: verifyFeedbackId || null,
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
      serviceRole: serviceKeyVal,
      anonKey: anonKeyVal,
      tables: {},
      rpcPublication: { available: false },
      lastEvents: { analytics: null, recommendation: null, feedback: null },
      apiStatus: 'healthy',
      supabaseStatus: 'unhealthy',
      serviceRoleStatus: serviceRoleStatusVal,
      error: err?.message || 'DB_CONNECTION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}
