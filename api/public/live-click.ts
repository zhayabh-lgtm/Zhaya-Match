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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let slug: string | null = null;

  try {
    // 1. Extração do corpo (JSON string, objeto pré-parseado, ou x-www-form-urlencoded)
    if (req.body) {
      if (typeof req.body === 'object' && req.body.slug) {
        slug = String(req.body.slug);
      } else if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          if (parsed?.slug) slug = String(parsed.slug);
        } catch {
          const params = new URLSearchParams(req.body);
          if (params.get('slug')) {
            slug = params.get('slug');
          }
        }
      }
    }

    // 2. Extração via query parameters ou WHATWG URL
    if (!slug) {
      if (req.query?.slug) {
        slug = String(req.query.slug);
      } else if (req.url) {
        const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
        slug = url.searchParams.get('slug');
      }
    }
  } catch {
    // Tratamento silencioso de erros de parsing
  }

  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({ ok: false, error: 'MISSING_SLUG' });
  }

  const cleanSlug = slug.trim();

  // 3. Incremento server-side via Supabase Service Role
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && serviceKey && isServiceRoleKey(serviceKey)) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Tenta RPC atômico increment_live_invite_clicks se configurado
      const { error: rpcError } = await supabase.rpc('increment_live_invite_clicks', {
        invite_slug: cleanSlug,
      });

      // Fallback: se o RPC não existir, faz busca e update
      if (rpcError) {
        const { data: currentItem } = await supabase
          .from('live_invites')
          .select('clicks')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (currentItem) {
          const newClicks = (currentItem.clicks || 0) + 1;
          await supabase
            .from('live_invites')
            .update({ clicks: newClicks })
            .eq('slug', cleanSlug);
        }
      }
    } catch (err: any) {
      console.warn('[Live Click API] Erro ao incrementar clique no Supabase:', err?.message);
    }
  }

  // 4. Retorna sempre 200 OK sem bloquear o usuário
  return res.status(200).json({ ok: true });
}

