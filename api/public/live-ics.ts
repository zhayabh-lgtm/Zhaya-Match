import { createClient } from '@supabase/supabase-js';

function isServiceRoleKey(key: string | undefined | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  if (clean.startsWith('sb_secret_')) return true;
  const parts = clean.split('.');
  if (parts.length === 3) {
    try {
      const payloadStr = typeof Buffer !== 'undefined'
        ? Buffer.from(parts[1], 'base64').toString('utf8')
        : atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadStr);
      return payload?.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

function escapeIcsText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildIcsResponse(res: any, cleanSlug: string, inviteData: { title: string; description?: string | null; platform_url?: string | null; starts_at: string; ends_at: string }) {
  const startDate = new Date(inviteData.starts_at);
  const endDate = new Date(inviteData.ends_at);
  const now = new Date();

  const dtStamp = formatIcsDate(now);
  const dtStart = formatIcsDate(startDate);
  const dtEnd = formatIcsDate(endDate);

  const summary = escapeIcsText(inviteData.title);
  const description = escapeIcsText(inviteData.description || 'Live Zhaya @shoes.zhaya');
  const location = escapeIcsText(inviteData.platform_url || 'Instagram @shoes.zhaya / Online');
  const uid = `live-${cleanSlug}@zhaya.com.br`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zhaya//Live Invites//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Live Zhaya @shoes.zhaya',
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="live-${cleanSlug}.ics"`);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).send(icsContent);
}

export default async function handler(req: any, res: any) {
  let slug: string | null = null;
  try {
    if (req.query?.slug) {
      slug = String(req.query.slug);
    } else if (req.url) {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      slug = url.searchParams.get('slug');
    }
  } catch {
    // Ignore parse errors
  }

  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Convite não encontrado.');
  }

  const cleanSlug = slug.trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const key = (serviceKey && isServiceRoleKey(serviceKey)) ? serviceKey : (anonKey || serviceKey);

  // 1. Tenta buscar no Supabase
  if (supabaseUrl && key) {
    try {
      const supabase = createClient(supabaseUrl, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from('live_invites')
        .select('title, description, platform_url, starts_at, ends_at, timezone, active')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (!error && data && data.active) {
        return buildIcsResponse(res, cleanSlug, data);
      }
    } catch (err: any) {
      console.warn('[Public Live ICS API] Supabase query falhou:', err?.message);
    }
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(404).send('Convite indisponível.');
}

