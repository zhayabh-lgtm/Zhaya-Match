import { supabase, isSupabaseConfigured } from './supabase';

export type CloudinaryResourceType = 'image' | 'video' | 'raw';
export interface CloudinaryMediaAsset {
  publicId: string;
  url: string;
  resourceType: CloudinaryResourceType;
  format?: string | null;
  bytes?: number | null;
  createdAt?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  name?: string | null;
  thumbnailUrl?: string | null;
}

let libraryCache: { at: number; configured: boolean; assets: CloudinaryMediaAsset[] } | null = null;
const LIBRARY_CACHE_MS = 60_000;

async function adminHeaders(json = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
  if (isSupabaseConfigured && supabase) {
    const token = (await supabase.auth.getSession())?.data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getCloudinaryMediaLibrary(resourceType: CloudinaryResourceType | 'all' = 'all'): Promise<{ configured: boolean; assets: CloudinaryMediaAsset[]; error?: string }> {
  try {
    if (resourceType === 'all' && libraryCache && Date.now() - libraryCache.at < LIBRARY_CACHE_MS) {
      return { configured: libraryCache.configured, assets: libraryCache.assets };
    }
    const headers = await adminHeaders();
    const res = await fetch(`/api/best-sellers?mode=admin-media&action=cloudinary-library&resourceType=${encodeURIComponent(resourceType)}`, { headers, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { configured: json.configured !== false, assets: [], error: json.message || 'Não foi possível abrir a biblioteca do Cloudinary.' };
    const result = { configured: json.configured !== false, assets: Array.isArray(json.assets) ? json.assets : [] };
    if (resourceType === 'all') libraryCache = { at: Date.now(), ...result };
    return result;
  } catch (error: any) {
    return { configured: false, assets: [], error: error?.message || 'Erro ao carregar Cloudinary.' };
  }
}

export async function uploadFileToCloudinary(file: File, resourceType: CloudinaryResourceType, purpose: string): Promise<CloudinaryMediaAsset> {
  const headers = await adminHeaders(true);
  const signRes = await fetch('/api/best-sellers?mode=admin-media', {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'sign-cloudinary-upload', fileName: file.name, fileSize: file.size, resourceType, purpose }),
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !sign.success) throw new Error(sign.message || 'Não foi possível preparar o upload no Cloudinary.');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('public_id', sign.publicId);
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/${sign.resourceType}/upload`;
  const uploadRes = await fetch(endpoint, { method: 'POST', body: form });
  const uploaded = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploaded.secure_url) throw new Error(uploaded?.error?.message || 'Falha no upload para o Cloudinary.');
  const publicId = String(uploaded.public_id || sign.publicId);
  libraryCache = null;
  const videoPoster = sign.resourceType === 'video'
    ? `https://res.cloudinary.com/${encodeURIComponent(sign.cloudName)}/video/upload/so_0,f_jpg,q_auto/${publicId}.jpg`
    : uploaded.secure_url;
  return {
    publicId,
    url: String(uploaded.secure_url),
    resourceType: sign.resourceType,
    format: uploaded.format || null,
    bytes: Number(uploaded.bytes || file.size || 0),
    createdAt: uploaded.created_at || new Date().toISOString(),
    width: uploaded.width ? Number(uploaded.width) : null,
    height: uploaded.height ? Number(uploaded.height) : null,
    duration: uploaded.duration ? Number(uploaded.duration) : null,
    name: file.name,
    thumbnailUrl: videoPoster,
  };
}
