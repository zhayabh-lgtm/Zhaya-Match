import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search, ChevronRight, RefreshCw, Terminal, Shield, Truck, RotateCcw } from 'lucide-react';

declare global {
  interface Window {
    dataLayer?: any[];
    openZhayaMatchModal?: () => void;
  }
}

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=80',
];

export const Preview: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [dataLayerLogs, setDataLayerLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'care' | 'shipping'>('details');

  const searchParams = new URLSearchParams(window.location.search);
  const isDebug = searchParams.get('debug') === '1';
  const isAdminPreview = searchParams.get('admin_preview') === '1';

  useEffect(() => {
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    const viewItemEvent = {
      event: 'view_item',
      ecommerce: {
        items: [
          {
            item_name: 'Jaqueta Biker Couro Signature',
            item_reference: '5695E',
            item_id: '3945',
            price: 2499.9,
            item_variant: '5695E-M',
            item_variant_id: 16570,
          },
        ],
      },
    };
    window.dataLayer.push(viewItemEvent);
    updateLogs();

    // Auto inject static widget script
    loadWidgetScript();
  }, []);

  const loadWidgetScript = () => {
    if (document.getElementById('zhaya-widget-script-preview')) return;

    const script = document.createElement('script');
    script.id = 'zhaya-widget-script-preview';
    script.src = '/widget.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
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
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Top Banner Debug Bar (ONLY shown if ?debug=1 or in debug mode) */}
      {isDebug && (
        <div className="bg-neutral-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-[11px]">Modo de Depuração Olist/GTM</span>
            <span className="text-[10px] text-neutral-400 font-mono">ID Produto: 3945</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Recarregar</span>
            </button>
            <a
              href="/admin/visualizacao"
              className="px-2.5 py-1 bg-white text-neutral-900 font-bold rounded text-[11px] hover:bg-neutral-100"
            >
              Painel Zhaya
            </a>
          </div>
        </div>
      )}

      {/* Store Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="font-serif font-bold text-2xl tracking-widest uppercase text-neutral-950">
              ZHAYA
            </a>
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-widest text-neutral-600 uppercase">
              <a href="#" className="text-neutral-950 font-bold hover:text-neutral-900">Novidades</a>
              <a href="#" className="hover:text-neutral-950 transition-colors">Jaquetas</a>
              <a href="#" className="hover:text-neutral-950 transition-colors">Alfaiataria</a>
              <a href="#" className="hover:text-neutral-950 transition-colors">Vestidos</a>
              <a href="#" className="hover:text-neutral-950 transition-colors text-amber-600 font-bold">Zhaya Match</a>
            </nav>
          </div>

          <div className="flex items-center gap-5 text-neutral-800">
            <button className="p-1 hover:text-black cursor-pointer" aria-label="Pesquisar">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-black relative cursor-pointer" aria-label="Sacola">
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-1 -right-1.5 bg-neutral-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                1
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2 text-[11px] font-medium text-neutral-500 uppercase tracking-widest flex items-center gap-2">
        <a href="#" className="hover:text-neutral-900">Início</a>
        <ChevronRight className="w-3 h-3 text-neutral-400" />
        <a href="#" className="hover:text-neutral-900">Jaquetas</a>
        <ChevronRight className="w-3 h-3 text-neutral-400" />
        <span className="text-neutral-900 font-semibold">Jaqueta Biker Couro Signature</span>
      </div>

      {/* Main Product Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Product Gallery (Left Column) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails */}
          <div className="flex sm:flex-col gap-3 justify-center sm:justify-start shrink-0">
            {PRODUCT_IMAGES.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImageIndex === idx ? 'border-neutral-950 shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Large Display */}
          <div className="flex-1 aspect-[3/4] bg-neutral-100 rounded-2xl overflow-hidden relative shadow-inner border border-neutral-200">
            <img
              src={PRODUCT_IMAGES[activeImageIndex]}
              alt="Jaqueta Biker Couro Signature Zhaya"
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute top-4 left-4 bg-neutral-950/90 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full tracking-widest uppercase">
              COURO NOIR 100% CAPRINO
            </div>
          </div>
        </div>

        {/* Product Details & Purchase Box (Right Column) */}
        <div className="lg:col-span-5 space-y-6 lg:pl-2">
          {/* Header & Ref */}
          <div className="space-y-2 border-b border-neutral-200/80 pb-5">
            <div className="text-[11px] text-neutral-500 font-mono tracking-widest uppercase">
              REF: 5695E • ED. LIMITADA
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-950 tracking-tight leading-tight">
              Jaqueta Biker Couro Signature
            </h1>
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-2xl font-serif font-bold text-neutral-950">
                R$ 2.499,90
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                ou 10x de R$ 249,99 sem juros
              </span>
            </div>
          </div>

          {/* Form and Trigger Placement Section */}
          <form
            className="add-to-cart space-y-6"
            data-product-purchase
            data-product-id="3945"
            data-form-product
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Color Option */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                Cor: <span className="font-normal text-neutral-600">Preto Noir</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-black border-2 border-neutral-950 ring-2 ring-neutral-300 ring-offset-2 cursor-pointer"
                  title="Preto Noir"
                />
              </div>
            </div>

            {/* Size Options Container (Matched by findProductTargetElement) */}
            <div
              className="prod-option option-input option-Tamanho space-y-3"
              data-attribute-name="Tamanho"
              data-prod-option
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-900">
                <span>Tamanho Selecionado:</span>
                <span className="text-neutral-950 font-extrabold">{selectedSize}</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {['PP', 'P', 'M', 'G', 'GG'].map((sz) => (
                  <label
                    key={sz}
                    className={`py-3 border rounded-xl text-xs font-bold text-center cursor-pointer transition-all ${
                      selectedSize === sz
                        ? 'border-neutral-950 bg-neutral-950 text-white shadow-md'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'
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

              {/* Anchor point for Zhaya Match widget button injection */}
              <div className="btn-medidas pt-1" />
            </div>

            {/* Actions Wrapper / Purchase Button */}
            <div className="actions-wrapper space-y-3 pt-2">
              <button
                type="button"
                className="w-full py-4 bg-neutral-950 hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.99]"
              >
                Adicionar à Sacola
              </button>
            </div>
          </form>

          {/* Guarantees & Benefits */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-200/80 text-[11px] text-neutral-600 font-medium">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-neutral-800 shrink-0" />
              <span>Frete grátis para todo o Brasil</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-neutral-800 shrink-0" />
              <span>Primeira troca grátis em até 30 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-800 shrink-0" />
              <span>Garantia vitalícia de costura e couro</span>
            </div>
          </div>

          {/* Product Specifications Tabs */}
          <div className="pt-6 border-t border-neutral-200/80 space-y-3">
            <div className="flex gap-6 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'details' ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-400'
                }`}
              >
                Detalhes Peça
              </button>
              <button
                onClick={() => setActiveTab('care')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'care' ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-400'
                }`}
              >
                Cuidados & Couro
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'shipping' ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-400'
                }`}
              >
                Envio & Entrega
              </button>
            </div>

            <div className="text-xs text-neutral-600 leading-relaxed pt-1">
              {activeTab === 'details' && (
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Modelagem Biker de alfaiataria estruturada com caimento impecável</li>
                  <li>Confeccionada em 100% couro caprino macio de altíssima gramatura</li>
                  <li>Forro interno em cetim de seda elastano para conforto absoluto</li>
                  <li>Metais banhados a níquel escovado de alta durabilidade e zíper YKK</li>
                </ul>
              )}
              {activeTab === 'care' && (
                <p>
                  A higienização deve ser realizada exclusivamente por lavanderias especializadas em couro natural.
                  Armazene a peça pendurada em cabides estruturados de madeira e em local arejado.
                </p>
              )}
              {activeTab === 'shipping' && (
                <p>
                  Enviado em embalagem especial de presente com capa protetora de tecido. Prazo médio de postagem de 24 horas úteis após aprovação do pedido.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Debug GTM Console (Only rendered if ?debug=1) */}
      {isDebug && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 my-12">
          <div className="bg-neutral-900 text-white rounded-2xl p-5 font-mono text-xs shadow-xl border border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Console GTM dataLayer (Ambiente de Testes)</span>
              </div>
              <button
                onClick={updateLogs}
                className="text-[10px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 cursor-pointer"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {dataLayerLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800/80">
                  <span className="text-emerald-400 font-bold">[{idx + 1}] Evento:</span>{' '}
                  <span className="text-amber-300 font-semibold">{log.event || 'custom_event'}</span>
                  <pre className="text-[10px] text-neutral-400 mt-1.5 whitespace-pre-wrap font-mono">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
