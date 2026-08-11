import { PopupAppearance, TextSettings, ProductType, AppConfig, SizeRow, MeasurementHelp, MeasurementObservation, MeasurementKey } from '../types/zhaya';
import { migrateLegacyTypography } from './fontRegistry';

export function normalizeMeasurementObservation(raw: any): MeasurementObservation {
  const condType = raw?.condition?.type === 'measurement_active' ? 'measurement_active' : 'always';
  const condKey = raw?.condition?.measurementKey || raw?.condition?.measurement_key || undefined;

  return {
    ...raw,
    id: String(raw?.id || 'obs-' + Math.random().toString(36).substring(2, 9)),
    text: String(raw?.text || ''),
    active: raw?.active !== false,
    order: typeof raw?.order === 'number' ? raw.order : 1,
    condition: {
      type: condType,
      measurementKey: condKey,
    },
  };
}

export function normalizeMeasurementHelp(raw: any, defaultKey?: MeasurementKey): MeasurementHelp {
  const key = (raw?.key || defaultKey) as MeasurementKey;
  const rawObs = Array.isArray(raw?.observations) ? raw.observations : [];
  const obs = rawObs.map(normalizeMeasurementObservation).sort((a: MeasurementObservation, b: MeasurementObservation) => a.order - b.order);

  return {
    ...raw,
    key,
    label: String(raw?.label || key || ''),
    title: String(raw?.title || ''),
    description: String(raw?.description || ''),
    imageUrl: raw?.imageUrl || raw?.image_url || undefined,
    observations: obs,
  };
}

export function normalizeSizeRow(raw: any): SizeRow {
  return {
    id: String(raw?.id || 'sz-' + Math.random().toString(36).substring(2, 9)),
    label: String(raw?.label || 'Padrão'),
    order: typeof raw?.order === 'number' ? raw.order : 1,
    ranges: typeof raw?.ranges === 'object' && raw?.ranges !== null ? raw.ranges : {},
    notes: raw?.notes ? String(raw.notes) : undefined,
  };
}

export function normalizeProductType(raw: any): ProductType {
  const activeVal = raw?.active;
  const isExplicitFalse = activeVal === false || activeVal === 0 || activeVal === 'false' || activeVal === '0';
  
  const rawTips = Array.isArray(raw?.measurementGuideTips)
    ? raw.measurementGuideTips
    : (Array.isArray(raw?.measurement_guide_tips) ? raw.measurement_guide_tips : []);

  const tips = rawTips.map((tip: any, idx: number) => ({
    id: String(tip?.id || `tip-${idx}-${Math.random().toString(36).substring(2, 7)}`),
    title: String(tip?.title || ''),
    text: String(tip?.text || ''),
  }));

  const rawObs = raw?.measurementGuideObservation !== undefined
    ? raw.measurementGuideObservation
    : raw?.measurement_guide_observation;

  const rawTags = Array.isArray(raw?.storeTags)
    ? raw.storeTags
    : (Array.isArray(raw?.store_tags) ? raw.store_tags : []);

  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || 'Tipo de Peça'),
    category: raw?.category || undefined,
    fitType: raw?.fitType || raw?.fit_type || undefined,
    active: !isExplicitFalse,
    order: typeof raw?.order === 'number' ? raw.order : (typeof raw?.sort_order === 'number' ? raw.sort_order : 1),
    imageUrl: raw?.imageUrl || raw?.image_url || undefined,
    iconUrl: raw?.iconUrl || raw?.icon_url || undefined,
    useIconInSelector: Boolean(raw?.useIconInSelector ?? raw?.use_icon_in_selector ?? false),
    measurementImageUrl: raw?.measurementImageUrl || raw?.measurement_image_url || undefined,
    measurementImageCaption: raw?.measurementImageCaption || raw?.measurement_image_caption || undefined,
    measurementGuideTips: tips,
    measurementGuideObservation: rawObs !== null && rawObs !== undefined ? String(rawObs) : undefined,
    storeTags: rawTags.map((t: any) => String(t).trim()).filter(Boolean),
    measurements: Array.isArray(raw?.measurements) ? raw.measurements : [],
    sizes: Array.isArray(raw?.sizes) ? raw.sizes.map(normalizeSizeRow) : [],
  };
}

