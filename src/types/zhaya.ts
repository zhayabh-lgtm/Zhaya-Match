export type MeasurementKey =
  | 'bust'
  | 'waist'
  | 'hip'
  | 'shoulders'
  | 'thigh'
  | 'torsoLength'
  | 'footLength'
  | 'footWidth'
  | 'fingerCircumference'
  | 'sleeveLength';

export interface MeasurementObservation {
  id: string;
  text: string;
  active: boolean;
  order: number;
  condition: {
    type: 'always' | 'measurement_active';
    measurementKey?: MeasurementKey;
  };
}

export interface MeasurementHelp {
  key: MeasurementKey;
  label: string;
  title: string;
  description: string;
  imageUrl?: string;
  observations?: MeasurementObservation[];
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

export type ProductCategory = 'upper_body' | 'lower_body' | 'full_body' | 'footwear' | 'generic';
export type ProductFitType = 'structured' | 'regular' | 'stretch' | 'footwear';

export interface MeasurementGuideTip {
  id: string;
  title: string;
  text: string;
}

export interface ProductType {
  id: string;
  name: string;
  category?: ProductCategory | null;
  fitType?: ProductFitType | null;
  imageUrl?: string | null;
  iconUrl?: string | null;
  useIconInSelector?: boolean;
  measurementImageUrl?: string | null;
  measurementImageCaption?: string | null;
  measurementGuideTips?: MeasurementGuideTip[];
  measurementGuideObservation?: string | null;
  storeTags?: string[];
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
  textFontWeight?: number | string;
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

