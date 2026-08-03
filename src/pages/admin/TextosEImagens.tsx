import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { TextSettings, PopupAppearance, MeasurementHelp, MeasurementKey } from '../../types/zhaya';
import { Save, Check, Image as ImageIcon, FileText } from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';

export const TextosEImagens: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'texts' | 'logos' | 'measurementHelp'>('texts');

  const [texts, setTexts] = useState<TextSettings>({
    buttonText: 'Descubra seu tamanho',
    initialTitle: 'Descubra seu tamanho ideal',
    typeChoiceTitle: 'O que você está escolhendo?',
    measurementsTitle: 'Vamos encontrar seu tamanho',
    calculateButtonText: 'Calcular meu tamanho',
    resultTitle: 'Sugerimos o tamanho',
    betweenSizesMessage: 'Você está entre dois tamanhos.',
    notFoundMessage: 'Não foi possível indicar um tamanho com segurança. Verifique suas medidas.',
    recalculateButtonText: 'Calcular novamente',
    closeButtonText: 'Fechar',
    backButtonText: 'Voltar',
    privacyNotice: 'Suas medidas são utilizadas apenas para esta recomendação.',
  });

  const [appearance, setAppearance] = useState<PopupAppearance>({
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    secondaryTextColor: '#A3A3A3',
    buttonColor: '#FFFFFF',
    buttonTextColor: '#000000',
    borderColor: '#262626',
    borderRadius: 8,
    overlayOpacity: 0.75,
    buttonText: 'Descubra seu tamanho',
    buttonStyle: 'border',
  });

  const [measurementHelps, setMeasurementHelps] = useState<Record<MeasurementKey, MeasurementHelp>>({} as any);

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const txt = await Repository.getTexts();
      const app = await Repository.getAppearance();
      const helps = await Repository.getMeasurementHelps();
      setTexts(txt);
      setAppearance(app);
      setMeasurementHelps(helps);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTextsAndLogos = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await Repository.saveTexts(texts);
      await Repository.saveAppearance(appearance);
      setSavedMessage('Textos e logos salvos com sucesso!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar textos.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHelp = async (key: MeasurementKey) => {
    const helpObj = measurementHelps[key];
    if (helpObj) {
      setSaving(true);
      setErrorMessage(null);
      try {
        await Repository.saveMeasurementHelp(key, helpObj);
        setSavedMessage(`Ajuda de ${helpObj.label} salva!`);
        setTimeout(() => setSavedMessage(null), 3000);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Erro ao salvar guia de medição.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-neutral-900">
            Textos e Imagens
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Personalize todas as mensagens do popup e os tutoriais de como medir.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && (
            <div className="bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savedMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-md">
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('texts')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'texts'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Textos Editáveis
        </button>
        <button
          onClick={() => setActiveTab('logos')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'logos'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Logos da Marca
        </button>
        <button
          onClick={() => setActiveTab('measurementHelp')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'measurementHelp'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Como Medir (Instruções)
        </button>
      </div>

      {/* Tab 1: Textos Editáveis */}
      {activeTab === 'texts' && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Título da Mensagem Inicial (Boas-vindas)
              </label>
              <input
                type="text"
                value={texts.initialTitle || 'Curadoria de Tamanho Zhaya'}
                onChange={(e) => setTexts({ ...texts, initialTitle: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Botão da Mensagem Inicial
              </label>
              <input
                type="text"
                value={texts.welcomeButtonText || 'Iniciar Curadoria'}
                onChange={(e) => setTexts({ ...texts, welcomeButtonText: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Mensagem Inicial de Curadoria (Explicativa)
              </label>
              <textarea
                rows={2}
                value={texts.welcomeMessage || 'Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.'}
                onChange={(e) => setTexts({ ...texts, welcomeMessage: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Texto do Botão no Site
              </label>
              <input
                type="text"
                value={texts.buttonText}
                onChange={(e) => setTexts({ ...texts, buttonText: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Título da Escolha do Tipo
              </label>
              <input
                type="text"
                value={texts.typeChoiceTitle}
                onChange={(e) => setTexts({ ...texts, typeChoiceTitle: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Título da Tela de Medidas
              </label>
              <input
                type="text"
                value={texts.measurementsTitle}
                onChange={(e) => setTexts({ ...texts, measurementsTitle: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Texto do Botão Calcular
              </label>
              <input
                type="text"
                value={texts.calculateButtonText}
                onChange={(e) => setTexts({ ...texts, calculateButtonText: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Título do Resultado
              </label>
              <input
                type="text"
                value={texts.resultTitle}
                onChange={(e) => setTexts({ ...texts, resultTitle: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Mensagem Entre Tamanhos
              </label>
              <input
                type="text"
                value={texts.betweenSizesMessage}
                onChange={(e) => setTexts({ ...texts, betweenSizesMessage: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Mensagem Sem Resultado / Fora de Tabela
              </label>
              <input
                type="text"
                value={texts.notFoundMessage}
                onChange={(e) => setTexts({ ...texts, notFoundMessage: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Aviso de Privacidade
              </label>
              <input
                type="text"
                value={texts.privacyNotice}
                onChange={(e) => setTexts({ ...texts, privacyNotice: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end">
            <button
              onClick={handleSaveTextsAndLogos}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Textos</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Logos */}
      {activeTab === 'logos' && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6 max-w-2xl">
          <div className="space-y-6">
            <MediaUploader
              category="logos"
              label="Logo Branca (para fundo escuro)"
              description="Exibida no topo do popup em temas escuros"
              value={appearance.logoWhiteUrl}
              onChange={(url) => setAppearance({ ...appearance, logoWhiteUrl: url })}
            />

            <MediaUploader
              category="logos"
              label="Logo Preta (para fundo claro)"
              description="Exibida no topo do popup em temas claros"
              value={appearance.logoBlackUrl}
              onChange={(url) => setAppearance({ ...appearance, logoBlackUrl: url })}
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex justify-end">
            <button
              onClick={handleSaveTextsAndLogos}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Logos</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Como Medir */}
      {activeTab === 'measurementHelp' && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Configure as instruções e imagens exibidas ao clicar em “Como medir” no popup.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(measurementHelps) as MeasurementKey[]).map((mKey) => {
              const help = measurementHelps[mKey];
              if (!help) return null;

              return (
                <div key={mKey} className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">{help.label}</span>
                    <button
                      onClick={() => handleSaveHelp(mKey)}
                      className="text-[11px] text-neutral-900 font-bold uppercase tracking-wider underline hover:text-neutral-600 cursor-pointer"
                    >
                      Salvar {help.label}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Título da Instrução
                    </label>
                    <input
                      type="text"
                      value={help.title}
                      onChange={(e) => {
                        const updated = { ...measurementHelps };
                        updated[mKey].title = e.target.value;
                        setMeasurementHelps(updated);
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Instrução Passo a Passo
                    </label>
                    <textarea
                      rows={2}
                      value={help.description}
                      onChange={(e) => {
                        const updated = { ...measurementHelps };
                        updated[mKey].description = e.target.value;
                        setMeasurementHelps(updated);
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                    />
                  </div>

                  <MediaUploader
                    category="measurement-guides"
                    label={`Imagem Guia: ${help.label}`}
                    description="Imagem ilustrativa mostrando como tirar esta medida"
                    value={help.imageUrl}
                    onChange={(url) => {
                      const updated = { ...measurementHelps };
                      updated[mKey].imageUrl = url;
                      setMeasurementHelps(updated);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