export function normalizeAppearance(raw?: Partial<PopupAppearance> | null): PopupAppearance {
  const app = raw || {};
  const typo = migrateLegacyTypography(app);
  
  return {
    ...app,
    // Tipografia Presets & Weights
    fontPreset: typo.fontPreset,
    titleFontWeight: typo.titleFontWeight,
    bodyFontWeight: typo.bodyFontWeight,
    buttonFontWeight: typo.buttonFontWeight,
    resultFontWeight: typo.resultFontWeight,
    storeButtonFontWeight: String(app.storeButtonFontWeight || '500'),

    // Marca
    showLogo: app.showLogo ?? true,
    logoVariant: app.logoVariant ?? 'auto',
    logoSize: app.logoSize ?? 24,
    logoPosition: app.logoPosition ?? 'center',
    logoMarginTop: app.logoMarginTop ?? 0,
    logoMarginBottom: app.logoMarginBottom ?? 16,

    // Estrutura & Cores do Popup
    backgroundColor: app.backgroundColor ?? '#000000',
    backgroundOpacity: typeof app.backgroundOpacity === 'number' ? Math.max(0, Math.min(1, app.backgroundOpacity)) : 1,
    textColor: app.textColor ?? '#FFFFFF',
    secondaryTextColor: app.secondaryTextColor ?? '#A3A3A3',
    borderColor: app.borderColor ?? '#262626',
    borderWidth: app.borderWidth ?? 1,
    borderRadius: app.borderRadius ?? 8,
    shadowColor: app.shadowColor ?? '#000000',
    shadowOpacity: app.shadowOpacity ?? 0.5,
    desktopWidth: app.desktopWidth ?? 820,
    desktopMaxHeight: app.desktopMaxHeight ?? 650,
    paddingDesktop: app.paddingDesktop ?? app.paddingInternal ?? 24,
    paddingMobile: app.paddingMobile ?? 16,
    paddingInternal: app.paddingInternal ?? app.paddingDesktop ?? 24,
    columnGap: app.columnGap ?? 24,
    imageColumnWidth: app.imageColumnWidth ?? 42,

    // Botões Ação no Modal
    buttonColor: app.buttonColor ?? '#FFFFFF',
    buttonTextColor: app.buttonTextColor ?? '#000000',
    buttonBorderColor: app.buttonBorderColor ?? '#FFFFFF',
    buttonBorderWidth: app.buttonBorderWidth ?? 1,
    buttonBorderRadius: app.buttonBorderRadius ?? 8,
    buttonHeight: app.buttonHeight ?? 48,
    buttonHoverOpacity: app.buttonHoverOpacity ?? 0.9,
    buttonTextTransform: app.buttonTextTransform ?? 'none',

    // Campos Input
    inputBackgroundColor: app.inputBackgroundColor ?? '#0F0F0F',
    inputTextColor: app.inputTextColor ?? '#FFFFFF',
    inputPlaceholderColor: app.inputPlaceholderColor ?? '#737373',
    inputBorderColor: app.inputBorderColor ?? 'rgba(255,255,255,0.12)',
    inputFocusColor: app.inputFocusColor ?? '#FFFFFF',
    inputBorderRadius: app.inputBorderRadius ?? 8,
    inputHeight: app.inputHeight ?? 44,

    // Imagens das 3 categorias (com fallbacks de leitura de propriedades legadas)
    upperBodyMeasurementImageUrl: app.upperBodyMeasurementImageUrl || app.apparelMeasurementImageUrl || app.mainMeasurementImageUrl || '',
    lowerBodyMeasurementImageUrl: app.lowerBodyMeasurementImageUrl || '',
    footwearMeasurementImageUrl: app.footwearMeasurementImageUrl || '',
    upperBodyMeasurementImageCaption: app.upperBodyMeasurementImageCaption || app.apparelMeasurementImageCaption || app.mainMeasurementImageCaption || 'Referência para busto, cintura, ombros e comprimento do tronco.',
    lowerBodyMeasurementImageCaption: app.lowerBodyMeasurementImageCaption || 'Referência para cintura, quadril e coxa.',
    footwearMeasurementImageCaption: app.footwearMeasurementImageCaption || 'Referência para comprimento e largura do pé.',

    // Legado de Imagens
    mainMeasurementImageUrl: app.mainMeasurementImageUrl ?? '',
    mainMeasurementImageCaption: app.mainMeasurementImageCaption ?? 'Áreas de medição do corpo (busto, cintura e quadril)',
    imageAreaBgColor: app.imageAreaBgColor ?? 'rgba(255,255,255,0.03)',
    imageAreaOpacity: app.imageAreaOpacity ?? 1,
    imageBorderColor: app.imageBorderColor ?? 'rgba(255,255,255,0.08)',
    imageBorderRadius: app.imageBorderRadius ?? 12,
    showMeasurementCaption: app.showMeasurementCaption ?? true,
    measurementCaptionColor: app.measurementCaptionColor ?? '#A3A3A3',
    imagePositionDesktop: app.imagePositionDesktop ?? 'left',
    imagePositionMobile: app.imagePositionMobile ?? 'top',

    // Fundo da Página / Overlay
    overlayColor: app.overlayColor ?? '#000000',
    overlayOpacity: app.overlayOpacity ?? 0.75,
    enableBlur: app.enableBlur ?? true,
    blurAmount: app.blurAmount ?? 3,
    closeOnClickOutside: app.closeOnClickOutside ?? true,
    animationDuration: app.animationDuration ?? 0.2,

    // Mobile
    mobileFormat: app.mobileFormat ?? 'modal',
    mobileMaxHeight: app.mobileMaxHeight ?? 580,
    mobileSideMargin: app.mobileSideMargin ?? 16,
    mobileImageHeight: app.mobileImageHeight ?? 180,
    mobileStickyAction: app.mobileStickyAction ?? true,

    // Acionador do Widget na Loja (Padrão: Apenas texto discreto)
    buttonText: app.buttonText ?? 'Encontrar meu tamanho',
    buttonStyle: 'text_only',
    storeButtonColor: 'transparent',
    storeButtonTextColor: app.storeButtonTextColor ?? '#111111',
    storeButtonBorderColor: 'transparent',
    storeButtonFontSize: app.storeButtonFontSize ?? 13,
    storeButtonPadding: app.storeButtonPadding ?? 0,
    storeButtonBorderRadius: app.storeButtonBorderRadius ?? 0,
  };
}

