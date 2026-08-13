import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { generateLiveSlug } from '../../src/lib/slugGenerator.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import { LiveInvitesStore } from '../../src/lib/liveInvitesStore.js';
import type { LiveInvite } from '../../src/types/zhaya.js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação de Autenticação do Administrador
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    if (auth.error === 'CONFIG_ERROR') {
      console.warn('[Live Invites API] Auth bypass para fallback local em memória');
    } else {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
    }
  }

  const supabase = getSupabaseClient();

  // 2. GET: Listar todos os convites (com fallback transparente em memória)
  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('live_invites')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted: LiveInvite[] = data.map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description || null,
            platform: row.platform || 'instagram',
            platformUrl: row.platform_url || 'https://instagram.com/shoes.zhaya',
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            timezone: row.timezone || 'America/Sao_Paulo',
            active: row.active ?? true,
            clicks: row.clicks ?? 0,
            createdAt: row.created_at,
            createdBy: row.created_by || null,
          }));

          // Atualiza também o store em memória para sincronização com consultas públicas
          for (const item of formatted) {
            LiveInvitesStore.save(item);
          }

          return res.status(200).json({
            invites: formatted,
            tableConfigured: true,
            storageMode: 'supabase',
          });
        }

        // Se o erro for de tabela ausente ou schema cache, faz fallback gracioso para memória
        if (error && LiveInvitesStore.isTableMissingError(error)) {
          console.info('[Live Invites API] Tabela live_invites não encontrada no Supabase. Utilizando fallback em memória.');
          return res.status(200).json({
            invites: LiveInvitesStore.getAll(),
            tableConfigured: false,
            storageMode: 'in_memory',
            note: 'Tabela opcional live_invites não encontrada no Supabase. Operando em memória.',
          });
        }

        if (error) {
          console.warn('[Live Invites API] Erro ao consultar Supabase, usando memória:', error.message);
          return res.status(200).json({
            invites: LiveInvitesStore.getAll(),
            tableConfigured: false,
            storageMode: 'in_memory',
          });
        }
      }

      // Fallback padrão em memória
      return res.status(200).json({
        invites: LiveInvitesStore.getAll(),
        tableConfigured: false,
        storageMode: 'in_memory',
      });
    } catch (err: any) {
      console.error('[Live Invites API] Exceção no GET:', err);
      return res.status(200).json({
        invites: LiveInvitesStore.getAll(),
        tableConfigured: false,
        storageMode: 'in_memory',
      });
    }
  }

  // 3. POST: Criar novo convite
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { title, description, platform, platformUrl, startsAt, endsAt } = body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'INVALID_TITLE', message: 'O título da live é obrigatório.' });
      }

      if (!startsAt || !endsAt) {
        return res.status(400).json({ error: 'INVALID_DATES', message: 'Horários de início e término são obrigatórios.' });
      }

      const startDate = new Date(startsAt);
      const endDate = new Date(endsAt);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'INVALID_DATES_FORMAT', message: 'Formato de data/hora inválido.' });
      }

      if (endDate <= startDate) {
        return res.status(400).json({ error: 'END_BEFORE_START', message: 'O horário de término deve ser posterior ao início.' });
      }

      const timezone = 'America/Sao_Paulo';
      const cleanTitle = title.trim();
      const cleanDesc = description && typeof description === 'string' && description.trim() ? description.trim() : null;
      const cleanPlatform = platform && typeof platform === 'string' && platform.trim() ? platform.trim().toLowerCase() : 'instagram';
      const cleanPlatformUrl = platformUrl && typeof platformUrl === 'string' && platformUrl.trim() ? platformUrl.trim() : 'https://instagram.com/shoes.zhaya';
      const slug = generateLiveSlug(16);
      const userEmail = auth.user?.email || 'admin@zhaya.com.br';

      // Tenta salvar no Supabase se configurado
      if (supabase) {
        const payload = {
          slug,
          title: cleanTitle,
          description: cleanDesc,
          platform: cleanPlatform,
          platform_url: cleanPlatformUrl,
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          timezone,
          active: true,
          created_by: userEmail,
        };

        const { data, error } = await supabase
          .from('live_invites')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          const newInvite: LiveInvite = {
            id: data.id,
            slug: data.slug,
            title: data.title,
            description: data.description || null,
            platform: data.platform || cleanPlatform,
            platformUrl: data.platform_url || cleanPlatformUrl,
            startsAt: data.starts_at,
            endsAt: data.ends_at,
            timezone: data.timezone || 'America/Sao_Paulo',
            active: data.active ?? true,
            clicks: data.clicks ?? 0,
            createdAt: data.created_at,
            createdBy: data.created_by || null,
          };

          LiveInvitesStore.save(newInvite);

          return res.status(201).json({
            success: true,
            invite: newInvite,
            tableConfigured: true,
            storageMode: 'supabase',
          });
        }

        if (error && !LiveInvitesStore.isTableMissingError(error)) {
          console.warn('[Live Invites API] Supabase retornou erro inesperado, salvando em memória:', error.message);
        }
      }

      // Fallback em memória
      const inMemInvite: LiveInvite = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        slug,
        title: cleanTitle,
        description: cleanDesc,
        platform: cleanPlatform,
        platformUrl: cleanPlatformUrl,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        timezone,
        active: true,
        clicks: 0,
        createdAt: new Date().toISOString(),
        createdBy: userEmail,
      };

      LiveInvitesStore.save(inMemInvite);

      return res.status(201).json({
        success: true,
        invite: inMemInvite,
        tableConfigured: false,
        storageMode: 'in_memory',
        note: 'Convite criado em memória (a tabela live_invites no Supabase é opcional).',
      });
    } catch (err: any) {
      console.error('[Live Invites API] Exceção no POST:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
    }
  }

  // 4. DELETE: Excluir convite
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = req.query?.id || url.searchParams.get('id');

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'MISSING_ID', message: 'ID do convite é obrigatório.' });
      }

      LiveInvitesStore.delete(id);

      if (supabase) {
        await supabase
          .from('live_invites')
          .delete()
          .eq('id', id);
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[Live Invites API] Exceção no DELETE:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
