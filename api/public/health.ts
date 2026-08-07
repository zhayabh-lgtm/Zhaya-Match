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
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '';

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

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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
        },
        message: 'Falha ao realizar health check.',
        timestamp: new Date().toISOString(),
      });
    }

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
      lastError: data?.last_error || null,
      updatedAt: data?.updated_at || new Date().toISOString(),
    };

    const isDbHealthy = activity.lastStatus === 'healthy' || activity.lastStatus === 'success';

    return res.status(200).json({
      success: isDbHealthy,
      status: isDbHealthy ? 'healthy' : activity.lastStatus,
      services: {
        api: 'healthy',
        database: isDbHealthy ? 'healthy' : 'unhealthy',
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
