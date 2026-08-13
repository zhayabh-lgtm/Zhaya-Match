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

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

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
    return res.status(404).json({
      success: false,
      status: 'not_found',
      message: 'Convite indisponível.',
    });
  }

  const cleanSlug = slug.trim();

  // 1. Consulta no Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const key = (serviceKey && isServiceRoleKey(serviceKey)) ? serviceKey : (anonKey || serviceKey);

  if (supabaseUrl && key) {
    try {
      const supabase = createClient(supabaseUrl, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from('live_invites')
        .select('title, description, platform, platform_url, starts_at, ends_at, timezone, active')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (!error && data) {
        if (!data.active) {
          return res.status(404).json({
            success: false,
            status: 'not_found',
            message: 'Convite indisponível.',
          });
        }

        const now = new Date();
        const endDate = new Date(data.ends_at);
        const isEnded = !isNaN(endDate.getTime()) && endDate.getTime() < now.getTime();

        const publicInvite = {
          title: data.title,
          description: data.description || null,
          platform: data.platform || 'instagram',
          platformUrl: data.platform_url || 'https://instagram.com/shoes.zhaya',
          startsAt: data.ends_at ? data.starts_at : data.starts_at,
          endsAt: data.ends_at,
          timezone: data.timezone || 'America/Sao_Paulo',
          status: isEnded ? 'ended' : 'active',
        };

        return res.status(200).json({
          success: true,
          invite: publicInvite,
        });
      }
    } catch (err: any) {
      console.warn('[Public Live Invite API] Erro ao consultar Supabase:', err?.message);
    }
  }

  return res.status(404).json({
    success: false,
    status: 'not_found',
    message: 'Convite indisponível.',
  });
}

