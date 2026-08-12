import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { ProductType, MeasurementKey, SizeRow, ProductCategory, ProductFitType } from '../../types/zhaya';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Save,
  AlertCircle,
  RefreshCw,
  Tag,
  Ruler,
  HelpCircle,
  Layers,
  Shirt,
  Sparkles,
  Info,
} from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { parseNumber, getProductCategoryAndFit } from '../../domain/recommendation';

const ALL_MEASUREMENTS: { key: MeasurementKey; label: string }[] = [
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
  const { replaceProductTypes, publish } = useConfigDraft();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ProductType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');

  useEffect(() => {
    loadTypes();
  }, []);

  // Sync types with ConfigDraftContext safely outside render
  useEffect(() => {
    if (types && types.length > 0) {
      replaceProductTypes(types);
    }
  }, [types]);

  const loadTypes = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await Repository.getProductTypes();
      setTypes(list);
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
    let currentTypes = types;
    if (activeType) {
      currentTypes = currentTypes.map((t) => (t.id === activeType.id ? activeType : t));
      setTypes(currentTypes);
    }
    setSelectedTypeId(id);
    const found = currentTypes.find((t) => t.id === id);
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
      await publish({ productTypes: updated });
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
        await publish({ productTypes: updated });
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
      let currentActive = activeType;
      if (currentActive && tagInput.trim()) {
        const raw = tagInput.trim().replace(/^,|,$/g, '');
        if (raw) {
          const existing = currentActive.storeTags || [];
          if (!existing.includes(raw)) {
            currentActive = {
              ...currentActive,
              storeTags: [...existing, raw],
            };
            setActiveType(currentActive);
          }
          setTagInput('');
        }
      }

      let typesToSave = [...types];
      if (currentActive) {
        typesToSave = typesToSave.map((pt) => (pt.id === currentActive.id ? currentActive : pt));
      }

      const valErr = validateProductTypes(typesToSave);
      if (valErr) {
        setErrorMessage(valErr);
        setSaving(false);
        return;
      }

      setTypes(typesToSave);
      replaceProductTypes(typesToSave);
      await publish({ productTypes: typesToSave });

      if (currentActive) {
        const found = typesToSave.find((t) => t.id === currentActive.id);
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
    setTypes((prev) => prev.map((t) => (t.id === updatedType.id ? updatedType : t)));
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
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-12">
      {/* Top Banner Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-neutral-900" />
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              Tipos de Peças e Tabela de Medidas
            </h1>
          </div>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Configure as regras de caimento, perguntas e tabelas de tamanhos em centímetros. Cada tipo de produto é selecionado automaticamente pelas tags da sua loja.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {message && (
            <div className="bg-emerald-900 text-emerald-100 text-xs px-3.5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-xs border border-emerald-800">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-800 border border-red-300 text-xs px-3.5 py-2 rounded-lg font-medium flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center text-xs text-neutral-500 flex flex-col items-center gap-3 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-900" />
          <span className="font-semibold text-neutral-700">Carregando tabelas de medidas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Types Navigation */}
          <div className="col-span-12 lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-4 space-y-4 shadow-xs sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-700" />
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Tipos Cadastrados
                </span>
                <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-neutral-200">
                  {types.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddType}
                className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Tipo</span>
              </button>
            </div>

            {types.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                Nenhum tipo cadastrado. Clique no botão acima para criar o primeiro.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
                {types.map((pt) => {
                  const isSel = selectedTypeId === pt.id;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => handleSelectType(pt.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer text-xs font-medium transition-all border ${
                        isSel
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm font-bold'
                          : 'bg-neutral-50/70 hover:bg-neutral-100/80 text-neutral-800 border-neutral-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            pt.active ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-neutral-400'
                          }`}
                        />
                        <span className="truncate">{pt.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            pt.active
                              ? isSel
                                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isSel
                                ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {pt.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className={`text-[10px] ${isSel ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {pt.sizes?.length || 0} tam.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Edit Selected ProductType */}
          <div className="col-span-12 lg:col-span-8 bg-white border border-neutral-200 rounded-xl p-6 space-y-6 shadow-xs">
            {activeType ? (
              <>
                {/* Product Type Identification Card */}
                <div className="bg-neutral-900 text-white rounded-xl p-5 space-y-4 shadow-sm border border-neutral-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Nome do Tipo de Peça / Categoria
                      </label>
                      <input
                        type="text"
                        value={activeType.name}
                        placeholder="Ex: Jaqueta, Vestido, Calçado, Anel"
                        onChange={(e) =>
                          updateActiveType({ ...activeType, name: e.target.value })
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2 text-base font-bold text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder:text-neutral-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTypeActive(activeType.id, !activeType.active)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeType.active
                            ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-extrabold'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            activeType.active ? 'bg-emerald-950' : 'bg-neutral-500'
                          }`}
                        />
                        <span>{activeType.active ? 'Ativo no Provador' : 'Inativo no Provador'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteType(activeType.id)}
                        disabled={saving}
                        className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer rounded-lg border border-transparent hover:border-red-500/30 disabled:opacity-50"
                        title="Excluir este tipo de peça"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* STEP 1: Store Integration & Tags */}
                <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/60 space-y-4">
                  <div className="flex items-start gap-3 border-b border-neutral-200/80 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Mapeamento Automático de Produtos (Tags da Loja)</span>
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Quando um produto na Olist possuir uma destas tags no cadastro, este tipo de peça será selecionado automaticamente.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                      Tags Cadastradas
                    </label>
                    <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 bg-white border border-neutral-300 rounded-lg items-center focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all">
                      {(activeType.storeTags || []).map((tag, tagIdx) => (
                        <span
                          key={tag + '-' + tagIdx}
                          className="inline-flex items-center gap-1.5 bg-neutral-900 text-white text-xs px-3 py-1 rounded-full font-semibold"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextTags = (activeType.storeTags || []).filter((_, i) => i !== tagIdx);
                              updateActiveType({ ...activeType, storeTags: nextTags });
                            }}
                            className="text-neutral-400 hover:text-red-300 cursor-pointer font-bold text-sm leading-none ml-0.5"
                            title="Remover tag"
                          >
                            ×
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const raw = tagInput.trim().replace(/^,|,$/g, '');
                            if (raw) {
                              const existing = activeType.storeTags || [];
                              if (!existing.includes(raw)) {
                                updateActiveType({
                                  ...activeType,
                                  storeTags: [...existing, raw],
                                });
                              }
                              setTagInput('');
                            }
                          }
                        }}
                        onBlur={() => {
                          const raw = tagInput.trim().replace(/^,|,$/g, '');
                          if (raw) {
                            const existing = activeType.storeTags || [];
                            if (!existing.includes(raw)) {
                              updateActiveType({
                                ...activeType,
                                storeTags: [...existing, raw],
                              });
                            }
                            setTagInput('');
                          }
                        }}
                        placeholder={(activeType.storeTags || []).length === 0 ? "Digite tags (ex: tenis, bota) e aperte Enter" : "Adicionar tag..."}
                        className="flex-1 min-w-[180px] text-xs bg-transparent focus:outline-none py-1 text-neutral-900 placeholder:text-neutral-400"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Info className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>Digite a palavra e pressione <strong>Enter</strong> ou <strong>vírgula</strong> para criar cada tag.</span>
                    </p>
                  </div>

                  {/* Category and Fit Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3.5 border border-neutral-200 rounded-lg space-y-1">
                      <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
                        Categoria Anatômica
                      </label>
                      <select
                        value={activeType.category || getProductCategoryAndFit(activeType).category}
                        onChange={(e) => updateActiveType({ ...activeType, category: e.target.value as ProductCategory })}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-md p-2 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      >
                        <option value="upper_body">Parte Superior (Camisetas, Jaquetas, Blusas)</option>
                        <option value="lower_body">Parte Inferior (Calças, Bermudas, Saias)</option>
                        <option value="full_body">Corpo Inteiro (Macacões, Vestidos)</option>
                        <option value="footwear">Calçados (Sapatos, Tênis, Botas)</option>
                        <option value="generic">Genérico / Outros</option>
                      </select>
                    </div>

                    <div className="bg-white p-3.5 border border-neutral-200 rounded-lg space-y-1">
                      <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
                        Estilo do Caimento
                      </label>
                      <select
                        value={activeType.fitType || getProductCategoryAndFit(activeType).fitType}
                        onChange={(e) => updateActiveType({ ...activeType, fitType: e.target.value as ProductFitType })}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-md p-2 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      >
                        <option value="regular">Padrão / Regular (Equilibrado)</option>
                        <option value="fitted">Ajustado / Slim Fit (Modelagem justa)</option>
                        <option value="oversized">Oversized / Amplo (Modelagem solta)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Questions / Measurements Selector */}
                <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/60 space-y-4">
                  <div className="flex items-start gap-3 border-b border-neutral-200/80 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Medidas Solicitadas à Cliente</span>
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Marque quais medidas o provador deve pedir para a cliente informar ao escolher {activeType.name}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_MEASUREMENTS.map((item) => {
                      const isChecked = (activeType.measurements || []).includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMeasurement(item.key)}
                            className="hidden"
                          />
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                              isChecked
                                ? 'bg-white border-white text-neutral-900'
                                : 'border-neutral-400 bg-neutral-50'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 3: Size Table */}
                <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-neutral-700" />
                          <span>Tabela de Tamanhos e Intervalos (cm)</span>
                        </h3>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          Informe os valores mínimo e máximo em cm. Aceita casas decimais (ex: 22,5 ou 94,5).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSizeRow}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo Tamanho</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-neutral-300 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-100 text-neutral-800 border-b border-neutral-300">
                          <th className="p-3 font-extrabold w-28 uppercase text-[10px] tracking-wider">Tamanho</th>
                          {activeType.measurements?.map((mKey) => {
                            const mInfo = ALL_MEASUREMENTS.find((m) => m.key === mKey);
                            return (
                              <th key={mKey} className="p-3 font-bold text-center border-l border-neutral-200 min-w-[150px]">
                                <div className="text-neutral-900 font-extrabold">{mInfo?.label || mKey} (cm)</div>
                                <div className="text-[10px] font-bold text-neutral-500 flex justify-center gap-8 mt-1 uppercase tracking-wider">
                                  <span>Mín.</span>
                                  <span>Máx.</span>
                                </div>
                              </th>
                            );
                          })}
                          <th className="p-3 font-extrabold text-right w-20 uppercase text-[10px] tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {activeType.sizes?.map((sizeRow, idx) => (
                          <tr key={sizeRow.id || idx} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="p-2.5 font-semibold">
                              <input
                                type="text"
                                value={sizeRow.label}
                                onChange={(e) => {
                                  const updated = [...activeType.sizes];
                                  updated[idx].label = e.target.value;
                                  updateActiveType({ ...activeType, sizes: updated });
                                }}
                                className="w-20 bg-neutral-50 border border-neutral-300 rounded-md px-2 py-1.5 text-xs font-extrabold text-neutral-900 text-center focus:outline-none focus:border-neutral-900"
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
                                <td key={mKey} className={`p-2 border-l border-neutral-200 text-center ${cellHasErr ? 'bg-red-50/60' : ''}`}>
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={minVal}
                                      placeholder="Mín"
                                      onChange={(e) => handleRangeChange(idx, mKey, 'min', e.target.value)}
                                      className={`w-14 bg-white border rounded-md px-1.5 py-1 text-xs text-center font-bold ${
                                        hasMinErr || isMinGreater ? 'border-red-500 text-red-900 bg-red-50' : 'border-neutral-300 text-neutral-900 focus:border-neutral-900'
                                      }`}
                                    />
                                    <span className="text-neutral-400 font-bold text-xs">-</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={maxVal}
                                      placeholder="Máx"
                                      onChange={(e) => handleRangeChange(idx, mKey, 'max', e.target.value)}
                                      className={`w-14 bg-white border rounded-md px-1.5 py-1 text-xs text-center font-bold ${
                                        hasMaxErr || isMinGreater ? 'border-red-500 text-red-900 bg-red-50' : 'border-neutral-300 text-neutral-900 focus:border-neutral-900'
                                      }`}
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateSizeRow(idx)}
                                  className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-all"
                                  title="Duplicar linha"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSizeRow(idx)}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                  title="Remover tamanho"
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

                  <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Dica: Caso um tamanho seja pontual ou fixo (ex: Calçado 35), preencha o mesmo valor em Mínimo e Máximo (ex: 22.5 e 22.5).</span>
                  </p>
                </div>

                {/* STEP 4: Measurement Guide & Selector Options */}
                <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/60 space-y-4">
                  <div className="flex items-start gap-3 border-b border-neutral-200/80 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                        <span>Guia "Como Medir" e Ícones (Opcional)</span>
                      </h3>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Personalize as imagens e explicações de medição exibidas no modal da cliente.
                      </p>
                    </div>
                  </div>

                  {/* Icon Selector Option Block */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
                          Visual na Seleção do Popup
                        </label>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Exibir apenas texto ou um ícone ilustrativo junto ao nome da peça no widget.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateActiveType({ ...activeType, useIconInSelector: false })}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            !activeType.useIconInSelector
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          Somente Texto
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveType({ ...activeType, useIconInSelector: true })}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            activeType.useIconInSelector
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'text-neutral-600 hover:text-neutral-900'
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
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Aviso: É necessário enviar um arquivo PNG/WebP com fundo transparente para utilizar a opção "Ícone e Nome", ou altere para "Somente Texto".</span>
                          </div>
                        )}

                        {activeType.iconUrl && (
                          <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                            <div className="w-12 h-12 bg-neutral-900 rounded-lg p-2 flex items-center justify-center shrink-0 border border-neutral-800">
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

                  {/* Custom Image Upload */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                    <MediaUploader
                      category="measurement-guides"
                      label={`Imagem do Guia de Medidas para ${activeType.name}`}
                      description="Imagem explicativa exibida quando a cliente clica em 'Ver como medir' neste tipo de peça."
                      value={activeType.measurementImageUrl}
                      onChange={(url) => updateActiveType({ ...activeType, measurementImageUrl: url })}
                    />
                    {activeType.measurementImageUrl && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Legenda da Imagem
                        </label>
                        <input
                          type="text"
                          value={activeType.measurementImageCaption || ''}
                          placeholder="Ex: Como medir o comprimento do pé com régua"
                          onChange={(e) => updateActiveType({ ...activeType, measurementImageCaption: e.target.value })}
                          className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-1.5 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    )}
                  </div>

                  {/* Step-by-step Tips */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                        Dicas Explicativas Passo a Passo
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const current = activeType.measurementGuideTips || [];
                          updateActiveType({
                            ...activeType,
                            measurementGuideTips: [
                              ...current,
                              { id: 'tip-' + Date.now(), title: `Passo ${current.length + 1}`, text: '' },
                            ],
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-900 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Passo</span>
                      </button>
                    </div>

                    {(!activeType.measurementGuideTips || activeType.measurementGuideTips.length === 0) ? (
                      <p className="text-[11px] text-neutral-400 italic">
                        Nenhuma dica customizada cadastrada. (O sistema usará as instruções padrão)
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {activeType.measurementGuideTips.map((tip, tIdx) => (
                          <div key={tip.id || tIdx} className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={tip.title}
                                placeholder="Título (ex: Posição do Pé)"
                                onChange={(e) => {
                                  const tipsCopy = [...(activeType.measurementGuideTips || [])];
                                  tipsCopy[tIdx] = { ...tipsCopy[tIdx], title: e.target.value };
                                  updateActiveType({ ...activeType, measurementGuideTips: tipsCopy });
                                }}
                                className="flex-1 bg-white border border-neutral-300 rounded-md px-2.5 py-1 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = (activeType.measurementGuideTips || []).filter((_, i) => i !== tIdx);
                                  updateActiveType({ ...activeType, measurementGuideTips: filtered });
                                }}
                                className="text-neutral-400 hover:text-red-600 p-1 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={tip.text}
                              placeholder="Texto instrutivo..."
                              rows={2}
                              onChange={(e) => {
                                const tipsCopy = [...(activeType.measurementGuideTips || [])];
                                tipsCopy[tIdx] = { ...tipsCopy[tIdx], text: e.target.value };
                                updateActiveType({ ...activeType, measurementGuideTips: tipsCopy });
                              }}
                              className="w-full bg-white border border-neutral-300 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Observação Geral */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
                      Observação / Dica de Ouro
                    </label>
                    <textarea
                      value={activeType.measurementGuideObservation || ''}
                      placeholder="Ex: Meça o pé apoiado em uma folha de papel para maior precisão."
                      rows={2}
                      onChange={(e) => updateActiveType({ ...activeType, measurementGuideObservation: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-md p-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                    <p className="text-[10px] text-neutral-500">
                      Exibida em destaque no rodapé da janela "Ver como medir".
                    </p>
                  </div>
                </div>

                {/* Main Save Action Bar */}
                <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-neutral-500">
                    Lembre-se de salvar suas alterações para que fiquem salvas no banco de dados.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAllTypes}
                    disabled={saving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                Nenhum tipo de peça selecionado. Escolha um tipo à esquerda ou crie um novo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
