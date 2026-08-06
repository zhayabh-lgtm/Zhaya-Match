import React, { useState, useEffect, useRef } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { Monitor, Smartphone, ExternalLink, RefreshCw, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Visualizacao: React.FC = () => {
  const {
    appearance,
    texts,
    config,
    productTypes,
    helps,
    revision,
    sessionId,
  } = useConfigDraft();

  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileWidth, setMobileWidth] = useState<number>(390);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Build complete draft snapshot payload
  const getDraftSnapshot = () => ({
    appearance,
    texts,
    config,
    productTypes,
    measurementHelps: helps,
    revision,
    sessionId,
    timestamp: Date.now(),
  });

  // Send real-time updates to iframe via postMessage whenever draft config changes
  const sendConfigToIframe = () => {
    setIsSynced(false);
    const snapshot = getDraftSnapshot();

    // Store temporary snapshot for new tabs / external preview window
    try {
      localStorage.setItem(`zhaya_preview_snapshot_${sessionId}`, JSON.stringify(snapshot));
      localStorage.setItem('zhaya_preview_latest_session', sessionId);

      // Broadcast update to open tabs
      if (typeof window.BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('zhaya-match-preview');
        bc.postMessage({
          type: 'ZHAYA_MATCH_PREVIEW_CONFIG_UPDATE',
          sessionId,
          revision,
          config: snapshot,
        });
        bc.close();
      }
    } catch (e) {}

    if (iframeRef.current && iframeRef.current.contentWindow) {
      const payload = {
        type: 'ZHAYA_MATCH_PREVIEW_CONFIG_UPDATE',
        config: snapshot,
        revision,
        sessionId,
      };
      iframeRef.current.contentWindow.postMessage(payload, window.location.origin);
    }
  };

  useEffect(() => {
    let bcAck: BroadcastChannel | null = null;
    if (typeof window.BroadcastChannel !== 'undefined') {
      bcAck = new BroadcastChannel('zhaya-match-preview-ack');
      bcAck.onmessage = (ev) => {
        if (ev && ev.data && ev.data.type === 'ZHAYA_MATCH_PREVIEW_APPLIED') {
          if (ev.data.sessionId === sessionId && ev.data.revision === revision) {
            setIsSynced(true);
          }
        }
      };
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'ZHAYA_MATCH_PREVIEW_READY') {
        sendConfigToIframe();
      } else if (event.data.type === 'ZHAYA_MATCH_PREVIEW_APPLIED') {
        if (event.data.sessionId === sessionId && event.data.revision === revision) {
          setIsSynced(true);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Initial ping to iframe
    sendConfigToIframe();

    return () => {
      window.removeEventListener('message', handleMessage);
      if (bcAck) bcAck.close();
    };
  }, [sessionId, revision]);

  useEffect(() => {
    sendConfigToIframe();
  }, [appearance, texts, config, productTypes, helps, revision, sessionId]);

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.preventDefault();
    const snapshot = getDraftSnapshot();
    try {
      localStorage.setItem(`zhaya_preview_snapshot_${sessionId}`, JSON.stringify(snapshot));
      localStorage.setItem('zhaya_preview_latest_session', sessionId);
    } catch (err) {}

    const url = `/preview?admin_preview=1&debug=1&previewSession=${encodeURIComponent(sessionId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Visualização da Loja em Tempo Real
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Runtime Oficial (widget.js)
            </span>
            {isSynced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white border border-neutral-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Rascunho Sincronizado (v{revision})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                Sincronizando...
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Simulação da loja real executando o script oficial. Qualquer alteração nas abas de Aparência, Textos ou Tipos é atualizada instantaneamente nesta tela sem recarregar.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <span>Abrir Loja em Nova Aba</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device & Resolution Toolbar */}
      <div className="flex flex-wrap items-center justify-between bg-white border border-neutral-200 p-3 rounded-xl text-xs font-medium gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[11px] mr-1">
            Visualizar em:
          </span>
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              device === 'desktop'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Computador (Desktop)</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              device === 'mobile'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Celular (Mobile)</span>
          </button>
        </div>

        {device === 'mobile' ? (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[11px]">
              Dispositivo / Resolução:
            </span>
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              {[
                { label: '320px', width: 320, title: 'Compacto' },
                { label: '360px', width: 360, title: 'Android Padrão' },
                { label: '390px', width: 390, title: 'iPhone 14' },
                { label: '430px', width: 430, title: 'Pro Max' },
              ].map((item) => (
                <button
                  key={item.width}
                  type="button"
                  onClick={() => setMobileWidth(item.width)}
                  title={item.title}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    mobileWidth === item.width
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-400 text-[11px] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Redimensionamento Fluido Ativo</span>
          </div>
        )}
      </div>

      {/* Main Preview Frame Area */}
      <div className="bg-neutral-100/80 border border-neutral-200 rounded-2xl p-4 sm:p-8 flex justify-center items-center min-h-[760px] relative overflow-hidden">
        {device === 'desktop' ? (
          /* Desktop Browser Mockup Frame */
          <div className="w-full max-w-6xl h-[780px] bg-white rounded-2xl border border-neutral-300 shadow-2xl flex flex-col overflow-hidden">
            {/* Browser Top Navigation Bar */}
            <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 border border-red-500/30" />
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/30" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-500/30" />
              </div>
              <div className="flex-1 max-w-xl mx-4 bg-white border border-neutral-200 rounded-lg px-3 py-1 text-[11px] text-neutral-600 font-mono text-center truncate shadow-xs">
                https://zhaya.com.br/produtos/jaqueta-biker-couro-signature
              </div>
              <button
                onClick={() => {
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src;
                  }
                }}
                className="p-1 hover:bg-neutral-200 rounded text-neutral-600 transition-colors cursor-pointer"
                title="Recarregar Pré-visualização"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Embedded Iframe */}
            <iframe
              ref={iframeRef}
              src="/preview?admin_preview=1"
              title="Pré-visualização da Loja Zhaya"
              className="w-full h-full border-none bg-white"
              onLoad={sendConfigToIframe}
            />
          </div>
        ) : (
          /* Mobile Smartphone Mockup Frame */
          <div className="flex flex-col items-center py-2">
            <div
              style={{ width: `${mobileWidth}px` }}
              className="h-[740px] bg-neutral-950 rounded-[44px] p-3 shadow-2xl ring-1 ring-neutral-800 relative transition-all duration-300 flex flex-col"
            >
              {/* Phone Speaker Notch */}
              <div className="w-32 h-5 bg-neutral-950 rounded-b-2xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
                <div className="w-12 h-1 bg-neutral-800 rounded-full" />
              </div>

              {/* Mobile Screen Iframe Container */}
              <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative pt-2">
                <iframe
                  ref={iframeRef}
                  src="/preview?admin_preview=1"
                  title="Pré-visualização Mobile Zhaya"
                  className="w-full h-full border-none bg-white"
                  onLoad={sendConfigToIframe}
                />
              </div>

              {/* Mobile Home Bar */}
              <div className="w-32 h-1 bg-neutral-600/50 rounded-full mx-auto my-1 shrink-0" />
            </div>
            <span className="text-[11px] text-neutral-400 font-mono mt-3">
              Largura Simulado: {mobileWidth}px
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
