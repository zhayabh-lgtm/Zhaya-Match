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
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const resources: any[] = [];
  let nextCursor = '';

  // A biblioteca pode crescer bastante. Pagina os resultados para o cálculo de
  // armazenamento refletir todo o acervo, e não somente os primeiros 500 itens.
  for (let page = 0; page < 20; page += 1) {
    const endpoint = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/${resourceType}/upload`);
    endpoint.searchParams.set('max_results', '500');
    endpoint.searchParams.set('direction', 'desc');
    endpoint.searchParams.set('fields', 'public_id,secure_url,url,resource_type,format,bytes,created_at,width,height,duration,display_name,original_filename');
    if (nextCursor) endpoint.searchParams.set('next_cursor', nextCursor);

    const response = await fetch(endpoint, { headers: { Authorization: `Basic ${auth}` } });
    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.error?.message || `Cloudinary Admin API: HTTP ${response.status}`);
    resources.push(...(Array.isArray(json.resources) ? json.resources : []));
    nextCursor = String(json.next_cursor || '');
    if (!nextCursor) break;
  }

  return resources.map((item: any) => ({
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

function guessResourceType(value: string, mimeType = ''): 'image' | 'video' | 'raw' {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const lower = String(value || '').toLowerCase().split('?')[0];
  if (/\.(jpe?g|png|webp|gif|svg|avif)$/i.test(lower)) return 'image';
  if (/\.(mp4|webm|mov|ogv|m4v)$/i.test(lower)) return 'video';
  return 'raw';
}

async function listSupabaseStorageFiles(supabase: any, bucket: string) {
  const out: Array<{ path: string; name: string; bytes: number; createdAt: string | null; mimeType: string | null }> = [];
  const queue: string[] = [''];
  const visited = new Set<string>();

  while (queue.length > 0 && visited.size < 500) {
    const prefix = queue.shift() || '';
    if (visited.has(prefix)) continue;
    visited.add(prefix);
    let offset = 0;
    for (let page = 0; page < 20; page += 1) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const items = Array.isArray(data) ? data : [];
      for (const item of items) {
        const path = prefix ? `${prefix}/${item.name}` : String(item.name || '');
        const metadata = (item as any)?.metadata || null;
        if ((item as any)?.id || metadata) {
          out.push({
            path,
            name: String(item.name || path.split('/').pop() || 'Arquivo'),
            bytes: Number(metadata.size || 0),
            createdAt: (item as any)?.updated_at || (item as any)?.created_at || null,
            mimeType: String(metadata.mimetype || metadata.contentType || '') || null,
          });
        } else if (path) {
          queue.push(path);
        }
      }
      if (items.length < 1000) break;
      offset += items.length;
    }
  }
  return out;
}

function scanReferenceValue(value: any, refs: Set<string>) {
  if (typeof value === 'string') {
    const clean = value.trim();
    if (clean) refs.add(clean);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanReferenceValue(item, refs));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => scanReferenceValue(item, refs));
  }
}

async function collectMediaReferences(supabase: any): Promise<string[]> {
  if (!supabase) return [];
  const refs = new Set<string>();
  const tables = ['best_seller_lists', 'best_seller_products', 'best_seller_product_library', 'best_seller_gift_library'];
  const results = await Promise.all(tables.map(async (table) => {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5000);
      if (error) return [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }));
  results.flat().forEach((row) => scanReferenceValue(row, refs));
  return Array.from(refs);
}

async function getStorageSnapshot() {
  const cloudinary = getCloudinaryConfig();
  const supabase = getSupabaseClient();
  const extensionBucket = String(process.env.ZHAYA_EXTENSION_BUCKET || process.env.SUPABASE_EXTENSION_BUCKET || 'zhaya-match-extension').trim() || 'zhaya-match-extension';
  const warnings: string[] = [];

  let cloudinaryAssets: any[] = [];
  if (cloudinary) {
    try {
      const groups = await Promise.all((['image', 'video', 'raw'] as const).map((type) => listCloudinaryResources(cloudinary, type)));
      cloudinaryAssets = groups.flat().filter((asset: any) => String(asset.publicId || '').startsWith('zhaya-match/'));
    } catch (error: any) {
      warnings.push(`Cloudinary: ${error?.message || 'falha ao consultar armazenamento'}`);
    }
  }

  let legacyFiles: Array<{ path: string; name: string; bytes: number; createdAt: string | null; mimeType: string | null }> = [];
  let extensionFiles: Array<{ path: string; name: string; bytes: number; createdAt: string | null; mimeType: string | null }> = [];
  if (supabase) {
    try {
      legacyFiles = await listSupabaseStorageFiles(supabase, BUCKET);
    } catch (error: any) {
      if (!/bucket|not found|does not exist/i.test(String(error?.message || ''))) warnings.push(`Supabase mídia: ${error?.message || 'falha ao consultar bucket'}`);
    }
    try {
      extensionFiles = await listSupabaseStorageFiles(supabase, extensionBucket);
    } catch (error: any) {
      if (!/bucket|not found|does not exist/i.test(String(error?.message || ''))) warnings.push(`Supabase extensão: ${error?.message || 'falha ao consultar bucket'}`);
    }
  }

  const cloudinaryBytes = cloudinaryAssets.reduce((sum, asset) => sum + Number(asset.bytes || 0), 0);
  const legacyBytes = legacyFiles.reduce((sum, asset) => sum + Number(asset.bytes || 0), 0);
  const extensionBytes = extensionFiles.reduce((sum, asset) => sum + Number(asset.bytes || 0), 0);
  return {
    cloudinary,
    supabase,
    extensionBucket,
    warnings,
    cloudinaryAssets,
    legacyFiles,
    extensionFiles,
    usage: {
      totalBytes: cloudinaryBytes + legacyBytes + extensionBytes,
      totalAssets: cloudinaryAssets.length + legacyFiles.length + extensionFiles.length,
      cloudinary: { bytes: cloudinaryBytes, count: cloudinaryAssets.length, configured: Boolean(cloudinary) },
      supabaseMedia: { bytes: legacyBytes, count: legacyFiles.length, bucket: BUCKET },
      extension: { bytes: extensionBytes, count: extensionFiles.length, bucket: extensionBucket },
    },
  };
}

async function deleteCloudinaryResource(config: { cloudName: string; apiKey: string; apiSecret: string }, resourceType: 'image' | 'video' | 'raw', publicId: string) {
  const endpoint = new URL(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/resources/${resourceType}/upload`);
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const form = new URLSearchParams();
  form.append('public_ids[]', publicId);
  form.append('invalidate', 'true');
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Cloudinary Admin API: HTTP ${response.status}`);
  return json;
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

  if (req.method === 'GET' && action === 'storage-usage') {
    try {
      const snapshot = await getStorageSnapshot();
      return res.status(200).json({ success: true, usage: snapshot.usage, warnings: snapshot.warnings });
    } catch (error: any) {
      console.error('[BestSellers Media] storage-usage error:', error);
      return res.status(500).json({ success: false, error: 'STORAGE_USAGE_FAILED', message: error?.message || 'Falha ao calcular armazenamento.' });
    }
  }

  if (req.method === 'GET' && action === 'storage-library') {
    try {
      const snapshot = await getStorageSnapshot();
      const references = await collectMediaReferences(snapshot.supabase);
      const isInUse = (asset: any) => references.some((ref) => {
        const clean = String(ref || '');
        if (!clean) return false;
        if (asset.provider === 'cloudinary') return clean === asset.url || (asset.publicId && clean.includes(asset.publicId));
        return clean === asset.url || clean === asset.path || (asset.path && clean.includes(asset.path));
      });

      const assets = [
        ...snapshot.cloudinaryAssets.map((asset: any) => ({
          id: `cloudinary:${asset.resourceType}:${asset.publicId}`,
          provider: 'cloudinary',
          publicId: asset.publicId,
          path: null,
          bucket: null,
          name: asset.name,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl || asset.url,
          resourceType: asset.resourceType,
          format: asset.format || null,
          bytes: Number(asset.bytes || 0),
          createdAt: asset.createdAt || null,
          width: asset.width || null,
          height: asset.height || null,
          duration: asset.duration || null,
        })),
        ...snapshot.legacyFiles.map((asset: any) => {
          const { data: publicUrlData } = snapshot.supabase.storage.from(BUCKET).getPublicUrl(asset.path);
          const url = String(publicUrlData?.publicUrl || '');
          const resourceType = guessResourceType(asset.path, asset.mimeType || '');
          return {
            id: `supabase:${BUCKET}:${asset.path}`,
            provider: 'supabase',
            publicId: null,
            path: asset.path,
            bucket: BUCKET,
            name: asset.name,
            url,
            thumbnailUrl: resourceType === 'image' ? url : null,
            resourceType,
            format: asset.path.includes('.') ? asset.path.split('.').pop()?.toLowerCase() || null : null,
            bytes: Number(asset.bytes || 0),
            createdAt: asset.createdAt || null,
            width: null,
            height: null,
            duration: null,
          };
        }),
      ].map((asset: any) => ({ ...asset, inUse: isInUse(asset) }))
        .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

      return res.status(200).json({ success: true, assets, usage: snapshot.usage, warnings: snapshot.warnings });
    } catch (error: any) {
      console.error('[BestSellers Media] storage-library error:', error);
      return res.status(500).json({ success: false, error: 'STORAGE_LIBRARY_FAILED', message: error?.message || 'Falha ao abrir a biblioteca.' });
    }
  }

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

  if (action === 'delete-media') {
    const provider = String(body.provider || '');
    try {
      if (provider === 'cloudinary') {
        const cloudinary = getCloudinaryConfig();
        if (!cloudinary) return res.status(500).json({ success: false, message: 'Cloudinary não está configurado.' });
        const resourceType = body.resourceType === 'video' ? 'video' : body.resourceType === 'raw' ? 'raw' : 'image';
        const publicId = String(body.publicId || '').trim();
        if (!publicId || !publicId.startsWith('zhaya-match/')) return res.status(400).json({ success: false, message: 'Mídia inválida.' });
        await deleteCloudinaryResource(cloudinary, resourceType, publicId);
        return res.status(200).json({ success: true });
      }

      if (provider === 'supabase') {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(500).json({ success: false, message: 'Supabase não está configurado.' });
        const bucket = String(body.bucket || BUCKET).trim();
        const path = String(body.path || '').trim();
        if (bucket !== BUCKET || !path.startsWith('bestsellers/')) return res.status(400).json({ success: false, message: 'Arquivo inválido.' });
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, message: 'Provedor de armazenamento inválido.' });
    } catch (error: any) {
      console.error('[BestSellers Media] delete-media error:', error);
      return res.status(500).json({ success: false, error: 'DELETE_MEDIA_FAILED', message: error?.message || 'Não foi possível excluir a mídia.' });
    }
  }

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
