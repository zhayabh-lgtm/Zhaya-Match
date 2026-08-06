import {
  ProductType,
  PopupAppearance,
  TextSettings,
  MeasurementHelp,
  AppConfig,
  MeasurementKey,
  MediaAsset,
  MeasurementObservation,
  PeriodType,
} from '../types/zhaya';
import { supabase, isSupabaseConfigured } from './supabase';
import { normalizeMeasurementObservation } from './normalize';

// Default initial values used for database seed or initial state
export const defaultProductTypes: ProductType[] = [
  {
    id: 'pt-jaqueta',
    name: 'Jaqueta',
    active: true,
    order: 1,
    measurements: ['bust', 'waist', 'shoulders'],
    sizes: [
      {
        id: 'sz-p',
        label: 'P',
        order: 1,
        ranges: {
          bust: { min: 84, max: 90 },
          waist: { min: 66, max: 72 },
          shoulders: { min: 36, max: 38 },
        },
      },
      {
        id: 'sz-m',
        label: 'M',
        order: 2,
        ranges: {
          bust: { min: 91, max: 97 },
          waist: { min: 73, max: 79 },
          shoulders: { min: 39, max: 41 },
        },
      },
      {
        id: 'sz-g',
        label: 'G',
        order: 3,
        ranges: {
          bust: { min: 98, max: 104 },
          waist: { min: 80, max: 86 },
          shoulders: { min: 42, max: 44 },
        },
      },
    ],
  },
  {
    id: 'pt-blazer',
    name: 'Blazer',
    active: true,
    order: 2,
    measurements: ['bust', 'waist', 'shoulders'],
    sizes: [
      {
        id: 'sz-bl-p',
        label: 'P',
        order: 1,
        ranges: {
          bust: { min: 84, max: 90 },
          waist: { min: 66, max: 72 },
          shoulders: { min: 37, max: 39 },
        },
      },
      {
        id: 'sz-bl-m',
        label: 'M',
        order: 2,
        ranges: {
          bust: { min: 91, max: 97 },
          waist: { min: 73, max: 79 },
          shoulders: { min: 40, max: 42 },
        },
      },
      {
        id: 'sz-bl-g',
        label: 'G',
        order: 3,
        ranges: {
          bust: { min: 98, max: 104 },
          waist: { min: 80, max: 86 },
          shoulders: { min: 43, max: 45 },
        },
      },
    ],
  },
  {
    id: 'pt-body',
    name: 'Body',
    active: true,
    order: 3,
    measurements: ['bust', 'waist', 'hip', 'torsoLength'],
    sizes: [
      {
        id: 'sz-bo-p',
        label: 'P',
        order: 1,
        ranges: {
          bust: { min: 82, max: 88 },
          waist: { min: 64, max: 70 },
          hip: { min: 88, max: 94 },
          torsoLength: { min: 60, max: 64 },
        },
      },
      {
        id: 'sz-bo-m',
        label: 'M',
        order: 2,
        ranges: {
          bust: { min: 89, max: 95 },
          waist: { min: 71, max: 77 },
          hip: { min: 95, max: 101 },
          torsoLength: { min: 65, max: 69 },
        },
      },
      {
        id: 'sz-bo-g',
        label: 'G',
        order: 3,
        ranges: {
          bust: { min: 96, max: 102 },
          waist: { min: 78, max: 84 },
          hip: { min: 102, max: 108 },
          torsoLength: { min: 70, max: 74 },
        },
      },
    ],
  },
  {
    id: 'pt-vestido',
    name: 'Vestido',
    active: true,
    order: 4,
    measurements: ['bust', 'waist', 'hip'],
    sizes: [
      {
        id: 'sz-ve-p',
        label: 'P',
        order: 1,
        ranges: {
          bust: { min: 84, max: 90 },
          waist: { min: 66, max: 72 },
          hip: { min: 90, max: 96 },
        },
      },
      {
        id: 'sz-ve-m',
        label: 'M',
        order: 2,
        ranges: {
          bust: { min: 91, max: 97 },
          waist: { min: 73, max: 79 },
          hip: { min: 97, max: 103 },
        },
      },
      {
        id: 'sz-ve-g',
        label: 'G',
        order: 3,
        ranges: {
          bust: { min: 98, max: 104 },
          waist: { min: 80, max: 86 },
          hip: { min: 104, max: 110 },
        },
      },
    ],
  },
  {
    id: 'pt-calca',
    name: 'Calça',
    active: true,
    order: 5,
    measurements: ['waist', 'hip', 'thigh'],
    sizes: [
      {
        id: 'sz-ca-36',
        label: '36',
        order: 1,
        ranges: {
          waist: { min: 64, max: 68 },
          hip: { min: 90, max: 94 },
          thigh: { min: 50, max: 54 },
        },
      },
      {
        id: 'sz-ca-38',
        label: '38',
        order: 2,
        ranges: {
          waist: { min: 69, max: 73 },
          hip: { min: 95, max: 99 },
          thigh: { min: 55, max: 58 },
        },
      },
      {
        id: 'sz-ca-40',
        label: '40',
        order: 3,
        ranges: {
          waist: { min: 74, max: 78 },
          hip: { min: 100, max: 104 },
          thigh: { min: 59, max: 62 },
        },
      },
      {
        id: 'sz-ca-42',
        label: '42',
        order: 4,
        ranges: {
          waist: { min: 79, max: 83 },
          hip: { min: 105, max: 109 },
          thigh: { min: 63, max: 66 },
        },
      },
    ],
  },
  {
    id: 'pt-short',
    name: 'Short',
    active: true,
    order: 6,
    measurements: ['waist', 'hip'],
    sizes: [
      {
        id: 'sz-sh-36',
        label: '36',
        order: 1,
        ranges: {
          waist: { min: 64, max: 68 },
          hip: { min: 90, max: 94 },
        },
      },
      {
        id: 'sz-sh-38',
        label: '38',
        order: 2,
        ranges: {
          waist: { min: 69, max: 73 },
          hip: { min: 95, max: 99 },
        },
      },
      {
        id: 'sz-sh-40',
        label: '40',
        order: 3,
        ranges: {
          waist: { min: 74, max: 78 },
          hip: { min: 100, max: 104 },
        },
      },
    ],
  },
  {
    id: 'pt-saia',
    name: 'Saia',
    active: true,
    order: 7,
    measurements: ['waist', 'hip'],
    sizes: [
      {
        id: 'sz-sa-p',
        label: 'P',
        order: 1,
        ranges: {
          waist: { min: 64, max: 70 },
          hip: { min: 90, max: 96 },
        },
      },
      {
        id: 'sz-sa-m',
        label: 'M',
        order: 2,
        ranges: {
          waist: { min: 71, max: 77 },
          hip: { min: 97, max: 103 },
        },
      },
      {
        id: 'sz-sa-g',
        label: 'G',
        order: 3,
        ranges: {
          waist: { min: 78, max: 84 },
          hip: { min: 104, max: 110 },
        },
      },
    ],
  },
  {
    id: 'pt-macacao',
    name: 'Macacão',
    active: true,
    order: 8,
    measurements: ['bust', 'waist', 'hip', 'torsoLength'],
    sizes: [
      {
        id: 'sz-mc-p',
        label: 'P',
        order: 1,
        ranges: {
          bust: { min: 84, max: 90 },
          waist: { min: 66, max: 72 },
          hip: { min: 90, max: 96 },
          torsoLength: { min: 60, max: 64 },
        },
      },
      {
        id: 'sz-mc-m',
        label: 'M',
        order: 2,
        ranges: {
          bust: { min: 91, max: 97 },
          waist: { min: 73, max: 79 },
          hip: { min: 97, max: 103 },
          torsoLength: { min: 65, max: 69 },
        },
      },
      {
        id: 'sz-mc-g',
        label: 'G',
        order: 3,
        ranges: {
          bust: { min: 98, max: 104 },
          waist: { min: 80, max: 86 },
          hip: { min: 104, max: 110 },
          torsoLength: { min: 70, max: 74 },
        },
      },
    ],
  },
  {
    id: 'pt-sapato',
    name: 'Sapato',
    active: true,
    order: 9,
    measurements: ['footLength', 'footWidth'],
    sizes: [
      {
        id: 'sz-sp-35',
        label: '35',
        order: 1,
        ranges: {
          footLength: { min: 22.5, max: 23.2 },
          footWidth: { min: 8.5, max: 9.0 },
        },
      },
      {
        id: 'sz-sp-36',
        label: '36',
        order: 2,
        ranges: {
          footLength: { min: 23.3, max: 23.9 },
          footWidth: { min: 9.1, max: 9.4 },
        },
      },
      {
        id: 'sz-sp-37',
        label: '37',
        order: 3,
        ranges: {
          footLength: { min: 24.0, max: 24.6 },
          footWidth: { min: 9.5, max: 9.8 },
        },
      },
      {
        id: 'sz-sp-38',
        label: '38',
        order: 4,
        ranges: {
          footLength: { min: 24.7, max: 25.3 },
          footWidth: { min: 9.9, max: 10.2 },
        },
      },
      {
        id: 'sz-sp-39',
        label: '39',
        order: 5,
        ranges: {
          footLength: { min: 25.4, max: 26.0 },
          footWidth: { min: 10.3, max: 10.6 },
        },
      },
    ],
  },
];

