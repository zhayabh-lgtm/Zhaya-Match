import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const BUCKET = 'zhaya-match-media';
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeFileName(fileName: string): string {
  const clean = String(fileName || 'media').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return clean.slice(-120) || 'media';
}

function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/ogg': 'ogv',
  };
  return map[mimeType] || '';
}

function isAllowedMime(mediaType: 'image' | 'video', mimeType: string): boolean {
  if (mediaType === 'image') {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mimeType);
  }
  return ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'].includes(mimeType);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Service Role não configurado.' });
  }

  const body = req.body || {};
  const action = String(body.action || 'sign-upload');
  if (action !== 'sign-upload') {
    return res.status(400).json({ error: 'INVALID_ACTION' });
  }

  const mediaType = body.mediaType === 'video' ? 'video' : 'image';
  const mimeType = String(body.mimeType || '').toLowerCase();
  const fileSize = Number(body.fileSize || 0);
  const fileName = sanitizeFileName(String(body.fileName || 'media'));
  const purpose = body.purpose === 'background' ? 'backgrounds' : body.purpose === 'logo' ? 'logos' : 'products';

  if (!isAllowedMime(mediaType, mimeType)) {
    return res.status(400).json({
      error: 'INVALID_MEDIA_TYPE',
      message: mediaType === 'video' ? 'Use MP4, WebM, MOV ou OGV.' : 'Use PNG, JPG, WebP, GIF ou SVG.',
    });
  }

  const maxSize = mediaType === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize) {
    return res.status(400).json({
      error: 'INVALID_FILE_SIZE',
      message: mediaType === 'video' ? 'O vídeo deve ter no máximo 100MB.' : 'A imagem deve ter no máximo 10MB.',
    });
  }

  try {
    const ext = extensionFromMime(mimeType) || fileName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const stem = fileName.replace(/\.[^.]+$/, '').slice(0, 70) || 'media';
    const randomPart = Math.random().toString(36).slice(2, 10);
    const storagePath = `bestsellers/${purpose}/${mediaType}/${Date.now()}_${randomPart}_${stem}.${ext}`;

    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (signedError || !signed?.token) {
      return res.status(500).json({ error: 'SIGNED_UPLOAD_FAILED', message: signedError?.message || 'Não foi possível preparar o upload.' });
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    // Só vídeos entram no registro de limpeza. Imagens não precisam de retenção automática.
    if (mediaType === 'video') {
      const { error: registryError } = await supabase.from('best_seller_media_assets').upsert({
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: mediaType,
        mime_type: mimeType,
        file_size: Math.round(fileSize),
        last_used_at: new Date().toISOString(),
      }, { onConflict: 'storage_path' });

      if (registryError) {
        return res.status(500).json({
          error: 'MEDIA_REGISTRY_UNAVAILABLE',
          message: 'Execute o SQL de mídia de Mais Vendidos no Supabase antes de enviar vídeos.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      bucket: BUCKET,
      path: storagePath,
      token: signed.token,
      publicUrl,
      mediaType,
    });
  } catch (err: any) {
    console.error('[BestSellers Media] sign-upload error:', err);
    return res.status(500).json({ error: 'MEDIA_UPLOAD_PREPARE_FAILED', message: err?.message || 'Falha ao preparar upload.' });
  }
}
