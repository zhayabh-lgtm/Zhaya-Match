import React, { useMemo, useState } from 'react';
import { Database, Film, Image as ImageIcon, Loader2, Search, X, File } from 'lucide-react';
import { getCloudinaryMediaLibrary, type CloudinaryMediaAsset, type CloudinaryResourceType } from '../../lib/cloudinaryMedia';

interface Props {
  allowedTypes?: CloudinaryResourceType[];
  onSelect: (asset: CloudinaryMediaAsset) => void;
  label?: string;
  className?: string;
  title?: string;
}

export const CloudinaryMediaPicker: React.FC<Props> = ({
  allowedTypes = ['image', 'video'],
  onSelect,
  label = 'Selecionar já enviado',
  className = 'px-3 py-2 border border-neutral-300 bg-white rounded text-[11px] font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer',
  title = 'Mídias já enviadas',
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [assets, setAssets] = useState<CloudinaryMediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CloudinaryResourceType | 'all'>('all');

  const load = async () => {
    setOpen(true);
    if (assets.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    const result = await getCloudinaryMediaLibrary('all');
    setConfigured(result.configured);
    setAssets(result.assets.filter((asset) => allowedTypes.includes(asset.resourceType)));
    setError(result.error || null);
    setLoading(false);
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (!allowedTypes.includes(asset.resourceType)) return false;
      if (typeFilter !== 'all' && asset.resourceType !== typeFilter) return false;
      if (!q) return true;
      return `${asset.name || ''} ${asset.publicId || ''} ${asset.format || ''}`.toLowerCase().includes(q);
    });
  }, [assets, search, typeFilter, allowedTypes]);

  const iconFor = (type: CloudinaryResourceType) => type === 'video' ? <Film className="w-4 h-4" /> : type === 'raw' ? <File className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />;

  return <>
    <button type="button" onClick={load} className={className}>
      <Database className="w-3.5 h-3.5" /> {label}
    </button>

    {open && <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[1px] p-4 flex items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="w-full max-w-3xl max-h-[86vh] bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Cloudinary • escolha um arquivo sem enviar novamente.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar mídia..." className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900" />
          </div>
          {allowedTypes.length > 1 && <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="px-3 py-2 border border-neutral-300 rounded bg-white text-xs">
            <option value="all">Todos</option>
            {allowedTypes.includes('image') && <option value="image">Imagens</option>}
            {allowedTypes.includes('video') && <option value="video">Vídeos</option>}
            {allowedTypes.includes('raw') && <option value="raw">Arquivos</option>}
          </select>}
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-[260px]">
          {loading ? <div className="py-16 text-center text-xs text-neutral-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando biblioteca...</div>
          : !configured ? <div className="py-12 text-center text-xs text-neutral-500">Cloudinary não está configurado no servidor.</div>
          : error ? <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
          : visible.length === 0 ? <div className="py-12 text-center text-xs text-neutral-500">Nenhuma mídia encontrada.</div>
          : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{visible.map((asset) => (
            <button key={`${asset.resourceType}:${asset.publicId}`} type="button" onClick={() => { onSelect(asset); setOpen(false); }} className="text-left border border-neutral-200 rounded-lg overflow-hidden bg-white hover:border-neutral-500 transition-colors cursor-pointer group">
              <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                {asset.resourceType === 'raw' ? <File className="w-8 h-8 text-neutral-300" /> : <img src={asset.thumbnailUrl || asset.url} alt="" className="w-full h-full object-cover" />}
                <span className="absolute left-2 top-2 bg-black/65 text-white rounded-full px-2 py-1 text-[9px] font-bold uppercase inline-flex items-center gap-1">{iconFor(asset.resourceType)}{asset.resourceType === 'video' ? 'Vídeo' : asset.resourceType === 'image' ? 'Imagem' : 'Arquivo'}</span>
              </div>
              <div className="p-2 min-w-0">
                <p className="text-[10px] font-semibold text-neutral-800 truncate">{asset.name || asset.publicId.split('/').pop()}</p>
                <p className="text-[9px] text-neutral-400 truncate mt-0.5">{asset.format?.toUpperCase() || asset.resourceType}</p>
              </div>
            </button>
          ))}</div>}
        </div>
      </div>
    </div>}
  </>;
};
