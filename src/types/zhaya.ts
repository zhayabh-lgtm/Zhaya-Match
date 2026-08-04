export type MeasurementKey =
  | 'bust'
  | 'waist'
  | 'hip'
  | 'shoulders'
  | 'thigh'
  | 'torsoLength'
  | 'footLength'
  | 'footWidth';

export interface MeasurementHelp {
  key: MeasurementKey;
  label: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface SizeRange {
  min?: number;
  max?: number;
  value?: number;
}

export interface SizeRow {
  id: string;
  label: string; // e.g. 'PP', 'P', 'M', 'G', 'GG' or '34', '35', '36'
  order: number;
  ranges: Partial<Record<MeasurementKey, SizeRange>>;
  notes?: string;
}

export interface ProductType {
  id: string;
  name: string;
  imageUrl?: string;
  iconUrl?: string;
  useIconInSelector?: boolean;
  measurementImageUrl?: string;
  measurementImageCaption?: string;
  active: boolean;
  order: number;
  measurements: MeasurementKey[];
  sizes: SizeRow[];
}

export interface MediaAsset {
  id: string;
  name: string;
  category: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  width?: number;
  height?: number;
  file_size?: number;
  alt_text?: string;
  created_at?: string;
}

export interface PopupAppearance {
  // Marca
  logoWhiteUrl?: string;
  logoBlackUrl?: string;
  logoVariant?: 'white' | 'black' | 'auto';
  showLogo?: boolean;
  logoSize?: number;
  logoPosition?: 'left' | 'center';
  logoMarginTop?: number;
  logoMarginBottom?: number;

  // Tipografia
  fontPreset?: string;
  titleFontFamily?: string;
  bodyFontFamily?: string;
  customFontUrl?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
  fieldFontSize?: number;
  buttonFontSize?: number;
  titleFontWeight?: number | string;
  bodyFontWeight?: number | string;
  buttonFontWeight?: number | string;
  resultFontWeight?: number | string;
  storeButtonFontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;

  // Popup
  backgroundColor: string;
  backgroundOpacity?: number;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
  borderWidth?: number;
  borderRadius: number;
  shadowColor?: string;
  shadowOpacity?: number;
  desktopWidth?: number;
  desktopMaxHeight?: number;
  paddingDesktop?: number;
  paddingMobile?: number;
  paddingInternal?: number; // legacy alias for paddingDesktop
  columnGap?: number;
  imageColumnWidth?: number;

  // Botões
  buttonColor: string;
  buttonTextColor: string;
  buttonBorderColor?: string;
  buttonBorderWidth?: number;
  buttonBorderRadius?: number;
  buttonHeight?: number;
  buttonHoverOpacity?: number;
  buttonTextTransform?: 'none' | 'uppercase' | 'capitalize';

  // Campos
  inputBackgroundColor?: string;
  inputTextColor?: string;
  inputPlaceholderColor?: string;
  inputBorderColor?: string;
  inputFocusColor?: string;
  inputBorderRadius?: number;
  inputHeight?: number;

  // Imagem
  upperBodyMeasurementImageUrl?: string;
  lowerBodyMeasurementImageUrl?: string;
  footwearMeasurementImageUrl?: string;
  upperBodyMeasurementImageCaption?: string;
  lowerBodyMeasurementImageCaption?: string;
  footwearMeasurementImageCaption?: string;
  mainMeasurementImageUrl?: string;
  apparelMeasurementImageUrl?: string;
  mainMeasurementImageCaption?: string;
  apparelMeasurementImageCaption?: string;
  imageAreaBgColor?: string;
  imageAreaOpacity?: number;
  imageBorderColor?: string;
  imageBorderRadius?: number;
  showMeasurementCaption?: boolean;
  measurementCaptionColor?: string;
  imagePositionDesktop?: 'left' | 'right';
  imagePositionMobile?: 'top' | 'hidden';

  // Fundo da Página / Overlay / Backgrounds
  overlayColor?: string;
  overlayOpacity: number;
  enableBlur?: boolean;
  blurAmount?: number;
  closeOnClickOutside?: boolean;
  animationDuration?: number;
  desktopBgImageUrl?: string;
  mobileBgImageUrl?: string;

  // Celular / Mobile
  mobileFormat?: 'drawer' | 'modal';
  mobileMaxHeight?: number;
  mobileSideMargin?: number;
  mobileImageHeight?: number;
  mobileStickyAction?: boolean;

  // Botão da Loja
  buttonText: string;
  buttonStyle: 'text_only' | 'border' | 'icon_text';
  storeButtonColor?: string;
  storeButtonTextColor?: string;
  storeButtonBorderColor?: string;
  storeButtonFontSize?: number;
  storeButtonPadding?: number;
  storeButtonBorderRadius?: number;
}

export interface TextSettings {
  buttonText: string;
  initialTitle: string;
  welcomeMessage?: string;
  welcomeButtonText?: string;
  typeChoiceTitle: string;
  measurementsTitle: string;
  calculateButtonText: string;
  resultTitle: string;
  betweenSizesMessage: string;
  notFoundMessage: string;
  recalculateButtonText: string;
  closeButtonText: string;
  backButtonText: string;
  privacyNotice: string;
}

export interface RecommendationResult {
  size: string | null;
  alternateSize?: string;
  status: 'recommended' | 'between_sizes' | 'not_found';
  message?: string;
}

export interface AppConfig {
  enabled: boolean;
  widgetUrl: string;
  testMode: boolean;
  allowedDomains?: string[];
  version?: number;
}

