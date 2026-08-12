import React from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { Save, RotateCcw, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const PublishStatusBar: React.FC = () => {
  const {
    isDirty,
    status,
    version,
    lastPublishedAt,
    errorMessage,
    successMessage,
    publish,
    discard,
  } = useConfigDraft();

  const handleDiscardClick = () => {
    if (window.confirm('Tem certeza de que deseja descartar todas as alterações não publicadas e restaurar a versão anterior?')) {
      discard();
    }
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Left: Status Badge & Info */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-mono">
          Widget Zhaya (v{version})
        </span>

        {status === 'publishing' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Publicando…</span>
          </span>
        )}

        {status === 'draft' && isDirty && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Alterações não publicadas</span>
          </span>
        )}

        {(status === 'saved' || status === 'published') && !isDirty && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Publicado</span>
            {lastPublishedAt && <span className="text-[10px] text-emerald-600 font-mono">({lastPublishedAt})</span>}
          </span>
        )}

        {status === 'error' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Falha ao publicar</span>
          </span>
        )}

        {successMessage && (
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
            {successMessage}
          </span>
        )}

        {errorMessage && (
          <span className="text-xs text-red-700 font-bold bg-red-50 px-3 py-1 rounded border border-red-200">
            {errorMessage}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <button
            type="button"
            onClick={handleDiscardClick}
            disabled={status === 'publishing'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Descartar alterações</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => publish()}
          disabled={!isDirty || status === 'publishing'}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{status === 'publishing' ? 'Publicando…' : 'Publicar atualização'}</span>
        </button>
      </div>
    </div>
  );
};
