import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_REGEX = /^[A-Za-z0-9_-]{8,128}$/;
const HEX_REGEX = /^#[0-9a-f]{6}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readMode(req: any): string {
  try {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    return String(req.query?.mode || url.searchParams.get('mode') || '').trim();
  } catch {
    return String(req.query?.mode || '').trim();
  }
}

function readParam(req: any, key: string): string {
  try {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    return String(req.query?.[key] || url.searchParams.get(key) || '').trim();
  } catch {
    return String(req.query?.[key] || '').trim();
  }
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function cleanText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function cleanRequiredText(value: unknown, fallback: string, max = 500): string {
  return cleanText(value, max) || fallback;
}

function cleanColor(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return HEX_REGEX.test(text) ? text.toUpperCase() : fallback;
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().slice(0, 1800);
  } catch {
    return null;
  }
}

function cleanIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function slugify(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function normalizeUnlockMode(value: unknown): 'immediate' | 'countdown' | 'video' {
  return value === 'countdown' || value === 'video' ? value : 'immediate';
}

function cleanHeader(value: unknown, max = 120): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let cleaned = value.trim();
  try { cleaned = decodeURIComponent(cleaned); } catch { /* noop */ }
  return cleaned.slice(0, max);
}

function detectDeviceType(userAgentRaw: unknown): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
  const ua = String(userAgentRaw || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|kindle|silk|playbook/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return 'tablet';
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectCountry(req: any): string | null {
  const raw =
    req?.headers?.['x-vercel-ip-country'] ||
    req?.headers?.['cf-ipcountry'] ||
    req?.headers?.['cloudfront-viewer-country'] ||
    req?.headers?.['x-country-code'] ||
    req?.geo?.country ||
    '';
  const code = String(raw || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function parseBody(req: any): any {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body && typeof body === 'object' ? body : {};
}

function dbToCampaign(row: any, includeCode = false, totalUnlocks?: number) {
  const campaign: any = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: Boolean(row.active),
    eyebrow: row.eyebrow || null,
    title: row.title,
    subtitle: row.subtitle || null,
    logoUrl: row.logo_url || null,
    backgroundColor: row.background_color || '#000000',
    backgroundImageUrl: row.background_image_url || null,
    backgroundVideoUrl: row.background_video_url || null,
    backgroundOverlay: Number(row.background_overlay ?? 0.34),
    backgroundBlur: Number(row.background_blur ?? 0),
    textColor: row.text_color || '#FFFFFF',
    mutedTextColor: row.muted_text_color || '#B7B7B7',
    accentColor: row.accent_color || '#FFFFFF',
    buttonBackgroundColor: row.button_background_color || '#FFFFFF',
    buttonTextColor: row.button_text_color || '#000000',
    unlockMode: normalizeUnlockMode(row.unlock_mode),
    unlockDelaySeconds: Number(row.unlock_delay_seconds || 0),
    unlockVideoUrl: row.unlock_video_url || null,
    unlockVideoMinPercent: Number(row.unlock_video_min_percent || 80),
    unlockButtonText: row.unlock_button_text || 'Desbloquear cupom',
    waitingText: row.waiting_text || null,
    successTitle: row.success_title || null,
    successMessage: row.success_message || null,
    copyButtonText: row.copy_button_text || 'Copiar cupom',
    copiedText: row.copied_text || 'Cupom copiado',
    siteCtaEnabled: row.site_cta_enabled !== false,
    siteCtaText: row.site_cta_text || 'Aproveitar oferta',
    siteUrl: row.site_url || null,
    scheduleEnabled: Boolean(row.schedule_enabled),
    unlockStartsAt: row.unlock_starts_at || null,
    unlockEndsAt: row.unlock_ends_at || null,
    timerEnabled: Boolean(row.timer_enabled),
    timerLabel: row.timer_label || 'Termina em',
    maxUnlocks: row.max_unlocks === null || row.max_unlocks === undefined ? null : Number(row.max_unlocks),
    showRemaining: Boolean(row.show_remaining),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeCode) campaign.couponCode = row.coupon_code || '';
  if (typeof totalUnlocks === 'number') {
    campaign.totalUnlocks = totalUnlocks;
    campaign.remainingUnlocks = campaign.maxUnlocks === null
      ? null
      : Math.max(0, campaign.maxUnlocks - totalUnlocks);
  }
  return campaign;
}

function campaignStatus(row: any, totalUnlocks: number, nowMs = Date.now()): 'scheduled' | 'available' | 'expired' | 'depleted' {
  if (!row.active) return 'expired';
  if (row.schedule_enabled && row.unlock_starts_at) {
    const starts = new Date(row.unlock_starts_at).getTime();
    if (Number.isFinite(starts) && starts > nowMs) return 'scheduled';
  }
  if (row.unlock_ends_at) {
    const ends = new Date(row.unlock_ends_at).getTime();
    if (Number.isFinite(ends) && ends <= nowMs) return 'expired';
  }
  if (row.max_unlocks !== null && row.max_unlocks !== undefined && totalUnlocks >= Number(row.max_unlocks)) {
    return 'depleted';
  }
  return 'available';
}

async function countUnlocks(supabase: any, campaignId: string): Promise<number> {
  const { count, error } = await supabase
    .from('coupon_events')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('event_type', 'unlocked');
  if (error) return 0;
  return Number(count || 0);
}

async function insertEvent(
  supabase: any,
  req: any,
  campaignId: string,
  visitorId: string,
  eventType: string,
  metadata: Record<string, any> = {},
) {
  if (!VISITOR_REGEX.test(visitorId)) return;
  const row = {
    campaign_id: campaignId,
    event_type: eventType,
    visitor_id: visitorId,
    device_type: detectDeviceType(req.headers?.['user-agent']),
    country_code: detectCountry(req),
    region: cleanHeader(req.headers?.['x-vercel-ip-country-region'], 80),
    city: cleanHeader(req.headers?.['x-vercel-ip-city'], 120),
    referrer: cleanText(metadata.referrer, 500),
    metadata: { ...metadata, referrer: undefined },
  };
  const { error } = await supabase.from('coupon_events').insert(row);
  if (error && String(error.code || '') !== '42P01') {
    console.warn('[Coupons] analytics event failed:', error.message);
  }
}

async function hasUnlocked(supabase: any, campaignId: string, visitorId: string): Promise<boolean> {
  if (!VISITOR_REGEX.test(visitorId)) return false;
  const { data } = await supabase
    .from('coupon_events')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('visitor_id', visitorId)
    .eq('event_type', 'unlocked')
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function claimUnlock(supabase: any, req: any, campaignId: string, visitorId: string, metadata: Record<string, any> = {}) {
  const { data, error } = await supabase.rpc('zhaya_coupon_claim', {
    p_campaign_id: campaignId,
    p_visitor_id: visitorId,
    p_device_type: detectDeviceType(req.headers?.['user-agent']),
    p_country_code: detectCountry(req),
    p_region: cleanHeader(req.headers?.['x-vercel-ip-country-region'], 80),
    p_city: cleanHeader(req.headers?.['x-vercel-ip-city'], 120),
    p_metadata: metadata || {},
  });

  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return { allowed: Boolean(row?.claimed), reason: String(row?.reason || '') };
  }

  // Compatibilidade defensiva caso a função ainda não exista enquanto o SQL novo
  // não foi executado. O índice único continua impedindo duplicidade por visitante.
  if (await hasUnlocked(supabase, campaignId, visitorId)) return { allowed: true, reason: 'already' };
  await insertEvent(supabase, req, campaignId, visitorId, 'unlocked', metadata);
  return { allowed: true, reason: 'fallback' };
}

function sanitizeAdminCampaign(body: any) {
  const slug = slugify(body.slug || body.name || body.title || 'cupom');
  const unlockMode = normalizeUnlockMode(body.unlockMode);
  const maxUnlocksRaw = Number(body.maxUnlocks);
  const maxUnlocks = body.maxUnlocks === null || body.maxUnlocks === '' || body.maxUnlocks === undefined
    ? null
    : Math.max(1, Math.min(1000000, Math.round(maxUnlocksRaw || 1)));
  return {
    name: cleanRequiredText(body.name, 'Nova campanha', 120),
    slug: SLUG_REGEX.test(slug) ? slug : `cupom-${Date.now()}`,
    active: Boolean(body.active),
    eyebrow: cleanText(body.eyebrow, 100),
    title: cleanRequiredText(body.title, 'Cupom exclusivo', 220),
    subtitle: cleanText(body.subtitle, 800),
    logo_url: cleanUrl(body.logoUrl),
    background_color: cleanColor(body.backgroundColor, '#000000'),
    background_image_url: cleanUrl(body.backgroundImageUrl),
    background_video_url: cleanUrl(body.backgroundVideoUrl),
    background_overlay: clamp(body.backgroundOverlay, 0, 0.95, 0.34),
    background_blur: clamp(body.backgroundBlur, 0, 40, 0),
    text_color: cleanColor(body.textColor, '#FFFFFF'),
    muted_text_color: cleanColor(body.mutedTextColor, '#B7B7B7'),
    accent_color: cleanColor(body.accentColor, '#FFFFFF'),
    button_background_color: cleanColor(body.buttonBackgroundColor, '#FFFFFF'),
    button_text_color: cleanColor(body.buttonTextColor, '#000000'),
    coupon_code: cleanRequiredText(body.couponCode, 'CUPOM', 100),
    unlock_mode: unlockMode,
    unlock_delay_seconds: unlockMode === 'countdown' ? Math.round(clamp(body.unlockDelaySeconds, 1, 3600, 10)) : 0,
    unlock_video_url: unlockMode === 'video' ? cleanUrl(body.unlockVideoUrl) : cleanUrl(body.unlockVideoUrl),
    unlock_video_min_percent: Math.round(clamp(body.unlockVideoMinPercent, 10, 100, 80)),
    unlock_button_text: cleanRequiredText(body.unlockButtonText, 'Desbloquear cupom', 100),
    waiting_text: cleanText(body.waitingText, 300),
    success_title: cleanText(body.successTitle, 180),
    success_message: cleanText(body.successMessage, 500),
    copy_button_text: cleanRequiredText(body.copyButtonText, 'Copiar cupom', 100),
    copied_text: cleanRequiredText(body.copiedText, 'Cupom copiado', 100),
    site_cta_enabled: body.siteCtaEnabled !== false,
    site_cta_text: cleanRequiredText(body.siteCtaText, 'Aproveitar oferta', 100),
    site_url: cleanUrl(body.siteUrl),
    schedule_enabled: Boolean(body.scheduleEnabled),
    unlock_starts_at: cleanIso(body.unlockStartsAt),
    unlock_ends_at: cleanIso(body.unlockEndsAt),
    timer_enabled: Boolean(body.timerEnabled),
    timer_label: cleanRequiredText(body.timerLabel, 'Termina em', 100),
    max_unlocks: maxUnlocks,
    show_remaining: Boolean(body.showRemaining),
    updated_at: new Date().toISOString(),
  };
}

async function requireAdmin(req: any, res: any) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: auth.error });
    return null;
  }
  return auth;
}

