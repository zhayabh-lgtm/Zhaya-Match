import { Repository } from '../../src/lib/repository';

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

  try {
    const result = await Repository.runActivityCheck();
    return res.status(200).json({
      success: result.ok,
      executedAt: new Date().toISOString(),
      status: result.status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'CRON_EXECUTION_FAILED',
      message: err?.message || 'Erro durante a execução da verificação automática de saúde.',
    });
  }
}
