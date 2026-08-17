import { createClient } from '@supabase/supabase-js';

const BUCKET = 'zhaya-match-media';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function collectReferencedVideos(lists: any[], products: any[]) {
  const paths = new Set<string>();
  const urls = new Set<string>();

  for (const list of lists || []) {
    if (typeof list?.background_video_path === 'string' && list.background_video_path.trim()) {
      paths.add(list.background_video_path.trim());
    }
    if (typeof list?.background_video_url === 'string' && list.background_video_url.trim()) {
      urls.add(list.background_video_url.trim());
    }
  }

  for (const product of products || []) {
    const items = Array.isArray(product?.media_items) ? product.media_items : [];
    for (const item of items) {
      if (item?.type !== 'video') continue;
      if (typeof item?.storagePath === 'string' && item.storagePath.trim()) paths.add(item.storagePath.trim());
      if (typeof item?.url === 'string' && item.url.trim()) urls.add(item.url.trim());
    }
  }

  return { paths, urls };
}

export async function cleanupUnusedBestSellerVideos(supabaseUrl: string, serviceRoleKey: string) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - THREE_DAYS_MS).toISOString();

  const [{ data: lists, error: listsError }, { data: products, error: productsError }] = await Promise.all([
    supabase.from('best_seller_lists').select('background_video_path, background_video_url'),
    supabase.from('best_seller_products').select('media_items'),
  ]);

  // Schema ainda não configurado: não compromete o cron de saúde.
  if (listsError || productsError) {
    return {
      ok: false,
      skipped: true,
      reason: listsError?.message || productsError?.message || 'Best sellers media schema unavailable',
      removed: 0,
    };
  }

  const referenced = collectReferencedVideos(lists || [], products || []);

  // "Touch" diário dos vídeos ainda em uso. Quando saem da lista/produto, passa a contar
  // uma janela real de aproximadamente 3 dias até a limpeza automática.
  if (referenced.paths.size > 0) {
    await supabase
      .from('best_seller_media_assets')
      .update({ last_used_at: nowIso })
      .in('storage_path', Array.from(referenced.paths));
  }
  if (referenced.urls.size > 0) {
    await supabase
      .from('best_seller_media_assets')
      .update({ last_used_at: nowIso })
      .in('public_url', Array.from(referenced.urls));
  }

  const { data: staleAssets, error: staleError } = await supabase
    .from('best_seller_media_assets')
    .select('id, storage_path, public_url, last_used_at')
    .eq('media_type', 'video')
    .lt('last_used_at', cutoffIso)
    .limit(200);

  if (staleError) {
    return { ok: false, skipped: true, reason: staleError.message, removed: 0 };
  }

  const removable = (staleAssets || []).filter((asset: any) => {
    const path = String(asset.storage_path || '');
    const url = String(asset.public_url || '');
    return !referenced.paths.has(path) && !referenced.urls.has(url);
  });

  if (removable.length === 0) return { ok: true, skipped: false, removed: 0 };

  const paths = removable.map((asset: any) => asset.storage_path).filter(Boolean);
  const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
  if (storageError) {
    return { ok: false, skipped: false, reason: storageError.message, removed: 0 };
  }

  await supabase
    .from('best_seller_media_assets')
    .delete()
    .in('id', removable.map((asset: any) => asset.id));

  return { ok: true, skipped: false, removed: removable.length };
}
