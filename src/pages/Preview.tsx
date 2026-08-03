import React, { useEffect, useState } from 'react';
import { ShoppingBag, Terminal, RefreshCw, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    dataLayer?: any[];
    __zhayaFitLoaded?: boolean;
  }
}

export const Preview: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [dataLayerLogs, setDataLayerLogs] = useState<any[]>([]);
  const [widgetScriptLoaded, setWidgetScriptLoaded] = useState(false);

  useEffect(() => {
    // Initialize window.dataLayer simulation on load
    window.dataLayer = window.dataLayer || [];

    // Push Olist view_item event as specified in prompt section 6
    const viewItemEvent = {
      event: 'view_item',
      ecommerce: {
        items: [
          {
            item_name: 'Jaqueta Couro Biker Zhaya Signature',
            item_reference: '5695E',
            item_id: '3945',
            price: 2499.9,
            item_variant: '5695E-1',
            item_variant_id: 16570,
          },
        ],
      },
    };

    window.dataLayer.push(viewItemEvent);
    updateLogs();

    // Listen to radio changes
    const handleRadioChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.name === 'attribute-Tamanho') {
        setSelectedSize(target.value);
      }
    };

    document.addEventListener('change', handleRadioChange);

    // Auto load widget script
    loadWidgetScript();

    return () => {
      document.removeEventListener('change', handleRadioChange);
    };
  }, []);

  const loadWidgetScript = () => {
    if (document.getElementById('zhaya-widget-script-preview')) return;

    const script = document.createElement('script');
    script.id = 'zhaya-widget-script-preview';
    script.src = '/widget.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setWidgetScriptLoaded(true);
      updateLogs();
    };
    document.head.appendChild(script);
  };

  const updateLogs = () => {
    if (window.dataLayer) {
      setDataLayerLogs([...window.dataLayer]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-neutral-900 font-sans pb-16">
      {/* Simulation Top Bar */}
      <div className="bg-[#1A1A1A] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase font-serif">SIMULAÇÃO DE E-COMMERCE OLIST</span>
          <span className="text-[10px] text-neutral-400 font-mono">Página do Produto (ID 3945)</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Recarregar Página</span>
          </button>
          <a
            href="/admin"
            className="px-2.5 py-1 bg-white text-neutral-900 font-bold rounded text-[11px] hover:bg-neutral-100"
          >
            Voltar ao Admin Zhaya
          </a>
        </div>
      </div>

      {/* Simulated Store Header */}
      <header className="bg-white border-b border-[#EBEBEB] px-8 py-5 flex items-center justify-between">
        <div className="font-serif font-bold text-xl tracking-widest uppercase text-[#1A1A1A]">
          ZHAYA
        </div>
        <nav className="hidden md:flex gap-8 text-xs font-medium tracking-wider text-neutral-600 uppercase">
          <span>Novidades</span>
          <span>Jaquetas</span>
          <span>Alfaiataria</span>
          <span>Vestidos</span>
          <span>Zhaya Match</span>
        </nav>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <ShoppingBag className="w-5 h-5 text-neutral-800" />
        </div>
      </header>

      {/* Main Product Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Product Gallery (Left) */}
        <div className="md:col-span-6 space-y-4">
          <div className="aspect-[3/4] bg-neutral-200 rounded-lg overflow-hidden relative shadow-2xs border border-[#EBEBEB]">
            <img
              src="https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80"
              alt="Jaqueta Couro Biker Zhaya"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-bold px-3 py-1 rounded tracking-widest uppercase">
              COURO PREMIUM
            </div>
          </div>
        </div>

        {/* Product Form Details (Right - Main Form) */}
        <div className="md:col-span-6 space-y-6">
          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-widest font-mono">
              Ref: 5695E • Jaquetas
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] mt-1">
              Jaqueta Couro Biker Zhaya Signature
            </h1>
            <div className="text-xl font-bold font-serif text-[#1A1A1A] mt-3">
              R$ 2.499,90
            </div>
          </div>

          {/* STRICT MAIN PRODUCT FORM */}
          <form
            className="add-to-cart space-y-5 pt-4 border-t border-[#EBEBEB]"
            data-product-purchase
            data-product-id="3945"
            data-form-product
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Size Options Container */}
            <div
              className="prod-option option-input option-Tamanho space-y-2"
              data-attribute-name="Tamanho"
              data-prod-option
            >
              <div className="flex justify-between items-center text-xs font-semibold uppercase text-neutral-800">
                <span>Tamanho: {selectedSize && <strong className="text-neutral-900 font-bold">({selectedSize})</strong>}</span>
              </div>

              <div className="flex gap-2">
                {['PP', 'P', 'M', 'G', 'GG'].map((sz) => (
                  <label
                    key={sz}
                    className={`flex-1 py-3 border rounded text-xs font-bold text-center cursor-pointer transition-all ${
                      selectedSize === sz
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-2xs'
                        : 'border-[#EBEBEB] bg-white text-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="attribute-Tamanho"
                      value={sz}
                      checked={selectedSize === sz}
                      onChange={() => setSelectedSize(sz)}
                      className="sr-only"
                    />
                    <span>{sz}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Standard Size Guide Button */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-medidas text-xs text-neutral-600 font-medium underline hover:text-neutral-900 transition-colors cursor-pointer text-left"
                data-popup="guia-de-medidas"
                onClick={() => {
                  if ((window as any).openZhayaMatchModal) {
                    (window as any).openZhayaMatchModal();
                  }
                }}
              >
                Ver guia de medidas tradicional / Zhaya Match
              </button>
            </div>

            {/* Actions Wrapper / Purchase Button */}
            <div className="actions-wrapper pt-2">
              <button
                type="button"
                data-event-json='{"item_name":"Jaqueta Couro Biker Zhaya Signature","item_reference":"5695E","item_id":"3945","item_variant":"5695E-1","item_variant_id":16570}'
                className="w-full py-4 bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded transition-colors cursor-pointer shadow-sm"
              >
                Adicionar à Sacola
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECONDARY / RELATED PRODUCTS SECTION (To prove Widget DOES NOT inject here!) */}
      <div className="max-w-6xl mx-auto px-4 py-12 border-t border-[#EBEBEB]">
        <h2 className="text-lg font-serif font-bold text-[#1A1A1A] mb-6">
          Produtos Relacionados (Teste de Isolamento de Formulário)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Related Product 1 */}
          <div className="bg-white border border-[#EBEBEB] p-4 rounded-lg shadow-2xs">
            <div className="aspect-[3/4] bg-neutral-200 rounded mb-3 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=500&q=80"
                alt="Calça Couro"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-serif font-bold text-xs text-[#1A1A1A]">Calça Alfaiataria Couro</div>
            <div className="text-xs text-neutral-500 font-mono mt-0.5">R$ 1.890,00</div>

            <form
              className="add-to-cart mt-3"
              data-product-purchase
              data-product-id="3946"
              data-form-product
            >
              <div className="option-Tamanho flex gap-1 mb-2">
                <span className="text-[10px] text-neutral-500">Tamanhos: 36, 38, 40</span>
              </div>
              <button
                type="button"
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-bold uppercase rounded border border-neutral-200"
              >
                Comprar Rápido
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* LIVE DATA LAYER CONSOLE MONITOR */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-4 font-mono text-xs shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neutral-700" />
              <span className="font-bold text-[#1A1A1A]">Console GTM dataLayer (Tempo Real)</span>
            </div>
            <button
              onClick={updateLogs}
              className="text-[10px] px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded border border-neutral-200"
            >
              Atualizar Eventos
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {dataLayerLogs.map((log, idx) => (
              <div key={idx} className="p-2 bg-[#FAFAFA] rounded border border-[#EBEBEB]">
                <span className="text-neutral-900 font-bold">[{idx + 1}] Evento:</span>{' '}
                <span className="text-[#2E7D32] font-semibold">{log.event || 'custom_event'}</span>
                <pre className="text-[10px] text-neutral-600 mt-1 whitespace-pre-wrap font-mono">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
