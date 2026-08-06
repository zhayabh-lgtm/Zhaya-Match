import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { ProductType, MeasurementKey, SizeRow, ProductCategory, ProductFitType } from '../../types/zhaya';
import { Plus, Trash2, Copy, Check, Save, AlertCircle, RefreshCw, Image } from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { parseNumber, getProductCategoryAndFit } from '../../domain/recommendation';
import { detectMeasurementGroup } from '../../lib/measurementGroup';

const ALL_MEASUREMENTS: { key: MeasurementKey; label: string }[] = [
  { key: 'bust', label: 'Busto' },
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Quadril' },
  { key: 'shoulders', label: 'Ombros' },
  { key: 'thigh', label: 'Coxa' },
  { key: 'torsoLength', label: 'Comprimento do tronco' },
  { key: 'footLength', label: 'Comprimento do pé' },
  { key: 'footWidth', label: 'Largura do pé' },
];

function validateProductTypes(typesList: ProductType[]): string | null {
  for (const pt of typesList) {
    if (!pt.active) continue;
    if (!pt.name || !pt.name.trim()) {
      return `O tipo ID ${pt.id} não possui nome.`;
    }
    if (pt.useIconInSelector && (!pt.iconUrl || !pt.iconUrl.trim())) {
      return `O tipo "${pt.name}" está com a opção "Ícone e Nome" ativada, mas não possui imagem de ícone enviada. Envie o PNG/WebP personalizado ou altere para "Somente Texto".`;
    }
    if (!pt.measurements || pt.measurements.length === 0) {
      return `O tipo "${pt.name}" precisa ter pelo menos 1 medida ativada.`;
    }
    if (!pt.sizes || pt.sizes.length === 0) {
      return `O tipo "${pt.name}" precisa ter pelo menos 1 tamanho cadastrado.`;
    }

    const sortedSizes = [...pt.sizes].sort((a, b) => a.order - b.order);

    for (const sizeRow of sortedSizes) {
      for (const mKey of pt.measurements) {
        const mLabel = ALL_MEASUREMENTS.find((m) => m.key === mKey)?.label || mKey;
        const range = sizeRow.ranges?.[mKey];
        if (!range) {
          return `O tamanho "${sizeRow.label}" em "${pt.name}" não possui valores para a medida ${mLabel}.`;
        }
        const minVal = range.min !== undefined ? range.min : range.value;
        const maxVal = range.max !== undefined ? range.max : range.value;

        if (minVal === undefined || minVal === null || isNaN(minVal) || minVal <= 0) {
          return `O tamanho "${sizeRow.label}" em "${pt.name}" possui Mínimo inválido para ${mLabel}.`;
        }
        if (maxVal === undefined || maxVal === null || isNaN(maxVal) || maxVal <= 0) {
          return `O tamanho "${sizeRow.label}" em "${pt.name}" possui Máximo inválido para ${mLabel}.`;
        }
        if (minVal > maxVal) {
          return `No tamanho "${sizeRow.label}" em "${pt.name}", a medida ${mLabel} tem Mínimo (${minVal}) maior que o Máximo (${maxVal}).`;
        }
      }
    }

    // Ascending order validation between size rows
    for (const mKey of pt.measurements) {
      const mLabel = ALL_MEASUREMENTS.find((m) => m.key === mKey)?.label || mKey;
      for (let i = 0; i < sortedSizes.length - 1; i++) {
        const s1 = sortedSizes[i];
        const s2 = sortedSizes[i + 1];
        const r1 = s1.ranges?.[mKey];
        const r2 = s2.ranges?.[mKey];
        if (r1 && r2) {
          const min1 = r1.min !== undefined ? r1.min : r1.value;
          const min2 = r2.min !== undefined ? r2.min : r2.value;
          const max1 = r1.max !== undefined ? r1.max : r1.value;
          const max2 = r2.max !== undefined ? r2.max : r2.value;

          if (min2 !== undefined && min1 !== undefined && min2 < min1) {
            return `Em "${pt.name}", a medida ${mLabel} no tamanho "${s2.label}" (Mín: ${min2}) não pode ser menor que no tamanho "${s1.label}" (Mín: ${min1}).`;
          }
          if (max2 !== undefined && max1 !== undefined && max2 < max1) {
            return `Em "${pt.name}", a medida ${mLabel} no tamanho "${s2.label}" (Máx: ${max2}) não pode ser menor que no tamanho "${s1.label}" (Máx: ${max1}).`;
          }
        }
      }
    }
  }
  return null;
}

