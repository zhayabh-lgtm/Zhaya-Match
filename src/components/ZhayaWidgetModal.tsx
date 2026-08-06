import React, { useState, useEffect, useMemo } from 'react';
import {
  PopupAppearance,
  TextSettings,
  ProductType,
  MeasurementHelp,
  MeasurementKey,
  MeasurementObservation,
} from '../types/zhaya';
import { MeasurementIllustration } from './MeasurementIllustration';
import { ChevronLeft, X, Sparkles, Check, HelpCircle, ArrowRight, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { resolveMeasurementImage } from '../lib/measurementGroup';
import { getFontFamilyString, parseFontWeight } from '../lib/fontRegistry';
import { parseNumber, formatMeasurementDisplay, calculateRecommendation } from '../domain/recommendation';
import { trackAnalyticsEvent } from '../lib/analyticsTracker';

export function getVisibleObservations(
  observations: MeasurementObservation[] | undefined,
  activeMeasurements: MeasurementKey[]
): MeasurementObservation[] {
  if (!observations || !Array.isArray(observations)) return [];

  return observations
    .filter((obs) => {
      if (!obs || obs.active === false || !obs.text || !obs.text.trim()) return false;
      if (obs.condition?.type === 'always') return true;
      if (obs.condition?.type === 'measurement_active' && obs.condition.measurementKey) {
        return activeMeasurements.includes(obs.condition.measurementKey);
      }
      return false;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

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
  const [activeWheelKey, setActiveWheelKey] = useState<MeasurementKey | null>(null);
  const [hasTrackedOpen, setHasTrackedOpen] = useState<boolean>(false);
  const [hasTrackedFlowStarted, setHasTrackedFlowStarted] = useState<boolean>(false);
  const [hasTrackedMeasurements, setHasTrackedMeasurements] = useState<boolean>(false);
  const [failedIcons, setFailedIcons] = useState<Record<string, boolean>>({});

  const activeStep = externalStep !== undefined ? externalStep : internalStep;

  // Track widget_opened when modal opens
  useEffect(() => {
    if (isOpen && !hasTrackedOpen) {
      setHasTrackedOpen(true);
      trackAnalyticsEvent('widget_opened', { isPreview: true });
    } else if (!isOpen && hasTrackedOpen) {
      setHasTrackedOpen(false);
    }
  }, [isOpen, hasTrackedOpen]);

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

  const calculatedResult = useMemo(() => {
    if (!activeType) return null;
    return calculateRecommendation(activeType, userMeasurements);
  }, [activeType, userMeasurements]);

  const handleSetStep = (nextStep: 0 | 1 | 2 | 3) => {
    if (nextStep === 1 && !hasTrackedFlowStarted) {
      setHasTrackedFlowStarted(true);
      trackAnalyticsEvent('flow_started', { isPreview: true });
    }

    if (nextStep === 3) {
      const status = calculatedResult?.status || 'not_found';

      if (status === 'not_found') {
        trackAnalyticsEvent('recommendation_not_found', {
          productTypeId: activeType?.id,
          productTypeName: activeType?.name,
          productCategory: activeType?.category,
          recommendationStatus: 'not_found',
          isPreview: true,
        });
      } else {
        trackAnalyticsEvent('recommendation_generated', {
          productTypeId: activeType?.id,
          productTypeName: activeType?.name,
          productCategory: activeType?.category,
          recommendationStatus: status,
          isPreview: true,
        });
      }
    }

    if (onStepChange) onStepChange(nextStep);
    setInternalStep(nextStep);
  };

  const handleSelectType = (type: ProductType) => {
    trackAnalyticsEvent('product_type_selected', {
      productTypeId: type.id,
      productTypeName: type.name,
      productCategory: type.category,
      isPreview: true,
    });
    if (onSelectType) onSelectType(type);
    setInternalSelectedType(type);
    handleSetStep(2);
  };

  const handleMeasurementChange = (key: string, value: string) => {
    if (!hasTrackedMeasurements) {
      setHasTrackedMeasurements(true);
      trackAnalyticsEvent('measurements_started', {
        productTypeId: activeType?.id,
        productTypeName: activeType?.name,
        productCategory: activeType?.category,
        isPreview: true,
      });
    }
    setUserMeasurements((prev) => ({ ...prev, [key]: value }));
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
              trackAnalyticsEvent('widget_closed', { isPreview: true });
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

            <div
              className={`w-full mx-auto max-h-[400px] overflow-y-auto pr-1 ${
                types.length === 1
                  ? 'max-w-[320px] grid grid-cols-1'
                  : types.length === 2
                  ? 'max-w-[480px] grid grid-cols-2 gap-3 sm:gap-4'
                  : types.length === 3
                  ? 'max-w-[640px] grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4'
                  : types.length === 4
                  ? 'max-w-[720px] grid grid-cols-2 sm:grid-cols-4 gap-3'
                  : 'max-w-[760px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
              }`}
            >
              {types.length > 0 ? (
                types.map((t) => {
                  const useIconConfig = Boolean(
                    (t.useIconInSelector || (t as any).use_icon_in_selector) &&
                    (t.iconUrl || (t as any).icon_url)
                  );
                  const iconSrc = t.iconUrl || (t as any).icon_url;
                  const hasIcon = useIconConfig && Boolean(iconSrc) && !failedIcons[t.id];
                  const isSelected = activeType?.id === t.id;

                  if (hasIcon) {
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectType(t)}
                        type="button"
                        className={`group relative flex flex-col items-center justify-between p-2 rounded-xl transition-all cursor-pointer bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                          isSelected ? 'scale-105 opacity-100' : 'opacity-75 hover:opacity-100 hover:scale-103'
                        }`}
                      >
                        {/* Square Image Area */}
                        <div className="w-full aspect-square flex items-center justify-center relative p-1">
                          <img
                            src={iconSrc}
                            alt={t.name}
                            className={`w-full h-full object-contain transition-all duration-200 ${
                              isSelected ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''
                            }`}
                            loading="lazy"
                            onError={() => {
                              setFailedIcons((prev) => ({ ...prev, [t.id]: true }));
                            }}
                          />
                        </div>

                        {/* Name and Selection Indicator */}
                        <div className="flex flex-col items-center gap-1 mt-1 text-center w-full">
                          <span
                            style={{ color: textColor, fontWeight: titleWeight }}
                            className="text-xs tracking-wider uppercase leading-tight line-clamp-2"
                          >
                            {t.name}
                          </span>
                          {isSelected && (
                            <span
                              style={{ backgroundColor: textColor }}
                              className="w-1.5 h-1.5 rounded-full inline-block mt-0.5 shadow-xs"
                            />
                          )}
                        </div>
                      </button>
                    );
                  }

                  // Text Mode / Fallback Mode
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectType(t)}
                      type="button"
                      style={{
                        backgroundColor: isSelected ? textColor : inputBgColor,
                        color: isSelected ? bgColor : textColor,
                        borderColor: isSelected ? textColor : inputBorderColor,
                        borderRadius: `${inputRadius}px`,
                      }}
                      className={`p-3.5 border text-center transition-all hover:border-neutral-400 cursor-pointer flex flex-col items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                        isSelected ? 'font-bold shadow-md scale-[1.02]' : 'min-h-[76px]'
                      }`}
                    >
                      <span
                        style={{ fontWeight: titleWeight }}
                        className="text-xs tracking-wide uppercase text-center leading-tight line-clamp-2"
                      >
                        {t.name}
                      </span>
                    </button>
                  );
                })
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
                    activeMeasurement={activeType.measurements?.[0] || 'bust'}
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
                            trackAnalyticsEvent('measurement_help_opened', {
                              productTypeId: activeType?.id,
                              productTypeName: activeType?.name,
                              productCategory: activeType?.category,
                              isPreview: true,
                            });
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

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={userMeasurements[mKey] || ''}
                          onChange={(e) => handleMeasurementChange(mKey, e.target.value)}
                          placeholder="Digite a medida em cm"
                          style={{
                            backgroundColor: inputBgColor,
                            color: inputTextColor,
                            borderColor: inputBorderColor,
                            borderRadius: `${inputRadius}px`,
                            fontSize: `${appearance.fieldFontSize ?? 13}px`,
                            fontWeight: textWeight,
                          }}
                          className="flex-1 border px-3 py-2 font-mono focus:outline-none focus:border-white transition-colors"
                        />
                        {device === 'mobile' && (
                          <button
                            type="button"
                            aria-label="Selecionar medida"
                            title="Selecionar medida"
                            onClick={() => setActiveWheelKey(mKey as MeasurementKey)}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
            {calculatedResult ? (
              <>
                {calculatedResult.status === 'recommended' && (
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
                        {calculatedResult.size}
                      </div>
                      <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}>
                        {calculatedResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {calculatedResult.status === 'between_sizes' && (
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
                        {calculatedResult.size} ou {calculatedResult.alternateSize}
                      </div>
                      <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }}>
                        {calculatedResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {calculatedResult.status === 'not_found' && (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p style={{ color: secondaryTextColor, fontSize: `${appearance.bodyFontSize ?? 13}px`, fontWeight: textWeight }} className="leading-relaxed">
                        {calculatedResult.message ||
                          texts.notFoundMessage ||
                          'Não foi possível indicar um tamanho com segurança. Verifique suas medidas ou consulte nossa equipe para suporte customizado.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
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

              {(() => {
                const guideObs = activeGuideKey && helps[activeGuideKey]
                  ? getVisibleObservations(helps[activeGuideKey].observations, activeType?.measurements || [])
                  : [];
                if (guideObs.length === 0) return null;

                return (
                  <div className="space-y-2 pt-1 border-t border-neutral-100/20">
                    {guideObs.map((obs) => (
                      <div
                        key={obs.id}
                        style={{ borderColor: borderColor }}
                        className="text-[11px] p-2.5 rounded bg-white/5 border leading-snug"
                      >
                        <span style={{ color: textColor }} className="font-bold mr-1.5">
                          Obs:
                        </span>
                        <span style={{ color: secondaryTextColor }}>{obs.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

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
        {/* Wheel Picker Sheet */}
        {activeWheelKey && (
          <ReactWheelPickerSheet
            measurementKey={activeWheelKey}
            label={helps[activeWheelKey]?.label || activeWheelKey}
            currentValue={userMeasurements[activeWheelKey] || ''}
            productType={activeType}
            onConfirm={(val) => {
              setUserMeasurements({ ...userMeasurements, [activeWheelKey]: val });
              setActiveWheelKey(null);
            }}
            onClose={() => setActiveWheelKey(null)}
          />
        )}
      </div>
    </div>
  );
};

interface ReactWheelPickerSheetProps {
  measurementKey: string;
  label: string;
  currentValue: string;
  productType: ProductType | null;
  onConfirm: (val: string) => void;
  onClose: () => void;
}

const ReactWheelPickerSheet: React.FC<ReactWheelPickerSheetProps> = ({
  measurementKey,
  label,
  currentValue,
  productType,
  onConfirm,
  onClose,
}) => {
  const scrollBoxRef = React.useRef<HTMLDivElement>(null);

  const config = useMemo(() => {
    const step = 0.5;
    const defaults: Record<string, { min: number; max: number; def: number }> = {
      bust: { min: 60, max: 150, def: 90 },
      waist: { min: 50, max: 140, def: 72 },
      hip: { min: 60, max: 160, def: 98 },
      shoulders: { min: 30, max: 60, def: 38 },
      thigh: { min: 35, max: 90, def: 54 },
      torsoLength: { min: 40, max: 90, def: 60 },
      footLength: { min: 15, max: 35, def: 24 },
      footWidth: { min: 5, max: 15, def: 9 },
    };

    let minVal = defaults[measurementKey]?.min ?? 10;
    let maxVal = defaults[measurementKey]?.max ?? 200;
    let defVal = defaults[measurementKey]?.def ?? 70;

    if (productType?.sizes && productType.sizes.length > 0) {
      const mins: number[] = [];
      const maxs: number[] = [];
      productType.sizes.forEach((s) => {
        if (s.ranges && s.ranges[measurementKey]) {
          const r = s.ranges[measurementKey];
          const mn = parseNumber(r.min !== undefined ? r.min : r.value);
          const mx = parseNumber(r.max !== undefined ? r.max : r.value);
          if (mn !== null && mn > 0) mins.push(mn);
          if (mx !== null && mx > 0) maxs.push(mx);
        }
      });
      if (mins.length > 0 && maxs.length > 0) {
        const minFound = Math.min(...mins);
        const maxFound = Math.max(...maxs);
        if (minFound > 0 && maxFound >= minFound) {
          minVal = Math.max(5, Math.floor(minFound - 10));
          maxVal = Math.ceil(maxFound + 10);
          defVal = Math.round(((minFound + maxFound) / 2) * 2) / 2;
        }
      }
    }

    return { step, min: minVal, max: maxVal, def: defVal };
  }, [measurementKey, productType]);

  const options = useMemo(() => {
    const opts: { val: number; display: string }[] = [];
    for (let v = config.min; v <= config.max + 0.001; v += config.step) {
      const roundV = Math.round(v * 10) / 10;
      opts.push({
        val: roundV,
        display: formatMeasurementDisplay(roundV),
      });
    }
    return opts;
  }, [config]);

  const initialIdx = useMemo(() => {
    const parsed = parseNumber(currentValue);
    const target = parsed !== null && parsed > 0 ? parsed : config.def;
    let closestIdx = 0;
    let minDiff = 999999;
    options.forEach((opt, idx) => {
      const diff = Math.abs(opt.val - target);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  }, [currentValue, config.def, options]);

  const [selectedIdx, setSelectedIdx] = useState<number>(initialIdx);
  const lastVibratedIdxRef = React.useRef<number>(initialIdx);

  useEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = initialIdx * 42;
    }
  }, [initialIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleScroll = () => {
    if (!scrollBoxRef.current) return;
    const idx = Math.round(scrollBoxRef.current.scrollTop / 42);
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    if (clamped !== selectedIdx) {
      setSelectedIdx(clamped);
      if (clamped !== lastVibratedIdxRef.current) {
        lastVibratedIdxRef.current = clamped;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!prefersReduced) {
            try { navigator.vibrate(5); } catch (e) {}
          }
        }
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seletor de medida"
      onClick={onClose}
      className="fixed inset-0 z-[1000000] bg-black/75 backdrop-blur-xs flex flex-col justify-end p-0 touch-none font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-[#171717] border-t border-white/15 rounded-t-2xl p-5 space-y-4 shadow-2xl touch-auto max-w-md mx-auto"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white m-0">{label}</h3>
            <p className="text-xs text-neutral-400 m-0 mt-0.5">Unidade em centímetros (cm)</p>
          </div>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={onClose}
            className="text-neutral-400 text-lg hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Wheel Container */}
        <div className="relative h-[210px] overflow-hidden select-none">
          <div className="absolute top-[84px] left-0 right-0 h-[42px] border-y border-white/25 bg-white/5 pointer-events-none rounded-lg" />
          <div
            ref={scrollBoxRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto snap-y snap-mandatory py-[84px] scrollbar-none"
          >
            {options.map((opt, idx) => {
              const isSel = idx === selectedIdx;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (scrollBoxRef.current) {
                      scrollBoxRef.current.scrollTo({ top: idx * 42, behavior: 'smooth' });
                    }
                  }}
                  className={`h-[42px] flex items-center justify-center transition-all cursor-pointer snap-center ${
                    isSel ? 'text-xl font-bold text-white opacity-100' : 'text-sm font-normal text-neutral-500 opacity-45'
                  }`}
                >
                  {opt.display} cm
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-transparent border border-white/20 text-white h-12 rounded-lg text-xs font-semibold cursor-pointer hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              if (options[selectedIdx]) {
                onConfirm(options[selectedIdx].display);
              }
            }}
            className="flex-1 bg-white text-black h-12 rounded-lg text-xs font-semibold cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Confirmar
          </button>
        </div>
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
