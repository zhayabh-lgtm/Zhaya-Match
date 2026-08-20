import React, { useEffect, useMemo, useState } from 'react';
import { Film, HardDrive, Image as ImageIcon, Loader2, RefreshCw, Search, Trash2, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import {
  deleteZhayaStoredMedia,
  formatStorageBytes,
  getZhayaStorageLibrary,
  type StoredMediaAsset,
  type StoredMediaType,
  type ZhayaStorageUsage,
} from '../../lib/storageLibrary';

function normalizeAssetName(asset: StoredMediaAsset): string {
  const raw = String(asset.name || asset.path?.split('/').pop() || asset.publicId?.split('/').pop() || '').toLowerCase();
  return raw
    .replace(/^\d{10,}_[a-z0-9]+_/, '')
    .replace(/^\d{10,}_/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function duplicateKey(asset: StoredMediaAsset): string {
  return `${asset.resourceType}|${normalizeAssetName(asset)}|${Number(asset.bytes || 0)}`;
}

export const Biblioteca: React.FC = () => {
  const [assets, setAssets] = useState<StoredMediaAsset[]>([]);
  const [usage, setUsage] = useState<ZhayaStorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | StoredMediaType>('all');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await getZhayaStorageLibrary();
    if (!result.success) {
      setError(result.error || 'Não foi possível abrir a biblioteca.');
      setAssets([]);
      setUsage(null);
      setWarnings([]);
    } else {
      setAssets(result.assets);
      setUsage(result.usage || null);
      setWarnings(result.warnings || []);
      setSelected(new Set());
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const duplicateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of assets) {
      const key = duplicateKey(asset);
      if (!normalizeAssetName(asset) || !asset.bytes) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [assets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (type !== 'all' && asset.resourceType !== type) return false;
      if (onlyDuplicates && (duplicateCounts.get(duplicateKey(asset)) || 0) < 2) return false;
      if (!q) return true;
      return [asset.name, asset.path, asset.publicId, asset.format, asset.provider]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [assets, type, onlyDuplicates, search, duplicateCounts]);

  const selectedAssets = assets.filter((asset) => selected.has(asset.id));

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteAssets = async (items: StoredMediaAsset[]) => {
    if (items.length === 0) return;
    const used = items.filter((asset) => asset.inUse).length;
    const message = used > 0
      ? `${items.length} arquivo(s) serão apagados permanentemente. ${used} estão marcados como EM USO e podem sumir de vitrines. Deseja continuar?`
      : `${items.length} arquivo(s) serão apagados permanentemente do armazenamento. Deseja continuar?`;
    if (!window.confirm(message)) return;

    setDeleting(true);
    setError(null);
    const failed: string[] = [];
    for (const asset of items) {
      const result = await deleteZhayaStoredMedia(asset);
      if (!result.success) failed.push(`${asset.name}: ${result.error || 'erro'}`);
    }
    setDeleting(false);
    if (failed.length) setError(`Alguns arquivos não foram excluídos: ${failed.slice(0, 3).join(' · ')}${failed.length > 3 ? '…' : ''}`);
    await load();
  };

  const filteredIds = filtered.map((asset) => asset.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const toggleAllFiltered = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-neutral-900">Biblioteca</h1>
          <p className="text-xs text-neutral-500 mt-1">Veja e remova imagens e vídeos já enviados. Itens repetidos são sinalizados automaticamente.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || deleting}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded border border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 lg:col-span-1 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Armazenamento total</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900">{formatStorageBytes(usage?.totalBytes || 0)}</div>
          <div className="text-[10px] text-neutral-500 mt-1">{usage?.totalAssets || 0} arquivos contabilizados</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400"><ImageIcon className="w-3.5 h-3.5" /> Imagens</div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{assets.filter((asset) => asset.resourceType === 'image').length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400"><Film className="w-3.5 h-3.5" /> Vídeos</div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{assets.filter((asset) => asset.resourceType === 'video').length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400"><HardDrive className="w-3.5 h-3.5" /> Possíveis repetidos</div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{assets.filter((asset) => (duplicateCounts.get(duplicateKey(asset)) || 0) > 1).length}</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
          {warnings.join(' · ')}
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 min-w-0 flex-1">
            <label className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar arquivo..."
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="px-3 py-2 border border-neutral-300 rounded text-xs bg-white">
              <option value="all">Todos os tipos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
              <option value="raw">Outros</option>
            </select>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-neutral-300 text-xs font-medium text-neutral-700 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={onlyDuplicates} onChange={(e) => setOnlyDuplicates(e.target.checked)} className="accent-neutral-900" /> Só repetidos
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleAllFiltered} disabled={filtered.length === 0 || deleting} className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer">
              {allFilteredSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />} Selecionar visíveis
            </button>
            <button type="button" onClick={() => void deleteAssets(selectedAssets)} disabled={selectedAssets.length === 0 || deleting} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-40 cursor-pointer">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir {selectedAssets.length > 0 ? `(${selectedAssets.length})` : ''}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-xs text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando biblioteca...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500">Nenhum arquivo encontrado com esses filtros.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((asset) => {
              const isDuplicate = (duplicateCounts.get(duplicateKey(asset)) || 0) > 1;
              const isSelected = selected.has(asset.id);
              return (
                <div key={asset.id} className={`relative rounded-lg border overflow-hidden bg-neutral-50 ${isSelected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}>
                  <button type="button" onClick={() => toggleSelected(asset.id)} className="absolute top-2 left-2 z-10 bg-white/95 rounded p-1 shadow-sm cursor-pointer" aria-label="Selecionar arquivo">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-neutral-900" /> : <Square className="w-4 h-4 text-neutral-600" />}
                  </button>

                  <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                    {asset.resourceType === 'image' && asset.thumbnailUrl ? (
                      <img src={asset.thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : asset.resourceType === 'video' && asset.thumbnailUrl ? (
                      <div className="relative w-full h-full">
                        <img src={asset.thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10"><Film className="w-7 h-7 text-white drop-shadow" /></div>
                      </div>
                    ) : (
                      <HardDrive className="w-8 h-8 text-neutral-400" />
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-neutral-900 truncate" title={asset.name}>{asset.name}</div>
                      <div className="text-[9px] text-neutral-500 mt-0.5">{formatStorageBytes(asset.bytes)} · {asset.provider === 'cloudinary' ? 'Cloudinary' : 'Supabase'}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {isDuplicate && <span className="text-[8px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5">Possível repetido</span>}
                      {asset.inUse && <span className="text-[8px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 rounded-full px-1.5 py-0.5">Em uso</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteAssets([asset])}
                      disabled={deleting}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded border border-red-200 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 text-[10px] text-neutral-500 border-t border-neutral-100 pt-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Excluir remove o arquivo do armazenamento de forma permanente. A etiqueta “Em uso” indica que o arquivo foi encontrado nas configurações atuais de vitrines, produtos, presentes ou biblioteca de produtos.</span>
        </div>
      </div>
    </div>
  );
};
