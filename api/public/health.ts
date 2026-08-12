import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const key = serviceKey || anonKey;

    if (!url || !key) {
      return res.status(200).json({
        success: false,
        status: 'configuration_error',
        services: {
          api: 'healthy',
          database: 'not_configured',
        },
        message: 'Configuração do Supabase ausente.',
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Validação de Anon Key se disponível
    let isAnonHealthy = true;
    if (anonKey) {
      const anonClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: anonErr } = await anonClient.from('popup_settings').select('id').limit(1);
      if (anonErr && anonErr.code !== 'PGRST116') {
        isAnonHealthy = false;
      }
    }

    // 2. Validação da Service Role Key se disponível
    let hasValidServiceRole = false;
    let isServiceRoleHealthy = false;
    if (serviceKey) {
      const parts = serviceKey.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          hasValidServiceRole = payload.role === 'service_role';
        } catch {}
      }
      if (hasValidServiceRole) {
        const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { error: adminErr } = await adminClient.from('system_activity_status').select('id').limit(1);
        isServiceRoleHealthy = !adminErr;
      }
    }

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 3. Teste de leitura no sistema de atividade
    const { data, error } = await supabase
      .from('system_activity_status')
      .select('*')
      .eq('id', 'supabase-activity-monitor')
      .maybeSingle();

    if (error) {
      console.error('[Health API Error]:', error.message);
      return res.status(200).json({
        success: false,
        status: 'database_error',
        services: {
          api: 'healthy',
          database: 'unhealthy',
          anonKey: isAnonHealthy ? 'valid' : 'invalid',
          serviceRole: hasValidServiceRole ? (isServiceRoleHealthy ? 'valid' : 'unhealthy') : (serviceKey ? 'invalid' : 'missing'),
        },
        message: `Falha ao realizar health check no banco de dados: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Verificação da tabela de analytics
    const { error: analyticsTableErr } = await supabase
      .from('widget_analytics_events')
      .select('event_id')
      .limit(1);

    const isAnalyticsTableHealthy = !analyticsTableErr;

    // 5. Verificação da tabela de feedback
    const { error: feedbackTableErr } = await supabase
      .from('widget_feedback_responses')
      .select('id')
      .limit(1);

    const isFeedbackTableHealthy = !feedbackTableErr;

    let lastStatus = data?.last_status || 'healthy';
    const refTime = data?.last_run_at || data?.last_success_at;
    if (refTime) {
      const runTimeMs = new Date(refTime).getTime();
      const nowMs = Date.now();
      if (!isNaN(runTimeMs) && nowMs - runTimeMs > 24 * 60 * 60 * 1000) {
        if (lastStatus === 'healthy' || lastStatus === 'success') {
          lastStatus = 'stale';
        }
      }
    }

    const activity = {
      id: data?.id || 'supabase-activity-monitor',
      lastRunAt: data?.last_run_at || null,
      lastSuccessAt: data?.last_success_at || null,
      lastStatus,
      lastError: data?.last_error || (analyticsTableErr ? analyticsTableErr.message : feedbackTableErr ? feedbackTableErr.message : null),
      updatedAt: data?.updated_at || new Date().toISOString(),
    };

    const isDbHealthy =
      (activity.lastStatus === 'healthy' || activity.lastStatus === 'success') &&
      isAnalyticsTableHealthy &&
      isFeedbackTableHealthy &&
      isAnonHealthy;

    return res.status(200).json({
      success: isDbHealthy,
      status: isDbHealthy ? 'healthy' : (analyticsTableErr || feedbackTableErr ? 'database_error' : activity.lastStatus),
      services: {
        api: 'healthy',
        database: isDbHealthy ? 'healthy' : 'unhealthy',
        anonKey: isAnonHealthy ? 'valid' : 'invalid',
        serviceRole: hasValidServiceRole ? (isServiceRoleHealthy ? 'valid' : 'unhealthy') : (serviceKey ? 'invalid' : 'missing'),
        analyticsTable: isAnalyticsTableHealthy ? 'healthy' : 'unhealthy',
        feedbackTable: isFeedbackTableHealthy ? 'healthy' : 'unhealthy',
      },
      activity,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Health API Exception]:', err?.message || err);
    return res.status(500).json({
      success: false,
      status: 'database_error',
      services: {
        api: 'healthy',
        database: 'unhealthy',
      },
      message: 'Falha ao realizar health check.',
      timestamp: new Date().toISOString(),
    });
  }
}
