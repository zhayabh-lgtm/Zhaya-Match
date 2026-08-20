import { supabase, isSupabaseConfigured } from './supabase';

export type StoredMediaProvider = 'cloudinary' | 'supabase';
export type StoredMediaType = 'image' | 'video' | 'raw';

export interface StoredMediaAsset {
  id: string;
  provider: StoredMediaProvider;
  publicId?: string | null;
  path?: string | null;
  bucket?: string | null;
  name: string;
  url: string;
  thumbnailUrl?: string | null;
  resourceType: StoredMediaType;
  format?: string | null;
  bytes: number;
  createdAt?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  inUse?: boolean;
}

export interface StorageProviderUsage {
  bytes: number;
  count: number;
  configured?: boolean;
  bucket?: string;
}

export interface ZhayaStorageUsage {
  totalBytes: number;
  totalAssets: number;
  cloudinary: StorageProviderUsage;
  supabaseMedia: StorageProviderUsage;
  extension: StorageProviderUsage;
}

async function adminHeaders(json = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
  if (isSupabaseConfigured && supabase) {
    const token = (await supabase.auth.getSession())?.data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getZhayaStorageUsage(): Promise<{ success: boolean; usage?: ZhayaStorageUsage; warnings?: string[]; error?: string }> {
  try {
    const headers = await adminHeaders();
    const res = await fetch('/api/best-sellers?mode=admin-media&action=storage-usage', { headers, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return { success: false, error: json.message || json.error || 'Não foi possível calcular o armazenamento.' };
    return { success: true, usage: json.usage as ZhayaStorageUsage, warnings: Array.isArray(json.warnings) ? json.warnings : [] };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao consultar armazenamento.' };
  }
}

export async function getZhayaStorageLibrary(): Promise<{ success: boolean; assets: StoredMediaAsset[]; usage?: ZhayaStorageUsage; warnings?: string[]; error?: string }> {
  try {
    const headers = await adminHeaders();
    const res = await fetch('/api/best-sellers?mode=admin-media&action=storage-library', { headers, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return { success: false, assets: [], error: json.message || json.error || 'Não foi possível abrir a biblioteca.' };
    return {
      success: true,
      assets: Array.isArray(json.assets) ? json.assets : [],
      usage: json.usage as ZhayaStorageUsage,
      warnings: Array.isArray(json.warnings) ? json.warnings : [],
    };
  } catch (error: any) {
    return { success: false, assets: [], error: error?.message || 'Erro ao abrir a biblioteca.' };
  }
}

export async function deleteZhayaStoredMedia(asset: StoredMediaAsset): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await adminHeaders(true);
    const res = await fetch('/api/best-sellers?mode=admin-media', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'delete-media',
        provider: asset.provider,
        publicId: asset.publicId || null,
        resourceType: asset.resourceType,
        bucket: asset.bucket || null,
        path: asset.path || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && json.success
      ? { success: true }
      : { success: false, error: json.message || json.error || 'Não foi possível excluir a mídia.' };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Erro ao excluir a mídia.' };
  }
}

export function formatStorageBytes(bytes: number): string {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024) return `${value.toFixed(0)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(value < 10 * 1024 ** 2 ? 2 : 1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}