export function normalizeTexts(raw?: Partial<TextSettings> | null): TextSettings {
  const txt = raw || {};
  return {
    buttonText: txt.buttonText || 'Encontrar meu tamanho',
    initialTitle: txt.initialTitle || 'Descubra seu tamanho ideal.',
    welcomeMessage: txt.welcomeMessage || 'Informe suas medidas e encontre a recomendação ideal para você.',
    welcomeButtonText: txt.welcomeButtonText || 'Encontrar meu tamanho',
    typeChoiceTitle: txt.typeChoiceTitle || 'O que você está escolhendo?',
    measurementsTitle: txt.measurementsTitle || 'Informe suas medidas',
    calculateButtonText: txt.calculateButtonText || 'Encontrar meu tamanho',
    resultTitle: txt.resultTitle || 'SEU TAMANHO SUGERIDO',
    betweenSizesMessage: txt.betweenSizesMessage || 'Você está entre dois tamanhos.',
    notFoundMessage: txt.notFoundMessage || 'Não encontramos um tamanho adequado para as medidas informadas.',
    recalculateButtonText: txt.recalculateButtonText || 'Calcular novamente',
    closeButtonText: txt.closeButtonText || 'Fechar',
    backButtonText: txt.backButtonText || 'Voltar',
    privacyNotice: txt.privacyNotice || 'Usamos suas medidas apenas para esta recomendação.',
  };
}

export function normalizePublicConfig(raw: any) {
  const appearance = normalizeAppearance(raw?.appearance);
  const texts = normalizeTexts(raw?.texts);
  const config = {
    enabled: raw?.config?.enabled ?? raw?.enabled ?? true,
    widgetUrl: raw?.config?.widgetUrl ?? raw?.widget_url ?? '/widget.js',
    testMode: raw?.config?.testMode ?? raw?.test_mode ?? false,
    allowedDomains: Array.isArray(raw?.config?.allowedDomains || raw?.allowedDomains)
      ? (raw?.config?.allowedDomains || raw?.allowedDomains)
      : ['zhaya.com.br', 'www.zhaya.com.br'],
    version: raw?.config?.version ?? raw?.version ?? 1,
  };

  const rawProductTypes = Array.isArray(raw?.productTypes)
    ? raw.productTypes
    : (Array.isArray(raw?.product_types) ? raw.product_types : []);

  // For public config, filter active === true
  const activeProductTypes = rawProductTypes
    .map(normalizeProductType)
    .filter((pt: ProductType) => pt.active === true)
    .sort((a: ProductType, b: ProductType) => a.order - b.order);

  const rawHelps = raw?.measurementHelps || raw?.helps || {};
  const normalizedHelps: Record<string, MeasurementHelp> = {};
  for (const k of Object.keys(rawHelps)) {
    normalizedHelps[k] = normalizeMeasurementHelp(rawHelps[k], k as MeasurementKey);
  }

  return {
    enabled: config.enabled,
    version: config.version,
    allowedDomains: config.allowedDomains,
    testMode: config.testMode,
    appearance,
    texts,
    config,
    productTypes: activeProductTypes,
    measurementHelps: normalizedHelps,
  };
}
