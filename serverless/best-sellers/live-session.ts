import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerLiveSession } from '../../src/types/zhaya.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function missingSchema(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return code === '42P01' || code === '42703' || code === 'PGRST204' || msg.includes('best_seller_live_sessions') || msg.includes('schema cache');
}

function format(row: any): BestSellerLiveSession {
  return {
    id: row.id,
    listId: row.list_id,
    status: ['running', 'paused', 'stopped'].includes(String(row.status)) ? row.status : 'stopped',
    startedAt: row.started_at,
    lastResumedAt: row.last_resumed_at || null,
    pausedAt: row.paused_at || null,
    endedAt: row.ended_at || null,
    accumulatedSeconds: Math.max(0, Number(row.accumulated_seconds || 0)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addRunningSeconds(row: any, nowMs: number): number {
  const base = Math.max(0, Number(row?.accumulated_seconds || 0));
  if (String(row?.status) !== 'running' || !row?.last_resumed_at) return base;
  const resumed = new Date(row.last_resumed_at).getTime();
  if (!Number.isFinite(resumed)) return base;
  return base + Math.max(0, Math.floor((nowMs - resumed) / 1000));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ success: false, error: 'SUPABASE_NOT_CONFIGURED' });

  const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const listId = String(body.listId || req.query?.listId || url.searchParams.get('listId') || '').trim();
  if (!UUID_REGEX.test(listId)) return res.status(400).json({ success: false, message: 'Vitrine inválida.' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('best_seller_live_sessions')
      .select('*')
      .eq('list_id', listId)
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) {
      if (missingSchema(error)) return res.status(200).json({ success: true, configured: false, session: null, sessions: [] });
      return res.status(500).json({ success: false, message: error.message });
    }
    const sessions = (data || []).map(format);
    return res.status(200).json({ success: true, configured: true, session: sessions[0] || null, sessions });
  }

  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });

  const action = String(body.action || '').toLowerCase();
  if (!['start', 'pause', 'resume', 'stop'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Ação de live inválida.' });
  }

  const { data: listRow, error: listError } = await supabase
    .from('best_seller_lists')
    .select('id, live_enabled')
    .eq('id', listId)
    .maybeSingle();
  if (listError) {
    if (missingSchema(listError)) return res.status(409).json({ success: false, configured: false, message: 'Execute o SQL das melhorias de hoje no Supabase.' });
    return res.status(500).json({ success: false, message: listError.message });
  }
  if (!listRow) return res.status(404).json({ success: false, message: 'Vitrine não encontrada.' });
  if (!listRow.live_enabled) return res.status(400).json({ success: false, message: 'Ative “Vincular a uma live” nos dados da Vitrine primeiro.' });

  const { data: latest, error: latestError } = await supabase
    .from('best_seller_live_sessions')
    .select('*')
    .eq('list_id', listId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) {
    if (missingSchema(latestError)) return res.status(409).json({ success: false, configured: false, message: 'Execute o SQL das melhorias de hoje no Supabase.' });
    return res.status(500).json({ success: false, message: latestError.message });
  }

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  if (action === 'start') {
    if (latest && (latest.status === 'running' || latest.status === 'paused')) {
      if (latest.status === 'paused') {
        const { data, error } = await supabase.from('best_seller_live_sessions')
          .update({ status: 'running', last_resumed_at: nowIso, paused_at: null, updated_at: nowIso })
          .eq('id', latest.id).select().single();
        if (error) return res.status(500).json({ success: false, message: error.message });
        return res.status(200).json({ success: true, session: format(data) });
      }
      return res.status(200).json({ success: true, session: format(latest) });
    }

    const { data, error } = await supabase.from('best_seller_live_sessions').insert({
      list_id: listId,
      status: 'running',
      started_at: nowIso,
      last_resumed_at: nowIso,
      paused_at: null,
      ended_at: null,
      accumulated_seconds: 0,
    }).select().single();
    if (error) {
      if (missingSchema(error)) return res.status(409).json({ success: false, configured: false, message: 'Execute o SQL das melhorias de hoje no Supabase.' });
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.status(201).json({ success: true, session: format(data) });
  }

  if (!latest || latest.status === 'stopped') {
    return res.status(400).json({ success: false, message: 'Não existe uma live em andamento.' });
  }

  if (action === 'pause') {
    if (latest.status === 'paused') return res.status(200).json({ success: true, session: format(latest) });
    const accumulated = addRunningSeconds(latest, nowMs);
    const { data, error } = await supabase.from('best_seller_live_sessions')
      .update({ status: 'paused', accumulated_seconds: accumulated, paused_at: nowIso, last_resumed_at: null, updated_at: nowIso })
      .eq('id', latest.id).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, session: format(data) });
  }

  if (action === 'resume') {
    if (latest.status === 'running') return res.status(200).json({ success: true, session: format(latest) });
    const { data, error } = await supabase.from('best_seller_live_sessions')
      .update({ status: 'running', last_resumed_at: nowIso, paused_at: null, updated_at: nowIso })
      .eq('id', latest.id).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, session: format(data) });
  }

  const accumulated = addRunningSeconds(latest, nowMs);
  const { data, error } = await supabase.from('best_seller_live_sessions')
    .update({ status: 'stopped', accumulated_seconds: accumulated, ended_at: nowIso, paused_at: null, last_resumed_at: null, updated_at: nowIso })
    .eq('id', latest.id).select().single();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(200).json({ success: true, session: format(data) });
}
