import { Repository } from '../../src/lib/repository';

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
    const isConfigured = Boolean(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    ) && Boolean(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!isConfigured) {
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

    const activity = await Repository.getActivityStatus();
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
