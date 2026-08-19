import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const DEFAULT_BUCKET = 'zhaya-match-extension';
const OBJECT_PATH = 'published/Zhaya-Match-Extensao.zip';
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getBucketName() {
  return String(process.env.ZHAYA_EXTENSION_BUCKET || process.env.SUPABASE_EXTENSION_BUCKET || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;
}

function cleanZipName(value: unknown) {
  const raw = String(value || 'Zhaya-Match-Extensao.zip').trim();
  const clean = raw.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
  return clean.toLowerCase().endsWith('.zip') ? clean : `${clean}.zip`;
}

function storageErrorMessage(error: any, bucket: string) {
  const msg = String(error?.message || error || 'Erro no Supabase Storage.');
  if (/bucket|not found|does not exist/i.test(msg)) {
    return `Bucket "${bucket}" não encontrado. Crie esse bucket no Supabase Storage ou configure ZHAYA_EXTENSION_BUCKET na Vercel.`;
  }
  return msg;
}

function isMissingBucketError(error: any) {
  const msg = String(error?.message || error || '');
  return /bucket|not found|does not exist/i.test(msg);
}

async function ensureBucket(supabase: any, bucket: string) {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (data && !error) return { ok: true };
  if (error && !isMissingBucketError(error)) return { ok: false, error };
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ['application/zip', 'application/x-zip-compressed'],
  });
  if (createError && !/already exists/i.test(String(createError.message || ''))) return { ok: false, error: createError };
  return { ok: true };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito.' });

  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ success: false, error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Service Role não configurado.' });
  const bucket = getBucketName();

  try {
    if (req.method === 'GET') {
      const { data: files, error: listError } = await supabase.storage.from(bucket).list('published', {
        limit: 20,
        search: 'Zhaya-Match-Extensao.zip',
      });
      if (listError) {
        if (isMissingBucketError(listError)) return res.status(200).json({ success: true, available: false, bucket });
        return res.status(400).json({ success: false, available: false, bucket, message: storageErrorMessage(listError, bucket) });
      }
      const file = (files || []).find((item: any) => item.name === 'Zhaya-Match-Extensao.zip');
      if (!file) return res.status(200).json({ success: true, available: false, bucket });

      const { data: signed, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(OBJECT_PATH, 600, {
        download: 'Zhaya-Match-Extensao.zip',
      });
      if (signedError || !signed?.signedUrl) {
        return res.status(400).json({ success: false, available: true, bucket, message: storageErrorMessage(signedError, bucket) });
      }
      const size = Number((file as any)?.metadata?.size || 0) || null;
      return res.status(200).json({
        success: true,
        available: true,
        bucket,
        fileName: 'Zhaya-Match-Extensao.zip',
        size,
        updatedAt: (file as any).updated_at || (file as any).created_at || null,
        downloadUrl: signed.signedUrl,
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = String(body.action || 'publish');
      if (action !== 'publish') return res.status(400).json({ success: false, message: 'Ação inválida.' });

      const fileName = cleanZipName(body.fileName);
      const fileSize = Number(body.fileSize || 0);
      const base64 = String(body.base64 || '').replace(/^data:[^;]+;base64,/, '').trim();
      if (!base64) return res.status(400).json({ success: false, message: 'Selecione o ZIP da extensão.' });
      if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ success: false, message: `A extensão deve ter no máximo ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.` });
      }
      if (!fileName.toLowerCase().endsWith('.zip')) return res.status(400).json({ success: false, message: 'Envie um arquivo .zip.' });

      let bytes: Buffer;
      try {
        bytes = Buffer.from(base64, 'base64');
      } catch {
        return res.status(400).json({ success: false, message: 'Não foi possível ler o ZIP enviado.' });
      }
      if (!bytes.length || bytes.length > MAX_FILE_SIZE) return res.status(400).json({ success: false, message: 'ZIP vazio ou acima do limite.' });

      const bucketReady = await ensureBucket(supabase, bucket);
      if (!bucketReady.ok) {
        return res.status(400).json({ success: false, bucket, message: storageErrorMessage(bucketReady.error, bucket) });
      }

      const { error: uploadError } = await supabase.storage.from(bucket).upload(OBJECT_PATH, bytes, {
        contentType: 'application/zip',
        cacheControl: '60',
        upsert: true,
        metadata: {
          originalName: fileName,
          publishedAt: new Date().toISOString(),
        },
      });
      if (uploadError) {
        return res.status(400).json({ success: false, bucket, message: storageErrorMessage(uploadError, bucket) });
      }

      const { data: signed, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(OBJECT_PATH, 600, {
        download: 'Zhaya-Match-Extensao.zip',
      });
      if (signedError) console.warn('[Zhaya extension] Não foi possível criar URL assinada após publicar:', signedError.message);

      return res.status(200).json({
        success: true,
        available: true,
        bucket,
        fileName: 'Zhaya-Match-Extensao.zip',
        originalName: fileName,
        size: bytes.length,
        updatedAt: new Date().toISOString(),
        downloadUrl: signed?.signedUrl || null,
      });
    }

    return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error?.message || 'Erro ao gerenciar a extensão.' });
  }
}
