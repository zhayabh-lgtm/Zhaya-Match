import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';
import type { BestSellerList } from '../../src/types/zhaya.js';

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

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === '42P01' ||
    msg.includes('relation "best_seller_lists" does not exist') ||
    msg.includes('relation "public.best_seller_lists" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verificação de Autenticação do Administrador
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      error: 'SUPABASE_NOT_CONFIGURED',
      message: 'Variáveis de ambiente do Supabase (URL e Service Role Key) não configuradas no servidor.',
      tableConfigured: false,
    });
  }

  // 2. GET: Listar todas as listas ou uma específica
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const singleId = req.query?.id || url.searchParams.get('id');

      if (singleId) {
        const { data: listData, error: listError } = await supabase
          .from('best_seller_lists')
          .select('*')
          .eq('id', singleId)
          .maybeSingle();

        if (listError) {
          if (isTableMissingError(listError)) {
            return res.status(200).json({ list: null, tableConfigured: false });
          }
          return res.status(500).json({ error: 'DATABASE_ERROR', message: listError.message });
        }

        if (!listData) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Lista não encontrada.' });
        }

        const { data: productsData } = await supabase
          .from('best_seller_products')
          .select('*')
          .eq('list_id', singleId)
          .order('position', { ascending: true });

        const listProducts = (productsData || []).map((p) => ({
          id: p.id,
          listId: p.list_id,
          position: p.position,
          name: p.name,
          category: p.category,
          imageUrl: p.image_url,
          imageUrls: Array.isArray(p.image_urls) ? p.image_urls : [],
          productUrl: p.product_url || null,
          soldQuantity: p.sold_quantity ?? null,
          showSoldQuantity: p.show_sold_quantity ?? true,
          availableQuantity: p.available_quantity ?? null,
          sizes: p.sizes || [],
          colors: p.colors || [],
          badgeEnabled: Boolean(p.badge_enabled),
          badgeText: p.badge_text || null,
          badgeColor: p.badge_color || '#FFFFFF',
          clicks: typeof p.clicks === 'number' ? p.clicks : 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));

        const totalClicks = listProducts.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

        const formattedList: BestSellerList = {
          id: listData.id,
          title: listData.title,
          logoUrl: listData.logo_url || null,
          subtitle: listData.subtitle || null,
          listDate: listData.list_date,
          active: Boolean(listData.active),
          timerEnabled: Boolean(listData.timer_enabled),
          timerEnd: listData.timer_end || null,
          timezone: listData.timezone || 'America/Sao_Paulo',
          createdAt: listData.created_at,
          updatedAt: listData.updated_at,
          createdBy: listData.created_by || null,
          productsCount: listProducts.length,
          totalClicks,
          products: listProducts,
        };

        return res.status(200).json({
          success: true,
          list: formattedList,
          tableConfigured: true,
        });
      }

      // Lista geral
      const { data: listsData, error: listsError } = await supabase
        .from('best_seller_lists')
        .select('*, best_seller_products(id, clicks)')
        .order('list_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (listsError) {
        if (isTableMissingError(listsError)) {
          return res.status(200).json({
            lists: [],
            tableConfigured: false,
            message: 'Tabela best_seller_lists ainda não foi criada no Supabase.',
          });
        }
        return res.status(500).json({ error: 'DATABASE_ERROR', message: listsError.message });
      }

      const formattedLists: BestSellerList[] = (listsData || []).map((row) => {
        const prods = Array.isArray(row.best_seller_products) ? row.best_seller_products : [];
        const totalClicks = prods.reduce((sum: number, p: any) => sum + (typeof p?.clicks === 'number' ? p.clicks : 0), 0);

        return {
          id: row.id,
          title: row.title,
          logoUrl: row.logo_url || null,
          subtitle: row.subtitle || null,
          listDate: row.list_date,
          active: Boolean(row.active),
          timerEnabled: Boolean(row.timer_enabled),
          timerEnd: row.timer_end || null,
          timezone: row.timezone || 'America/Sao_Paulo',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by || null,
          productsCount: prods.length,
          totalClicks,
        };
      });

      return res.status(200).json({
        success: true,
        lists: formattedLists,
        tableConfigured: true,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] GET error:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao buscar listas.' });
    }
  }

  // 3. POST: Criar nova lista
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Ação de Duplicação de Lista (Item 30)
      if (body.action === 'duplicate') {
        const sourceListId = body.sourceListId;
        if (!sourceListId) {
          return res.status(400).json({ success: false, message: 'sourceListId é obrigatório para duplicação.' });
        }

        // Busca lista de origem
        const { data: srcList, error: srcListErr } = await supabase
          .from('best_seller_lists')
          .select('*')
          .eq('id', sourceListId)
          .single();

        if (srcListErr || !srcList) {
          return res.status(404).json({ success: false, message: 'Lista de origem não encontrada.' });
        }

        // Busca produtos da lista de origem
        const { data: srcProds, error: srcProdsErr } = await supabase
          .from('best_seller_products')
          .select('*')
          .eq('list_id', sourceListId)
          .order('position', { ascending: true });

        if (srcProdsErr) {
          return res.status(500).json({ success: false, message: 'Erro ao ler produtos da lista de origem.' });
        }

        const targetDate = body.newListDate || new Date().toISOString().slice(0, 10);
        const targetTitle = body.newTitle ? String(body.newTitle).trim() : `${srcList.title} (Cópia)`;

        // Cria nova lista (sempre inativa por segurança ao duplicar)
        const { data: newListData, error: createListErr } = await supabase
          .from('best_seller_lists')
          .insert({
            title: targetTitle,
            logo_url: srcList.logo_url || null,
            subtitle: srcList.subtitle || null,
            list_date: targetDate,
            active: false,
            timer_enabled: false,
            timer_end: null,
            timezone: srcList.timezone || 'America/Sao_Paulo',
            created_by: auth.user?.email || null,
          })
          .select()
          .single();

        if (createListErr || !newListData) {
          return res.status(500).json({ success: false, message: createListErr?.message || 'Erro ao criar cópia da lista.' });
        }

        // Copia todos os produtos vinculados ao novo list_id
        if (srcProds && srcProds.length > 0) {
          const prodsToInsert = srcProds.map((p) => ({
            list_id: newListData.id,
            position: p.position,
            name: p.name,
            category: p.category,
            image_url: p.image_url,
            image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
            product_url: p.product_url || null,
            sold_quantity: p.sold_quantity ?? null,
            show_sold_quantity: p.show_sold_quantity ?? true,
            available_quantity: p.available_quantity ?? null,
            sizes: p.sizes || [],
            colors: p.colors || [],
            badge_enabled: Boolean(p.badge_enabled),
            badge_text: p.badge_text || null,
            badge_color: p.badge_color || '#FFFFFF',
            clicks: 0,
          }));

          const { error: insertProdsErr } = await supabase
            .from('best_seller_products')
            .insert(prodsToInsert);

          if (insertProdsErr) {
            console.error('[Admin BestSellers API] Erro ao duplicar produtos da lista:', insertProdsErr);
          }
        }

        const duplicated: BestSellerList = {
          id: newListData.id,
          title: newListData.title,
          logoUrl: newListData.logo_url || null,
          subtitle: newListData.subtitle || null,
          listDate: newListData.list_date,
          active: false,
          timerEnabled: false,
          timerEnd: null,
          timezone: newListData.timezone,
          createdAt: newListData.created_at,
          updatedAt: newListData.updated_at,
          createdBy: newListData.created_by,
          productsCount: srcProds ? srcProds.length : 0,
          totalClicks: 0,
        };

        return res.status(201).json({
          success: true,
          list: duplicated,
          message: 'Lista duplicada com sucesso.',
        });
      }

      // Criação normal de lista
      const title = (body.title || 'Mais Vendidos do Dia').trim();
      const logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
      const subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      const listDate = body.listDate || new Date().toISOString().slice(0, 10);
      const active = Boolean(body.active);
      const timerEnabled = Boolean(body.timerEnabled);
      const timerEnd = timerEnabled && body.timerEnd ? body.timerEnd : null;
      const timezone = body.timezone || 'America/Sao_Paulo';

      if (!title) {
        return res.status(400).json({ success: false, message: 'O título da lista é obrigatório.' });
      }
      if (!listDate) {
        return res.status(400).json({ success: false, message: 'A data da lista é obrigatória.' });
      }

      // Regra: se esta lista estiver sendo criada como ativa, desativa todas as outras
      if (active) {
        await supabase
          .from('best_seller_lists')
          .update({ active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase
        .from('best_seller_lists')
        .insert({
          title,
          logo_url: logoUrl,
          subtitle,
          list_date: listDate,
          active,
          timer_enabled: timerEnabled,
          timer_end: timerEnd,
          timezone,
          created_by: auth.user?.email || null,
        })
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({
            success: false,
            tableConfigured: false,
            error: 'TABLE_NOT_CONFIGURED',
            message: 'Tabela best_seller_lists não encontrada. Execute o script SQL no Supabase para criá-la.',
          });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      const created: BestSellerList = {
        id: data.id,
        title: data.title,
        logoUrl: data.logo_url || null,
        subtitle: data.subtitle || null,
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timezone: data.timezone,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        productsCount: 0,
        totalClicks: 0,
      };

      return res.status(201).json({
        success: true,
        list: created,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] POST error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao criar lista.' });
    }
  }

  // 4. PUT / PATCH: Atualizar lista existente
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const id = body.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da lista é obrigatório para atualização.' });
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.title !== undefined) updates.title = String(body.title).trim();
      if (body.logoUrl !== undefined) updates.logo_url = body.logoUrl ? String(body.logoUrl).trim() : null;
      if (body.subtitle !== undefined) updates.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
      if (body.listDate !== undefined) updates.list_date = body.listDate;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.timerEnabled !== undefined) {
        updates.timer_enabled = Boolean(body.timerEnabled);
        updates.timer_end = updates.timer_enabled && body.timerEnd ? body.timerEnd : null;
      } else if (body.timerEnd !== undefined) {
        updates.timer_end = body.timerEnd;
      }

      if (body.active !== undefined) {
        const isActive = Boolean(body.active);
        updates.active = isActive;

        // Se ativando esta lista, desativa atomicamente as outras
        if (isActive) {
          await supabase
            .from('best_seller_lists')
            .update({ active: false })
            .neq('id', id);
        }
      }

      const { data, error } = await supabase
        .from('best_seller_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({
            success: false,
            tableConfigured: false,
            error: 'TABLE_NOT_CONFIGURED',
            message: 'Tabela best_seller_lists não encontrada no Supabase.',
          });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      const updated: BestSellerList = {
        id: data.id,
        title: data.title,
        logoUrl: data.logo_url || null,
        subtitle: data.subtitle || null,
        listDate: data.list_date,
        active: Boolean(data.active),
        timerEnabled: Boolean(data.timer_enabled),
        timerEnd: data.timer_end || null,
        timezone: data.timezone,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
      };

      return res.status(200).json({
        success: true,
        list: updated,
      });
    } catch (err: any) {
      console.error('[Admin BestSellers API] PUT error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao atualizar lista.' });
    }
  }

  // 5. DELETE: Excluir lista (Cascade deletará os produtos)
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      const id = req.query?.id || url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da lista é obrigatório para exclusão.' });
      }

      const { error } = await supabase
        .from('best_seller_lists')
        .delete()
        .eq('id', id);

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(400).json({ success: false, tableConfigured: false, message: 'Tabela não encontrada.' });
        }
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
      }

      return res.status(200).json({ success: true, message: 'Lista e produtos excluídos com sucesso.' });
    } catch (err: any) {
      console.error('[Admin BestSellers API] DELETE error:', err);
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Erro ao excluir lista.' });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
