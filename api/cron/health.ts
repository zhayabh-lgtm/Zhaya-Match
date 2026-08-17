import { createClient } from '@supabase/supabase-js';
import { cleanupUnusedBestSellerVideos } from '../../serverless/best-sellers/media-cleanup.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization;
  const isVercelCron = req.headers?.['x-vercel-cron'] === '1';

  // Validação do segredo do Cron
  if (cronSecret) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token !== cronSecret && !isVercelCron) {
      return res.status(401).json({ error: 'UNAUTHORIZED_CRON_REQUEST' });
    }
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (!url || !key) {
    return res.status(500).json({
      success: false,
      error: 'SUPABASE_NOT_CONFIGURED',
      message: 'Configuração do Supabase ausente.',
    });
  }

  try {
    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const nowIso = new Date().toISOString();
    let mediaCleanup: any = null;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (serviceRoleKey) {
      try {
        mediaCleanup = await cleanupUnusedBestSellerVideos(url, serviceRoleKey);
      } catch (cleanupError: any) {
        mediaCleanup = { ok: false, removed: 0, reason: cleanupError?.message || 'Falha na limpeza de mídia temporária' };
        console.warn('[Cron] Falha ao limpar mídia temporária órfã de Mais Vendidos:', cleanupError?.message || cleanupError);
      }
    }

    // Tenta RPC primeiro
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('execute_system_activity_check');

    if (!rpcErr && rpcRes && rpcRes.ok !== false) {
      return res.status(200).json({
        success: true,
        executedAt: nowIso,
        mediaCleanup,
        status: {
          id: 'supabase-activity-monitor',
          lastRunAt: nowIso,
          lastSuccessAt: nowIso,
          lastStatus: 'healthy',
          lastError: null,
          updatedAt: nowIso,
        },
      });
    }

    // Fallback: Query em app_settings para atestar a saúde do banco e atualizar system_activity_status
    const { error: countErr } = await supabase
      .from('app_settings')
      .select('*', { count: 'exact', head: true });

    const isHealthy = !countErr;
    const statusLabel = isHealthy ? 'healthy' : 'database_error';
    const cleanErrorMessage = countErr ? `Erro ao acessar o banco de dados: ${countErr.message}` : null;

    const record = {
      id: 'supabase-activity-monitor',
      last_run_at: nowIso,
      last_success_at: isHealthy ? nowIso : null,
      last_status: statusLabel,
      last_error: cleanErrorMessage,
      updated_at: nowIso,
    };

    await supabase
      .from('system_activity_status')
      .upsert(record, { onConflict: 'id' });

    return res.status(isHealthy ? 200 : 500).json({
      success: isHealthy,
      executedAt: nowIso,
      mediaCleanup,
      status: {
        id: 'supabase-activity-monitor',
        lastRunAt: nowIso,
        lastSuccessAt: isHealthy ? nowIso : null,
        lastStatus: statusLabel,
        lastError: cleanErrorMessage,
        updatedAt: nowIso,
      },
    });
  } catch (err: any) {
    console.error('[Cron Health API Exception]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'CRON_EXECUTION_FAILED',
      message: err?.message || 'Erro durante a execução da verificação automática de saúde.',
    });
  }
}
