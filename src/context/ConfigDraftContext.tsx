import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { PopupAppearance, TextSettings, AppConfig, ProductType, MeasurementHelp } from '../types/zhaya';
import { Repository, defaultAppearance, defaultTexts, defaultAppConfig } from '../lib/repository';
import { normalizeAppearance, normalizeTexts, normalizeProductType } from '../lib/normalize';

export type PublishStatus = 'saved' | 'draft' | 'publishing' | 'published' | 'error';

interface ConfigDraftContextType {
  // Current draft states
  appearance: PopupAppearance;
  texts: TextSettings;
  config: AppConfig;
  productTypes: ProductType[];
  helps: Record<string, MeasurementHelp>;

  // Published snapshot states
  publishedAppearance: PopupAppearance;
  publishedTexts: TextSettings;
  publishedConfig: AppConfig;
  publishedProductTypes: ProductType[];
  publishedHelps: Record<string, MeasurementHelp>;

  // Handshake & Sync Protocol
  revision: number;
  sessionId: string;

  // Status & Metadata
  status: PublishStatus;
  isDirty: boolean;
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  lastPublishedAt: string | null;
  version: number;

  // Draft Mutations
  updateAppearance: (updater: (prev: PopupAppearance) => PopupAppearance) => void;
  updateTexts: (updater: (prev: TextSettings) => TextSettings) => void;
  updateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  replaceProductTypes: (types: ProductType[]) => void;
  updateHelps: (helps: Record<string, MeasurementHelp>) => void;

  // Actions
  publish: (overrides?: Partial<{
    appearance: PopupAppearance;
    texts: TextSettings;
    config: AppConfig;
    productTypes: ProductType[];
    helps: Record<string, MeasurementHelp>;
  }>) => Promise<void>;
  discard: () => void;
  reloadFromDatabase: () => Promise<void>;
}

const ConfigDraftContext = createContext<ConfigDraftContextType | undefined>(undefined);

