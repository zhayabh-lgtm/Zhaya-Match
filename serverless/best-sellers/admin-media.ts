import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { verifyAdminAuth } from '../../src/lib/adminAuth.js';
import { isValidServiceRoleKey } from '../../src/lib/supabaseKeyValidator.js';

const BUCKET = 'zhaya-match-media';
const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;
const RAW_LIMIT = 10 * 1024 * 1024;

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey || !isValidServiceRoleKey(serviceKey)) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getCloudinaryConfig(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || '').trim();
  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      const cloudName = parsed.hostname;
      const apiKey = decodeURIComponent(parsed.username || '');
      const apiSecret = decodeURIComponent(parsed.password || '');
      if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
    } catch {
      // fallback abaixo
    }
  }
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function sanitizeFileName(fileName: string): string {
  const clean = String(fileName || 'media').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return clean.slice(-120) || 'media';
}

function sanitizeCloudinarySegment(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9/_-]/g, '-').replace(/-+/g, '-').replace(/^\/+|\/+$/g, '').slice(0, 180);
}

function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/ogg': 'ogv',
  };
  return map[mimeType] || '';
}

function isAllowedMime(mediaType: 'image' | 'video', mimeType: string): boolean {
  if (mediaType === 'image') return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mimeType);
  return ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'].includes(mimeType);
}

