import {
  ProductType,
  PopupAppearance,
  TextSettings,
  MeasurementHelp,
  AppConfig,
  MeasurementKey,
  MediaAsset,
} from '../types/zhaya';
import { supabase, isSupabaseConfigured } from './supabase';

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

let cachedAppearance: PopupAppearance | null = null;

export const Repository = {
  // ProductTypes
  async getProductTypes(): Promise<ProductType[]> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultProductTypes;
    }
    const client = ensureSupabase();
    const { data, error } = await client
      .from('product_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar tipos de produtos:', error);
      throw new Error(`Falha ao buscar tipos de produtos: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return defaultProductTypes;
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active ?? true,
      order: row.sort_order ?? 0,
      imageUrl: row.image_url || undefined,
      measurementImageUrl: row.measurement_image_url || undefined,
      measurementImageCaption: row.measurement_image_caption || undefined,
      measurements: row.measurements || [],
      sizes: row.sizes || [],
    }));
  },

  async saveProductType(pt: ProductType): Promise<ProductType> {
    const client = ensureSupabase();
    const dbPayload = {
      id: pt.id,
      name: pt.name,
      active: pt.active,
      sort_order: pt.order,
      image_url: pt.imageUrl || null,
      measurement_image_url: pt.measurementImageUrl || null,
      measurement_image_caption: pt.measurementImageCaption || null,
      measurements: pt.measurements,
      sizes: pt.sizes,
    };

    const { error } = await client.from('product_types').upsert(dbPayload);

    if (error) {
      console.error('Erro ao salvar tipo de produto:', error);
      throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);
    }

    return pt;
  },

  async saveProductTypes(typesList: ProductType[]): Promise<ProductType[]> {
    if (!typesList || typesList.length === 0) return [];
    const client = ensureSupabase();
    const dbPayloads = typesList.map((pt) => ({
      id: pt.id,
      name: pt.name,
      active: pt.active,
      sort_order: pt.order,
      image_url: pt.imageUrl || null,
      measurement_image_url: pt.measurementImageUrl || null,
      measurement_image_caption: pt.measurementImageCaption || null,
      measurements: pt.measurements,
      sizes: pt.sizes,
    }));

    const { error } = await client.from('product_types').upsert(dbPayloads);

    if (error) {
      console.error('Erro ao salvar tipos de produtos em lote:', error);
      throw new Error(`Falha ao salvar tipos de peças no banco de dados: ${error.message}`);
    }

    return typesList;
  },

  async deleteProductType(id: string): Promise<void> {
    const client = ensureSupabase();
    const { error } = await client.from('product_types').delete().eq('id', id);

    if (error) {
      console.error('Erro ao excluir tipo de produto:', error);
      throw new Error(`Falha ao excluir no banco de dados: ${error.message}`);
    }
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
    const { data, error } = await client.from('popup_settings').select('*').limit(1);

    if (error) {
      console.error('Erro ao buscar configurações de aparência:', error);
      throw new Error(`Falha ao buscar aparência: ${error.message}`);
    }

    if (data && data.length > 0) {
      cachedAppearance = data[0].settings as PopupAppearance;
      return cachedAppearance;
    }

    cachedAppearance = defaultAppearance;
    return defaultAppearance;
  },

  async saveAppearance(app: PopupAppearance): Promise<PopupAppearance> {
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
  },

  // Texts
  async getTexts(): Promise<TextSettings> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultTexts;
    }
    const client = ensureSupabase();
    const { data, error } = await client.from('text_settings').select('*').limit(1);

    if (error) {
      console.error('Erro ao buscar textos:', error);
      throw new Error(`Falha ao buscar textos: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data[0].settings as TextSettings;
    }

    return defaultTexts;
  },

  async saveTexts(txt: TextSettings): Promise<TextSettings> {
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
  },

  // Measurement Helps / Guides
  async getMeasurementHelps(): Promise<Record<MeasurementKey, MeasurementHelp>> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultMeasurementHelps;
    }
    const client = ensureSupabase();
    const { data, error } = await client.from('measurement_guides').select('*');

    if (error) {
      console.error('Erro ao buscar guias de medição:', error);
      throw new Error(`Falha ao buscar guias de medição: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return defaultMeasurementHelps;
    }

    const result: Record<string, MeasurementHelp> = { ...defaultMeasurementHelps };
    for (const row of data) {
      if (row.measurement_key) {
        result[row.measurement_key as MeasurementKey] = {
          key: row.measurement_key as MeasurementKey,
          label: row.label,
          title: row.title,
          description: row.description || '',
          imageUrl: row.image_url || undefined,
        };
      }
    }

    return result as Record<MeasurementKey, MeasurementHelp>;
  },

  async saveMeasurementHelp(key: MeasurementKey, help: MeasurementHelp): Promise<Record<MeasurementKey, MeasurementHelp>> {
    const client = ensureSupabase();
    const payload = {
      measurement_key: key,
      label: help.label,
      title: help.title,
      description: help.description,
      image_url: help.imageUrl || null,
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
  },

  // App Config
  async getConfig(): Promise<AppConfig> {
    if (!isSupabaseConfigured || !supabase) {
      return defaultAppConfig;
    }
    const client = ensureSupabase();
    const { data, error } = await client.from('app_settings').select('*').limit(1);

    if (error) {
      console.error('Erro ao buscar configurações do app:', error);
      throw new Error(`Falha ao buscar configurações: ${error.message}`);
    }

    if (data && data.length > 0) {
      const row = data[0];
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
  },

  async getMediaAssets(category?: string): Promise<MediaAsset[]> {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }
    const client = ensureSupabase();
    let query = client.from('media_assets').select('*').order('created_at', { ascending: false });
    if (category) {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar mídias:', error);
      return [];
    }
    return data as MediaAsset[];
  },

  async deleteMediaAsset(id: string, storagePath?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
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
  },
};