export const TiposEMedidas: React.FC = () => {
  const { replaceProductTypes } = useConfigDraft();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ProductType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await Repository.getProductTypes();
      setTypes(list);
      replaceProductTypes(list);
      if (list.length > 0) {
        if (!selectedTypeId || !list.some((t) => t.id === selectedTypeId)) {
          setSelectedTypeId(list[0].id);
          setActiveType(JSON.parse(JSON.stringify(list[0])));
        }
      } else {
        setSelectedTypeId(null);
        setActiveType(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao carregar tipos de peças.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (id: string) => {
    setSelectedTypeId(id);
    const found = types.find((t) => t.id === id);
    if (found) setActiveType(JSON.parse(JSON.stringify(found)));
  };

  const handleAddType = () => {
    const newType: ProductType = {
      id: 'pt-' + Date.now(),
      name: 'Novo Tipo de Peça',
      active: true,
      order: types.length + 1,
      measurements: ['bust', 'waist'],
      sizes: [
        {
          id: 'sz-1',
          label: 'P',
          order: 1,
          ranges: {
            bust: { min: 80, max: 88 },
            waist: { min: 60, max: 68 },
          },
        },
        {
          id: 'sz-2',
          label: 'M',
          order: 2,
          ranges: {
            bust: { min: 89, max: 96 },
            waist: { min: 69, max: 76 },
          },
        },
      ],
    };
    const updated = [...types, newType];
    setTypes(updated);
    replaceProductTypes(updated);
    setSelectedTypeId(newType.id);
    setActiveType(newType);
  };

  const handleDeleteType = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este tipo de peça? Esta ação não poderá ser desfeita.')) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await Repository.deleteProductType(id);
      const updated = types.filter((t) => t.id !== id);
      setTypes(updated);
      replaceProductTypes(updated);
      if (updated.length > 0) {
        setSelectedTypeId(updated[0].id);
        setActiveType(JSON.parse(JSON.stringify(updated[0])));
      } else {
        setSelectedTypeId(null);
        setActiveType(null);
      }
      setMessage('Tipo de peça removido com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao excluir tipo de peça.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTypeActive = async (id: string, newActiveState: boolean) => {
    const targetType = types.find((t) => t.id === id);
    if (!targetType) return;

    if (newActiveState) {
      if (!targetType.name || !targetType.name.trim()) {
        setErrorMessage('Este tipo não pode ser ativado porque não possui nome definido.');
        return;
      }
      if (!targetType.measurements || targetType.measurements.length === 0) {
        setErrorMessage('Este tipo não pode ser ativado porque não possui medidas selecionadas.');
        return;
      }
      if (!targetType.sizes || targetType.sizes.length === 0) {
        setErrorMessage('Este tipo não pode ser ativado porque não possui tabela de tamanhos.');
        return;
      }
    }

    setErrorMessage(null);
    const updated = types.map((t) => (t.id === id ? { ...t, active: newActiveState } : t));
    setTypes(updated);
    replaceProductTypes(updated);

    if (activeType && activeType.id === id) {
      setActiveType({ ...activeType, active: newActiveState });
    }

    try {
      const updatedTarget = updated.find((t) => t.id === id);
      if (updatedTarget) {
        await Repository.saveProductType(updatedTarget);
      }
    } catch (err: any) {
      console.error('Erro ao salvar alteração de status ativo:', err);
      setErrorMessage(err?.message || 'Erro ao salvar alteração de status ativo.');
    }
  };

  const handleSaveAllTypes = async () => {
    setSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      let typesToSave = [...types];
      if (activeType) {
        typesToSave = typesToSave.map((pt) => (pt.id === activeType.id ? activeType : pt));
      }

      const valErr = validateProductTypes(typesToSave);
      if (valErr) {
        setErrorMessage(valErr);
        setSaving(false);
        return;
      }

      await Repository.saveProductTypes(typesToSave);

      const reloaded = await Repository.getProductTypes();
      setTypes(reloaded);
      replaceProductTypes(reloaded);

      if (activeType) {
        const found = reloaded.find((t) => t.id === activeType.id);
        if (found) {
          setActiveType(JSON.parse(JSON.stringify(found)));
        }
      }

      setMessage('Todos os tipos e tabelas de medidas salvos com sucesso!');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar tipos de peças:', err);
      setErrorMessage(err?.message || 'Erro ao salvar alterações. Nem todas as alterações foram gravadas.');
    } finally {
      setSaving(false);
    }
  };

  const updateActiveType = (updatedType: ProductType) => {
    setActiveType(updatedType);
    setTypes((prevTypes) => {
      const updatedTypes = prevTypes.map((t) => (t.id === updatedType.id ? updatedType : t));
      replaceProductTypes(updatedTypes);
      return updatedTypes;
    });
  };

  const handleToggleMeasurement = (key: MeasurementKey) => {
    if (!activeType) return;
    const current = activeType.measurements || [];
    let updatedKeys: MeasurementKey[];
    if (current.includes(key)) {
      updatedKeys = current.filter((k) => k !== key);
    } else {
      updatedKeys = [...current, key];
    }
    updateActiveType({ ...activeType, measurements: updatedKeys });
  };

  const handleAddSizeRow = () => {
    if (!activeType) return;
    const newRow: SizeRow = {
      id: 'sz-' + Date.now(),
      label: 'G',
      order: activeType.sizes.length + 1,
      ranges: {},
    };
    activeType.measurements.forEach((k) => {
      newRow.ranges[k] = { min: 90, max: 98 };
    });
    updateActiveType({ ...activeType, sizes: [...activeType.sizes, newRow] });
  };

  const handleDuplicateSizeRow = (idx: number) => {
    if (!activeType) return;
    const target = activeType.sizes[idx];
    const newRow: SizeRow = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'sz-' + Date.now(),
      label: target.label + ' (Cópia)',
      order: activeType.sizes.length + 1,
    };
    const updatedSizes = [...activeType.sizes];
    updatedSizes.splice(idx + 1, 0, newRow);
    updateActiveType({ ...activeType, sizes: updatedSizes });
  };

  const handleRemoveSizeRow = (idx: number) => {
    if (!activeType) return;
    const updated = activeType.sizes.filter((_, i) => i !== idx);
    updateActiveType({ ...activeType, sizes: updated });
  };

  const handleRangeChange = (
    sizeIdx: number,
    key: MeasurementKey,
    field: 'min' | 'max',
    valStr: string
  ) => {
    if (!activeType) return;
    const updatedSizes = [...activeType.sizes];
    const row = { ...updatedSizes[sizeIdx] };
    const ranges = { ...(row.ranges || {}) };
    const currentRange = { ...(ranges[key] || {}) };

    const parsed = parseNumber(valStr);

    if (field === 'min') {
      currentRange.min = parsed !== null ? parsed : (valStr as any);
    } else {
      currentRange.max = parsed !== null ? parsed : (valStr as any);
    }

    delete currentRange.value;

    ranges[key] = currentRange;
    row.ranges = ranges;
    updatedSizes[sizeIdx] = row;
    updateActiveType({ ...activeType, sizes: updatedSizes });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-neutral-900">
            Tipos e Medidas
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Cadastre os tipos de peças (Jaqueta, Vestido, Sapato) e configure suas perguntas e tabelas de tamanhos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <div className="bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-neutral-800" />
          <span>Carregando tipos de peças...</span>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left column: Types List */}
          <div className="col-span-4 bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Tipos Cadastrados
              </span>
              <button
                onClick={handleAddType}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {types.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                Nenhum tipo cadastrado. Clique em + Adicionar para criar.
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {types.map((pt) => {
                  const isSel = selectedTypeId === pt.id;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => handleSelectType(pt.id)}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer text-xs font-medium transition-colors ${
                        isSel
                          ? 'bg-neutral-900 text-white font-semibold'
                          : 'bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            pt.active ? 'bg-emerald-500' : 'bg-neutral-400'
                          }`}
                        />
                        <span>{pt.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            pt.active
                              ? isSel
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-800'
                              : isSel
                                ? 'bg-neutral-800 text-neutral-400'
                                : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {pt.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {pt.sizes?.length || 0} tam.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: Edit selected ProductType */}
          <div className="col-span-8 bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
            {activeType ? (
              <>
                {/* Type Name & Status Header */}
                <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1">
                      Nome do Tipo de Peça
                    </label>
                    <input
                      type="text"
                      value={activeType.name}
                      onChange={(e) =>
                        updateActiveType({ ...activeType, name: e.target.value })
                      }
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 text-sm font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <button
                      type="button"
                      onClick={() => handleToggleTypeActive(activeType.id, !activeType.active)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        activeType.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 border border-neutral-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeType.active ? 'bg-emerald-600' : 'bg-neutral-500'
                        }`}
                      />
                      <span>{activeType.active ? 'Ativo no Popup' : 'Inativo no Popup'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteType(activeType.id)}
                      disabled={saving}
                      className="p-2 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer rounded-md hover:bg-red-50 disabled:opacity-50"
                      title="Excluir tipo cadastrado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Section 1: Automatic Image Detection Status */}
                <div className="space-y-4">
                  {(() => {
                    const detectedGroup = detectMeasurementGroup(activeType);
                    if (detectedGroup === 'unknown') {
                      return (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold block mb-0.5">Imagem Explicativa Indefinida</strong>
                            <span>
                              Não foi possível determinar automaticamente a imagem explicativa deste tipo. Adicione uma medida mais específica, como busto, quadril, coxa, ombros ou medidas dos pés.
                            </span>
                          </div>
                        </div>
                      );
                    }
                    const groupLabels = {
                      upper_body: 'Parte de cima (Busto, Cintura, Ombros, Tronco)',
                      lower_body: 'Parte de baixo (Cintura, Quadril, Coxa)',
                      footwear: 'Para os pés (Comprimento/Largura do Pé)',
                    };
                    return (
                      <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Image className="w-4 h-4 text-neutral-500 shrink-0" />
                          <span>
                            Imagem Explicativa Automática:{' '}
                            <strong className="font-semibold text-neutral-900">{groupLabels[detectedGroup]}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500 font-medium">Gerenciada em Textos e Imagens</span>
                      </div>
                    );
                  })()}

                  {/* Category and Fit Selectors */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div>
                      <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block mb-1">
                        Categoria do Produto
                      </label>
                      <select
                        value={activeType.category || getProductCategoryAndFit(activeType).category}
                        onChange={(e) => updateActiveType({ ...activeType, category: e.target.value as ProductCategory })}
                        className="w-full bg-white border border-neutral-200 rounded-md p-2 text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      >
                        <option value="upper_body">Parte Superior (Camisetas, Jaquetas, Blusas)</option>
                        <option value="lower_body">Parte Inferior (Calças, Bermudas, Saias)</option>
                        <option value="full_body">Corpo Inteiro (Macacões, Vestidos)</option>
                        <option value="footwear">Calçados (Sapatos, Tênis, Botas)</option>
                        <option value="generic">Genérico / Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block mb-1">
                        Tipo de Caimento
                      </label>
                      <select
                        value={activeType.fitType || getProductCategoryAndFit(activeType).fitType}
                        onChange={(e) => updateActiveType({ ...activeType, fitType: e.target.value as ProductFitType })}
                        className="w-full bg-white border border-neutral-200 rounded-md p-2 text-xs font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      >
                        <option value="regular">Padrão / Regular (Equilibrado)</option>
                        <option value="fitted">Ajustado / Slim Fit (Modelagem justa)</option>
                        <option value="oversized">Oversized / Amplo (Modelagem solta)</option>
                      </select>
                    </div>
                  </div>

                  {/* Icon Selector Option Block */}
                  <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                          Visual na Seleção do Popup
                        </label>
                        <p className="text-[11px] text-neutral-500">
                          Escolha se deseja exibir somente texto ou um ícone customizado junto ao nome da peça.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-neutral-200 p-1 rounded-md">
                        <button
                          type="button"
                          onClick={() => updateActiveType({ ...activeType, useIconInSelector: false })}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            !activeType.useIconInSelector
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'text-neutral-700 hover:text-neutral-900'
                          }`}
                        >
                          Somente Texto
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveType({ ...activeType, useIconInSelector: true })}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            activeType.useIconInSelector
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'text-neutral-700 hover:text-neutral-900'
                          }`}
                        >
                          Ícone e Nome
                        </button>
                      </div>
                    </div>

                    {activeType.useIconInSelector && (
                      <div className="pt-3 border-t border-neutral-200 space-y-3">
                        <MediaUploader
                          category="product-type-icons"
                          label={`Ícone para ${activeType.name} (Proporção 1:1, rec. 500x500px)`}
                          description="Imagem limpa sem moldura, fundo transparente (PNG/WebP), proporção 1:1 e sem cortes."
                          value={activeType.iconUrl}
                          onChange={(url) => updateActiveType({ ...activeType, iconUrl: url })}
                        />

                        {!activeType.iconUrl && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-[11px] flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Aviso: É necessário enviar um arquivo PNG/WebP com fundo transparente para utilizar a opção "Ícone e Nome", ou altere para "Somente Texto".</span>
                          </div>
                        )}

                        {activeType.iconUrl && (
                          <div className="flex items-center gap-3 bg-white p-3 rounded-md border border-neutral-200">
                            <div className="w-12 h-12 bg-neutral-900 rounded-md p-2 flex items-center justify-center shrink-0 border border-neutral-800">
                              <img
                                src={activeType.iconUrl}
                                alt={`Ícone ${activeType.name}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-neutral-900 block">Pré-visualização do Ícone 1:1</span>
                              <span className="text-[11px] text-neutral-500">Exibido na seleção de tipo de peça no popup.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider pt-2 border-t border-neutral-100">
                    1. Perguntas Utilizadas
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Marque as medidas que a cliente deverá informar ao escolher {activeType.name}:
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {ALL_MEASUREMENTS.map((item) => {
                      const isChecked = (activeType.measurements || []).includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMeasurement(item.key)}
                            className="hidden"
                          />
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              isChecked
                                ? 'bg-white border-white text-neutral-900'
                                : 'border-neutral-400'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Size Table */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        2. Tabela de Tamanhos
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Informe os intervalos Mínimo e Máximo em cm para cada tamanho (aceita números decimais ex: 22,5 ou 94.5):
                      </p>
                    </div>
                    <button
                      onClick={handleAddSizeRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Tamanho</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                          <th className="p-2.5 font-bold w-24">Tamanho</th>
                          {activeType.measurements?.map((mKey) => {
                            const mInfo = ALL_MEASUREMENTS.find((m) => m.key === mKey);
                            return (
                              <th key={mKey} className="p-2.5 font-bold text-center border-l border-neutral-200 min-w-[150px]">
                                <div>{mInfo?.label || mKey} (cm)</div>
                                <div className="text-[10px] font-normal text-neutral-500 flex justify-center gap-8 mt-0.5">
                                  <span>Mín.</span>
                                  <span>Máx.</span>
                                </div>
                              </th>
                            );
                          })}
                          <th className="p-2.5 font-bold text-right w-20">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {activeType.sizes?.map((sizeRow, idx) => (
                          <tr key={sizeRow.id || idx} className="hover:bg-neutral-50">
                            <td className="p-2 font-semibold">
                              <input
                                type="text"
                                value={sizeRow.label}
                                onChange={(e) => {
                                  const updated = [...activeType.sizes];
                                  updated[idx].label = e.target.value;
                                  updateActiveType({ ...activeType, sizes: updated });
                                }}
                                className="w-16 bg-white border border-neutral-200 rounded px-2 py-1 text-xs font-bold text-neutral-900 text-center"
                              />
                            </td>

                            {activeType.measurements?.map((mKey) => {
                              const range = sizeRow.ranges?.[mKey] || {};
                              const minVal = range.min !== undefined ? range.min : (range.value !== undefined ? range.value : '');
                              const maxVal = range.max !== undefined ? range.max : (range.value !== undefined ? range.value : '');

                              const parsedMin = parseNumber(minVal);
                              const parsedMax = parseNumber(maxVal);

                              const hasMinErr = minVal === '' || parsedMin === null || parsedMin <= 0;
                              const hasMaxErr = maxVal === '' || parsedMax === null || parsedMax <= 0;
                              const isMinGreater = !hasMinErr && !hasMaxErr && parsedMin > parsedMax;
                              const cellHasErr = hasMinErr || hasMaxErr || isMinGreater;

                              return (
                                <td key={mKey} className={`p-1.5 border-l border-neutral-200 text-center ${cellHasErr ? 'bg-red-50/50' : ''}`}>
                                  <div className="flex items-center gap-1 justify-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={minVal}
                                      placeholder="Mín"
                                      onChange={(e) => handleRangeChange(idx, mKey, 'min', e.target.value)}
                                      className={`w-14 bg-white border rounded px-1.5 py-1 text-xs text-center font-medium ${
                                        hasMinErr || isMinGreater ? 'border-red-500 text-red-900 bg-red-50' : 'border-neutral-200 text-neutral-900'
                                      }`}
                                    />
                                    <span className="text-neutral-400 text-[10px]">-</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={maxVal}
                                      placeholder="Máx"
                                      onChange={(e) => handleRangeChange(idx, mKey, 'max', e.target.value)}
                                      className={`w-14 bg-white border rounded px-1.5 py-1 text-xs text-center font-medium ${
                                        hasMaxErr || isMinGreater ? 'border-red-500 text-red-900 bg-red-50' : 'border-neutral-200 text-neutral-900'
                                      }`}
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleDuplicateSizeRow(idx)}
                                  className="p-1 text-neutral-500 hover:text-neutral-900"
                                  title="Duplicar linha"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveSizeRow(idx)}
                                  className="p-1 text-neutral-400 hover:text-red-600"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save Footer */}
                <div className="pt-4 border-t border-neutral-200 flex justify-end">
                  <button
                    onClick={handleSaveAllTypes}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Nenhum tipo de peça selecionado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
