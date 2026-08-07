import { Repository } from '../../src/lib/repository';
import { verifyAdminAuth } from '../../src/lib/adminAuth';

export default async function handler(req: any, res: any) {
  const requestOrigin =
    typeof req.headers?.origin === 'string'
      ? req.headers.origin
      : '*';

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
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
  }

  try {
    const period = (req.query?.period as any) || (req.query?.from && req.query?.to ? 'custom' : '7days');
    const customStart = (req.query?.from as string) || (req.query?.start as string) || '';
    const customEnd = (req.query?.to as string) || (req.query?.end as string) || '';

    const summary = await Repository.getAnalyticsSummary(period, customStart, customEnd);
    return res.status(200).json(summary);
  } catch (err: any) {
    console.error('[Admin Analytics API Error]:', err);
    return res.status(500).json({ error: 'FAILED_TO_LOAD_ANALYTICS' });
  }
}
