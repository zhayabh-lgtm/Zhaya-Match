import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import { LiveInvitesStore } from '../../src/lib/liveInvitesStore.js';

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let slug: string | null = null;

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      slug = body.slug;
    }
    if (!slug) {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      slug = req.query?.slug || url.searchParams.get('slug');
    }
  } catch {
    // Ignore parsing errors
  }

  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({ ok: false, error: 'MISSING_SLUG' });
  }

  const cleanSlug = slug.trim();

  // 1. Sempre incrementa no store em memória (garante contagem mesmo sem tabela no Supabase)
  LiveInvitesStore.incrementClicks(cleanSlug);

  // 2. Incrementa no Supabase via Service Role se configurado
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && serviceKey && isValidServiceRoleKey(serviceKey)) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Tenta primeiro via RPC atômico
      const { error: rpcError } = await supabase.rpc('increment_live_invite_clicks', {
        invite_slug: cleanSlug,
      });

      // Se o RPC não existir, faz fallback para update direto
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
      console.warn('[Live Click API] Erro ao incrementar no Supabase:', err?.message);
    }
  }

  // Resposta segura e simples sem expor o total de cliques para o visitante público
  return res.status(200).json({ ok: true });
}
