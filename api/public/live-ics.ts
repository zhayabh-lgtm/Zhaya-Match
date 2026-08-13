import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import { LiveInvitesStore } from '../../src/lib/liveInvitesStore.js';

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

function buildIcsResponse(res: any, cleanSlug: string, inviteData: { title: string; description?: string | null; starts_at: string; ends_at: string }) {
  const startDate = new Date(inviteData.starts_at);
  const endDate = new Date(inviteData.ends_at);
  const now = new Date();

  const dtStamp = formatIcsDate(now);
  const dtStart = formatIcsDate(startDate);
  const dtEnd = formatIcsDate(endDate);

  const summary = escapeIcsText(inviteData.title);
  const description = escapeIcsText(inviteData.description || 'Live Zhaya @shoes.zhaya');
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
    'LOCATION:Instagram @shoes.zhaya / Online',
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
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const slug = req.query?.slug || url.searchParams.get('slug');

  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Convite não encontrado.');
  }

  const cleanSlug = slug.trim();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Tenta buscar no Supabase
  if (supabaseUrl && serviceKey && isValidServiceRoleKey(serviceKey)) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from('live_invites')
        .select('title, description, starts_at, ends_at, timezone, active')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (!error && data && data.active) {
        return buildIcsResponse(res, cleanSlug, data);
      }
    } catch (err: any) {
      console.warn('[Public Live ICS API] Supabase query falhou, verificando store em memória:', err?.message);
    }
  }

  // 2. Fallback para store em memória
  const inMem = LiveInvitesStore.getBySlug(cleanSlug);
  if (inMem && inMem.active) {
    return buildIcsResponse(res, cleanSlug, {
      title: inMem.title,
      description: inMem.description,
      starts_at: inMem.startsAt,
      ends_at: inMem.endsAt,
    });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(404).send('Convite indisponível.');
}
