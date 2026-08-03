import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { PopupAppearance } from '../../types/zhaya';
import {
  Save,
  Check,
  Monitor,
  Smartphone,
  Sparkles,
  Type,
  Layout,
  Image as ImageIcon,
  MousePointer,
  SlidersHorizontal,
  Shield,
  Smartphone as PhoneIcon,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MeasurementIllustration } from '../../components/MeasurementIllustration';
import { MediaUploader } from '../../components/admin/MediaUploader';

export const Aparencia: React.FC = () => {
  const [appearance, setAppearance] = useState<PopupAppearance>({
    // Marca
    showLogo: true,
    logoVariant: 'auto',
    logoSize: 24,
    logoPosition: 'center',
    logoMarginTop: 0,
    logoMarginBottom: 16,

    // Tipografia
    titleFontFamily: 'Serif',
    bodyFontFamily: 'Sans-serif',
    customFontUrl: '',
    titleFontSize: 20,
    bodyFontSize: 13,
    fieldFontSize: 13,
    buttonFontSize: 12,
    titleFontWeight: 'bold',
    bodyFontWeight: 'normal',
    letterSpacing: '0.05em',
    lineHeight: '1.5',

    // Popup
    backgroundColor: '#000000',
    backgroundOpacity: 1,
    textColor: '#FFFFFF',
    secondaryTextColor: '#A3A3A3',
    borderColor: '#262626',
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    desktopWidth: 820,
    desktopMaxHeight: 650,
    paddingDesktop: 24,
    paddingMobile: 16,
    paddingInternal: 24,
    columnGap: 24,
    imageColumnWidth: 42,

    // Botões
    buttonColor: '#FFFFFF',
    buttonTextColor: '#000000',
    buttonBorderColor: '#FFFFFF',
    buttonBorderWidth: 1,
    buttonBorderRadius: 4,
    buttonHeight: 44,
    buttonHoverOpacity: 0.9,
    buttonTextTransform: 'uppercase',

    // Campos
    inputBackgroundColor: '#121212',
    inputTextColor: '#FFFFFF',
    inputPlaceholderColor: '#737373',
    inputBorderColor: '#262626',
    inputFocusColor: '#FFFFFF',
    inputBorderRadius: 4,
    inputHeight: 40,

    // Imagem
    mainMeasurementImageUrl: '',
    mainMeasurementImageCaption: 'Áreas de medição corporal (busto, cintura e quadril)',
    imageAreaBgColor: '#0A0A0A',
    imageAreaOpacity: 1,
    imageBorderColor: '#262626',
    imageBorderRadius: 8,
    showMeasurementCaption: true,
    measurementCaptionColor: '#A3A3A3',
    imagePositionDesktop: 'left',
    imagePositionMobile: 'top',

    // Fundo da Página / Overlay
    overlayColor: '#000000',
    overlayOpacity: 0.75,
    enableBlur: true,
    blurAmount: 3,
    closeOnClickOutside: true,
    animationDuration: 0.2,

    // Mobile
    mobileFormat: 'modal',
    mobileMaxHeight: 580,
    mobileSideMargin: 16,
    mobileImageHeight: 180,
    mobileStickyAction: true,

    // Botão da Loja
    buttonText: 'Descubra seu tamanho',
    buttonStyle: 'border',
    storeButtonColor: '#000000',
    storeButtonTextColor: '#FFFFFF',
    storeButtonBorderColor: '#000000',
    storeButtonFontSize: 13,
    storeButtonPadding: 12,
    storeButtonBorderRadius: 4,
  });

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    marca: true,
    tipografia: false,
    popup: true,
    imagem: true,
    botoes: false,
    campos: false,
    overlay: false,
    mobile: false,
    lojaBotao: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadAppearance();
  }, []);

  const loadAppearance = async () => {
    try {
      const data = await Repository.getAppearance();
      setAppearance((prev) => ({ ...prev, ...data }));
      setIsDirty(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao carregar configurações de aparência.');
    }
  };

  const handleChange = (updater: (prev: PopupAppearance) => PopupAppearance) => {
    setAppearance((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await Repository.saveAppearance(appearance);
      setIsDirty(false);
      setSavedMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar aparência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 font-sans tracking-tight">
              Aparência do Popup Zhaya Match
            </h1>
            {isDirty && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Alterações não salvas
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Personalize a curadoria visual: marca, tipografia, dimensões, cores, imagens e botões.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <div className="bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savedMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Config Accordions */}
        <div className="col-span-12 lg:col-span-7 space-y-4">

          {/* 1. MARCA */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('marca')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <Sparkles className="w-4 h-4 text-neutral-700" />
                <span>1. Identidade de Marca (Logos)</span>
              </div>
              {openSections.marca ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.marca && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    category="logos"
                    label="Logo Versão Branca"
                    description="Usada sobre fundos escuros"
                    value={appearance.logoWhiteUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, logoWhiteUrl: url }))}
                  />
                  <MediaUploader
                    category="logos"
                    label="Logo Versão Preta"
                    description="Usada sobre fundos claros"
                    value={appearance.logoBlackUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, logoBlackUrl: url }))}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Variante da Logo</label>
                    <select
                      value={appearance.logoVariant || 'auto'}
                      onChange={(e) => handleChange((p) => ({ ...p, logoVariant: e.target.value as any }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="auto">Automática (Cor do Fundo)</option>
                      <option value="white">Sempre Branca</option>
                      <option value="black">Sempre Preta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Alinhamento</label>
                    <select
                      value={appearance.logoPosition || 'center'}
                      onChange={(e) => handleChange((p) => ({ ...p, logoPosition: e.target.value as any }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="center">Centralizada</option>
                      <option value="left">À Esquerda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Tamanho: {appearance.logoSize || 24}px
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="60"
                      value={appearance.logoSize || 24}
                      onChange={(e) => handleChange((p) => ({ ...p, logoSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appearance.showLogo ?? true}
                        onChange={(e) => handleChange((p) => ({ ...p, showLogo: e.target.checked }))}
                        className="rounded border-neutral-300 text-neutral-900"
                      />
                      <span>Exibir Logo</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. TIPOGRAFIA */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('tipografia')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <Type className="w-4 h-4 text-neutral-700" />
                <span>2. Tipografia e Fontes</span>
              </div>
              {openSections.tipografia ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.tipografia && (
              <div className="p-5 space-y-4">
                <MediaUploader
                  category="fonts"
                  label="Fonte Customizada (.WOFF2)"
                  description="Upload de fonte personalizada Neue Einstellung para o popup"
                  value={appearance.customFontUrl}
                  onChange={(url) => handleChange((p) => ({ ...p, customFontUrl: url }))}
                />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Família dos Títulos</label>
                    <input
                      type="text"
                      value={appearance.titleFontFamily || 'Serif'}
                      onChange={(e) => handleChange((p) => ({ ...p, titleFontFamily: e.target.value }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Família do Texto</label>
                    <input
                      type="text"
                      value={appearance.bodyFontFamily || 'Sans-serif'}
                      onChange={(e) => handleChange((p) => ({ ...p, bodyFontFamily: e.target.value }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Tamanho do Título ({appearance.titleFontSize || 20}px)</label>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      value={appearance.titleFontSize || 20}
                      onChange={(e) => handleChange((p) => ({ ...p, titleFontSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Tamanho do Texto ({appearance.bodyFontSize || 13}px)</label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      value={appearance.bodyFontSize || 13}
                      onChange={(e) => handleChange((p) => ({ ...p, bodyFontSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Espaçamento Entre Letras</label>
                    <input
                      type="text"
                      value={appearance.letterSpacing || '0.05em'}
                      onChange={(e) => handleChange((p) => ({ ...p, letterSpacing: e.target.value }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono text-neutral-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. POPUP (ESTILO E CORES) */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('popup')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <Layout className="w-4 h-4 text-neutral-700" />
                <span>3. Estrutura e Cores do Popup</span>
              </div>
              {openSections.popup ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.popup && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Fundo Principal</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.backgroundColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, backgroundColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.backgroundColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, backgroundColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Texto Principal</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.textColor || '#FFFFFF'}
                        onChange={(e) => handleChange((p) => ({ ...p, textColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.textColor || '#FFFFFF'}
                        onChange={(e) => handleChange((p) => ({ ...p, textColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Texto Secundário</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.secondaryTextColor || '#A3A3A3'}
                        onChange={(e) => handleChange((p) => ({ ...p, secondaryTextColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.secondaryTextColor || '#A3A3A3'}
                        onChange={(e) => handleChange((p) => ({ ...p, secondaryTextColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Cor da Borda</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.borderColor || '#262626'}
                        onChange={(e) => handleChange((p) => ({ ...p, borderColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.borderColor || '#262626'}
                        onChange={(e) => handleChange((p) => ({ ...p, borderColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Largura Desktop ({appearance.desktopWidth || 820}px)</label>
                    <input
                      type="range"
                      min="680"
                      max="960"
                      step="10"
                      value={appearance.desktopWidth || 820}
                      onChange={(e) => handleChange((p) => ({ ...p, desktopWidth: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Arredondamento ({appearance.borderRadius ?? 8}px)</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={appearance.borderRadius ?? 8}
                      onChange={(e) => handleChange((p) => ({ ...p, borderRadius: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Espaçamento Interno ({appearance.paddingDesktop || 24}px)</label>
                    <input
                      type="range"
                      min="12"
                      max="40"
                      value={appearance.paddingDesktop || 24}
                      onChange={(e) => handleChange((p) => ({ ...p, paddingDesktop: parseInt(e.target.value), paddingInternal: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. IMAGENS EXPLICATIVAS */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('imagem')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <ImageIcon className="w-4 h-4 text-neutral-700" />
                <span>4. Imagens Explicativas</span>
              </div>
              {openSections.imagem ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.imagem && (
              <div className="p-5 space-y-5">
                <p className="text-xs text-neutral-500">
                  Defina as imagens explicativas gerais para as categorias. O sistema detecta automaticamente se a peça é de <strong>Vestuário</strong> ou <strong>Sapatos / Calçados</strong> de acordo com as medidas selecionadas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MediaUploader
                    category="main-images"
                    label="Imagem Explicativa — Vestuário"
                    description="Para roupas (busto, cintura, quadril, costas, ombros, entreperna). Omitida, usará vetor corporal."
                    value={appearance.apparelMeasurementImageUrl || appearance.mainMeasurementImageUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, apparelMeasurementImageUrl: url, mainMeasurementImageUrl: url }))}
                  />

                  <MediaUploader
                    category="main-images"
                    label="Imagem Explicativa — Sapatos / Calçados"
                    description="Para calçados (comprimento e largura do pé). Omitida, usará vetor do pé."
                    value={appearance.footwearMeasurementImageUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, footwearMeasurementImageUrl: url }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Legenda Padrão das Imagens</label>
                    <input
                      type="text"
                      value={appearance.mainMeasurementImageCaption || ''}
                      onChange={(e) => handleChange((p) => ({ ...p, mainMeasurementImageCaption: e.target.value }))}
                      placeholder="ex: Guia de referência corporal para escolha do tamanho"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Fundo da Área da Imagem</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={appearance.imageAreaBgColor || '#0A0A0A'}
                        onChange={(e) => handleChange((p) => ({ ...p, imageAreaBgColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.imageAreaBgColor || '#0A0A0A'}
                        onChange={(e) => handleChange((p) => ({ ...p, imageAreaBgColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.showMeasurementCaption ?? true}
                      onChange={(e) => handleChange((p) => ({ ...p, showMeasurementCaption: e.target.checked }))}
                      className="rounded border-neutral-300 text-neutral-900"
                    />
                    <span>Exibir legenda descritiva</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Largura da Coluna ({appearance.imageColumnWidth || 42}%)</label>
                    <input
                      type="range"
                      min="35"
                      max="50"
                      value={appearance.imageColumnWidth || 42}
                      onChange={(e) => handleChange((p) => ({ ...p, imageColumnWidth: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. BOTÕES */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('botoes')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <MousePointer className="w-4 h-4 text-neutral-700" />
                <span>5. Estilo dos Botões do Popup</span>
              </div>
              {openSections.botoes ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.botoes && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Fundo do Botão</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.buttonColor || '#FFFFFF'}
                        onChange={(e) => handleChange((p) => ({ ...p, buttonColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.buttonColor || '#FFFFFF'}
                        onChange={(e) => handleChange((p) => ({ ...p, buttonColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Texto do Botão</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={appearance.buttonTextColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, buttonTextColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.buttonTextColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, buttonTextColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Transformação do Texto</label>
                    <select
                      value={appearance.buttonTextTransform || 'uppercase'}
                      onChange={(e) => handleChange((p) => ({ ...p, buttonTextTransform: e.target.value as any }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="uppercase">MAIÚSCULAS</option>
                      <option value="capitalize">Primeira Maiúscula</option>
                      <option value="none">Normal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Altura do Botão ({appearance.buttonHeight || 44}px)</label>
                    <input
                      type="range"
                      min="36"
                      max="56"
                      value={appearance.buttonHeight || 44}
                      onChange={(e) => handleChange((p) => ({ ...p, buttonHeight: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Arredondamento ({appearance.buttonBorderRadius ?? 4}px)</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={appearance.buttonBorderRadius ?? 4}
                      onChange={(e) => handleChange((p) => ({ ...p, buttonBorderRadius: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. FUNDO DA PÁGINA / OVERLAY */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('overlay')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <Shield className="w-4 h-4 text-neutral-700" />
                <span>6. Fundo da Página (Overlay & Backgrounds)</span>
              </div>
              {openSections.overlay ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.overlay && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Cor do Escurecimento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={appearance.overlayColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, overlayColor: e.target.value }))}
                        className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={appearance.overlayColor || '#000000'}
                        onChange={(e) => handleChange((p) => ({ ...p, overlayColor: e.target.value }))}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Opacidade: {Math.round((appearance.overlayOpacity ?? 0.75) * 100)}%</label>
                    <input
                      type="range"
                      min="0.2"
                      max="0.95"
                      step="0.05"
                      value={appearance.overlayOpacity ?? 0.75}
                      onChange={(e) => handleChange((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.enableBlur ?? true}
                      onChange={(e) => handleChange((p) => ({ ...p, enableBlur: e.target.checked }))}
                      className="rounded border-neutral-300 text-neutral-900"
                    />
                    <span>Ativar desfoque suave (Blur)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.closeOnClickOutside ?? true}
                      onChange={(e) => handleChange((p) => ({ ...p, closeOnClickOutside: e.target.checked }))}
                      className="rounded border-neutral-300 text-neutral-900"
                    />
                    <span>Fechar ao clicar fora</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-neutral-100 space-y-4">
                  <MediaUploader
                    category="backgrounds-desktop"
                    label="Imagem de Fundo Customizada (Desktop)"
                    description="Opcional: Imagem para o fundo da página em telas grandes"
                    value={appearance.desktopBgImageUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, desktopBgImageUrl: url }))}
                  />
                  <MediaUploader
                    category="backgrounds-mobile"
                    label="Imagem de Fundo Customizada (Mobile)"
                    description="Opcional: Imagem para o fundo em telas pequenas"
                    value={appearance.mobileBgImageUrl}
                    onChange={(url) => handleChange((p) => ({ ...p, mobileBgImageUrl: url }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. BOTÃO NA LOJA */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection('lojaBotao')}
              className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
                <ShoppingBag className="w-4 h-4 text-neutral-700" />
                <span>7. Botão do Widget na Loja</span>
              </div>
              {openSections.lojaBotao ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
            </button>

            {openSections.lojaBotao && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Texto do Botão na Página de Produto</label>
                  <input
                    type="text"
                    value={appearance.buttonText || 'Descubra seu tamanho'}
                    onChange={(e) => handleChange((p) => ({ ...p, buttonText: e.target.value }))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Estilo Visual</label>
                  <select
                    value={appearance.buttonStyle || 'border'}
                    onChange={(e) => handleChange((p) => ({ ...p, buttonStyle: e.target.value as any }))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-medium"
                  >
                    <option value="border">Borda Discreta (Padrão Zhaya)</option>
                    <option value="text_only">Somente Texto Sublinhado</option>
                    <option value="icon_text">Texto com Ícone Discreto</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Real-time Live Preview */}
        <div className="col-span-12 lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between bg-neutral-200 p-2 rounded-lg">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider px-2">
              Prévia do Popup
            </span>
            <div className="flex gap-1 bg-white p-1 rounded-md shadow-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Computador</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <PhoneIcon className="w-3.5 h-3.5" />
                <span>Celular</span>
              </button>
            </div>
          </div>

          {/* Simulated Backdrop Overlay Container */}
          <div
            style={{
              backgroundColor: appearance.overlayColor || '#000000',
            }}
            className="p-4 sm:p-6 rounded-xl relative min-h-[500px] flex items-center justify-center overflow-hidden shadow-2xl border border-neutral-800"
          >
            {/* Background Image / Blur simulator */}
            <div
              style={{
                filter: appearance.enableBlur ? `blur(${appearance.blurAmount || 3}px)` : 'none',
                backgroundImage: appearance.desktopBgImageUrl ? `url(${appearance.desktopBgImageUrl})` : 'none',
              }}
              className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
            >
              <div className="p-6 text-white/50 text-[10px] font-mono space-y-1">
                <div>[LOJA ZHAYA PRODUCT PAGE]</div>
                <div>JAQUETA COURO PREMIUM</div>
              </div>
            </div>

            {/* Simulated Popup Card */}
            <div
              style={{
                backgroundColor: appearance.backgroundColor || '#000000',
                color: appearance.textColor || '#FFFFFF',
                borderColor: appearance.borderColor || '#262626',
                borderWidth: `${appearance.borderWidth ?? 1}px`,
                borderRadius: `${appearance.borderRadius ?? 8}px`,
                maxWidth: previewDevice === 'desktop' ? `${Math.min(appearance.desktopWidth || 820, 500)}px` : '320px',
                padding: `${previewDevice === 'desktop' ? (appearance.paddingDesktop || 24) : (appearance.paddingMobile || 16)}px`,
              }}
              className="w-full border shadow-2xl relative space-y-4 text-left font-sans transition-all z-10"
            >
              {/* Header with Logo */}
              <div
                className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: appearance.borderColor || '#262626' }}
              >
                <div>
                  {(appearance.showLogo ?? true) && (
                    <div>
                      {appearance.logoWhiteUrl || appearance.logoBlackUrl ? (
                        <img
                          src={
                            appearance.logoVariant === 'black'
                              ? appearance.logoBlackUrl || appearance.logoWhiteUrl
                              : appearance.logoWhiteUrl || appearance.logoBlackUrl
                          }
                          alt="Zhaya"
                          style={{ height: `${appearance.logoSize || 24}px` }}
                          className="object-contain"
                        />
                      ) : (
                        <div
                          style={{ fontSize: `${appearance.logoSize || 20}px` }}
                          className="font-serif tracking-widest font-bold uppercase"
                        >
                          ZHAYA
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] opacity-70 cursor-pointer"
                  style={{ borderColor: appearance.borderColor || '#262626' }}
                >
                  ✕
                </div>
              </div>

              {/* Main Body */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Image Column */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div
                    style={{
                      backgroundColor: appearance.imageAreaBgColor || '#0A0A0A',
                      borderColor: appearance.borderColor || '#262626',
                      borderRadius: `${appearance.borderRadius ?? 8}px`,
                    }}
                    className="w-full h-36 border overflow-hidden flex items-center justify-center p-2 relative"
                  >
                    {appearance.mainMeasurementImageUrl ? (
                      <img
                        src={appearance.mainMeasurementImageUrl}
                        alt="Guia"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <MeasurementIllustration activeKey="bust" className="w-full h-full" />
                    )}
                  </div>
                  {(appearance.showMeasurementCaption ?? true) && (
                    <p
                      style={{ color: appearance.secondaryTextColor || '#A3A3A3' }}
                      className="text-[10px] text-center mt-1"
                    >
                      {appearance.mainMeasurementImageCaption || 'Busto, cintura e quadril'}
                    </p>
                  )}
                </div>

                {/* Form Inputs Column */}
                <div className="md:col-span-7 space-y-2.5">
                  <div>
                    <label
                      style={{ color: appearance.secondaryTextColor || '#A3A3A3' }}
                      className="block text-[10px] uppercase tracking-wider mb-1"
                    >
                      Busto (cm)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="88"
                      style={{
                        backgroundColor: appearance.inputBackgroundColor || '#121212',
                        color: appearance.textColor || '#FFFFFF',
                        borderColor: appearance.borderColor || '#262626',
                        borderRadius: `${appearance.inputBorderRadius ?? 4}px`,
                      }}
                      className="w-full border px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label
                      style={{ color: appearance.secondaryTextColor || '#A3A3A3' }}
                      className="block text-[10px] uppercase tracking-wider mb-1"
                    >
                      Cintura (cm)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="70"
                      style={{
                        backgroundColor: appearance.inputBackgroundColor || '#121212',
                        color: appearance.textColor || '#FFFFFF',
                        borderColor: appearance.borderColor || '#262626',
                        borderRadius: `${appearance.inputBorderRadius ?? 4}px`,
                      }}
                      className="w-full border px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: appearance.buttonColor || '#FFFFFF',
                      color: appearance.buttonTextColor || '#000000',
                      borderRadius: `${appearance.buttonBorderRadius ?? 4}px`,
                      height: `${appearance.buttonHeight || 40}px`,
                      textTransform: appearance.buttonTextTransform || 'uppercase',
                    }}
                    className="w-full text-xs font-bold tracking-wider transition-all cursor-pointer mt-1"
                  >
                    Calcular meu tamanho
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
