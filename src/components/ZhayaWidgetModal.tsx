import React, { useState, useEffect, useMemo } from 'react';
import {
  PopupAppearance,
  TextSettings,
  ProductType,
  MeasurementHelp,
  MeasurementKey,
} from '../types/zhaya';
import { MeasurementIllustration } from './MeasurementIllustration';
import { ChevronLeft, X, Sparkles, Check, HelpCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { resolveMeasurementImage } from '../lib/measurementGroup';
import { getFontFamilyString, parseFontWeight } from '../lib/fontRegistry';

interface ZhayaWidgetModalProps {
  appearance: PopupAppearance;
  texts: TextSettings;
  types?: ProductType[];
  helps?: Record<string, MeasurementHelp>;
  device?: 'desktop' | 'mobile';
  mobileWidth?: number; // e.g. 320, 360, 390, 430
  step?: 0 | 1 | 2 | 3;
  onStepChange?: (step: 0 | 1 | 2 | 3) => void;
  selectedType?: ProductType | null;
  onSelectType?: (type: ProductType) => void;
  resultMode?: 'recommended' | 'between' | 'none';
  onClose?: () => void;
  isOpen?: boolean;
}

function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = (hex || '#000000').replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ZhayaWidgetModal: React.FC<ZhayaWidgetModalProps> = ({
  appearance,
  texts,
  types = [],
  helps = {},
  device = 'desktop',
  mobileWidth = 360,
  step: externalStep,
  onStepChange,
  selectedType: externalSelectedType,
  onSelectType,
  resultMode = 'recommended',
  onClose,
  isOpen = true,
}) => {
  // Internal step & selected type state if not controlled externally
  const [internalStep, setInternalStep] = useState<0 | 1 | 2 | 3>(0);
  const [internalSelectedType, setInternalSelectedType] = useState<ProductType | null>(null);
  const [userMeasurements, setUserMeasurements] = useState<Record<string, string>>({
    bust: '88',
    waist: '70',
    hip: '96',
    shoulders: '38',
    footLength: '24.2',
    footWidth: '9.2',
  });
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [activeGuideKey, setActiveGuideKey] = useState<MeasurementKey | null>(null);

  const activeStep = externalStep !== undefined ? externalStep : internalStep;

  useEffect(() => {
    if (externalStep !== undefined) {
      setInternalStep(externalStep);
    }
  }, [externalStep]);

  const activeType = useMemo(() => {
    if (externalSelectedType !== undefined) return externalSelectedType;
    if (internalSelectedType) return internalSelectedType;
    return types.length > 0 ? types[0] : null;
  }, [externalSelectedType, internalSelectedType, types]);

  const handleSetStep = (nextStep: 0 | 1 | 2 | 3) => {
    if (onStepChange) onStepChange(nextStep);
    setInternalStep(nextStep);
  };

  const handleSelectType = (type: ProductType) => {
    if (onSelectType) onSelectType(type);
    setInternalSelectedType(type);
    handleSetStep(2);
  };

  // Helper values with Nullish Coalescing (??)
  const bgColor = appearance.backgroundColor ?? '#000000';
  const bgOpacity = appearance.backgroundOpacity ?? 1;
  const cardBgColor = hexToRgba(bgColor, bgOpacity);
  const textColor = appearance.textColor ?? '#FFFFFF';
  const secondaryTextColor = appearance.secondaryTextColor ?? '#A3A3A3';
  const borderColor = appearance.borderColor ?? '#262626';
  const borderWidth = appearance.borderWidth ?? 1;
  const borderRadius = appearance.borderRadius ?? 8;
  const buttonColor = appearance.buttonColor ?? '#FFFFFF';
  const buttonTextColor = appearance.buttonTextColor ?? '#000000';
  const buttonBorderRadius = appearance.buttonBorderRadius ?? 4;
  const buttonHeight = appearance.buttonHeight ?? 44;
  const buttonTransform = appearance.buttonTextTransform ?? 'uppercase';
  const inputBgColor = appearance.inputBackgroundColor ?? '#121212';
  const inputTextColor = appearance.inputTextColor ?? '#FFFFFF';
  const inputBorderColor = appearance.inputBorderColor ?? '#262626';
  const inputRadius = appearance.inputBorderRadius ?? 4;
  const imageBgColor = appearance.imageAreaBgColor ?? '#0A0A0A';
  const imageRadius = appearance.imageBorderRadius ?? 8;
  const showLogo = appearance.showLogo ?? true;
  const logoSize = appearance.logoSize ?? 24;
  const logoPosition = appearance.logoPosition ?? 'center';

  // Font typography resolution
  const fontPresetId = appearance.fontPreset || 'neue-einstellung';
  const fontFamilyStyle = getFontFamilyString(fontPresetId);
  const titleWeight = parseFontWeight(appearance.titleFontWeight, 700);
  const textWeight = parseFontWeight(appearance.textFontWeight, 400);
  const buttonWeight = parseFontWeight(appearance.buttonFontWeight, 700);
  const resultWeight = parseFontWeight(appearance.resultFontWeight, 700);

  // Measurement image for current active type
  const imageInfo = resolveMeasurementImage(activeType, appearance);
  const measurementImageUrl = imageInfo.imageUrl;
  const measurementImageCaption = imageInfo.caption;

  // Logo source
  const isDarkBg = (bgColor.toLowerCase() === '#000000' || bgColor.toLowerCase() === '#121212' || bgColor.toLowerCase() === '#0a0a0a');
  const logoUrl = appearance.logoVariant === 'white'
    ? (appearance.logoWhiteUrl || appearance.logoBlackUrl)
    : appearance.logoVariant === 'black'
    ? (appearance.logoBlackUrl || appearance.logoWhiteUrl)
    : isDarkBg
    ? (appearance.logoWhiteUrl || appearance.logoBlackUrl)
    : (appearance.logoBlackUrl || appearance.logoWhiteUrl);

  if (!isOpen) return null;

  return (
    <div className="w-full flex justify-center items-center font-sans transition-all">
      {/* Outer Card Container */}
      <div
        style={{
          backgroundColor: cardBgColor,
          color: textColor,
          borderColor: borderColor,
          borderWidth: `${borderWidth}px`,
          borderRadius: `${borderRadius}px`,
          maxWidth: device === 'desktop' ? `${appearance.desktopWidth ?? 820}px` : `${mobileWidth}px`,
          fontFamily: fontFamilyStyle,
          fontWeight: textWeight,
          letterSpacing: appearance.letterSpacing || 'normal',
          lineHeight: appearance.lineHeight || '1.4',
        }}
        className="w-full border shadow-2xl relative overflow-hidden text-left p-4 sm:p-6 transition-all duration-200"
      >
        {/* Header Bar with Logo and Close/Back Button */}
        <div
          className={`flex items-center justify-between pb-3 mb-4 border-b ${
            logoPosition === 'center' ? 'relative' : ''
          }`}
          style={{ borderColor: borderColor }}
        >
          {/* Back Button */}
          {activeStep > 0 ? (
            <button
              onClick={() => handleSetStep((activeStep - 1) as any)}
              className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer z-10"
              style={{ color: secondaryTextColor }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{texts.backButtonText || 'Voltar'}</span>
            </button>
          ) : (
            <div className="w-12" />
          )}

          {/* Logo Container */}
          {showLogo && (
            <div className={logoPosition === 'center' ? 'absolute left-1/2 -translate-x-1/2' : ''}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Zhaya"
                  style={{ height: `${logoSize}px` }}
                  className="object-contain block"
                />
              ) : (
                <span
                  style={{ fontSize: `${logoSize}px`, fontWeight: titleWeight }}
                  className="tracking-widest uppercase"
                >
                  ZHAYA
                </span>
              )}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={() => {
              if (onClose) onClose();
            }}
            className="w-7 h-7 rounded-full border flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer z-10"
            style={{ borderColor: borderColor, color: secondaryTextColor }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* STEP 0: WELCOME SCREEN */}
        {activeStep === 0 && (
          <div className="py-6 sm:py-8 text-center space-y-5 max-w-lg mx-auto">
            <div className="inline-flex p-3 rounded-full border border-neutral-700/50 bg-neutral-900/50 text-amber-300 mb-2">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <h2
              style={{ fontSize: `${appearance.titleFontSize ?? 20}px`, fontWeight: titleWeight }}
              className="tracking-wide uppercase"
            >
              {texts.initialTitle || 'Curadoria de Tamanho Zhaya'}
            </h2>

            <p
              style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}
              className="leading-relaxed"
            >
              {texts.welcomeMessage ||
                'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.'}
            </p>

            <div className="pt-4">
              <button
                onClick={() => handleSetStep(1)}
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  borderRadius: `${buttonBorderRadius}px`,
                  height: `${buttonHeight}px`,
                  fontSize: `${appearance.buttonFontSize ?? 12}px`,
                  fontWeight: buttonWeight,
                  textTransform: buttonTransform as any,
                }}
                className="w-full sm:w-auto px-8 tracking-widest transition-all hover:brightness-110 cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
              >
                <span>{texts.welcomeButtonText || 'Iniciar Curadoria'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: CATEGORY / TYPE CHOICE */}
        {activeStep === 1 && (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-1">
              <h2
                style={{ fontSize: `${appearance.titleFontSize ?? 18}px`, fontWeight: titleWeight }}
                className="uppercase tracking-wider"
              >
                {texts.typeChoiceTitle || 'Qual peça você deseja escolher?'}
              </h2>
              <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}>
                Selecione a categoria para ajustarmos as medidas recomendadas.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {types.length > 0 ? (
                types.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectType(t)}
                    style={{
                      backgroundColor: inputBgColor,
                      borderColor: activeType?.id === t.id ? textColor : inputBorderColor,
                      borderRadius: `${inputRadius}px`,
                    }}
                    className="p-3 border text-left transition-all hover:border-neutral-400 cursor-pointer flex flex-col justify-between group h-24"
                  >
                    <span style={{ color: secondaryTextColor }} className="text-[10px] font-mono uppercase tracking-wider">
                      Categoria
                    </span>
                    <span style={{ color: textColor, fontWeight: titleWeight }} className="text-xs tracking-wide uppercase group-hover:underline">
                      {t.name}
                    </span>
                  </button>
                ))
              ) : (
                <div style={{ color: secondaryTextColor }} className="col-span-full py-8 text-center text-xs">
                  Nenhum tipo de peça cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: MEASUREMENTS FORM */}
        {activeStep === 2 && activeType && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start py-2">
            {/* Image Column (Left on Desktop, Top on Mobile) */}
            <div className="md:col-span-5 space-y-2">
              <div
                style={{
                  backgroundColor: imageBgColor,
                  borderColor: borderColor,
                  borderRadius: `${imageRadius}px`,
                }}
                className="w-full aspect-[4/3] border overflow-hidden relative flex items-center justify-center p-3 shadow-inner"
              >
                {measurementImageUrl ? (
                  <img
                    src={measurementImageUrl}
                    alt={activeType.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <MeasurementIllustration
                    activeKey={activeType.measurements?.[0] || 'bust'}
                    className="w-full h-full"
                  />
                )}
              </div>

              {(appearance.showMeasurementCaption ?? true) && (
                <p
                  style={{ color: appearance.measurementCaptionColor || secondaryTextColor, fontWeight: textWeight }}
                  className="text-[10px] text-center leading-tight"
                >
                  {measurementImageCaption || 'Áreas corporais para recomendação de tamanho'}
                </p>
              )}
            </div>

            {/* Form Inputs Column (Right) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    style={{ fontWeight: titleWeight, fontSize: `${appearance.titleFontSize ?? 16}px` }}
                    className="uppercase tracking-wider"
                  >
                    {activeType.name}
                  </h3>
                  <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 11}px`, fontWeight: textWeight }}>
                    {texts.measurementsTitle || 'Insira suas medidas corporais em centímetros'}
                  </p>
                </div>
              </div>

              {/* Input Fields Grid */}
              <div className="space-y-3">
                {activeType.measurements?.map((mKey) => {
                  const helpObj = helps[mKey];
                  const label = helpObj?.label || mKey;

                  return (
                    <div key={mKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          style={{ color: secondaryTextColor, fontWeight: textWeight }}
                          className="uppercase tracking-wider text-[11px]"
                        >
                          {label} (cm)
                        </label>

                        {/* Saber Mais / Tutorial Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGuideKey(mKey as MeasurementKey);
                            setShowGuideModal(true);
                          }}
                          className="text-[10px] underline flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                          style={{ color: secondaryTextColor, fontWeight: textWeight }}
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Como medir</span>
                        </button>
                      </div>

                      <input
                        type="number"
                        step="0.1"
                        value={userMeasurements[mKey] || ''}
                        onChange={(e) =>
                          setUserMeasurements({ ...userMeasurements, [mKey]: e.target.value })
                        }
                        placeholder="Ex: 88"
                        style={{
                          backgroundColor: inputBgColor,
                          color: inputTextColor,
                          borderColor: inputBorderColor,
                          borderRadius: `${inputRadius}px`,
                          fontSize: `${appearance.fieldFontSize ?? 13}px`,
                          fontWeight: textWeight,
                        }}
                        className="w-full border px-3 py-2 font-mono focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSetStep(3)}
                  style={{
                    backgroundColor: buttonColor,
                    color: buttonTextColor,
                    borderRadius: `${buttonBorderRadius}px`,
                    height: `${buttonHeight}px`,
                    fontSize: `${appearance.buttonFontSize ?? 12}px`,
                    fontWeight: buttonWeight,
                    textTransform: buttonTransform as any,
                  }}
                  className="w-full tracking-widest transition-all hover:brightness-110 cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>{texts.calculateButtonText || 'Descobrir meu tamanho'}</span>
                </button>
              </div>

              {/* Privacy Notice */}
              <p style={{ color: secondaryTextColor, fontWeight: textWeight }} className="text-[10px] text-center italic">
                {texts.privacyNotice || 'Suas medidas são utilizadas apenas para esta recomendação.'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT SCREEN */}
        {activeStep === 3 && (
          <div className="py-6 text-center space-y-6 max-w-md mx-auto">
            {resultMode === 'recommended' && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <span
                    style={{ color: secondaryTextColor, fontWeight: textWeight }}
                    className="text-xs uppercase tracking-widest font-mono block mb-1"
                  >
                    {texts.resultTitle || 'Sugerimos o tamanho'}
                  </span>
                  <div
                    style={{ fontWeight: resultWeight }}
                    className="text-5xl uppercase tracking-tight my-2"
                  >
                    M
                  </div>
                  <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}>
                    Com base nas suas medidas ({userMeasurements.bust || '88'}cm busto / {userMeasurements.waist || '70'}cm cintura), o tamanho <strong>M</strong> veste perfeitamente.
                  </p>
                </div>
              </div>
            )}

            {resultMode === 'between' && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span
                    style={{ color: secondaryTextColor, fontWeight: textWeight }}
                    className="text-xs uppercase tracking-widest font-mono block mb-1"
                  >
                    {texts.betweenSizesMessage || 'Você está entre dois tamanhos.'}
                  </span>
                  <div
                    style={{ fontWeight: resultWeight }}
                    className="text-4xl uppercase tracking-tight my-2"
                  >
                    M ou G
                  </div>
                  <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}>
                    Para um caimento justo, sugerimos o <strong>M</strong>. Se preferir mais solto e confortável, sugerimos o <strong>G</strong>.
                  </p>
                </div>
              </div>
            )}

            {resultMode === 'none' && (
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }} className="leading-relaxed">
                    {texts.notFoundMessage ||
                      'Não foi possível indicar um tamanho com segurança. Verifique suas medidas ou consulte nossa equipe para suporte customizado.'}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleSetStep(2)}
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  borderRadius: `${buttonBorderRadius}px`,
                  height: `${buttonHeight}px`,
                  fontSize: `${appearance.buttonFontSize ?? 12}px`,
                  fontWeight: buttonWeight,
                  textTransform: buttonTransform as any,
                }}
                className="w-full tracking-widest transition-all hover:brightness-110 cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{texts.recalculateButtonText || 'Calcular novamente'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="w-full py-2.5 text-xs hover:underline cursor-pointer"
                style={{ color: secondaryTextColor, fontWeight: textWeight }}
              >
                {texts.closeButtonText || 'Concluir'}
              </button>
            </div>
          </div>
        )}

        {/* TUTORIAL / SABER MAIS MODAL OVERLAY */}
        {showGuideModal && activeGuideKey && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              style={{
                backgroundColor: bgColor,
                color: textColor,
                borderColor: borderColor,
                borderRadius: `${borderRadius}px`,
              }}
              className="w-full max-w-sm border p-5 relative space-y-4 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: borderColor }}>
                <span style={{ fontWeight: titleWeight }} className="text-xs uppercase tracking-wider">
                  {helps[activeGuideKey]?.title || `Como medir: ${activeGuideKey}`}
                </span>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-xs cursor-pointer hover:opacity-80"
                  style={{ borderColor: borderColor }}
                >
                  ✕
                </button>
              </div>

              {/* Show the group image in the tutorial modal if available */}
              {measurementImageUrl && (
                <div
                  style={{ backgroundColor: imageBgColor }}
                  className="aspect-[4/3] rounded overflow-hidden border p-2 flex items-center justify-center"
                >
                  <img
                    src={measurementImageUrl}
                    alt={helps[activeGuideKey]?.label || 'Como medir'}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <p style={{ color: secondaryTextColor, fontWeight: textWeight }} className="text-xs leading-relaxed">
                {helps[activeGuideKey]?.description ||
                  'Passe a fita métrica suavemente ao redor do corpo sem apertar.'}
              </p>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  borderRadius: `${buttonBorderRadius}px`,
                  fontWeight: buttonWeight,
                }}
                className="w-full py-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ZhayaStoreButton: React.FC<{
  appearance: PopupAppearance;
  texts?: TextSettings;
  onClick?: () => void;
}> = ({ appearance, texts, onClick }) => {
  const text = texts?.buttonText || appearance.buttonText || 'Encontrar meu tamanho';
  const textColor = appearance.storeButtonTextColor || '#111111';
  const fontSize = appearance.storeButtonFontSize || 13;
  const fontWeight = parseFontWeight(appearance.storeButtonFontWeight, 500);
  const fontPresetId = appearance.fontPreset || 'neue-einstellung';
  const fontFamilyStyle = getFontFamilyString(fontPresetId);

  return (
    <button
      onClick={onClick}
      type="button"
      className="inline-flex items-center gap-1.5 underline hover:opacity-75 transition-opacity cursor-pointer bg-transparent border-none p-0 text-left"
      style={{
        color: textColor,
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        fontFamily: fontFamilyStyle,
        textUnderlineOffset: '4px',
      }}
    >
      <span>{text}</span>
    </button>
  );
};
