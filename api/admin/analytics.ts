import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { computeAnalyticsSummary } from '../../src/lib/analyticsAggregator.js';
import type { PeriodType } from '../../src/types/zhaya.js';

function parsePeriodDates(period: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === '30days') {
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === '90days') {
    startDate.setDate(now.getDate() - 89);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'custom' || customStart || customEnd) {
    if (customStart) {
      const parsedStart = new Date(customStart);
      if (!isNaN(parsedStart.getTime())) {
        startDate = parsedStart;
        if (!customStart.includes('T')) {
          startDate.setHours(0, 0, 0, 0);
        }
      } else {
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      }
    } else {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    }

    if (customEnd) {
      const parsedEnd = new Date(customEnd);
      if (!isNaN(parsedEnd.getTime())) {
        endDate = parsedEnd;
        if (!customEnd.includes('T')) {
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
  } else {
    // Default: 7days
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

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
    if (auth.error === 'CONFIG_ERROR') {
      return res.status(503).json({
        error: 'CONFIG_ERROR',
        message: 'Analytics server configuration is missing',
      });
    }
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(503).json({
      error: 'CONFIG_ERROR',
      message: 'Analytics server configuration is missing',
    });
  }

  try {
    const periodParam = (req.query?.period as string) || (req.query?.from && req.query?.to ? 'custom' : '7days');
    const customStart = (req.query?.from as string) || (req.query?.start as string) || '';
    const customEnd = (req.query?.to as string) || (req.query?.end as string) || '';

    const { startDate, endDate } = parsePeriodDates(periodParam, customStart, customEnd);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: records, error } = await supabase
      .from('widget_analytics_events')
      .select('*')
      .gte('occurred_at', startDate.toISOString())
      .lte('occurred_at', endDate.toISOString())
      .order('occurred_at', { ascending: true });

    if (error) {
      console.error('[Admin Analytics Query Error]:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return res.status(500).json({ error: 'ANALYTICS_QUERY_FAILED' });
    }

    const { data: feedbackRecords } = await supabase
      .from('widget_feedback_responses')
      .select('*')
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString())
      .order('submitted_at', { ascending: false });

    const summary = computeAnalyticsSummary(
      records || [],
      periodParam as PeriodType,
      startDate,
      endDate,
      feedbackRecords || []
    );
    return res.status(200).json(summary);
  } catch (err: any) {
    console.error('[Admin Analytics Exception]:', err);
    return res.status(500).json({ error: 'ANALYTICS_QUERY_FAILED' });
  }
}

