import { createClient } from '@supabase/supabase-js';

const BUCKET = 'zhaya-match-media';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function collectReferencedTemporaryMedia(lists: any[], products: any[]) {
  const paths = new Set<string>();
  const urls = new Set<string>();

  for (const list of lists || []) {
    // Vídeo de fundo enviado pelo painel.
    if (typeof list?.background_video_path === 'string' && list.background_video_path.trim()) paths.add(list.background_video_path.trim());
    if (typeof list?.background_video_url === 'string' && list.background_video_url.trim()) urls.add(list.background_video_url.trim());

    // Logos por upload são registradas pelo public_url; logos externas não existem no registry e são ignoradas naturalmente.
    if (typeof list?.logo_url === 'string' && list.logo_url.trim()) urls.add(list.logo_url.trim());
  }

  for (const product of products || []) {
    const items = Array.isArray(product?.media_items) ? product.media_items : [];
    for (const item of items) {
      if (item?.type !== 'video') continue;
      if (typeof item?.storagePath === 'string' && item.storagePath.trim()) paths.add(item.storagePath.trim());
      if (typeof item?.url === 'string' && item.url.trim()) urls.add(item.url.trim());
      // A capa automática pertence ao vídeo, não à biblioteca reutilizável de imagens.
      if (typeof item?.posterStoragePath === 'string' && item.posterStoragePath.trim()) paths.add(item.posterStoragePath.trim());
      if (typeof item?.posterUrl === 'string' && item.posterUrl.trim()) urls.add(item.posterUrl.trim());
    }
  }

  return { paths, urls };
}

/**
 * Limpa mídia temporária de Mais Vendidos depois de 7 dias sem qualquer referência:
 * - vídeos de produto;
 * - vídeos de fundo;
 * - logos enviadas por upload;
 * - capas JPG geradas automaticamente para vídeos.
 *
 * Imagens normais de produto NÃO entram neste registry, pois ficam disponíveis
 * permanentemente para a Biblioteca de Produtos.
 */
export async function cleanupUnusedBestSellerVideos(supabaseUrl: string, serviceRoleKey: string) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const [{ data: lists, error: listsError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from('best_seller_lists').select('logo_url, background_video_path, background_video_url'),
    supabase.from('best_seller_products').select('media_items'),
  ]);

  if (listsError || productsError) {
    return {
      ok: false,
      skipped: true,
      reason: listsError?.message || productsError?.message || 'Best sellers media schema unavailable',
      removed: 0,
    };
  }

  const referenced = collectReferencedTemporaryMedia(lists || [], products || []);

  // Enquanto a mídia continua referenciada, seu relógio de retenção é renovado pelo cron diário.
  if (referenced.paths.size > 0) {
    await supabase.from('best_seller_media_assets').update({ last_used_at: nowIso }).in('storage_path', Array.from(referenced.paths));
  }
  if (referenced.urls.size > 0) {
    await supabase.from('best_seller_media_assets').update({ last_used_at: nowIso }).in('public_url', Array.from(referenced.urls));
  }

  const { data: staleAssets, error: staleError } = await supabase
    .from('best_seller_media_assets')
    .select('id, storage_path, public_url, media_type, purpose, last_used_at')
    .lt('last_used_at', cutoffIso)
    .limit(250);

  if (staleError) return { ok: false, skipped: true, reason: staleError.message, removed: 0 };

  const removable = (staleAssets || []).filter((asset: any) => {
    const path = String(asset.storage_path || '');
    const url = String(asset.public_url || '');
    return !referenced.paths.has(path) && !referenced.urls.has(url);
  });

  if (removable.length === 0) return { ok: true, skipped: false, removed: 0 };

  const paths = removable.map((asset: any) => asset.storage_path).filter(Boolean);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
  if (storageError) return { ok: false, skipped: false, reason: storageError.message, removed: 0 };

  await supabase.from('best_seller_media_assets').delete().in('id', removable.map((asset: any) => asset.id));
  return { ok: true, skipped: false, removed: removable.length };
}
