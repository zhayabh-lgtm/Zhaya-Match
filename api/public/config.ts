import { createClient } from '@supabase/supabase-js';
import { normalizeProductType, normalizeMeasurementObservation } from '../../src/lib/normalize.js';

const defaultAppearance = {
  showLogo: true,
  logoVariant: 'auto',
  logoSize: 24,
  logoPosition: 'center',
  logoMarginTop: 0,
  logoMarginBottom: 16,
  fontPreset: 'neue-einstellung',
  titleFontFamily: 'Neue Einstellung',
  bodyFontFamily: 'Neue Einstellung',
  customFontUrl: '',
  titleFontSize: 20,
  bodyFontSize: 13,
  fieldFontSize: 13,
  buttonFontSize: 12,
  titleFontWeight: 700,
  textFontWeight: 400,
  buttonFontWeight: 700,
  resultFontWeight: 700,
  bodyFontWeight: 'normal',
  letterSpacing: '0.05em',
  lineHeight: '1.4',
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
  buttonColor: '#FFFFFF',
  buttonTextColor: '#000000',
  buttonBorderColor: '#FFFFFF',
  buttonBorderWidth: 1,
  buttonBorderRadius: 4,
  buttonHeight: 44,
  buttonHoverOpacity: 0.9,
  buttonTextTransform: 'uppercase',
  inputBackgroundColor: '#121212',
  inputTextColor: '#FFFFFF',
  inputPlaceholderColor: '#737373',
  inputBorderColor: '#262626',
  inputFocusColor: '#FFFFFF',
  inputBorderRadius: 4,
  inputHeight: 40,
  upperBodyMeasurementImageUrl: '',
  upperBodyMeasurementImageCaption: 'Referência para busto, cintura, ombros e comprimento do tronco.',
  lowerBodyMeasurementImageUrl: '',
  lowerBodyMeasurementImageCaption: 'Referência para cintura, quadril e coxa.',
  footwearMeasurementImageUrl: '',
  footwearMeasurementImageCaption: 'Referência para comprimento e largura do pé.',
  mainMeasurementImageUrl: '',
  mainMeasurementImageCaption: 'Áreas de medição do corpo (busto, cintura e quadril)',
  imageAreaBgColor: '#0A0A0A',
  imageAreaOpacity: 1,
  imageBorderColor: '#262626',
  imageBorderRadius: 8,
  showMeasurementCaption: true,
  measurementCaptionColor: '#A3A3A3',
  imagePositionDesktop: 'left',
  imagePositionMobile: 'top',
  overlayColor: '#000000',
  overlayOpacity: 0.75,
  enableBlur: true,
  blurAmount: 3,
  closeOnClickOutside: true,
  animationDuration: 0.2,
  mobileFormat: 'modal',
  mobileMaxHeight: 580,
  mobileSideMargin: 16,
  mobileImageHeight: 180,
  mobileStickyAction: true,
  buttonText: 'Encontrar meu tamanho',
  buttonStyle: 'border',
  storeButtonColor: '#000000',
  storeButtonTextColor: '#FFFFFF',
  storeButtonBorderColor: '#000000',
  storeButtonFontSize: 13,
  storeButtonFontWeight: 500,
  storeButtonPadding: 12,
  storeButtonBorderRadius: 4,
};

const defaultTexts = {
  buttonText: 'Descubra seu tamanho pelo Zhaya Match',
  initialTitle: 'Curadoria de Tamanho Zhaya',
  welcomeMessage:
    'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.',
  welcomeButtonText: 'Iniciar Curadoria',
  typeChoiceTitle: 'Qual peça você deseja escolher?',
  measurementsTitle: 'Insira suas medidas corporais',
  calculateButtonText: 'Descobrir meu tamanho',
  resultTitle: 'Sugerimos o tamanho',
  betweenSizesMessage: 'Você está entre dois tamanhos.',
  notFoundMessage:
    'Não foi possível recomendar um tamanho automaticamente com base nestas medidas. Nossa equipe está à disposição para atendimento personalizado.',
  recalculateButtonText: 'Calcular novamente',
  closeButtonText: 'Concluir',
  backButtonText: 'Voltar',
  privacyNotice: 'Suas medidas são utilizadas estritamente para esta recomendação.',
};