function cloudinaryPosterUrl(cloudName: string, publicId: string): string {
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/so_0,f_jpg,q_auto/${publicId}.jpg`;
}

function signCloudinaryParams(params: Record<string, string | number>, secret: string): string {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1').update(`${serialized}${secret}`).digest('hex');
}

async function listCloudinaryResources(config: { cloudName: string; apiKey: string; apiSecret: string }, resourceType: 'image' | 'video' | 'raw') {
  const endpoint = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/${resourceType}/upload`);
  endpoint.searchParams.set('max_results', '500');
  endpoint.searchParams.set('direction', 'desc');
  endpoint.searchParams.set('fields', 'public_id,secure_url,url,resource_type,format,bytes,created_at,width,height,duration,display_name,original_filename');
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const response = await fetch(endpoint, { headers: { Authorization: `Basic ${auth}` } });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary Admin API: HTTP ${response.status}`);
  return (Array.isArray(json.resources) ? json.resources : []).map((item: any) => ({
    publicId: String(item.public_id || ''),
    url: String(item.secure_url || item.url || ''),
    resourceType,
    format: item.format ? String(item.format) : null,
    bytes: Number(item.bytes || 0),
    createdAt: item.created_at ? String(item.created_at) : null,
    width: item.width ? Number(item.width) : null,
    height: item.height ? Number(item.height) : null,
    duration: item.duration ? Number(item.duration) : null,
    name: String(item.display_name || item.original_filename || String(item.public_id || '').split('/').pop() || 'Mídia'),
    thumbnailUrl: resourceType === 'video' ? cloudinaryPosterUrl(config.cloudName, String(item.public_id || '')) : String(item.secure_url || item.url || ''),
  }));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error || 'Acesso restrito ao administrador.' });

  const requestUrl = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const body = req.body || {};
  const action = String(body.action || req.query?.action || requestUrl.searchParams.get('action') || (req.method === 'GET' ? 'cloudinary-library' : 'sign-upload'));

  if (req.method === 'GET' && action === 'cloudinary-library') {
    const cloudinary = getCloudinaryConfig();
    if (!cloudinary) return res.status(200).json({ success: true, configured: false, assets: [] });
    const requested = String(req.query?.resourceType || requestUrl.searchParams.get('resourceType') || 'all');
    const types: Array<'image' | 'video' | 'raw'> = requested === 'image' ? ['image'] : requested === 'video' ? ['video'] : requested === 'raw' ? ['raw'] : ['image', 'video', 'raw'];
    try {
      const groups = await Promise.all(types.map((type) => listCloudinaryResources(cloudinary, type)));
      const assets = groups.flat().filter((asset) => asset.publicId && asset.url).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return res.status(200).json({ success: true, configured: true, assets });
    } catch (error: any) {
      console.error('[BestSellers Media] cloudinary-library error:', error);
      return res.status(502).json({ success: false, configured: true, error: 'CLOUDINARY_LIBRARY_FAILED', message: error?.message || 'Falha ao listar mídias do Cloudinary.' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  if (action === 'sign-cloudinary-upload') {
    const cloudinary = getCloudinaryConfig();
    if (!cloudinary) return res.status(500).json({ error: 'CLOUDINARY_NOT_CONFIGURED', message: 'Cloudinary não está configurado no servidor.' });
    const resourceType = body.resourceType === 'video' ? 'video' : body.resourceType === 'raw' ? 'raw' : 'image';
    const fileSize = Number(body.fileSize || 0);
    const maxSize = resourceType === 'video' ? VIDEO_LIMIT : resourceType === 'raw' ? RAW_LIMIT : IMAGE_LIMIT;
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize) {
      return res.status(400).json({ error: 'INVALID_FILE_SIZE', message: `Arquivo deve ter no máximo ${Math.round(maxSize / 1024 / 1024)}MB.` });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const purpose = sanitizeCloudinarySegment(String(body.purpose || 'media')) || 'media';
    const stem = sanitizeFileName(String(body.fileName || 'media')).replace(/\.[^.]+$/, '').slice(0, 70) || 'media';
    // Use o caminho no próprio public_id para funcionar tanto em contas Cloudinary com
    // pastas fixas quanto dinâmicas, sem depender do parâmetro legado `folder`.
    const publicId = `zhaya-match/${purpose}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${stem}`;
    const params = { public_id: publicId, timestamp };
    const signature = signCloudinaryParams(params, cloudinary.apiSecret);
    return res.status(200).json({ success: true, cloudName: cloudinary.cloudName, apiKey: cloudinary.apiKey, timestamp, signature, publicId, resourceType });
  }

  // Compatibilidade com uploads antigos no Supabase Storage.
  if (action !== 'sign-upload') return res.status(400).json({ error: 'INVALID_ACTION' });
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Service Role não configurado.' });

  const mediaType = body.mediaType === 'video' ? 'video' : 'image';
  const mimeType = String(body.mimeType || '').toLowerCase();
  const fileSize = Number(body.fileSize || 0);
  const fileName = sanitizeFileName(String(body.fileName || 'media'));
  const purposeKey = body.purpose === 'background' ? 'background' : body.purpose === 'logo' ? 'logo' : body.purpose === 'poster' ? 'poster' : body.purpose === 'gift' ? 'gift' : 'product';
  const purpose = purposeKey === 'background' ? 'backgrounds' : purposeKey === 'logo' ? 'logos' : purposeKey === 'poster' ? 'posters' : purposeKey === 'gift' ? 'gifts' : 'products';

  if (!isAllowedMime(mediaType, mimeType)) return res.status(400).json({ error: 'INVALID_MEDIA_TYPE', message: mediaType === 'video' ? 'Use MP4, WebM, MOV ou OGV.' : 'Use PNG, JPG, WebP, GIF ou SVG.' });
  const maxSize = mediaType === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSize) return res.status(400).json({ error: 'INVALID_FILE_SIZE', message: mediaType === 'video' ? 'O vídeo deve ter no máximo 100MB.' : 'A imagem deve ter no máximo 10MB.' });

  try {
    const ext = extensionFromMime(mimeType) || fileName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const stem = fileName.replace(/\.[^.]+$/, '').slice(0, 70) || 'media';
    const storagePath = `bestsellers/${purpose}/${mediaType}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${stem}.${ext}`;
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (signedError || !signed?.token) return res.status(500).json({ error: 'SIGNED_UPLOAD_FAILED', message: signedError?.message || 'Não foi possível preparar o upload.' });
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return res.status(200).json({ success: true, bucket: BUCKET, path: storagePath, token: signed.token, publicUrl: publicUrlData.publicUrl, mediaType });
  } catch (err: any) {
    return res.status(500).json({ error: 'MEDIA_UPLOAD_PREPARE_FAILED', message: err?.message || 'Falha ao preparar upload.' });
  }
}