// Helper to compare object equality deep enough for dirty checking
function isDeepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export const ConfigDraftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const sessionIdRef = useRef<string>('sess-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
  const [revision, setRevision] = useState<number>(1);

  const [appearance, setAppearance] = useState<PopupAppearance>(() => normalizeAppearance(defaultAppearance));
  const [texts, setTexts] = useState<TextSettings>(() => normalizeTexts(defaultTexts));
  const [config, setConfig] = useState<AppConfig>(defaultAppConfig);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [helps, setHelps] = useState<Record<string, MeasurementHelp>>({});

  const [publishedAppearance, setPublishedAppearance] = useState<PopupAppearance>(() => normalizeAppearance(defaultAppearance));
  const [publishedTexts, setPublishedTexts] = useState<TextSettings>(() => normalizeTexts(defaultTexts));
  const [publishedConfig, setPublishedConfig] = useState<AppConfig>(defaultAppConfig);
  const [publishedProductTypes, setPublishedProductTypes] = useState<ProductType[]>([]);
  const [publishedHelps, setPublishedHelps] = useState<Record<string, MeasurementHelp>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<PublishStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);

  const isDirty =
    !isDeepEqual(appearance, publishedAppearance) ||
    !isDeepEqual(texts, publishedTexts) ||
    !isDeepEqual(config, publishedConfig) ||
    !isDeepEqual(productTypes, publishedProductTypes) ||
    !isDeepEqual(helps, publishedHelps);

  useEffect(() => {
    reloadFromDatabase();
  }, []);

  useEffect(() => {
    if (isDirty && status === 'saved') {
      setStatus('draft');
    } else if (!isDirty && status === 'draft') {
      setStatus('saved');
    }
  }, [isDirty, status]);

  const incrementRevision = () => {
    setRevision((prev) => prev + 1);
  };

  const reloadFromDatabase = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [appData, txtData, cfgData, ptData, hlpData] = await Promise.all([
        Repository.getAppearance(),
        Repository.getTexts(),
        Repository.getConfig(),
        Repository.getProductTypes(),
        Repository.getMeasurementHelps(),
      ]);

      const normApp = normalizeAppearance(appData);
      const normTxt = normalizeTexts(txtData);
      const normPt = ptData.map(normalizeProductType);

      setAppearance(normApp);
      setTexts(normTxt);
      setConfig(cfgData);
      setProductTypes(normPt);
      setHelps(hlpData);

      setPublishedAppearance(normApp);
      setPublishedTexts(normTxt);
      setPublishedConfig(cfgData);
      setPublishedProductTypes(normPt);
      setPublishedHelps(hlpData);

      setVersion(cfgData.version || 1);
      setStatus('saved');
      incrementRevision();
    } catch (err: any) {
      console.error('Erro ao carregar dados do banco:', err);
      setErrorMessage(err?.message || 'Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const updateAppearance = (updater: (prev: PopupAppearance) => PopupAppearance) => {
    setAppearance((prev) => {
      const updated = normalizeAppearance(updater(prev));
      return updated;
    });
    incrementRevision();
  };

  const updateTexts = (updater: (prev: TextSettings) => TextSettings) => {
    const updated = normalizeTexts(updater(texts));
    setTexts(updated);
    setAppearance((appPrev) => ({ ...appPrev, buttonText: updated.buttonText }));
    incrementRevision();
  };

  const updateConfig = (updater: (prev: AppConfig) => AppConfig) => {
    setConfig((prev) => updater(prev));
    incrementRevision();
  };

  const replaceProductTypes = (types: ProductType[]) => {
    const normPt = types.map(normalizeProductType);
    setProductTypes(normPt);
    incrementRevision();
  };

  const updateHelps = (newHelps: Record<string, MeasurementHelp>) => {
    setHelps(newHelps);
    incrementRevision();
  };

  const publish = async (overrides?: Partial<{
    appearance: PopupAppearance;
    texts: TextSettings;
    config: AppConfig;
    productTypes: ProductType[];
    helps: Record<string, MeasurementHelp>;
  }>) => {
    setStatus('publishing');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const appToSave = overrides?.appearance || appearance;
      const txtToSave = overrides?.texts || texts;
      const cfgToSave = overrides?.config || config;
      const ptToSave = overrides?.productTypes || productTypes;
      const hlpToSave = overrides?.helps || helps;

      if (!appToSave || !txtToSave) {
        throw new Error('Configurações inválidas para publicação.');
      }

      // Make sure local draft state matches what we're saving right now if overrides were passed
      if (overrides?.appearance) setAppearance(overrides.appearance);
      if (overrides?.texts) setTexts(overrides.texts);
      if (overrides?.config) setConfig(overrides.config);
      if (overrides?.productTypes) setProductTypes(overrides.productTypes);
      if (overrides?.helps) setHelps(overrides.helps);

      const result = await Repository.publishAllAtomic({
        appearance: appToSave,
        texts: txtToSave,
        config: cfgToSave,
        productTypes: ptToSave,
        helps: hlpToSave,
      });

      const normApp = normalizeAppearance(result.appearance);
      const normTxt = normalizeTexts(result.texts);
      const normPt = result.productTypes.map(normalizeProductType);

      setAppearance(normApp);
      setTexts(normTxt);
      setConfig(result.config);
      setProductTypes(normPt);
      setHelps(result.helps);

      setPublishedAppearance(normApp);
      setPublishedTexts(normTxt);
      setPublishedConfig(result.config);
      setPublishedProductTypes(normPt);
      setPublishedHelps(result.helps);
      setVersion(result.version);

      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastPublishedAt(nowStr);
      setStatus('published');
      setSuccessMessage(`Configuração publicada com sucesso! (v${result.version})`);
      incrementRevision();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Erro ao publicar:', err);
      setStatus('error');
      setErrorMessage(err?.message || 'Falha ao publicar alterações.');
      throw err;
    }
  };

  const discard = () => {
    setAppearance(publishedAppearance);
    setTexts(publishedTexts);
    setConfig(publishedConfig);
    setProductTypes(publishedProductTypes);
    setHelps(publishedHelps);
    setStatus('saved');
    setErrorMessage(null);
    setSuccessMessage('Alterações descartadas. Restaurada última publicação.');
    incrementRevision();
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <ConfigDraftContext.Provider
      value={{
        appearance,
        texts,
        config,
        productTypes,
        helps,
        publishedAppearance,
        publishedTexts,
        publishedConfig,
        publishedProductTypes,
        publishedHelps,
        revision,
        sessionId: sessionIdRef.current,
        status,
        isDirty,
        loading,
        errorMessage,
        successMessage,
        lastPublishedAt,
        version,
        updateAppearance,
        updateTexts,
        updateConfig,
        replaceProductTypes,
        updateHelps,
        publish,
        discard,
        reloadFromDatabase,
      }}
    >
      {children}
    </ConfigDraftContext.Provider>
  );
};

export const useConfigDraft = () => {
  const context = useContext(ConfigDraftContext);
  if (!context) {
    throw new Error('useConfigDraft deve ser usado dentro de ConfigDraftProvider');
  }
  return context;
};