  // Feedback Survey Texts
  feedbackAdequacyQuestion?: string;
  feedbackEaseQuestion?: string;
  feedbackEaseMinLabel?: string;
  feedbackEaseMaxLabel?: string;
  feedbackCommentLabel?: string;
  feedbackCommentPlaceholder?: string;
  feedbackSubmitButtonText?: string;
  feedbackSkipButtonText?: string;
  feedbackThankYouMessage?: string;
}

export interface RecommendationResult {
  size: string | null;
  alternateSize?: string;
  status: 'recommended' | 'between_sizes' | 'not_found';
  message?: string;
}

export interface AppConfig {
  enabled: boolean;
  enableFeedbackSurvey?: boolean;
  widgetUrl: string;
  testMode: boolean;
  allowedDomains?: string[];
  version?: number;
}

export interface WidgetFeedbackInput {
  visitorId?: string;
  sessionId?: string;
  productTypeId?: string;
  recommendationStatus?: string;
  recommendedSize?: string;
  alternateSize?: string;
  adequacyResponse: 'Sim' | 'Não' | 'Ainda não sei';
  easeRating: number;
  comment?: string;
  configVersion?: number;
}

export type AnalyticsEventName =
  | 'launcher_viewed'
  | 'launcher_clicked'
  | 'widget_opened'
  | 'flow_started'
  | 'product_type_selected'
  | 'measurements_started'
  | 'recommendation_processing_started'
  | 'recommendation_generated'
  | 'recommendation_result_viewed'
  | 'recommendation_not_found'
  | 'measurement_help_opened'
  | 'feedback_started'
  | 'feedback_submitted'
  | 'feedback_skipped'
  | 'widget_closed';

export type PeriodType = 'today' | '7days' | '30days' | '90days' | 'custom';

export interface SystemActivityStatus {
  id: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: 'success' | 'healthy' | 'pending' | 'warning' | 'stale' | 'error' | 'database_error' | 'not_configured' | 'configuration_error';
  lastError: string | null;
  updatedAt: string;
}

export interface DiagnosticContract {
  api: { status: 'healthy' | 'unhealthy' };
  supabase: { status: 'healthy' | 'unhealthy' | 'not_configured' };
  serviceRole: {
    status: 'valid' | 'invalid_anon' | 'missing' | string;
    detectedFormat?: string;
    isValid?: boolean;
    message?: string;
  };
  anonKey?: {
    status: 'valid' | 'missing' | string;
    detectedFormat?: string;
    isValid?: boolean;
    message?: string;
  };
  tables?: Record<string, boolean>;
  rpcPublication?: {
    exists: boolean;
    status: string;
    message?: string;
  };
  verifiedEvent?: boolean;
  verifiedFeedback?: boolean;
  lastEvents: {
    analytics: string | null;
    recommendation: string | null;
    feedback: string | null;
  };
  apiStatus?: string;
  supabaseStatus?: string;
  serviceRoleStatus?: string;
  timestamp?: string;
}

export interface AnalyticsEventInput {
  eventId: string;
  eventName: AnalyticsEventName;
  visitorId?: string;
  sessionId: string;
  productTypeId?: string;
  productTypeName?: string;
  productCategory?: string;
  recommendationStatus?: 'recommended' | 'between_sizes' | 'not_found';
  sourceDomain?: string;
  pagePath?: string;
  deviceType?: 'desktop' | 'mobile';
  configVersion?: number;
  metadata?: Record<string, any>;
  occurredAt?: string;
}

export interface FeedbackSummaryData {
  totalResponses: number;
  yesPercent: number;
  noPercent: number;
  notSurePercent: number;
  averageEaseRating: number;
  recentComments: Array<{
    id?: string;
    comment: string;
    productTypeId?: string;
    productTypeName?: string;
    recommendedSize?: string;
    adequacyResponse?: string;
    easeRating?: number;
    submittedAt: string;
  }>;
}

export interface AnalyticsSummary {
  period: PeriodType;
  startDate: string;
  endDate: string;
  totalViewed: number;
  totalClicked: number;
  totalOpened: number;
  totalStarted: number;
  totalTypeSelected: number;
  totalMeasurementsStarted: number;
  totalRecommended: number;
  totalNotFound: number;
  totalHelpOpened: number;
  totalClosed: number;
  totalRecommendationProcessingStarted?: number;
  totalRecommendationResultViewed?: number;
  totalFeedbackStarted?: number;
  totalFeedbackSubmitted?: number;
  totalFeedbackSkipped?: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  openRate: number;
  startRate: number;
  completionRate: number;
  notFoundRate: number;
  abandonmentRate: number;
  feedbackDetails?: FeedbackSummaryData;
  dailyEvolution: Array<{
    date: string;
    displayDate?: string;
    fullDate?: string;
    visitors?: number;
    sessions?: number;
    viewed: number;
    opened: number;
    started: number;
    completed: number;
    abandoned: number;
  }>;
  funnel: Array<{
    step: string;
    stage?: string;
    event?: string;
    label?: string;
    count: number;
    rate: number;
    conversionRate?: number;
  }>;
  topTypes: Array<{
    typeId?: string;
    typeName: string;
    category?: string;
    started: number;
    completed: number;
    recommended?: number;
    betweenSizes?: number;
    notFound?: number;
  }>;
  recommendationTypes: {
    recommended: number;
    between_sizes: number;
    not_found: number;
    [key: string]: number;
  };
}

export interface LiveInvite {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  platform?: string; // 'instagram' | 'youtube' | 'tiktok' | 'custom'
  platformUrl?: string | null;
  startsAt: string; // ISO String
  endsAt: string; // ISO String
  timezone: string; // 'America/Sao_Paulo'
  active: boolean;
  clicks: number;
  createdAt: string;
  createdBy?: string | null;
}

export interface PublicLiveInvite {
  title: string;
  description?: string | null;
  platform?: string;
  platformUrl?: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: 'active' | 'ended' | 'not_found';
}

export type BestSellerCategory = 'Calçado' | 'Bolsa' | 'Cinto' | 'Acessório' | 'Outro' | string;

export type BestSellerMediaType = 'image' | 'video';

export interface BestSellerMediaItem {
  id: string;
  type: BestSellerMediaType;
  url: string;
  storagePath?: string | null;
  posterUrl?: string | null;
  posterStoragePath?: string | null;
  source?: 'upload' | 'url';
}

export interface PublicBestSellerMediaItem {
  id: string;
  type: BestSellerMediaType;
  url: string;
  posterUrl?: string | null;
}


export type BestSellerButtonDestination = 'product' | 'whatsapp' | 'custom' | 'form';
export type BestSellerExperienceMode = 'traditional' | 'organized';

export interface BestSellerInternationalProductTranslation {
  /** Conteúdo editorial digitado manualmente no painel. */
  name?: string | null;
  description?: string | null;
  videoTitle?: string | null;
  benefits?: string[];
  badgeText?: string | null;
  giftTitle?: string | null;
  giftLabel?: string | null;
  colors?: string[];
  sizes?: string[];
  outOfStockSizes?: string[];
}

export interface BestSellerInternationalAdditionalCountry {
  /** País adicional que reutiliza idioma, textos e comportamento da regra principal. */
  countryCode: string;
  /** Moeda específica exibida para este país adicional. */
  currencyCode: string;
  /** Multiplicador manual aplicado ao preço em BRL para este país. */
  currencyRate: number;
  approximateConversion?: boolean;
  approximateLabel?: string | null;
}

export interface BestSellerInternationalCountryRule {
  countryCode: string;
  enabled: boolean;
  locale: string;
  currencyCode: string;
  /** Multiplicador manual aplicado ao preço em BRL. Ex.: USD 0.18. */
  currencyRate: number;
  /** Países extras que herdam esta tradução/configuração, mas podem ter moeda e taxa próprias. */
  additionalCountries?: BestSellerInternationalAdditionalCountry[];
  approximateConversion?: boolean;
  approximateLabel?: string | null;
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  buttonDestination?: BestSellerButtonDestination;
  whatsappNumber?: string | null;
  whatsappMessage?: string | null;
  customUrl?: string | null;
  /** Texto editorial do formulário internacional. Se vazio, a interface usa tradução automática. */
  formTitle?: string | null;
  formMessage?: string | null;
  /** CTA editorial exibido após o último produto. Vazio = herda a configuração principal. */
  footerCtaText?: string | null;
  /** Link do CTA final para este mercado. Vazio = herda a configuração principal. */
  footerCtaUrl?: string | null;
  /** Quando ativo, este mercado recebe apenas os produtos da área Redirecionar. */
  redirectProducts?: boolean;
  /** Mensagem editorial exibida acima da seleção alternativa internacional. */
  redirectMessage?: string | null;
  /** Overrides do novo modo Imersiva organizada. Vazios usam tradução automática da interface. */
  organizedTitle?: string | null;
  organizedSubtitle?: string | null;
  categoryTranslations?: Record<string, string>;
  /** Controles de exibição específicos por mercado. */
  showPrices?: boolean;
  showInstallments?: boolean;
  showCta?: boolean;
  showFooterCta?: boolean;
  showBenefits?: boolean;
  showSoldQuantity?: boolean;
  showAvailableQuantity?: boolean;
  showSizes?: boolean;
  showColors?: boolean;
  showBadges?: boolean;
  showGift?: boolean;
  showProductTimers?: boolean;
  productTranslations?: Record<string, BestSellerInternationalProductTranslation>;
}

export interface BestSellerInternationalConfig {
  enabled: boolean;
  rules: BestSellerInternationalCountryRule[];
}

export interface BestSellerLiveSession {
  id: string;
  listId: string;
  status: 'running' | 'paused' | 'stopped';
  startedAt: string;
  lastResumedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  accumulatedSeconds: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BestSellerList {
  id: string;
  slug?: string;
  title: string;
  logoUrl?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  /** Botão opcional exibido depois de todo o conteúdo da vitrine. */
  footerCtaEnabled?: boolean;
  /** Experiência dos produtos. Traditional preserva o comportamento histórico. */
  experienceMode?: BestSellerExperienceMode;
  /** Quantos produtos imersivos aparecem antes do seletor automático de categorias. */
  organizedIntroCount?: number;
  footerCtaText?: string | null;
  footerCtaUrl?: string | null;
  showDate?: boolean;
  showRanking?: boolean;
  rankColor?: string;
  sizeColor?: string;
  backgroundVideoUrl?: string | null;
  backgroundVideoPath?: string | null;
  backgroundVideoOpacity?: number;
  backgroundVideoBlur?: number;
  defaultBadgeEnabled?: boolean;
  defaultBadgeText?: string | null;
  defaultBadgeColor?: string;
  /** Admin-only action flag; not persisted on the list row. */
  applyDefaultBadgeToAll?: boolean;
  /** Admin-only action flag; applies only the list badge color to individually configured badges. */
  applyDefaultBadgeColorToConfigured?: boolean;
  giftEnabled?: boolean;
  giftImageUrl?: string | null;
  giftImagePath?: string | null;
  giftTitle?: string | null;
  giftLabel?: string | null;
  giftTextColor?: string;
  giftImageSize?: number;
  /** Admin-only action flag; not persisted on the list row. */
  applyTimerToAll?: boolean;
  /** Admin-only: aplica uma única cor a todos os timers individuais da vitrine. */
  applyTimerColorToAll?: boolean;
  /** Cor usada pela ação em massa acima; não é persistida na linha da vitrine. */
  timerColorForAll?: string;
  /** Habilita os controles de sessão de live para esta vitrine. */
  liveEnabled?: boolean;
  /** Configuração internacional manual por país. */
  internationalConfig?: BestSellerInternationalConfig | null;
  listDate: string; // YYYY-MM-DD
  active: boolean;
  timerEnabled: boolean;
  timerEnd?: string | null; // ISO 8601 para timer fixo
  timerLooping?: boolean;
  timerDurationMinutes?: number | null;
  timezone: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string | null;
  productsCount?: number;
  totalClicks?: number;
  products?: BestSellerProduct[];
}

export interface BestSellerProduct {
  id: string;
  itemType?: 'product' | 'video' | 'benefits';
  /** Principal aparece na vitrine normal; redirect só aparece no fluxo internacional alternativo. */
  displayGroup?: 'main' | 'redirect';
  libraryProductId?: string | null;
  listId: string;
  position: number;
  name: string;
  category: string;
  /** Descrição breve opcional exibida abaixo do nome. Persistida via category por compatibilidade com bancos antigos. */
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  mediaItems?: BestSellerMediaItem[];
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoControls?: boolean;
  videoTitle?: string | null;
  /** Itens do bloco opcional de benefícios da compra. */
  benefits?: string[];
  productUrl?: string | null;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  soldQuantity?: number | null;
  showSoldQuantity: boolean;
  availableQuantity?: number | null;
  sizes: string[];
  outOfStockSizes?: string[];
  colors: string[];
  installmentsCount?: number | null;
  installmentValue?: number | null;
  badgeEnabled: boolean;
  badgeText?: string | null;
  badgeColor?: string;
  badgeUseListDefault?: boolean;
  giftMode?: 'inherit' | 'off' | 'custom';
  giftImageUrl?: string | null;
  giftImagePath?: string | null;
  giftTitle?: string | null;
  giftLabel?: string | null;
  giftTextColor?: string;
  giftImageSize?: number;
  timerEnabled?: boolean;
  timerEnd?: string | null;
  timerLooping?: boolean;
  timerDurationMinutes?: number | null;
  timerColor?: string;
  /** Quando false, o timer do produto usa o mesmo ciclo do timer geral da vitrine. */
  timerSeparate?: boolean;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
}


export interface BestSellerGiftPreset {
  id: string;
  imageUrl: string;
  imagePath?: string | null;
  title?: string | null;
  label?: string | null;
  textColor?: string;
  imageSize?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BestSellerLibraryProduct {
  id: string;
  name: string;
  category?: string;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls: string[];
  mediaItems: BestSellerMediaItem[]; // imagens e vídeos ficam salvos para reutilização
  productUrl?: string | null;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  sizes: string[];
  colors: string[];
  installmentsCount?: number | null;
  installmentValue?: number | null;
  badgeEnabled?: boolean;
  badgeText?: string | null;
  badgeColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicBestSellerProduct {
  id: string;
  itemType?: 'product' | 'video' | 'benefits';
  displayGroup?: 'main' | 'redirect';
  /** Categoria semântica calculada a partir do produto original; permanece estável mesmo após traduzir o nome. */
  autoCategoryKey?: string;
  position: number;
  name: string;
  category: string;
  /** Descrição breve opcional exibida abaixo do nome. Persistida via category por compatibilidade com bancos antigos. */
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  mediaItems?: PublicBestSellerMediaItem[];
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoControls?: boolean;
  videoTitle?: string | null;
  /** Itens do bloco opcional de benefícios da compra. */
  benefits?: string[];
  productUrl?: string | null;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  soldQuantity?: number | null;
  showSoldQuantity: boolean;
  availableQuantity?: number | null;
  sizes: string[];
  outOfStockSizes?: string[];
  colors: string[];
  installmentsCount?: number | null;
  installmentValue?: number | null;
  badgeEnabled: boolean;
  badgeText?: string | null;
  badgeColor?: string;
  giftEnabled?: boolean;
  giftImageUrl?: string | null;
  giftTitle?: string | null;
  giftLabel?: string | null;
  giftTextColor?: string;
  giftImageSize?: number;
  timerEnabled?: boolean;
  timerEnd?: string | null;
  timerLooping?: boolean;
  timerDurationMinutes?: number | null;
  timerColor?: string;
  timerSeparate?: boolean;
}


export interface BestSellerAnalyticsDeviceItem {
  deviceType: string;
  count: number;
}

export interface BestSellerAnalyticsLocationItem {
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  count: number;
  /** Cliques originados nesta localização. */
  clicks?: number;
}

export interface BestSellerAnalyticsProductItem {
  productId: string;
  name: string;
  position?: number;
  clicks: number;
  plays: number;
  viewers?: number;
  averageAttentionSeconds?: number;
  totalAttentionSeconds?: number;
  galleryCompletedVisitors?: number;
  galleryCompletedRate?: number;
  dropOffs?: number;
}

export interface BestSellerAnalyticsHourItem {
  hour: number;
  visitors: number;
}

export interface BestSellerOverallHourItem {
  hour: number;
  visitors: number;
  averageVisitors: number;
}

export interface BestSellerOverallHoursSummary {
  configured: boolean;
  listsCount: number;
  listsWithVisitors: number;
  totalVisitors: number;
  peakHour: number | null;
  peakVisitors: number;
  strongestWindowStart: number | null;
  strongestWindowEnd: number | null;
  strongestWindowVisitors: number;
  hourlyVisitors: BestSellerOverallHourItem[];
}

export interface BestSellerAnalyticsSummary {
  configured: boolean;
  engagementConfigured?: boolean;
  listId: string;
  pageViews: number;
  uniqueVisitors: number;
  totalClicks: number;
  totalPlays: number;
  averageEngagementSeconds: number;
  medianEngagementSeconds?: number;
  totalEngagementSeconds: number;
  reachedLastProductVisitors?: number;
  reachedLastProductRate?: number;
  viewedAllProductsVisitors?: number;
  viewedAllProductsRate?: number;
  galleryExplorersVisitors?: number;
  galleryExplorersRate?: number;
  videoToClickVisitors?: number;
  videoToClickRate?: number;
  devices: BestSellerAnalyticsDeviceItem[];
  locations: BestSellerAnalyticsLocationItem[];
  hourlyVisitors: BestSellerAnalyticsHourItem[];
  products: BestSellerAnalyticsProductItem[];
}

export type BestSellerInternationalLeadStatus = 'new' | 'contacted';

export interface BestSellerInternationalLead {
  id: string;
  listId: string;
  listTitle?: string | null;
  productId?: string | null;
  productName: string;
  countryCode?: string | null;
  locale?: string | null;
  name: string;
  email: string;
  phone: string;
  status: BestSellerInternationalLeadStatus;
  referrer?: string | null;
  createdAt: string;
  contactedAt?: string | null;
}

export interface PublicBestSellerList {
  id: string;
  slug?: string;
  title: string;
  logoUrl?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  footerCtaEnabled?: boolean;
  experienceMode?: BestSellerExperienceMode;
  organizedIntroCount?: number;
  /** Textos resolvidos do modo organizado para o mercado atual. */
  organizedTitle?: string | null;
  organizedSubtitle?: string | null;
  categoryTranslations?: Record<string, string>;
  footerCtaText?: string | null;
  footerCtaUrl?: string | null;
  showDate?: boolean;
  showRanking?: boolean;
  rankColor?: string;
  sizeColor?: string;
  backgroundVideoUrl?: string | null;
  backgroundVideoOpacity?: number;
  backgroundVideoBlur?: number;
  defaultBadgeEnabled?: boolean;
  defaultBadgeText?: string | null;
  defaultBadgeColor?: string;
  giftEnabled?: boolean;
  giftImageUrl?: string | null;
  giftTitle?: string | null;
  giftLabel?: string | null;
  giftTextColor?: string;
  giftImageSize?: number;
  listDate: string;
  timerEnabled: boolean;
  timerEnd?: string | null;
  timerLooping?: boolean;
  timerDurationMinutes?: number | null;
  timezone: string;
  /** País detectado pelo edge/IP da Vercel. */
  detectedCountryCode?: string | null;
  /** Idioma usado pelos textos automáticos da interface pública. */
  uiLocale?: string;
  /** Controles de exibição resolvidos para o mercado atual. */
  showPrices?: boolean;
  showInstallments?: boolean;
  showCta?: boolean;
  showBenefits?: boolean;
  showSoldQuantity?: boolean;
  showAvailableQuantity?: boolean;
  showSizes?: boolean;
  showColors?: boolean;
  showBadges?: boolean;
  showGift?: boolean;
  showProductTimers?: boolean;
  currencyCode?: string;
  currencyLocale?: string;
  approximateConversion?: boolean;
  approximateLabel?: string | null;
  /** Destino de CTA resolvido para o país atual. */
  buttonDestination?: BestSellerButtonDestination;
  /** Texto editorial opcional do formulário internacional. */
  formTitle?: string | null;
  formMessage?: string | null;
  /** Modo alternativo: remove a personalização da vitrine e exibe somente itens Redirecionar. */
  redirectMode?: boolean;
  redirectMessage?: string | null;
  products: PublicBestSellerProduct[];
}


