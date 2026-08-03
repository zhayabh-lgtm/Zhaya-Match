import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { PopupAppearance, TextSettings, ProductType, MeasurementHelp } from '../../types/zhaya';
import { Monitor, Smartphone, ChevronLeft, Sparkles } from 'lucide-react';
import { MeasurementIllustration } from '../../components/MeasurementIllustration';

const resolveMeasurementImageUrl = (
  type: ProductType,
  app: PopupAppearance
) => {
  if (type.measurementImageUrl) return type.measurementImageUrl;
  const name = (type.name || '').toLowerCase();
  const keys = type.measurements || [];
  const isFootwear =
    name.includes('sapato') ||
    name.includes('calçado') ||
    name.includes('calcado') ||
    name.includes('tenis') ||
    name.includes('tênis') ||
    name.includes('sapatilha') ||
    name.includes('sandalia') ||
    name.includes('sandália') ||
    name.includes('mocassim') ||
    name.includes('bota') ||
    keys.includes('footLength') ||
    keys.includes('footWidth');

  if (isFootwear) {
    return app.footwearMeasurementImageUrl || undefined;
  }
  return app.apparelMeasurementImageUrl || app.mainMeasurementImageUrl || undefined;
};

export const Visualizacao: React.FC = () => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [resultMode, setResultMode] = useState<'recommended' | 'between' | 'none'>('recommended');
  const [showSaberMaisModal, setShowSaberMaisModal] = useState(false);

  const [appearance, setAppearance] = useState<PopupAppearance>({} as any);
  const [texts, setTexts] = useState<TextSettings>({} as any);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [helps, setHelps] = useState<Record<string, MeasurementHelp>>({});
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const app = await Repository.getAppearance();
    const txt = await Repository.getTexts();
    const pts = await Repository.getProductTypes();
    const hlp = await Repository.getMeasurementHelps();

    setAppearance(app);
    setTexts(txt);
    setTypes(pts.filter((p) => p.active));
    setHelps(hlp);
    if (pts.length > 0) setSelectedType(pts[0]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 font-sans tracking-tight">
            Visualização do Popup
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Simulação da experiência Zhaya Match: mensagem de boas-vindas, seleção estética de categorias, formulário minimalista sem ruídos e resultado limpo.
          </p>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-1 bg-neutral-200 p-1 rounded-md shadow-xs">
          <button
            onClick={() => setDevice('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              device === 'desktop'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Computador</span>
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              device === 'mobile'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Celular</span>
          </button>
        </div>
      </div>

      {/* Step and state control bar */}
      <div className="flex flex-wrap items-center justify-between bg-white border border-neutral-200 p-3 rounded-lg text-xs font-medium gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[11px]">Etapas do Popup:</span>
          <button
            onClick={() => setStep(0)}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              step === 0 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            0. Boas-vindas
          </button>
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              step === 1 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            1. Categoria (Tipo)
          </button>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              step === 2 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            2. Medidas (Sem poluição)
          </button>
          <button
            onClick={() => setStep(3)}
            className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
              step === 3 ? 'bg-neutral-900 text-white font-bold' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            3. Resultado
          </button>
        </div>

        {step === 3 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-bold uppercase tracking-wider text-[11px]">Cenário de Resultado:</span>
            <select
              value={resultMode}
              onChange={(e) => setResultMode(e.target.value as any)}
              className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-semibold text-neutral-800"
            >
              <option value="recommended">Tamanho Sugerido (M)</option>
              <option value="between">Entre dois tamanhos (M / G)</option>
              <option value="none">Fora de padrão</option>
            </select>
          </div>
        )}
      </div>

      {/* Simulated Store Page Stage */}
      <div className="bg-[#050505] rounded-2xl p-8 flex items-center justify-center min-h-[580px] relative overflow-hidden shadow-2xl">
        {/* Backdrop simulation layer */}
        <div
          style={{
            backgroundColor: appearance.overlayColor || '#000000',
            opacity: appearance.overlayOpacity ?? 0.75,
            filter: appearance.enableBlur ? `blur(${appearance.blurAmount || 3}px)` : 'none',
          }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Modal Popup Card */}
        <div
          style={{
            backgroundColor: appearance.backgroundColor || '#000000',
            color: appearance.textColor || '#FFFFFF',
            borderRadius: `${appearance.borderRadius ?? 8}px`,
            maxWidth: device === 'desktop' ? `${appearance.desktopWidth || 820}px` : '380px',
            fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif',
          }}
          className="w-full border border-neutral-800/80 p-6 shadow-2xl relative space-y-5 text-left z-10 transition-all backdrop-blur-md"
        >
          {/* Header - Brand Logo */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60 min-h-[40px]">
            <div className="flex items-center gap-2.5">
              {appearance.showLogo !== false && (
                appearance.logoWhiteUrl ? (
                  <img
                    src={appearance.logoWhiteUrl}
                    alt="Logo Zhaya"
                    style={{ height: `${appearance.logoSize || 24}px` }}
                    className="object-contain block max-w-[180px]"
                  />
                ) : (
                  <div
                    style={{ height: `${appearance.logoSize || 24}px` }}
                    className="w-28 bg-neutral-800/80 rounded border border-neutral-700/50 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-neutral-400 font-mono">LOGO ZHAYA</span>
                  </div>
                )
              )}
            </div>
            <button
              onClick={() => setStep(0)}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* STEP 0: Mensagem Inicial Bonitinha de Curadoria */}
          {step === 0 && (
            <div className="text-center py-6 px-4 space-y-5 max-w-md mx-auto">
              <div className="space-y-2">
                <h2 className="font-bold text-lg text-white tracking-tight">
                  {texts.initialTitle || 'Curadoria de Tamanho Zhaya'}
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  {texts.welcomeMessage ||
                    'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.'}
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                style={{
                  backgroundColor: appearance.buttonColor || '#FFFFFF',
                  color: appearance.buttonTextColor || '#000000',
                }}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:opacity-95 transition-all shadow-md mt-2"
              >
                {texts.welcomeButtonText || 'Iniciar Curadoria'}
              </button>
            </div>
          )}

          {/* STEP 1: Escolha da Categoria (Tipo de Produto) - Pensada para Mobile e PC */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
                <span className="text-[11px] text-neutral-500 uppercase tracking-widest font-mono">
                  Etapa 1 de 2
                </span>
              </div>

              <div className="text-center space-y-1">
                <h2 className="font-bold text-sm text-white tracking-tight">
                  {texts.typeChoiceTitle || 'Qual peça você deseja escolher?'}
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Selecione a categoria do produto para que possamos avaliar as proporções exatas.
                </p>
              </div>

              {/* Aesthetic Responsive Category Grid */}
              <div
                className={`grid gap-3 ${
                  device === 'desktop' ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {types
                  .filter((pt) => pt.active !== false)
                  .map((pt) => {
                    const isSel = selectedType?.id === pt.id;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => {
                          setSelectedType(pt);
                          setStep(2);
                        }}
                        style={{
                          backgroundColor: isSel ? '#FFFFFF' : '#0F0F0F',
                          color: isSel ? '#000000' : '#FFFFFF',
                        }}
                        className="group p-5 rounded-lg border border-neutral-800/80 hover:border-neutral-500 text-sm font-bold text-center transition-all cursor-pointer flex items-center justify-center relative overflow-hidden active:scale-95 shadow-xs min-h-[80px]"
                      >
                        <span className="tracking-wide text-sm">{pt.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 2: Formulário de Medidas - Limpo sem "como medir" poluindo */}
          {step === 2 && selectedType && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Alterar categoria</span>
                </button>
                <span className="text-xs font-bold text-neutral-200">
                  {selectedType.name}
                </span>
              </div>

              {/* Composition Layout */}
              {device === 'desktop' ? (
                /* DESKTOP 2-COLUMN LAYOUT */
                <div className="grid grid-cols-12 gap-6 items-stretch min-h-[300px]">
                  {/* Left Column: Illustration cleanly showing measurement zones */}
                  <div className="col-span-5 flex flex-col justify-between">
                    <MeasurementIllustration
                      imageUrl={resolveMeasurementImageUrl(selectedType, appearance)}
                      caption={
                        selectedType.measurementImageCaption || appearance.mainMeasurementImageCaption
                      }
                      showCaption={appearance.showMeasurementCaption}
                      typeName={selectedType.name}
                      bgColor={appearance.imageAreaBgColor}
                      onSaberMaisClick={() => setShowSaberMaisModal(true)}
                    />
                  </div>

                  {/* Right Column: Clean Form Inputs */}
                  <div className="col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div>
                        <h2 className="font-bold text-sm tracking-tight text-white">
                          Informe suas medidas
                        </h2>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Consulte o guia ao lado para identificar cada ponto de medição.
                        </p>
                      </div>

                      <div className="space-y-3.5">
                        {(selectedType.measurements || ['bust', 'waist']).map((mKey) => {
                          const h = helps[mKey] || { label: mKey };
                          return (
                            <div key={mKey} className="space-y-1">
                              <label className="block text-xs font-medium text-neutral-300">
                                {h.label} (cm)
                              </label>
                              <input
                                type="number"
                                placeholder="Digite a medida em cm"
                                className="w-full bg-[#0F0F0F] border border-neutral-800 rounded-md px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-400 transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setStep(3)}
                      style={{
                        backgroundColor: appearance.buttonColor || '#FFFFFF',
                        color: appearance.buttonTextColor || '#000000',
                      }}
                      className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                    >
                      {texts.calculateButtonText || 'Descobrir meu tamanho'}
                    </button>
                  </div>
                </div>
              ) : (
                /* MOBILE 1-COLUMN LAYOUT */
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="font-bold text-sm text-white tracking-tight">
                      {texts.measurementsTitle || 'Insira suas medidas corporais'}
                    </h2>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Veja os pontos de medição no guia ilustrativo abaixo:
                    </p>
                  </div>

                  {/* Mobile Illustration */}
                  <div className="h-[210px]">
                    <MeasurementIllustration
                      imageUrl={resolveMeasurementImageUrl(selectedType, appearance)}
                      caption={
                        selectedType.measurementImageCaption || appearance.mainMeasurementImageCaption
                      }
                      showCaption={appearance.showMeasurementCaption}
                      typeName={selectedType.name}
                      bgColor={appearance.imageAreaBgColor}
                      onSaberMaisClick={() => setShowSaberMaisModal(true)}
                    />
                  </div>

                  <div className="space-y-3">
                    {(selectedType.measurements || ['bust', 'waist']).map((mKey) => {
                      const h = helps[mKey] || { label: mKey };
                      return (
                        <div key={mKey} className="space-y-1">
                          <label className="block text-xs font-medium text-neutral-300">
                            {h.label} (cm)
                          </label>
                          <input
                            type="number"
                            placeholder="Digite a medida em cm"
                            className="w-full bg-[#0F0F0F] border border-neutral-800 rounded-md px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-400 transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    style={{
                      backgroundColor: appearance.buttonColor || '#FFFFFF',
                      color: appearance.buttonTextColor || '#000000',
                    }}
                    className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    {texts.calculateButtonText || 'Descobrir meu tamanho'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Resultado Simplificado e Elegante */}
          {step === 3 && (
            <div className="text-center py-4 space-y-5">
              {resultMode === 'recommended' && (
                <div className="space-y-3">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-mono">
                    SEU TAMANHO RECOMENDADO
                  </div>
                  <div className="text-6xl font-extrabold text-white tracking-tight my-2">M</div>
                  <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed font-sans">
                    Com base nas suas medidas, o tamanho M oferece o melhor caimento e conforto para o seu corpo.
                  </p>
                </div>
              )}

              {resultMode === 'between' && (
                <div className="space-y-3">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-mono">
                    VOCÊ ESTÁ ENTRE DOIS TAMANHOS
                  </div>
                  <div className="text-5xl font-extrabold text-white tracking-tight my-2">M / G</div>
                  <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed font-sans">
                    O tamanho M ficará mais ajustado ao corpo, enquanto o tamanho G proporcionará um caimento mais solto.
                  </p>
                </div>
              )}

              {resultMode === 'none' && (
                <div className="space-y-3">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-mono">
                    PROPORÇÃO EXCLUSIVA
                  </div>
                  <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed font-sans pt-2">
                    {texts.notFoundMessage || 'Não foi possível recomendar um tamanho automaticamente com base nestas medidas. Nossa equipe está à disposição para atendimento personalizado.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-neutral-800/60">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-[#0F0F0F] border border-neutral-800 text-neutral-200 py-2.5 text-xs font-bold rounded-md cursor-pointer hover:border-neutral-600 transition-colors"
                >
                  {texts.recalculateButtonText || 'Calcular novamente'}
                </button>
                <button
                  style={{
                    backgroundColor: appearance.buttonColor || '#FFFFFF',
                    color: appearance.buttonTextColor || '#000000',
                  }}
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                >
                  {texts.closeButtonText || 'Concluir'}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Footnote */}
          <div className="text-[10px] text-neutral-500 text-center pt-2 border-t border-neutral-900/50">
            {texts.privacyNotice || 'Suas medidas são utilizadas estritamente para esta recomendação.'}
          </div>

          {/* SABER MAIS Modal Overlay */}
          {showSaberMaisModal && selectedType && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-5 rounded-xl animate-in fade-in duration-200 overflow-y-auto text-left">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Como Medir ({selectedType.name})
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Instruções passo a passo para garantir a precisão ideal
                  </p>
                </div>
                <button
                  onClick={() => setShowSaberMaisModal(false)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded cursor-pointer"
                >
                  Fechar ✕
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {(selectedType.measurements || []).map((mKey) => {
                  const h = helps[mKey];
                  return (
                    <div key={mKey} className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800/80 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          {h?.label || mKey}
                        </h4>
                      </div>
                      <p className="text-xs font-semibold text-neutral-300">
                        {h?.title || `Como medir ${h?.label || mKey}`}
                      </p>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        {h?.description || 'Posicione a fita métrica confortavelmente ao redor da área sem apertar em demasia.'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-neutral-800 mt-4">
                <button
                  onClick={() => setShowSaberMaisModal(false)}
                  style={{
                    backgroundColor: appearance.buttonColor || '#FFFFFF',
                    color: appearance.buttonTextColor || '#000000',
                  }}
                  className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Entendi, voltar às medidas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