const defaultMeasurementHelps: Record<string, any> = {
  bust: {
    key: 'bust',
    label: 'Busto',
    title: 'Como medir o busto',
    description: 'Passe a fita ao redor da parte mais cheia do busto, mantendo-a reta e sem apertar.',
  },
  waist: {
    key: 'waist',
    label: 'Cintura',
    title: 'Como medir a cintura',
    description: 'Passe a fita ao redor da menor parte da cintura, logo acima do umbigo.',
  },
  hip: {
    key: 'hip',
    label: 'Quadril',
    title: 'Como medir o quadril',
    description: 'Passe a fita na parte mais larga do quadril com os pés juntos.',
  },
  shoulders: {
    key: 'shoulders',
    label: 'Ombros',
    title: 'Como medir os ombros',
    description: 'Meça na parte de trás, de uma extremidade do ombro à outra.',
  },
  thigh: {
    key: 'thigh',
    label: 'Coxa',
    title: 'Como medir a coxa',
    description: 'Passe a fita ao redor da parte mais grossa da coxa.',
  },
  torsoLength: {
    key: 'torsoLength',
    label: 'Comprimento do tronco',
    title: 'Como medir o tronco',
    description: 'Meça da base do pescoço até a linha da cintura.',
  },
  footLength: {
    key: 'footLength',
    label: 'Comprimento do pé',
    title: 'Como medir o pé',
    description: 'Meça do calcanhar até a ponta do dedo mais longo.',
  },
  footWidth: {
    key: 'footWidth',
    label: 'Largura do pé',
    title: 'Como medir a largura do pé',
    description: 'Meça na parte mais larga da planta do pé.',
  },
};

const defaultDomains = [
  'zhaya.com.br',
  'www.zhaya.com.br',
  'localhost',
  '127.0.0.1',
  'localhost:8080',
  '127.0.0.1:8080',
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

res.setHeader('Content-Type', 'application/json; charset=utf-8');
res.setHeader(
  'Cache-Control',
  'no-store, no-cache, must-revalidate'
);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.warn('[api/public/config] Supabase credentials missing. Returning default fallback config.');
    return res.status(200).json({
      enabled: true,
      version: 1,
      allowedDomains: defaultDomains,
      testMode: false,
      productTypes: [],
      appearance: defaultAppearance,
      texts: defaultTexts,
      measurementHelps: defaultMeasurementHelps,
    });
  }

  const supabase = createClient(url, key);

  let productTypes: any[] = [];
  let appearance = defaultAppearance;
  let texts = defaultTexts;
  let measurementHelps: Record<string, any> = { ...defaultMeasurementHelps };
let enabled = true;
let version = 1;
let testMode = false;
let allowedDomains = defaultDomains;
let enableFeedbackSurvey = true;

  // 1. Fetch product_types
  try {
const { data, error } = await supabase
  .from('product_types')
  .select('*')
  .eq('active', true)
  .order('sort_order', { ascending: true });

if (error) {
  console.error(
    '[api/public/config] Failed fetching product_types:',
    error.message
  );
} else {
  productTypes = (data || []).map((row: any) => normalizeProductType(row));
}
  } catch (err: any) {
    console.error('[api/public/config] Exception fetching product_types:', err?.message || err);
  }

  // 2. Fetch popup_settings
  try {
    const { data, error } = await supabase.from('popup_settings').select('*').limit(1);
    if (error) {
      console.error('[api/public/config] Failed fetching popup_settings:', error.message);
    } else if (data && data.length > 0 && data[0].settings) {
      appearance = data[0].settings;
    }
  } catch (err: any) {
    console.error('[api/public/config] Exception fetching popup_settings:', err?.message || err);
  }

  // 3. Fetch text_settings
  try {
    const { data, error } = await supabase.from('text_settings').select('*').limit(1);
    if (error) {
      console.error('[api/public/config] Failed fetching text_settings:', error.message);
    } else if (data && data.length > 0 && data[0].settings) {
      texts = data[0].settings;
    }
  } catch (err: any) {
    console.error('[api/public/config] Exception fetching text_settings:', err?.message || err);
  }

  // 4. Fetch measurement_guides
  try {
    const { data, error } = await supabase.from('measurement_guides').select('*');
    if (error) {
      console.error('[api/public/config] Failed fetching measurement_guides:', error.message);
    } else if (data && data.length > 0) {
      for (const row of data) {
        if (row.measurement_key) {
          const rawObs = Array.isArray(row.observations) ? row.observations : [];
          measurementHelps[row.measurement_key] = {
            key: row.measurement_key,
            label: row.label,
            title: row.title,
            description: row.description || '',
            imageUrl: row.image_url || undefined,
            observations: rawObs.map(normalizeMeasurementObservation),
          };
        }
      }
    }
  } catch (err: any) {
    console.error('[api/public/config] Exception fetching measurement_guides:', err?.message || err);
  }

  // 5. Fetch app_settings
  try {
    const { data, error } = await supabase.from('app_settings').select('*').limit(1);
    if (error) {
      console.error('[api/public/config] Failed fetching app_settings:', error.message);
    } else if (data && data.length > 0) {
const row = data[0];
enabled = row.enabled ?? true;
version = row.version || 1;
testMode = row.test_mode ?? false;
enableFeedbackSurvey = row.enable_feedback_survey ?? true;

if (Array.isArray(row.allowed_domains) && row.allowed_domains.length > 0) {
  allowedDomains = Array.from(new Set([...row.allowed_domains, ...defaultDomains]));
}
    }
  } catch (err: any) {
    console.error('[api/public/config] Exception fetching app_settings:', err?.message || err);
  }

return res.status(200).json({
  enabled,
  version,
  allowedDomains,
  testMode,
  enableFeedbackSurvey,
  productTypes,
  appearance,
  texts,
  measurementHelps,
});
}
