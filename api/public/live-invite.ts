import { createClient } from '@supabase/supabase-js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import { LiveInvitesStore } from '../../src/lib/liveInvitesStore.js';
import type { PublicLiveInvite } from '../../src/types/zhaya.js';

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

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const slug = req.query?.slug || url.searchParams.get('slug');

  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({
      success: false,
      status: 'not_found',
      message: 'Slug inválido ou ausente.',
    });
  }

  const cleanSlug = slug.trim();

  // 1. Tenta buscar no Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && serviceKey && isValidServiceRoleKey(serviceKey)) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from('live_invites')
        .select('title, description, platform, platform_url, starts_at, ends_at, timezone, active')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (!error && data) {
        if (!data.active) {
          return res.status(200).json({
            success: true,
            invite: {
              title: data.title,
              description: data.description || null,
              platform: data.platform || 'instagram',
              platformUrl: data.platform_url || 'https://instagram.com/shoes.zhaya',
              startsAt: data.starts_at,
              endsAt: data.ends_at,
              timezone: data.timezone || 'America/Sao_Paulo',
              status: 'not_found',
            } satisfies PublicLiveInvite,
          });
        }

        const now = new Date();
        const endDate = new Date(data.ends_at);
        const isEnded = !isNaN(endDate.getTime()) && endDate.getTime() < now.getTime();

        const publicInvite: PublicLiveInvite = {
          title: data.title,
          description: data.description || null,
          platform: data.platform || 'instagram',
          platformUrl: data.platform_url || 'https://instagram.com/shoes.zhaya',
          startsAt: data.starts_at,
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
      console.warn('[Public Live Invite API] Supabase query falhou, verificando store em memória:', err?.message);
    }
  }

  // 2. Fallback gracioso para store em memória (caso a tabela ainda não tenha sido criada no Supabase)
  const inMemInvite = LiveInvitesStore.getPublicBySlug(cleanSlug);
  if (inMemInvite) {
    return res.status(200).json({
      success: true,
      invite: inMemInvite,
    });
  }

  return res.status(404).json({
    success: false,
    status: 'not_found',
  });
}