export default async function handler(req: any, res: any) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'SUPABASE_NOT_CONFIGURED' });
  }

  const rawMode = readMode(req);
  const mode = rawMode.startsWith('coupon-') ? rawMode.slice('coupon-'.length) : rawMode;

  try {
    if (mode === 'admin-list') {
      if (!await requireAdmin(req, res)) return;
      const { data, error } = await supabase
        .from('coupon_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) {
        const missing = String(error.code || '') === '42P01';
        return res.status(missing ? 409 : 500).json({
          success: false,
          error: missing ? 'COUPONS_TABLE_MISSING' : 'DATABASE_ERROR',
          message: error.message,
        });
      }
      const rows = data || [];
      const campaigns = [];
      for (const row of rows) {
        const totalUnlocks = await countUnlocks(supabase, row.id);
        campaigns.push(dbToCampaign(row, true, totalUnlocks));
      }
      return res.status(200).json({ success: true, campaigns });
    }

    if (mode === 'admin-save') {
      const auth = await requireAdmin(req, res);
      if (!auth) return;
      if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const body = parseBody(req);
      const payload = sanitizeAdminCampaign(body);
      const id = typeof body.id === 'string' && UUID_REGEX.test(body.id) ? body.id : null;
      let query: any;
      if (id) {
        query = supabase.from('coupon_campaigns').update(payload).eq('id', id).select('*').single();
      } else {
        query = supabase.from('coupon_campaigns').insert({
          ...payload,
          created_by: auth.user?.id || auth.user?.email || null,
        }).select('*').single();
      }
      const { data, error } = await query;
      if (error) {
        const duplicate = String(error.code || '') === '23505';
        return res.status(duplicate ? 409 : 500).json({
          success: false,
          error: duplicate ? 'SLUG_ALREADY_EXISTS' : 'DATABASE_ERROR',
          message: duplicate ? 'Este endereço já está sendo usado por outra campanha.' : error.message,
        });
      }
      const totalUnlocks = await countUnlocks(supabase, data.id);
      return res.status(200).json({ success: true, campaign: dbToCampaign(data, true, totalUnlocks) });
    }

    if (mode === 'admin-delete') {
      if (!await requireAdmin(req, res)) return;
      if (req.method !== 'DELETE' && req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const id = readParam(req, 'id') || String(parseBody(req).id || '');
      if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'INVALID_ID' });
      const { error } = await supabase.from('coupon_campaigns').delete().eq('id', id);
      if (error) return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      return res.status(200).json({ success: true });
    }

    if (mode === 'analytics') {
      if (!await requireAdmin(req, res)) return;
      const id = readParam(req, 'id');
      if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'INVALID_ID' });
      const { data, error } = await supabase
        .from('coupon_events')
        .select('event_type, visitor_id, device_type, created_at')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(30000);
      if (error) return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      const events = data || [];
      const count = (type: string) => events.filter((e: any) => e.event_type === type).length;
      const uniqueVisitors = new Set(events.filter((e: any) => e.event_type === 'page_view').map((e: any) => e.visitor_id)).size;
      const pageViews = count('page_view');
      const unlocked = count('unlocked');
      const copies = count('copy');
      const siteClicks = count('site_click');
      const devices: Record<string, number> = {};
      for (const event of events.filter((e: any) => e.event_type === 'page_view')) {
        const key = String(event.device_type || 'unknown');
        devices[key] = (devices[key] || 0) + 1;
      }
      return res.status(200).json({
        success: true,
        analytics: {
          campaignId: id,
          pageViews,
          uniqueVisitors,
          unlockClicks: count('unlock_click'),
          unlocked,
          copies,
          siteClicks,
          videoStarts: count('video_started'),
          videoCompleted: count('video_completed'),
          unlockRate: pageViews > 0 ? (unlocked / pageViews) * 100 : 0,
          copyRate: unlocked > 0 ? (copies / unlocked) * 100 : 0,
          siteClickRate: unlocked > 0 ? (siteClicks / unlocked) * 100 : 0,
          devices,
        },
      });
    }

    if (mode === 'public') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const slug = slugify(readParam(req, 'slug'));
      if (!slug) return res.status(400).json({ error: 'INVALID_SLUG' });
      const { data: row, error } = await supabase
        .from('coupon_campaigns')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) {
        const missing = String(error.code || '') === '42P01';
        return res.status(missing ? 409 : 500).json({ success: false, error: missing ? 'COUPONS_TABLE_MISSING' : 'DATABASE_ERROR' });
      }
      if (!row) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const totalUnlocks = await countUnlocks(supabase, row.id);
      const campaign: any = dbToCampaign(row, false, totalUnlocks);
      campaign.status = campaignStatus(row, totalUnlocks);
      campaign.serverNow = new Date().toISOString();
      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5, stale-while-revalidate=10');
      return res.status(200).json({ success: true, campaign });
    }

    if (mode === 'unlock-status') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const body = parseBody(req);
      const campaignId = String(body.campaignId || '').trim();
      const visitorId = String(body.visitorId || '').trim();
      if (!UUID_REGEX.test(campaignId) || !VISITOR_REGEX.test(visitorId)) {
        return res.status(400).json({ success: false, error: 'INVALID_REQUEST' });
      }
      const { data: row, error } = await supabase
        .from('coupon_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();
      if (error || !row) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const totalUnlocks = await countUnlocks(supabase, campaignId);
      const status = campaignStatus(row, totalUnlocks);
      const unlocked = await hasUnlocked(supabase, campaignId, visitorId);
      const mayReuseUnlocked = unlocked && (status === 'available' || status === 'depleted');
      return res.status(200).json({
        success: true,
        unlocked: mayReuseUnlocked,
        couponCode: mayReuseUnlocked ? row.coupon_code : null,
        status,
      });
    }

    if (mode === 'event') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const body = parseBody(req);
      const campaignId = String(body.campaignId || '').trim();
      const visitorId = String(body.visitorId || '').trim();
      const eventType = String(body.eventType || '').trim();
      const allowed = new Set(['page_view', 'copy', 'site_click', 'video_started', 'video_completed']);
      if (!UUID_REGEX.test(campaignId) || !VISITOR_REGEX.test(visitorId) || !allowed.has(eventType)) {
        return res.status(400).json({ success: false, error: 'INVALID_EVENT' });
      }
      await insertEvent(supabase, req, campaignId, visitorId, eventType, {
        referrer: cleanText(body.referrer, 500),
        progress: clamp(body.progress, 0, 100, 0),
      });
      return res.status(200).json({ success: true });
    }

    if (mode === 'unlock-start' || mode === 'unlock-reveal') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
      const body = parseBody(req);
      const campaignId = String(body.campaignId || '').trim();
      const visitorId = String(body.visitorId || '').trim();
      if (!UUID_REGEX.test(campaignId) || !VISITOR_REGEX.test(visitorId)) {
        return res.status(400).json({ success: false, error: 'INVALID_REQUEST' });
      }
      const { data: row, error } = await supabase
        .from('coupon_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();
      if (error || !row) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
      const totalUnlocks = await countUnlocks(supabase, campaignId);
      const status = campaignStatus(row, totalUnlocks);
      const previouslyUnlocked = await hasUnlocked(supabase, campaignId, visitorId);
      if (previouslyUnlocked && (status === 'available' || status === 'depleted')) {
        return res.status(200).json({
          success: true,
          unlocked: true,
          couponCode: row.coupon_code,
          copiedText: row.copied_text || 'Cupom copiado',
          returning: true,
        });
      }
      if (status !== 'available') {
        return res.status(409).json({ success: false, error: `CAMPAIGN_${status.toUpperCase()}`, status });
      }

      const unlockMode = normalizeUnlockMode(row.unlock_mode);
      if (mode === 'unlock-start') {
        if (unlockMode === 'immediate') {
          await insertEvent(supabase, req, campaignId, visitorId, 'unlock_click', { mode: 'immediate' });
          const claim = await claimUnlock(supabase, req, campaignId, visitorId, { mode: 'immediate' });
          if (!claim.allowed) return res.status(409).json({ success: false, error: `CAMPAIGN_${String(claim.reason || 'depleted').toUpperCase()}` });
          return res.status(200).json({ success: true, unlocked: true, couponCode: row.coupon_code });
        }
        if (unlockMode === 'countdown') {
          const delaySeconds = Math.max(1, Math.min(3600, Number(row.unlock_delay_seconds || 10)));
          const unlockAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
          await insertEvent(supabase, req, campaignId, visitorId, 'unlock_click', { mode: 'countdown', unlockAt });
          return res.status(200).json({ success: true, unlocked: false, mode: 'countdown', unlockAt, delaySeconds });
        }
        await insertEvent(supabase, req, campaignId, visitorId, 'unlock_click', {
          mode: 'video',
          requiredPercent: Number(row.unlock_video_min_percent || 80),
        });
        return res.status(200).json({
          success: true,
          unlocked: false,
          mode: 'video',
          requiredPercent: Number(row.unlock_video_min_percent || 80),
        });
      }

      if (unlockMode === 'countdown') {
        const { data: startEvent } = await supabase
          .from('coupon_events')
          .select('metadata, created_at')
          .eq('campaign_id', campaignId)
          .eq('visitor_id', visitorId)
          .eq('event_type', 'unlock_click')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const unlockAt = new Date(startEvent?.metadata?.unlockAt || '').getTime();
        if (!Number.isFinite(unlockAt) || Date.now() + 250 < unlockAt) {
          return res.status(409).json({ success: false, error: 'COUNTDOWN_NOT_FINISHED', unlockAt: startEvent?.metadata?.unlockAt || null });
        }
      }
      if (unlockMode === 'video') {
        const progress = clamp(body.videoProgress, 0, 100, 0);
        const required = Math.max(10, Math.min(100, Number(row.unlock_video_min_percent || 80)));
        if (progress + 0.01 < required) {
          return res.status(409).json({ success: false, error: 'VIDEO_NOT_FINISHED', requiredPercent: required });
        }
      }
      const claim = await claimUnlock(supabase, req, campaignId, visitorId, { mode: unlockMode });
      if (!claim.allowed) return res.status(409).json({ success: false, error: `CAMPAIGN_${String(claim.reason || 'depleted').toUpperCase()}` });
      return res.status(200).json({ success: true, unlocked: true, couponCode: row.coupon_code });
    }

    return res.status(404).json({ success: false, error: 'COUPONS_ROUTE_NOT_FOUND' });
  } catch (err: any) {
    console.error('[Coupons API]', err?.message || err);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro interno.' });
  }
}
