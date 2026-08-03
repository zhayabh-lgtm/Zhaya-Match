import React, { useState, useEffect } from 'react';
import { Repository } from '../../lib/repository';
import { ProductType, MeasurementKey, SizeRow } from '../../types/zhaya';
import { Plus, Trash2, Copy, Check, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { MediaUploader } from '../../components/admin/MediaUploader';

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

export const TiposEMedidas: React.FC = () => {
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

  const handleToggleTypeActive = (id: string, newActiveState: boolean) => {
    const updated = types.map((t) => (t.id === id ? { ...t, active: newActiveState } : t));
    setTypes(updated);
    if (activeType && activeType.id === id) {
      setActiveType({ ...activeType, active: newActiveState });
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

      await Repository.saveProductTypes(typesToSave);

      const reloaded = await Repository.getProductTypes();
      setTypes(reloaded);
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

  const handleToggleMeasurement = (key: MeasurementKey) => {
    if (!activeType) return;
    const current = activeType.measurements || [];
    let updatedKeys: MeasurementKey[];
    if (current.includes(key)) {
      updatedKeys = current.filter((k) => k !== key);
    } else {
      updatedKeys = [...current, key];
    }
    setActiveType({ ...activeType, measurements: updatedKeys });
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
    setActiveType({ ...activeType, sizes: [...activeType.sizes, newRow] });
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
    setActiveType({ ...activeType, sizes: updatedSizes });
  };

  const handleRemoveSizeRow = (idx: number) => {
    if (!activeType) return;
    const updated = activeType.sizes.filter((_, i) => i !== idx);
    setActiveType({ ...activeType, sizes: updated });
  };

  const handleSingleValueChange = (
    sizeIdx: number,
    key: MeasurementKey,
    val: number
  ) => {
    if (!activeType) return;
    const updatedSizes = [...activeType.sizes];
    const row = { ...updatedSizes[sizeIdx] };
    const ranges = { ...(row.ranges || {}) };
    const numVal = isNaN(val) ? 0 : val;
    // Set value, min, and max for full backwards & forwards compatibility
    ranges[key] = { value: numVal, min: numVal, max: numVal };
    row.ranges = ranges;
    updatedSizes[sizeIdx] = row;
    setActiveType({ ...activeType, sizes: updatedSizes });
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
                        setActiveType({ ...activeType, name: e.target.value })
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

                {/* Section 1: Image & Questions */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MediaUploader
                      category="product-types"
                      label={`Imagem do Tipo: ${activeType.name}`}
                      description="Substitui a imagem principal do corpo ao escolher esta categoria"
                      value={activeType.measurementImageUrl}
                      onChange={(url) => setActiveType({ ...activeType, measurementImageUrl: url })}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Legenda / Instrução Personalizada para {activeType.name}
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Medir sobre a blusa mais grossa que usar com a jaqueta."
                        value={activeType.measurementImageCaption || ''}
                        onChange={(e) => setActiveType({ ...activeType, measurementImageCaption: e.target.value })}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs text-neutral-900"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Texto exibido abaixo da imagem específica desta categoria.
                      </p>
                    </div>
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
                        Informe o intervalo em centímetros de cada tamanho para as medidas ativas:
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
                              <th key={mKey} className="p-2.5 font-bold text-center border-l border-neutral-200">
                                {mInfo?.label || mKey} (cm)
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
                                  setActiveType({ ...activeType, sizes: updated });
                                }}
                                className="w-16 bg-white border border-neutral-200 rounded px-2 py-1 text-xs font-bold text-neutral-900 text-center"
                              />
                            </td>

                            {activeType.measurements?.map((mKey) => {
                              const range = sizeRow.ranges?.[mKey] || {};
                              const displayVal = range.value !== undefined ? range.value : (range.min !== undefined ? range.min : '');
                              return (
                                <td key={mKey} className="p-1.5 border-l border-neutral-200 text-center">
                                  <input
                                    type="number"
                                    value={displayVal}
                                    placeholder="ex: 88"
                                    onChange={(e) =>
                                      handleSingleValueChange(idx, mKey, parseFloat(e.target.value))
                                    }
                                    className="w-24 bg-white border border-neutral-200 rounded px-2 py-1 text-xs text-center font-medium text-neutral-900 focus:border-neutral-900 focus:outline-none"
                                  />
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
