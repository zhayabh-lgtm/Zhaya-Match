import React, { useState, useEffect } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { MeasurementHelp, MeasurementKey, MeasurementObservation } from '../../types/zhaya';
import { Save, Check, FileText, Image, Info, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';
import { Repository } from '../../lib/repository';

const ALL_MEASUREMENT_KEYS: { key: MeasurementKey; label: string }[] = [
  { key: 'bust', label: 'Busto' },
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'shoulders', label: 'Ombros' },
  { key: 'sleeveLength', label: 'Comprimento da manga' },
  { key: 'thigh', label: 'Coxa' },
  { key: 'torsoLength', label: 'Comprimento do tronco' },
  { key: 'fingerCircumference', label: 'Dedo' },
  { key: 'footLength', label: 'Comprimento do pé' },
  { key: 'footWidth', label: 'Largura do pé' },
];

export const TextosEImagens: React.FC = () => {
  const {
    texts,
    appearance,
    helps: contextHelps,
    updateTexts,
    updateAppearance,
    updateHelps,
  } = useConfigDraft();

  const [activeTab, setActiveTab] = useState<'flowTexts' | 'groupImages' | 'measurementHelp'>('flowTexts');
  const [measurementHelps, setMeasurementHelps] = useState<Record<MeasurementKey, MeasurementHelp>>({} as any);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (contextHelps && Object.keys(contextHelps).length > 0) {
      setMeasurementHelps(contextHelps);
    } else {
      Repository.getMeasurementHelps().then((h) => setMeasurementHelps(h));
    }
  }, [contextHelps]);

  const handleSaveHelp = async (key: MeasurementKey) => {
    const helpObj = measurementHelps[key];
    if (!helpObj) return;

    if (helpObj.observations && helpObj.observations.length > 0) {
      for (const obs of helpObj.observations) {
        if (obs.active && (!obs.text || !obs.text.trim())) {
          setErrorMessage(`Em "${helpObj.label}", existe uma observação ativa sem texto. Preencha o texto ou desative-a.`);
          return;
        }
        if (obs.active && obs.condition.type === 'measurement_active' && !obs.condition.measurementKey) {
          setErrorMessage(`Em "${helpObj.label}", selecione qual medida ativará a regra da observação.`);
          return;
        }
      }
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await Repository.saveMeasurementHelp(key, helpObj);
      setSavedMessage(`Instrução de ${helpObj.label} salva!`);
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar instrução.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddObservation = (mKey: MeasurementKey) => {
    const current = measurementHelps[mKey];
    if (!current) return;

    const obsList = current.observations || [];
    const nextOrder = obsList.length > 0 ? Math.max(...obsList.map((o) => o.order || 0)) + 1 : 1;

    const newObs: MeasurementObservation = {
      id: 'obs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      text: '',
      active: true,
      order: nextOrder,
      condition: {
        type: 'always',
      },
    };

    const updatedHelps = {
      ...measurementHelps,
      [mKey]: {
        ...current,
        observations: [...obsList, newObs],
      },
    };

    setMeasurementHelps(updatedHelps);
    updateHelps(updatedHelps);
  };

  const handleUpdateObservation = (
    mKey: MeasurementKey,
    obsId: string,
    updatedFields: Partial<MeasurementObservation>
  ) => {
    const current = measurementHelps[mKey];
    if (!current) return;

    const obsList = (current.observations || []).map((o) => {
      if (o.id === obsId) {
        return { ...o, ...updatedFields };
      }
      return o;
    });

    const updatedHelps = {
      ...measurementHelps,
      [mKey]: {
        ...current,
        observations: obsList,
      },
    };

    setMeasurementHelps(updatedHelps);
    updateHelps(updatedHelps);
  };

  const handleDeleteObservation = (mKey: MeasurementKey, obsId: string) => {
    const current = measurementHelps[mKey];
    if (!current) return;

    const obsList = (current.observations || []).filter((o) => o.id !== obsId);

    const updatedHelps = {
      ...measurementHelps,
      [mKey]: {
        ...current,
        observations: obsList,
      },
    };

    setMeasurementHelps(updatedHelps);
    updateHelps(updatedHelps);
  };

  const handleMoveObservation = (mKey: MeasurementKey, index: number, direction: 'up' | 'down') => {
    const current = measurementHelps[mKey];
    if (!current) return;

    const obsList = [...(current.observations || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= obsList.length) return;

    const tempOrder = obsList[index].order;
    obsList[index].order = obsList[targetIndex].order;
    obsList[targetIndex].order = tempOrder;

    obsList.sort((a, b) => a.order - b.order);

    const updatedHelps = {
      ...measurementHelps,
      [mKey]: {
        ...current,
        observations: obsList,
      },
    };

    setMeasurementHelps(updatedHelps);
    updateHelps(updatedHelps);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-neutral-900">
            Textos e Imagens
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Gerencie os textos do fluxo, aviso de privacidade, as três imagens explicativas e as instruções por medida.
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
          onClick={() => setActiveTab('flowTexts')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'flowTexts'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Textos do Fluxo & Resultado
        </button>
        <button
          onClick={() => setActiveTab('groupImages')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'groupImages'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Imagens de Como Medir (3 Gerais)
        </button>
        <button
          onClick={() => setActiveTab('measurementHelp')}
          className={`pb-2 transition-colors cursor-pointer ${
            activeTab === 'measurementHelp'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          Orientações de Cada Medida (Texto)
        </button>
      </div>

      {/* TAB 1: Textos do Fluxo & Resultado */}
      {activeTab === 'flowTexts' && (
        <div className="space-y-6">
          {/* Seção 1: Textos do Fluxo */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-2">
              1. Textos do Fluxo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Acionador Discreto na Loja ("Link do Widget")
                </label>
                <input
                  type="text"
                  value={texts.buttonText || 'Encontrar meu tamanho'}
                  onChange={(e) => updateTexts((t) => ({ ...t, buttonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título da Mensagem Inicial
                </label>
                <input
                  type="text"
                  value={texts.initialTitle || 'Curadoria de Tamanho Zhaya'}
                  onChange={(e) => updateTexts((t) => ({ ...t, initialTitle: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Botão de Início (Curadoria)
                </label>
                <input
                  type="text"
                  value={texts.welcomeButtonText || 'Iniciar Curadoria'}
                  onChange={(e) => updateTexts((t) => ({ ...t, welcomeButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título da Escolha do Tipo de Peça
                </label>
                <input
                  type="text"
                  value={texts.typeChoiceTitle || 'O que você está escolhendo?'}
                  onChange={(e) => updateTexts((t) => ({ ...t, typeChoiceTitle: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título da Tela de Medidas
                </label>
                <input
                  type="text"
                  value={texts.measurementsTitle || 'Informe suas medidas'}
                  onChange={(e) => updateTexts((t) => ({ ...t, measurementsTitle: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Texto do Botão Calcular
                </label>
                <input
                  type="text"
                  value={texts.calculateButtonText || 'Encontrar meu tamanho'}
                  onChange={(e) => updateTexts((t) => ({ ...t, calculateButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem Inicial de Boas-Vindas / Explicativa
                </label>
                <textarea
                  rows={2}
                  value={
                    texts.welcomeMessage ||
                    'Informe suas medidas e encontre o caimento mais indicado para o seu corpo.'
                  }
                  onChange={(e) => updateTexts((t) => ({ ...t, welcomeMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Textos do Resultado */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-2">
              2. Textos do Resultado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título do Resultado
                </label>
                <input
                  type="text"
                  value={texts.resultTitle || 'SEU TAMANHO SUGERIDO'}
                  onChange={(e) => updateTexts((t) => ({ ...t, resultTitle: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem Entre Tamanhos (Between Sizes)
                </label>
                <input
                  type="text"
                  value={texts.betweenSizesMessage || 'Você está entre dois tamanhos.'}
                  onChange={(e) => updateTexts((t) => ({ ...t, betweenSizesMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem Tamanho Não Encontrado (Fora da Faixa)
                </label>
                <input
                  type="text"
                  value={texts.notFoundMessage || 'Não encontramos um tamanho adequado para as medidas informadas.'}
                  onChange={(e) => updateTexts((t) => ({ ...t, notFoundMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Aviso de Privacidade */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-2">
              3. Aviso de Privacidade
            </h2>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Texto de Privacidade no Rodapé do Widget
              </label>
              <input
                type="text"
                value={texts.privacyNotice || 'Usamos suas medidas apenas para esta recomendação.'}
                onChange={(e) => updateTexts((t) => ({ ...t, privacyNotice: e.target.value }))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Imagens de Como Medir (3 Gerais) */}
      {activeTab === 'groupImages' && (
        <div className="space-y-6">
          {/* Caixa de Orientações */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2 text-xs text-neutral-700">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Info className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>Orientações para as Imagens Explicativas</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 list-disc list-inside text-[11px] text-neutral-600">
              <li>Formato recomendado: PNG ou WebP com fundo transparente ou neutro.</li>
              <li>Proporção: Vertical (recomendação 1200 × 1600 px).</li>
              <li>Tamanho máximo: até 3 MB por imagem.</li>
              <li>Enquadramento: objeto/corpo centralizado, leitura confortável no celular.</li>
              <li>Evite textos pequenos e não embuta botões dentro da imagem.</li>
              <li>O sistema aplica <code className="bg-neutral-200 px-1 py-0.5 rounded">object-fit: contain</code> para nunca cortar a imagem.</li>
            </ul>
          </div>

          {/* As 3 Imagens por Categoria */}
          <div className="space-y-6">
            {/* 1. Parte de Cima */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  1. Parte de Cima
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Usada automaticamente para tipos com busto, ombros ou comprimento do tronco (ex: camisa, blusa, jaqueta, blazer, casaco, body, vestido, macacão, cropped, top).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <MediaUploader
                  category="measurement-guides"
                  label="Imagem Explicativa - Parte de Cima"
                  description="Selecione ou envie o arquivo da imagem"
                  value={appearance.upperBodyMeasurementImageUrl || appearance.apparelMeasurementImageUrl || appearance.mainMeasurementImageUrl}
                  onChange={(url) => updateAppearance((a) => ({ ...a, upperBodyMeasurementImageUrl: url }))}
                />

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Legenda da Imagem (Parte de Cima)
                    </label>
                    <textarea
                      rows={3}
                      value={
                        appearance.upperBodyMeasurementImageCaption ??
                        appearance.apparelMeasurementImageCaption ??
                        appearance.mainMeasurementImageCaption ??
                        'Referência para busto, cintura, ombros e comprimento do tronco.'
                      }
                      onChange={(e) =>
                        updateAppearance((a) => ({ ...a, upperBodyMeasurementImageCaption: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Parte de Baixo */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  2. Parte de Baixo
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Usada automaticamente para tipos com quadril ou coxa (ex: calça, shorts, saia, bermuda, legging).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <MediaUploader
                  category="measurement-guides"
                  label="Imagem Explicativa - Parte de Baixo"
                  description="Selecione ou envie o arquivo da imagem"
                  value={appearance.lowerBodyMeasurementImageUrl}
                  onChange={(url) => updateAppearance((a) => ({ ...a, lowerBodyMeasurementImageUrl: url }))}
                />

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Legenda da Imagem (Parte de Baixo)
                    </label>
                    <textarea
                      rows={3}
                      value={
                        appearance.lowerBodyMeasurementImageCaption ??
                        'Referência para cintura, quadril e coxa.'
                      }
                      onChange={(e) =>
                        updateAppearance((a) => ({ ...a, lowerBodyMeasurementImageCaption: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Para os Pés */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  3. Para os Pés
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Usada automaticamente para tipos com comprimento ou largura do pé (ex: sapato, sandália, tênis, bota, rasteira, scarpin, sapatilha, mule, mocassim).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <MediaUploader
                  category="measurement-guides"
                  label="Imagem Explicativa - Para os Pés"
                  description="Selecione ou envie o arquivo da imagem"
                  value={appearance.footwearMeasurementImageUrl}
                  onChange={(url) => updateAppearance((a) => ({ ...a, footwearMeasurementImageUrl: url }))}
                />

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Legenda da Imagem (Para os Pés)
                    </label>
                    <textarea
                      rows={3}
                      value={
                        appearance.footwearMeasurementImageCaption ??
                        'Referência para comprimento e largura do pé.'
                      }
                      onChange={(e) =>
                        updateAppearance((a) => ({ ...a, footwearMeasurementImageCaption: e.target.value }))
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Orientações de Cada Medida (Texto apenas) */}
      {activeTab === 'measurementHelp' && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">
            Edite os títulos e descrições explicativas de cada medida individual. A tela "Ver como medir" exibirá a imagem geral do grupo e os textos das medidas selecionadas pelo tipo.
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
                      disabled={saving}
                      className="text-[11px] text-neutral-900 font-bold uppercase tracking-wider underline hover:text-neutral-600 cursor-pointer disabled:opacity-50"
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
                        updated[mKey] = { ...updated[mKey], title: e.target.value };
                        setMeasurementHelps(updated);
                        updateHelps(updated);
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Instrução Passo a Passo
                    </label>
                    <textarea
                      rows={3}
                      value={help.description}
                      onChange={(e) => {
                        const updated = { ...measurementHelps };
                        updated[mKey] = { ...updated[mKey], description: e.target.value };
                        setMeasurementHelps(updated);
                        updateHelps(updated);
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 text-xs text-neutral-900"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
