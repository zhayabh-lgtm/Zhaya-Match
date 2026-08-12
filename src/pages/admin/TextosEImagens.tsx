import React, { useState } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { Save, Check, FileText, MessageSquareQuote } from 'lucide-react';
import { Repository } from '../../lib/repository';

export const TextosEImagens: React.FC = () => {
  const {
    texts,
    updateTexts,
    publish,
  } = useConfigDraft();

  const [activeTab, setActiveTab] = useState<'flowTexts' | 'feedbackTexts'>('flowTexts');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const handleSaveAll = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await publish({ texts });
      setSavedMessage('Textos de resultados e feedback salvos e publicados com sucesso!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar textos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-200 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-sans font-bold text-neutral-900">
            Textos e Feedback
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Personalize as mensagens do fluxo, resultados e a pesquisa de satisfação.
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
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('flowTexts')}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'flowTexts'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Textos de Resultados</span>
        </button>
        <button
          onClick={() => setActiveTab('feedbackTexts')}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'feedbackTexts'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-700'
          }`}
        >
          <MessageSquareQuote className="w-4 h-4" />
          <span>Pesquisa de Feedback</span>
        </button>
      </div>

      {/* TAB 1: RESULTADOS */}
      {activeTab === 'flowTexts' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-2">
              Mensagens e Rótulos de Resultados
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
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem Entre Dois Tamanhos
                </label>
                <input
                  type="text"
                  value={texts.betweenSizesMessage || 'Você está entre dois tamanhos.'}
                  onChange={(e) => updateTexts((t) => ({ ...t, betweenSizesMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Botão Recalcular
                </label>
                <input
                  type="text"
                  value={texts.recalculateButtonText || 'Calcular novamente'}
                  onChange={(e) => updateTexts((t) => ({ ...t, recalculateButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Botão Concluir / Fechar
                </label>
                <input
                  type="text"
                  value={texts.closeButtonText || 'Fechar'}
                  onChange={(e) => updateTexts((t) => ({ ...t, closeButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem Tamanho Não Encontrado
                </label>
                <input
                  type="text"
                  value={texts.notFoundMessage || 'Não encontramos um tamanho adequado para as medidas informadas.'}
                  onChange={(e) => updateTexts((t) => ({ ...t, notFoundMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Pesquisa de Feedback */}
      {activeTab === 'feedbackTexts' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
            <div className="border-b border-neutral-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Pesquisa de Satisfação e Feedback do Usuário
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Exibida ao fechar a recomendação. Configure as perguntas, rótulos e botões.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  1. Pergunta sobre Adequação da Recomendação
                </label>
                <input
                  type="text"
                  value={texts.feedbackAdequacyQuestion || 'A recomendação fez sentido para você?'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackAdequacyQuestion: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
                <p className="text-[11px] text-neutral-400 mt-1">As opções fixas são: Sim, Não, Ainda não sei.</p>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  2. Pergunta sobre Facilidade do Processo de Medição
                </label>
                <input
                  type="text"
                  value={texts.feedbackEaseQuestion || 'Como foi o processo de medição? (1 a 5)'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackEaseQuestion: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Rótulo da Escala Mínima (Nota 1)
                </label>
                <input
                  type="text"
                  value={texts.feedbackEaseMinLabel || 'Muito difícil'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackEaseMinLabel: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Rótulo da Escala Máxima (Nota 5)
                </label>
                <input
                  type="text"
                  value={texts.feedbackEaseMaxLabel || 'Muito fácil'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackEaseMaxLabel: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  3. Pergunta ou Rótulo do Campo de Comentário (Opcional)
                </label>
                <input
                  type="text"
                  value={texts.feedbackCommentLabel || 'Deixe seu comentário ou sugestão:'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackCommentLabel: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Placeholder do Campo de Comentário
                </label>
                <input
                  type="text"
                  value={texts.feedbackCommentPlaceholder || 'Escreva aqui seu comentário ou sugestão...'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackCommentPlaceholder: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Texto do Botão de Enviar
                </label>
                <input
                  type="text"
                  value={texts.feedbackSubmitButtonText || 'Enviar'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackSubmitButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Texto do Botão de Pular
                </label>
                <input
                  type="text"
                  value={texts.feedbackSkipButtonText || 'Pular'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackSkipButtonText: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Mensagem de Agradecimento Após Envio
                </label>
                <input
                  type="text"
                  value={texts.feedbackThankYouMessage || 'Obrigado pelo seu feedback!'}
                  onChange={(e) => updateTexts((t) => ({ ...t, feedbackThankYouMessage: e.target.value }))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-xs text-neutral-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