export const defaultAppearance: PopupAppearance = {
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
  mainMeasurementImageCaption: 'Áreas de medição do corpo (busto, cintura e quadril)',
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
};

export const defaultTexts: TextSettings = {
  buttonText: 'Descubra seu tamanho',
  initialTitle: 'Curadoria de Tamanho Zhaya',
  welcomeMessage: 'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.',
  welcomeButtonText: 'Iniciar Curadoria',
  typeChoiceTitle: 'Qual peça você deseja escolher?',
  measurementsTitle: 'Insira suas medidas corporais',
  calculateButtonText: 'Descobrir meu tamanho',
  resultTitle: 'Sugerimos o tamanho',
  betweenSizesMessage: 'Você está entre dois tamanhos.',
  notFoundMessage: 'Não foi possível recomendar um tamanho automaticamente com base nestas medidas. Nossa equipe está à disposição para atendimento personalizado.',
  recalculateButtonText: 'Calcular novamente',
  closeButtonText: 'Concluir',
  backButtonText: 'Voltar',
  privacyNotice: 'Suas medidas são utilizadas estritamente para esta recomendação.',
};

export const defaultMeasurementHelps: Record<MeasurementKey, MeasurementHelp> = {
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

export const defaultAppConfig: AppConfig = {
  enabled: true,
  widgetUrl: '/widget.js',
  testMode: false,
  allowedDomains: ['zhaya.com.br', 'www.zhaya.com.br'],
  version: 1,
};

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não está configurado. Por favor, preencha as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
  }
  return supabase;
}

