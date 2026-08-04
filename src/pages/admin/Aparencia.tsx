import React, { useState } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { PopupAppearance } from '../../types/zhaya';
import { checkContrastWarning } from '../../lib/contrast';
import { FONT_PRESETS } from '../../lib/fontRegistry';
import {
  Sparkles,
  Type,
  Layout,
  MousePointer,
  Shield,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sliders,
  Smartphone,
} from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';

export const Aparencia: React.FC = () => {
  const { appearance, updateAppearance } = useConfigDraft();

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    marca: true,
    tipografia: true,
    popup: true,
    botoes: false,
    campos: false,
    overlay: false,
    mobile: false,
    lojaBotao: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (updater: (prev: PopupAppearance) => PopupAppearance) => {
    updateAppearance(updater);
  };

  // Contrast checks
  const popupContrastWarning = checkContrastWarning(
    appearance.backgroundColor || '#000000',
    appearance.textColor || '#FFFFFF',
    3.0
  );
  const buttonContrastWarning = checkContrastWarning(
    appearance.buttonColor || '#FFFFFF',
    appearance.buttonTextColor || '#000000',
    3.0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Title Bar */}
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold text-neutral-900 font-sans tracking-tight">
          Aparência do Popup Zhaya Match
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Personalize todos os elementos visuais do widget em tempo real: marca, tipografia, dimensões, cores e acionadores. As alterações são refletidas instantaneamente na página de Visualização.
        </p>
      </div>

      {/* Contrast Warnings Banner if contrast is low */}
      {(popupContrastWarning || buttonContrastWarning) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Aviso de Acessibilidade: </span>
            <span>{popupContrastWarning || buttonContrastWarning}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
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
            {openSections.marca ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
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
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Variante da Logo
                  </label>
                  <select
                    value={appearance.logoVariant || 'auto'}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, logoVariant: e.target.value as any }))
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-900"
                  >
                    <option value="auto">Automática (Cor do Fundo)</option>
                    <option value="white">Sempre Branca</option>
                    <option value="black">Sempre Preta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Alinhamento
                  </label>
                  <select
                    value={appearance.logoPosition || 'center'}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, logoPosition: e.target.value as any }))
                    }
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
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, logoSize: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.showLogo ?? true}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, showLogo: e.target.checked }))
                      }
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
            {openSections.tipografia ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.tipografia && (
            <div className="p-5 space-y-5">
              {/* Preset Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Preset de Tipografia
                </label>
                <select
                  value={appearance.fontPreset || 'neue-einstellung'}
                  onChange={(e) =>
                    handleChange((p) => ({ ...p, fontPreset: e.target.value as any }))
                  }
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium text-neutral-900"
                >
                  {Object.values(FONT_PRESETS).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} {preset.id === 'neue-einstellung' ? '— (Recomendado)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  A fonte Neue Einstellung é a fonte oficial padrão do Zhaya.
                </p>
              </div>

              {/* Weight Selectors */}
              <div className="pt-3 border-t border-neutral-100 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Pesos da Fonte (Font Weights)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Peso dos Títulos
                    </label>
                    <select
                      value={String(appearance.titleFontWeight ?? 700)}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, titleFontWeight: parseInt(e.target.value) }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="700">Bold (700)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Peso dos Textos
                    </label>
                    <select
                      value={String(appearance.textFontWeight ?? 400)}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, textFontWeight: parseInt(e.target.value) }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Peso dos Botões
                    </label>
                    <select
                      value={String(appearance.buttonFontWeight ?? 700)}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonFontWeight: parseInt(e.target.value) }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="500">Medium (500)</option>
                      <option value="700">Bold (700)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Peso do Resultado
                    </label>
                    <select
                      value={String(appearance.resultFontWeight ?? 700)}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, resultFontWeight: parseInt(e.target.value) }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="700">Bold (700)</option>
                      <option value="900">Black (900)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sizes and Spacings */}
              <div className="pt-3 border-t border-neutral-100 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Tamanhos e Espaçamentos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Tamanho do Título ({appearance.titleFontSize || 20}px)
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      value={appearance.titleFontSize || 20}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, titleFontSize: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Tamanho do Texto ({appearance.bodyFontSize || 13}px)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="18"
                      value={appearance.bodyFontSize || 13}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, bodyFontSize: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Tamanho dos Campos ({appearance.fieldFontSize || 13}px)
                    </label>
                    <input
                      type="range"
                      min="11"
                      max="18"
                      value={appearance.fieldFontSize || 13}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, fieldFontSize: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Tamanho dos Botões ({appearance.buttonFontSize || 12}px)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="16"
                      value={appearance.buttonFontSize || 12}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonFontSize: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Espaçamento Entre Letras
                    </label>
                    <input
                      type="text"
                      value={appearance.letterSpacing || '0.05em'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, letterSpacing: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Altura de Linha (Line Height)
                    </label>
                    <input
                      type="text"
                      value={appearance.lineHeight || '1.4'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, lineHeight: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono text-neutral-900"
                    />
                  </div>
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
            {openSections.popup ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.popup && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Fundo Principal
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.backgroundColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, backgroundColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.backgroundColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, backgroundColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Opacidade do Fundo ({Math.round((appearance.backgroundOpacity ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appearance.backgroundOpacity ?? 1}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, backgroundOpacity: parseFloat(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Texto Principal
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.textColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, textColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.textColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, textColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Texto Secundário
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.secondaryTextColor || '#A3A3A3'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, secondaryTextColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.secondaryTextColor || '#A3A3A3'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, secondaryTextColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Largura Desktop ({appearance.desktopWidth || 820}px)
                  </label>
                  <input
                    type="range"
                    min="680"
                    max="960"
                    step="10"
                    value={appearance.desktopWidth || 820}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, desktopWidth: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Arredondamento ({appearance.borderRadius ?? 8}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={appearance.borderRadius ?? 8}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, borderRadius: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Espaçamento Interno ({appearance.paddingDesktop || 24}px)
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="40"
                    value={appearance.paddingDesktop || 24}
                    onChange={(e) =>
                      handleChange((p) => ({
                        ...p,
                        paddingDesktop: parseInt(e.target.value),
                        paddingInternal: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Fundo da Área da Imagem
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appearance.imageAreaBgColor || '#0A0A0A'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, imageAreaBgColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.imageAreaBgColor || '#0A0A0A'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, imageAreaBgColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Largura da Coluna de Imagem ({appearance.imageColumnWidth || 42}%)
                  </label>
                  <input
                    type="range"
                    min="35"
                    max="50"
                    value={appearance.imageColumnWidth || 42}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, imageColumnWidth: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. BOTÕES INTERNOS DO POPUP */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('botoes')}
            className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
          >
            <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
              <MousePointer className="w-4 h-4 text-neutral-700" />
              <span>4. Estilo dos Botões Internos do Popup</span>
            </div>
            {openSections.botoes ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.botoes && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Fundo do Botão
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.buttonColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.buttonColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Texto do Botão
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.buttonTextColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonTextColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.buttonTextColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, buttonTextColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Transformação do Texto
                  </label>
                  <select
                    value={appearance.buttonTextTransform || 'uppercase'}
                    onChange={(e) =>
                      handleChange((p) => ({
                        ...p,
                        buttonTextTransform: e.target.value as any,
                      }))
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-900"
                  >
                    <option value="uppercase">MAIÚSCULAS</option>
                    <option value="capitalize">Primeira Maiúscula</option>
                    <option value="none font-medium">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Altura do Botão ({appearance.buttonHeight || 44}px)
                  </label>
                  <input
                    type="range"
                    min="36"
                    max="56"
                    value={appearance.buttonHeight || 44}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, buttonHeight: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Arredondamento ({appearance.buttonBorderRadius ?? 4}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={appearance.buttonBorderRadius ?? 4}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, buttonBorderRadius: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. CAMPOS DE ENTRADA */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('campos')}
            className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
          >
            <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
              <Sliders className="w-4 h-4 text-neutral-700" />
              <span>5. Estilo dos Campos de Entrada (Inputs)</span>
            </div>
            {openSections.campos ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.campos && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Fundo do Campo
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.inputBackgroundColor || '#121212'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputBackgroundColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.inputBackgroundColor || '#121212'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputBackgroundColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Texto do Campo
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.inputTextColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputTextColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.inputTextColor || '#FFFFFF'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputTextColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Borda do Campo
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={appearance.inputBorderColor || '#262626'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputBorderColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.inputBorderColor || '#262626'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, inputBorderColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Arredondamento ({appearance.inputBorderRadius ?? 4}px)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    value={appearance.inputBorderRadius ?? 4}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, inputBorderRadius: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. OVERLAY */}
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
            {openSections.overlay ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.overlay && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Cor do Escurecimento
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appearance.overlayColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, overlayColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.overlayColor || '#000000'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, overlayColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Opacidade: {Math.round((appearance.overlayOpacity ?? 0.75) * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="0.95"
                    step="0.05"
                    value={appearance.overlayOpacity ?? 0.75}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appearance.enableBlur ?? true}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, enableBlur: e.target.checked }))
                    }
                    className="rounded border-neutral-300 text-neutral-900"
                  />
                  <span>Ativar desfoque suave (Blur)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appearance.closeOnClickOutside ?? true}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, closeOnClickOutside: e.target.checked }))
                    }
                    className="rounded border-neutral-300 text-neutral-900"
                  />
                  <span>Fechar ao clicar fora</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 7. MOBILE */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('mobile')}
            className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
          >
            <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
              <Smartphone className="w-4 h-4 text-neutral-700" />
              <span>7. Ajustes para Celular (Mobile)</span>
            </div>
            {openSections.mobile ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.mobile && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Margem Lateral ({appearance.mobileSideMargin ?? 16}px)
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    value={appearance.mobileSideMargin ?? 16}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, mobileSideMargin: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Altura Máxima ({appearance.mobileMaxHeight ?? 580}px)
                  </label>
                  <input
                    type="range"
                    min="450"
                    max="700"
                    step="10"
                    value={appearance.mobileMaxHeight ?? 580}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, mobileMaxHeight: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8. ACIONADOR DO WIDGET NA LOJA */}
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection('lojaBotao')}
            className="w-full p-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-200"
          >
            <div className="flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider text-neutral-900">
              <ShoppingBag className="w-4 h-4 text-neutral-700" />
              <span>8. Acionador do Widget na Loja (Link Discreto)</span>
            </div>
            {openSections.lojaBotao ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {openSections.lojaBotao && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-neutral-500">
                O acionador na página do produto é exibido como um link de texto minimalista e discreto ("Encontrar meu tamanho"). O texto do botão pode ser alterado na página Textos e Imagens.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Cor do Texto do Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={appearance.storeButtonTextColor || '#111111'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, storeButtonTextColor: e.target.value }))
                      }
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={appearance.storeButtonTextColor || '#111111'}
                      onChange={(e) =>
                        handleChange((p) => ({ ...p, storeButtonTextColor: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-2.5 py-1 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Tamanho da Fonte ({appearance.storeButtonFontSize || 13}px)
                  </label>
                  <input
                    type="range"
                    min="11"
                    max="16"
                    value={appearance.storeButtonFontSize || 13}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, storeButtonFontSize: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Peso da Fonte
                  </label>
                  <select
                    value={String(appearance.storeButtonFontWeight || '500')}
                    onChange={(e) =>
                      handleChange((p) => ({ ...p, storeButtonFontWeight: e.target.value }))
                    }
                    className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                  >
                    <option value="400">Normal (400)</option>
                    <option value="500">Médio (500)</option>
                    <option value="700">Bold (700)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
