import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === '42P01' || msg.includes('best_seller_international_forms') || msg.includes('schema cache');
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, max) : '';
}

function cleanHeader(value: unknown, max: number): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const cleaned = cleanText(raw, max);
  return cleaned || null;
}

function detectCountryCode(req: any): string | null {
  const raw = req?.headers?.['x-vercel-ip-country'] || req?.headers?.['cf-ipcountry'] || req?.headers?.['x-country-code'] || '';
  const code = cleanText(Array.isArray(raw) ? raw[0] : raw, 2).toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function mapLead(row: any) {
  return {
    id: row.id,
    listId: row.list_id,
    listTitle: row.list_title || null,
    productId: row.product_id || null,
    productName: row.product_name || 'Produto',
    countryCode: row.country_code || null,
    locale: row.locale || null,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    status: row.status === 'contacted' ? 'contacted' : 'new',
    referrer: row.referrer || null,
    createdAt: row.created_at,
    contactedAt: row.contacted_at || null,
  };
}

export default async function handler(req: any, res: any) {
  const requestOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({ success: false, configured: false, error: 'SUPABASE_NOT_CONFIGURED' });
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      // Honeypot simples contra robôs. O campo nunca é exibido ao visitante.
      if (cleanText(body.website, 200)) return res.status(200).json({ success: true });

      const listId = cleanText(body.listId, 36);
      const productId = cleanText(body.productId, 36);
      const name = cleanText(body.name, 120);
      const email = cleanText(body.email, 180).toLowerCase();
      const phone = cleanText(body.phone, 60);
      const locale = cleanText(body.locale, 32) || null;
      const referrer = cleanText(body.referrer, 500) || null;

      if (!UUID_REGEX.test(listId) || !UUID_REGEX.test(productId)) {
        return res.status(400).json({ success: false, error: 'INVALID_PRODUCT' });
      }
      if (name.length < 2 || phone.replace(/\D+/g, '').length < 6 || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, error: 'INVALID_CONTACT' });
      }

      const { data: product, error: productError } = await supabase
        .from('best_seller_products')
        .select('id, list_id, name')
        .eq('id', productId)
        .eq('list_id', listId)
        .maybeSingle();

      if (productError || !product) {
        return res.status(400).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
      }

      const { data: list } = await supabase
        .from('best_seller_lists')
        .select('id, title')
        .eq('id', listId)
        .maybeSingle();

      // Evita cliques repetidos acidentais gerarem vários contatos idênticos.
      const duplicateSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: recentDuplicate } = await supabase
        .from('best_seller_international_forms')
        .select('id')
        .eq('product_id', product.id)
        .eq('email', email)
        .gte('created_at', duplicateSince)
        .limit(1)
        .maybeSingle();
      if (recentDuplicate?.id) return res.status(200).json({ success: true, leadId: recentDuplicate.id, duplicate: true });

      const { data, error } = await supabase
        .from('best_seller_international_forms')
        .insert({
          list_id: listId,
          list_title: cleanText(list?.title, 180) || null,
          product_id: product.id,
          product_name: cleanText(product.name, 180) || 'Produto',
          country_code: detectCountryCode(req),
          locale,
          name,
          email,
          phone,
          status: 'new',
          referrer,
          user_agent: cleanHeader(req.headers?.['user-agent'], 500),
        })
        .select('*')
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return res.status(503).json({ success: false, configured: false, error: 'FORMS_TABLE_MISSING' });
        }
        console.error('[BestSeller Forms] Erro ao salvar formulário:', error.message);
        return res.status(500).json({ success: false, error: 'DATABASE_ERROR' });
      }

      return res.status(201).json({ success: true, leadId: data.id });
    } catch (err: any) {
      console.error('[BestSeller Forms] Exceção no formulário público:', err?.message || err);
      return res.status(500).json({ success: false, error: 'FORM_SUBMIT_FAILED' });
    }
  }

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito.' });
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
      const listId = cleanText(req.query?.listId || url.searchParams.get('listId'), 36);
      const status = cleanText(req.query?.status || url.searchParams.get('status'), 20);

      let query = supabase
        .from('best_seller_international_forms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (listId && UUID_REGEX.test(listId)) query = query.eq('list_id', listId);
      if (status === 'new' || status === 'contacted') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) {
        if (isTableMissingError(error)) return res.status(200).json({ success: true, configured: false, leads: [] });
        return res.status(500).json({ success: false, configured: true, error: 'DATABASE_ERROR', message: error.message });
      }

      return res.status(200).json({ success: true, configured: true, leads: (data || []).map(mapLead) });
    } catch (err: any) {
      return res.status(500).json({ success: false, configured: true, error: 'FORMS_LOAD_FAILED', message: err?.message });
    }
  }

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const id = cleanText(body.id, 36);
    const status = cleanText(body.status, 20);
    if (!UUID_REGEX.test(id) || !['new', 'contacted'].includes(status)) {
      return res.status(400).json({ success: false, error: 'INVALID_UPDATE' });
    }

    const updates = {
      status,
      contacted_at: status === 'contacted' ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
      .from('best_seller_international_forms')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) {
      if (isTableMissingError(error)) return res.status(409).json({ success: false, configured: false, error: 'FORMS_TABLE_MISSING' });
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
    }
    return res.status(200).json({ success: true, lead: data ? mapLead(data) : null });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const id = cleanText(req.query?.id || url.searchParams.get('id'), 36);
    if (!UUID_REGEX.test(id)) return res.status(400).json({ success: false, error: 'INVALID_ID' });
    const { error } = await supabase.from('best_seller_international_forms').delete().eq('id', id);
    if (error) {
      if (isTableMissingError(error)) return res.status(409).json({ success: false, configured: false, error: 'FORMS_TABLE_MISSING' });
      return res.status(500).json({ success: false, error: 'DATABASE_ERROR', message: error.message });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
}