async function executeWithRetry<T = any>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>,
  retries = 3,
  delayMs = 800
): Promise<{ data: T | null; error: any }> {
  let lastResult: { data: T | null; error: any } = { data: null, error: null };
  for (let attempt = 0; attempt < retries; attempt++) {
    lastResult = (await queryFn()) as { data: T | null; error: any };
    if (!lastResult.error) {
      return lastResult;
    }
    const errMsg = String(lastResult.error?.message || lastResult.error || '');
    const errCode = lastResult.error?.code;
    const isJwtFuture = errMsg.includes('JWT issued at future') || errCode === 'PGRST301';

    if (isJwtFuture && attempt < retries - 1) {
      console.warn(`[Supabase] JWT issued at future detectado (tentativa ${attempt + 1}/${retries}). Aguardando ${delayMs}ms para sincronização do tempo...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    break;
  }
  return lastResult;
}

async function runWithRetry<T>(
  actionFn: () => Promise<T>,
  retries = 3,
  delayMs = 800
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await actionFn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isJwtFuture = msg.includes('JWT issued at future') || err?.code === 'PGRST301';
      if (isJwtFuture && attempt < retries - 1) {
        console.warn(`[Supabase] JWT issued at future na escrita (tentativa ${attempt + 1}/${retries}). Aguardando ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

let cachedAppearance: PopupAppearance | null = null;

export const Repository = {
  // ProductTypes
  async getProductTypes(): Promise<ProductType[]> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultProductTypes;
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry<any[]>(async () =>
      await client.from('product_types').select('*').order('sort_order', { ascending: true })
    );

    if (error) {
      console.warn('Erro ao buscar tipos de produtos no Supabase (usando dados padrão):', error.message || error);
      return defaultProductTypes;
    }

    const rows = (data || []) as any[];
    if (rows.length === 0) {
      return defaultProductTypes;
    }

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      active: row.active ?? true,
      order: row.sort_order ?? 0,
      imageUrl: row.image_url || undefined,
      iconUrl: row.icon_url || undefined,
      useIconInSelector: row.use_icon_in_selector ?? false,
      measurementImageUrl: row.measurement_image_url || undefined,
      measurementImageCaption: row.measurement_image_caption || undefined,
      measurements: row.measurements || [],
      sizes: row.sizes || [],
    }));
  },

  async saveProductType(pt: ProductType): Promise<ProductType> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const dbPayload: Record<string, any> = {
        id: pt.id,
        name: pt.name,
        active: pt.active,
        sort_order: pt.order,
        image_url: pt.imageUrl || null,
        icon_url: pt.iconUrl || null,
        use_icon_in_selector: pt.useIconInSelector ?? false,
        measurement_image_url: pt.measurementImageUrl || null,
        measurement_image_caption: pt.measurementImageCaption || null,
        measurements: pt.measurements,
        sizes: pt.sizes,
      };

      let { error } = await client.from('product_types').upsert(dbPayload);

      if (
        error &&
        (error.message?.includes('icon_url') ||
          error.message?.includes('use_icon_in_selector') ||
          error.code === 'PGRST204')
      ) {
        console.warn(
          'Coluna icon_url ou use_icon_in_selector não encontrada na tabela product_types do Supabase. Salvando sem esses campos...',
          error.message
        );
        delete dbPayload.icon_url;
        delete dbPayload.use_icon_in_selector;
        const fallbackRes = await client.from('product_types').upsert(dbPayload);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao salvar tipo de produto:', error);
        throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);
      }

      return pt;
    });
  },

  async saveProductTypes(typesList: ProductType[]): Promise<ProductType[]> {
    if (!typesList || typesList.length === 0) return [];
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const dbPayloads: Record<string, any>[] = typesList.map((pt) => ({
        id: pt.id,
        name: pt.name,
        active: pt.active,
        sort_order: pt.order,
        image_url: pt.imageUrl || null,
        icon_url: pt.iconUrl || null,
        use_icon_in_selector: pt.useIconInSelector ?? false,
        measurement_image_url: pt.measurementImageUrl || null,
        measurement_image_caption: pt.measurementImageCaption || null,
        measurements: pt.measurements,
        sizes: pt.sizes,
      }));

      let { error } = await client.from('product_types').upsert(dbPayloads);

      if (
        error &&
        (error.message?.includes('icon_url') ||
          error.message?.includes('use_icon_in_selector') ||
          error.code === 'PGRST204')
      ) {
        console.warn(
          'Coluna icon_url ou use_icon_in_selector não encontrada na tabela product_types do Supabase. Salvando sem esses campos...',
          error.message
        );
        const fallbackPayloads = dbPayloads.map((payload) => {
          const copy = { ...payload };
          delete copy.icon_url;
          delete copy.use_icon_in_selector;
          return copy;
        });
        const fallbackRes = await client.from('product_types').upsert(fallbackPayloads);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao salvar tipos de produtos em lote:', error);
        throw new Error(`Falha ao salvar tipos de peças no banco de dados: ${error.message}`);
      }

      return typesList;
    });
  },

  async deleteProductType(id: string): Promise<void> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const { error } = await client.from('product_types').delete().eq('id', id);

      if (error) {
        console.error('Erro ao excluir tipo de produto:', error);
        throw new Error(`Falha ao excluir no banco de dados: ${error.message}`);
      }
    });
  },

  // Appearance
  async getAppearance(): Promise<PopupAppearance> {
    if (cachedAppearance) {
      return cachedAppearance;
    }
    if (!isSupabaseConfigured || !supabase) {
      cachedAppearance = defaultAppearance;
      return defaultAppearance;
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry<any[]>(async () =>
      await client.from('popup_settings').select('*').limit(1)
    );

    if (error) {
      console.warn('Erro ao buscar configurações de aparência (usando padrão):', error.message || error);
      cachedAppearance = defaultAppearance;
      return defaultAppearance;
    }

    const rows = (data || []) as any[];
    if (rows.length > 0) {
      cachedAppearance = rows[0].settings as PopupAppearance;
      return cachedAppearance;
    }

    cachedAppearance = defaultAppearance;
    return defaultAppearance;
  },

  async saveAppearance(app: PopupAppearance): Promise<PopupAppearance> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const { data: existing } = await client.from('popup_settings').select('id').limit(1);

      if (existing && existing.length > 0) {
        const { error } = await client
          .from('popup_settings')
          .update({ settings: app })
          .eq('id', existing[0].id);

        if (error) {
          console.error('Erro ao atualizar aparência:', error);
          throw new Error(`Falha ao atualizar aparência: ${error.message}`);
        }
      } else {
        const { error } = await client
          .from('popup_settings')
          .insert({ settings: app, version: 1 });

        if (error) {
          console.error('Erro ao inserir aparência:', error);
          throw new Error(`Falha ao salvar aparência: ${error.message}`);
        }
      }

      cachedAppearance = app;
      return app;
    });
  },

  // Texts
  async getTexts(): Promise<TextSettings> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultTexts;
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry<any[]>(async () =>
      await client.from('text_settings').select('*').limit(1)
    );

    if (error) {
      console.warn('Erro ao buscar textos (usando padrão):', error.message || error);
      return defaultTexts;
    }

    const rows = (data || []) as any[];
    if (rows.length > 0) {
      return rows[0].settings as TextSettings;
    }

    return defaultTexts;
  },

  async saveTexts(txt: TextSettings): Promise<TextSettings> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const { data: existing } = await client.from('text_settings').select('id').limit(1);

      if (existing && existing.length > 0) {
        const { error } = await client
          .from('text_settings')
          .update({ settings: txt })
          .eq('id', existing[0].id);

        if (error) {
          console.error('Erro ao atualizar textos:', error);
          throw new Error(`Falha ao atualizar textos: ${error.message}`);
        }
      } else {
        const { error } = await client.from('text_settings').insert({ settings: txt });

        if (error) {
          console.error('Erro ao inserir textos:', error);
          throw new Error(`Falha ao salvar textos: ${error.message}`);
        }
      }

      return txt;
    });
  },

  // Measurement Helps / Guides
  async getMeasurementHelps(): Promise<Record<MeasurementKey, MeasurementHelp>> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultMeasurementHelps;
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry<any[]>(async () =>
      await client.from('measurement_guides').select('*')
    );

    if (error) {
      console.warn('Erro ao buscar guias de medição (usando padrão):', error.message || error);
      return defaultMeasurementHelps;
    }

    const rows = (data || []) as any[];
    if (rows.length === 0) {
      return defaultMeasurementHelps;
    }

    const result: Record<string, MeasurementHelp> = { ...defaultMeasurementHelps };
    for (const row of rows) {
      if (row.measurement_key) {
        const rawObs = Array.isArray(row.observations) ? row.observations : [];
        result[row.measurement_key as MeasurementKey] = {
          key: row.measurement_key as MeasurementKey,
          label: row.label,
          title: row.title,
          description: row.description || '',
          imageUrl: row.image_url || undefined,
          observations: rawObs.map(normalizeMeasurementObservation),
        };
      }
    }

    return result as Record<MeasurementKey, MeasurementHelp>;
  },

  async saveMeasurementHelp(key: MeasurementKey, help: MeasurementHelp): Promise<Record<MeasurementKey, MeasurementHelp>> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const payload = {
        measurement_key: key,
        label: help.label,
        title: help.title,
        description: help.description,
        image_url: help.imageUrl || null,
        observations: help.observations || [],
        active: true,
      };

      const { error } = await client
        .from('measurement_guides')
        .upsert(payload, { onConflict: 'measurement_key' });

      if (error) {
        console.error('Erro ao salvar guia de medição:', error);
        throw new Error(`Falha ao salvar guia de medição: ${error.message}`);
      }

      return this.getMeasurementHelps();
    });
  },

  async saveMeasurementHelps(helpsMap: Record<MeasurementKey, MeasurementHelp>): Promise<Record<MeasurementKey, MeasurementHelp>> {
    if (!isSupabaseConfigured || !supabase) {
      return helpsMap;
    }
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const payloads = Object.entries(helpsMap).map(([key, help]) => ({
        measurement_key: key,
        label: help.label,
        title: help.title,
        description: help.description || '',
        image_url: help.imageUrl || null,
        observations: help.observations || [],
        active: true,
      }));

      if (payloads.length === 0) return helpsMap;

      const { error } = await client
        .from('measurement_guides')
        .upsert(payloads, { onConflict: 'measurement_key' });

      if (error) {
        console.error('Erro ao salvar guias de medição em lote:', error);
        throw new Error(`Falha ao salvar guias de medição: ${error.message}`);
      }

      return this.getMeasurementHelps();
    });
  },

  // App Config
  async getConfig(): Promise<AppConfig> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultAppConfig;
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry<any[]>(async () =>
      await client.from('app_settings').select('*').limit(1)
    );

    if (error) {
      console.warn('Erro ao buscar configurações do app (usando padrão):', error.message || error);
      return defaultAppConfig;
    }

    const rows = (data || []) as any[];
    if (rows.length > 0) {
      const row = rows[0];
      return {
        enabled: row.enabled ?? true,
        widgetUrl: row.widget_url || '/widget.js',
        testMode: row.test_mode ?? false,
        allowedDomains: Array.isArray(row.allowed_domains) && row.allowed_domains.length > 0
          ? row.allowed_domains
          : ['zhaya.com.br', 'www.zhaya.com.br'],
        version: row.version || 1,
      };
    }

    return defaultAppConfig;
  },

  async saveConfig(cfg: AppConfig): Promise<AppConfig> {
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const { data: existing } = await client.from('app_settings').select('id, version').limit(1);

      const newVersion = ((existing && existing[0] && existing[0].version) || 1) + 1;
      const payload = {
        enabled: cfg.enabled,
        widget_url: cfg.widgetUrl,
        test_mode: cfg.testMode,
        allowed_domains: cfg.allowedDomains || ['zhaya.com.br', 'www.zhaya.com.br'],
        version: newVersion,
      };

      if (existing && existing.length > 0) {
        const { error } = await client
          .from('app_settings')
          .update(payload)
          .eq('id', existing[0].id);

        if (error) {
          console.error('Erro ao atualizar configurações:', error);
          throw new Error(`Falha ao atualizar configurações: ${error.message}`);
        }
      } else {
        const { error } = await client.from('app_settings').insert(payload);

        if (error) {
          console.error('Erro ao salvar configurações:', error);
          throw new Error(`Falha ao salvar configurações: ${error.message}`);
        }
      }

      return { ...cfg, version: newVersion };
    });
  },

  // Media Assets
  async saveMediaAsset(asset: Omit<MediaAsset, 'id' | 'created_at'>): Promise<MediaAsset> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        id: 'media-' + Date.now(),
        ...asset,
        created_at: new Date().toISOString(),
      };
    }
    return runWithRetry(async () => {
      const client = ensureSupabase();
      const { data, error } = await client
        .from('media_assets')
        .insert({
          name: asset.name,
          category: asset.category,
          storage_path: asset.storage_path,
          public_url: asset.public_url,
          mime_type: asset.mime_type,
          width: asset.width || null,
          height: asset.height || null,
          file_size: asset.file_size || null,
          alt_text: asset.alt_text || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar mídia em media_assets:', error);
        throw new Error(`Falha ao registrar mídia: ${error.message}`);
      }

      return data as MediaAsset;
    });
  },

  async getMediaAssets(category?: string): Promise<MediaAsset[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }
    const client = ensureSupabase();
    const { data, error } = await executeWithRetry(() => {
      let query = client.from('media_assets').select('*').order('created_at', { ascending: false });
      if (category) {
        query = query.eq('category', category);
      }
      return query;
    });

    if (error) {
      console.warn('Erro ao buscar mídias:', error.message || error);
      return [];
    }
    return (data || []) as MediaAsset[];
  },

  async deleteMediaAsset(id: string, storagePath?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    return runWithRetry(async () => {
      const client = ensureSupabase();

      if (storagePath) {
        const { error: storageErr } = await client.storage
          .from('zhaya-match-media')
          .remove([storagePath]);
        if (storageErr) {
          console.warn('Aviso ao remover arquivo do Storage:', storageErr.message);
        }
      }

      const { error } = await client.from('media_assets').delete().eq('id', id);
      if (error) {
        console.error('Erro ao remover registro de media_assets:', error);
        throw new Error(`Falha ao remover mídia: ${error.message}`);
      }
    });
  },

  // Analytics
  async saveAnalyticsEvent(eventPayload: {
    eventId: string;
    eventName: string;
    visitorId?: string;
    sessionId: string;
    productTypeId?: string;
    productTypeName?: string;
    productCategory?: string;
    recommendationStatus?: 'recommended' | 'between_sizes' | 'not_found';
    sourceDomain?: string;
    pagePath?: string;
    deviceType?: 'mobile' | 'desktop';
    configVersion?: number;
    metadata?: Record<string, any>;
    occurredAt?: string;
  }): Promise<void> {
    const record: any = {
      event_id: eventPayload.eventId,
      event_name: eventPayload.eventName,
      visitor_id: eventPayload.visitorId || null,
      session_id: eventPayload.sessionId,
      product_type_id: eventPayload.productTypeId || null,
      product_type_name: eventPayload.productTypeName || null,
      product_category: eventPayload.productCategory || null,
      recommendation_status: eventPayload.recommendationStatus || null,
      source_domain: eventPayload.sourceDomain || null,
      page_path: eventPayload.pagePath || null,
      device_type: eventPayload.deviceType || 'desktop',
      config_version: eventPayload.configVersion || 1,
      metadata: eventPayload.metadata || {},
      occurred_at: eventPayload.occurredAt || new Date().toISOString(),
    };

    // Always maintain in-memory fallback
    if (!inMemoryAnalyticsEvents.some((e) => e.event_id === record.event_id)) {
      inMemoryAnalyticsEvents.push(record);
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const client = ensureSupabase();
      const { error } = await client
        .from('widget_analytics_events')
        .upsert(record, { onConflict: 'event_id', ignoreDuplicates: true });

      if (error) {
        console.warn('Aviso ao registrar evento de analytics no Supabase:', error.message || error);
      }
    } catch (e: any) {
      console.warn('Exceção ao salvar evento de analytics no Supabase:', e?.message || e);
    }
  },

  async getAnalyticsSummary(
    period: PeriodType | 'today' = '7days',
    customStart?: string,
    customEnd?: string
  ): Promise<any> {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30days') {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '90days') {
      startDate.setDate(now.getDate() - 89);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    let records: any[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const client = ensureSupabase();
        const { data, error } = await executeWithRetry<any[]>(async () =>
          await client
            .from('widget_analytics_events')
            .select('*')
            .gte('occurred_at', startIso)
            .lte('occurred_at', endIso)
            .order('occurred_at', { ascending: true })
        );

        if (!error && data) {
          records = data;
        } else {
          console.warn('Usando dados em memória para Analytics devido a aviso no Supabase:', error?.message);
          records = inMemoryAnalyticsEvents.filter((e) => {
            const occ = new Date(e.occurred_at || e.created_at || '').getTime();
            return occ >= startDate.getTime() && occ <= endDate.getTime();
          });
        }
      } catch (e) {
        records = inMemoryAnalyticsEvents.filter((e) => {
          const occ = new Date(e.occurred_at || e.created_at || '').getTime();
          return occ >= startDate.getTime() && occ <= endDate.getTime();
        });
      }
    } else {
      records = inMemoryAnalyticsEvents.filter((e) => {
        const occ = new Date(e.occurred_at || e.created_at || '').getTime();
        return occ >= startDate.getTime() && occ <= endDate.getTime();
      });
    }

    // Exclui eventos de pré-visualização (modo admin preview)
    records = records.filter(
      (r) => !r.metadata || (r.metadata.preview !== true && r.metadata.is_preview !== true)
    );

    // Métricas principais
    const totalLauncherClicked = records.filter((r) => r.event_name === 'launcher_clicked').length;
    const totalWidgetOpened = records.filter((r) => r.event_name === 'widget_opened').length;
    const totalFlowStarted = records.filter((r) => r.event_name === 'flow_started').length;
    const totalProductTypeSelected = records.filter((r) => r.event_name === 'product_type_selected').length;
    const totalMeasurementsStarted = records.filter((r) => r.event_name === 'measurements_started').length;

    const recommendedList = records.filter((r) => r.event_name === 'recommendation_generated');
    const notFoundList = records.filter((r) => r.event_name === 'recommendation_not_found');

    const totalRecommendedFound = recommendedList.length;
    const totalNotFound = notFoundList.length;
    const totalCalculations = totalRecommendedFound + totalNotFound;

    // Visitantes e Sessões Únicos
    const visitorIdSet = new Set<string>();
    const sessionIdSet = new Set<string>();
    records.forEach((r) => {
      if (r.visitor_id) visitorIdSet.add(r.visitor_id);
      if (r.session_id) sessionIdSet.add(r.session_id);
    });

    const uniqueVisitors = visitorIdSet.size > 0 ? visitorIdSet.size : sessionIdSet.size;
    const uniqueSessions = sessionIdSet.size;

    // Taxas de conversão (com proteção contra divisão por zero)
    const openRate = totalLauncherClicked > 0 ? totalWidgetOpened / totalLauncherClicked : 0;
    const startRate = totalWidgetOpened > 0 ? totalFlowStarted / totalWidgetOpened : 0;
    const completionRate = totalFlowStarted > 0 ? totalCalculations / totalFlowStarted : 0;
    const notFoundRate = totalCalculations > 0 ? totalNotFound / totalCalculations : 0;

    // Cálculo de abandono por sessão (sessões onde ocorreu flow_started mas NENHUM cálculo foi concluído)
    const sessionsWithFlowStarted = new Set<string>();
    const sessionsWithCalculation = new Set<string>();

    records.forEach((r) => {
      if (r.event_name === 'flow_started' && r.session_id) {
        sessionsWithFlowStarted.add(r.session_id);
      }
      if (
        (r.event_name === 'recommendation_generated' || r.event_name === 'recommendation_not_found') &&
        r.session_id
      ) {
        sessionsWithCalculation.add(r.session_id);
      }
    });

    let abandonmentCount = 0;
    sessionsWithFlowStarted.forEach((sid) => {
      if (!sessionsWithCalculation.has(sid)) {
        abandonmentCount++;
      }
    });

    const abandonmentRate =
      sessionsWithFlowStarted.size > 0 ? abandonmentCount / sessionsWithFlowStarted.size : 0;

    // Agregação diária por fuso horário brasileiro America/Sao_Paulo
    const dailyMap: Record<string, { aberturas: number; inicios: number; calculos: number }> = {};

    // Inicializa todos os dias do período no mapa para garantir continuidade visual no gráfico
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dayKey = curr.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      dailyMap[dayKey] = { aberturas: 0, inicios: 0, calculos: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    records.forEach((r) => {
      const dt = new Date(r.occurred_at || r.created_at || Date.now());
      const dayKey = dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { aberturas: 0, inicios: 0, calculos: 0 };
      }
      if (r.event_name === 'widget_opened') {
        dailyMap[dayKey].aberturas++;
      } else if (r.event_name === 'flow_started') {
        dailyMap[dayKey].inicios++;
      } else if (
        r.event_name === 'recommendation_generated' ||
        r.event_name === 'recommendation_not_found'
      ) {
        dailyMap[dayKey].calculos++;
      }
    });

    const dailyMetrics = Object.entries(dailyMap).map(([dateStr, counts]) => ({
      date: dateStr.slice(0, 5), // DD/MM
      fullDate: dateStr,
      aberturas: counts.aberturas,
      inicios: counts.inicios,
      calculos: counts.calculos,
    }));

    // Funil de conversão
    const baseCount = Math.max(totalLauncherClicked, totalWidgetOpened, 1);
    const funnelStages = [
      {
        stage: 'launcher_clicked',
        label: 'Botão clicado',
        count: totalLauncherClicked,
        percentage: totalLauncherClicked > 0 ? 100 : 0,
      },
      {
        stage: 'widget_opened',
        label: 'Widget aberto',
        count: totalWidgetOpened,
        percentage: totalLauncherClicked > 0 ? Math.round((totalWidgetOpened / totalLauncherClicked) * 100) : (totalWidgetOpened > 0 ? 100 : 0),
      },
      {
        stage: 'flow_started',
        label: 'Fluxo iniciado',
        count: totalFlowStarted,
        percentage: totalWidgetOpened > 0 ? Math.round((totalFlowStarted / totalWidgetOpened) * 100) : 0,
      },
      {
        stage: 'product_type_selected',
        label: 'Tipo selecionado',
        count: totalProductTypeSelected,
        percentage: totalFlowStarted > 0 ? Math.round((totalProductTypeSelected / totalFlowStarted) * 100) : 0,
      },
      {
        stage: 'measurements_started',
        label: 'Medidas iniciadas',
        count: totalMeasurementsStarted,
        percentage: totalProductTypeSelected > 0 ? Math.round((totalMeasurementsStarted / totalProductTypeSelected) * 100) : 0,
      },
      {
        stage: 'recommendation_completed',
        label: 'Cálculo concluído',
        count: totalCalculations,
        percentage: totalFlowStarted > 0 ? Math.round((totalCalculations / totalFlowStarted) * 100) : 0,
      },
    ];

    // Categorias/Tipos mais escolhidos
    const categoryCounts: Record<string, { name: string; category?: string; count: number }> = {};
    records
      .filter((r) => r.event_name === 'product_type_selected' && r.product_type_name)
      .forEach((r) => {
        const name = r.product_type_name!;
        if (!categoryCounts[name]) {
          categoryCounts[name] = {
            name,
            category: r.product_category || undefined,
            count: 0,
          };
        }
        categoryCounts[name].count++;
      });

    const totalCategorySelections = Object.values(categoryCounts).reduce((acc, c) => acc + c.count, 0);
    const topCategories = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .map((cat) => ({
        name: cat.name,
        category: cat.category,
        count: cat.count,
        percentage: totalCategorySelections > 0 ? Math.round((cat.count / totalCategorySelections) * 100) : 0,
      }));

    // Distribuição dos Resultados
    let exactCount = 0;
    let betweenSizesCount = 0;
    recommendedList.forEach((r) => {
      if (r.recommendation_status === 'between_sizes') {
        betweenSizesCount++;
      } else {
        exactCount++;
      }
    });

    const recommendationBreakdown = {
      recommended: exactCount,
      betweenSizes: betweenSizesCount,
      notFound: totalNotFound,
    };

    const recommendationTypes = {
      recommended: exactCount,
      between_sizes: betweenSizesCount,
      not_found: totalNotFound,
    };

    const dailyEvolution = Object.entries(dailyMap).map(([dateStr, counts]) => ({
      date: dateStr.slice(0, 5),
      fullDate: dateStr,
      viewed: totalLauncherClicked,
      opened: counts.aberturas,
      started: counts.inicios,
      completed: counts.calculos,
      abandoned: 0,
      aberturas: counts.aberturas,
      inicios: counts.inicios,
      calculos: counts.calculos,
    }));

    const funnel = funnelStages.map((st) => ({
      step: st.stage,
      label: st.label,
      count: st.count,
      rate: st.percentage,
    }));

    const topTypes = topCategories.map((cat) => ({
      typeName: cat.name,
      category: cat.category,
      started: cat.count,
      completed: Math.round((cat.count * (completionRate || 0))),
    }));

    return {
      period,
      startDate: startDate.toLocaleDateString('pt-BR'),
      endDate: endDate.toLocaleDateString('pt-BR'),
      startDateStr: startDate.toLocaleDateString('pt-BR'),
      endDateStr: endDate.toLocaleDateString('pt-BR'),
      totalViewed: totalLauncherClicked,
      totalClicked: totalLauncherClicked,
      totalLauncherClicked,
      totalWidgetOpened,
      totalOpened: totalWidgetOpened,
      totalFlowStarted,
      totalStarted: totalFlowStarted,
      totalProductTypeSelected,
      totalTypeSelected: totalProductTypeSelected,
      totalMeasurementsStarted,
      totalCalculations,
      totalRecommendedFound,
      totalRecommended: totalRecommendedFound,
      totalNotFound,
      totalHelpOpened: 0,
      totalClosed: 0,
      uniqueVisitors,
      uniqueSessions,
      openRate,
      startRate,
      completionRate,
      notFoundRate,
      abandonmentCount,
      abandonmentRate,
      dailyMetrics,
      dailyEvolution,
      funnelStages,
      funnel,
      topCategories,
      topTypes,
      recommendationBreakdown,
      recommendationTypes,
      totalRecords: records.length,
    };
  },

  async getActivityStatus(): Promise<any> {
    if (isSupabaseConfigured && supabase) {
      try {
        const client = ensureSupabase();
        const { data, error } = await client
          .from('system_activity_status')
          .select('*')
          .eq('id', 'supabase-activity-monitor')
          .maybeSingle();

        if (!error && data) {
          let lastStatus = data.last_status || 'success';
          if (data.last_run_at) {
            const lastRunTime = new Date(data.last_run_at).getTime();
            const now = Date.now();
            if (now - lastRunTime > 48 * 60 * 60 * 1000 && lastStatus === 'success') {
              lastStatus = 'warning';
            }
          }
          return {
            id: data.id,
            lastRunAt: data.last_run_at,
            lastSuccessAt: data.last_success_at,
            lastStatus,
            lastError: data.last_error,
            updatedAt: data.updated_at,
          };
        }
      } catch (e) {
        console.warn('Erro ao consultar status de atividade no Supabase:', e);
      }
    }
    return inMemoryActivityStatus;
  },

  async runActivityCheck(): Promise<any> {
    const nowIso = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      try {
        const client = ensureSupabase();
        const { data: rpcRes, error: rpcErr } = await client.rpc('execute_system_activity_check');
        if (!rpcErr && rpcRes) {
          const status = await this.getActivityStatus();
          return { ok: true, status };
        }

        const { error: countErr } = await client
          .from('app_settings')
          .select('*', { count: 'exact', head: true });

        const record = {
          id: 'supabase-activity-monitor',
          last_run_at: nowIso,
          last_success_at: !countErr ? nowIso : undefined,
          last_status: !countErr ? 'success' : 'error',
          last_error: countErr ? countErr.message : null,
          updated_at: nowIso,
        };

        await client
          .from('system_activity_status')
          .upsert(record, { onConflict: 'id' });

        inMemoryActivityStatus = {
          id: 'supabase-activity-monitor',
          lastRunAt: nowIso,
          lastSuccessAt: !countErr ? nowIso : inMemoryActivityStatus.lastSuccessAt,
          lastStatus: !countErr ? 'success' : 'error',
          lastError: countErr ? countErr.message : null,
          updatedAt: nowIso,
        };

        const status = await this.getActivityStatus();
        return { ok: true, status };
      } catch (e: any) {
        console.warn('Exceção ao executar verificação de atividade:', e);
      }
    }

    inMemoryActivityStatus = {
      id: 'supabase-activity-monitor',
      lastRunAt: nowIso,
      lastSuccessAt: nowIso,
      lastStatus: 'success',
      lastError: null,
      updatedAt: nowIso,
    };

    return { ok: true, status: inMemoryActivityStatus };
  },
};

const inMemoryAnalyticsEvents: any[] = [];
let inMemoryActivityStatus: any = {
  id: 'supabase-activity-monitor',
  lastRunAt: new Date().toISOString(),
  lastSuccessAt: new Date().toISOString(),
  lastStatus: 'success',
  lastError: null,
  updatedAt: new Date().toISOString(),
};

