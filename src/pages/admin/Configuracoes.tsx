import React, { useState, useEffect } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { AppConfig, SystemActivityStatus } from '../../types/zhaya';
import { Repository } from '../../lib/repository';
import {
  Save,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Globe,
  Shield,
  Code,
  ExternalLink,
  Terminal,
  Database,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
} from 'lucide-react';

export const Configuracoes: React.FC = () => {
  const { config, updateConfig, publish, loading, errorMessage: draftError } = useConfigDraft();
  const [domainInput, setDomainInput] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Estados do Monitor de Atividade do Supabase
  const [activityStatus, setActivityStatus] = useState<SystemActivityStatus | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(true);
  const [checkingActivity, setCheckingActivity] = useState<boolean>(false);

  const loadActivityStatus = async () => {
    setLoadingActivity(true);
    try {
      const res = await Repository.getActivityStatus();
      setActivityStatus(res);
    } catch (e) {
      console.warn('Erro ao carregar status de atividade:', e);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleVerifyActivity = async () => {
    setCheckingActivity(true);
    try {
      const result = await Repository.runActivityCheck();
      if (result && result.status) {
        setActivityStatus(result.status);
      } else {
        await loadActivityStatus();
      }
    } catch (e) {
      console.error('Erro ao executar verificação de atividade:', e);
    } finally {
      setCheckingActivity(false);
    }
  };

  useEffect(() => {
    if (config.allowedDomains) {
      setDomainInput(config.allowedDomains.join(', '));
    }
    loadActivityStatus();
  }, [config.allowedDomains]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const parsedDomains = domainInput
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      updateConfig((prev) => ({
        ...prev,
        allowedDomains: parsedDomains.length > 0 ? parsedDomains : ['zhaya.com.br', 'www.zhaya.com.br'],
      }));

      await publish();
      setSavedMessage('Configurações publicadas com sucesso!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const currentHost = window.location.origin;
  const widgetPublicUrl = `${currentHost}/widget.js`;

  const scriptSnippet = `<script>
(function () {
  if (window.__zhayaMatchScriptRequested) return;
  window.__zhayaMatchScriptRequested = true;

  var script = document.createElement('script');
  script.src = '${widgetPublicUrl}';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
})();
</script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-serif font-bold text-neutral-900">
            Instalação e Configurações
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Status do Zhaya Match, domínios autorizados e código de instalação para a loja Olist / GTM.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && (
            <div className="bg-neutral-900 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-2 shadow-xs">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{savedMessage}</span>
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
          <span>Carregando configurações do sistema...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Overview & Status Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Status do Widget</div>
              <div className="flex items-center gap-2 pt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                <span className="text-sm font-bold text-neutral-900">
                  {config.enabled ? 'Ativo na Loja' : 'Desativado'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Modo de Teste</div>
              <div className="flex items-center gap-2 pt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${config.testMode ? 'bg-amber-500' : 'bg-neutral-300'}`} />
                <span className="text-sm font-bold text-neutral-900">
                  {config.testMode ? 'Habilitado (Previews)' : 'Desabilitado (Produção)'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-1">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Versão Ativa</div>
              <div className="flex items-center gap-2 pt-1">
                <Shield className="w-4 h-4 text-neutral-700" />
                <span className="text-sm font-bold text-neutral-900">v{config.version || 1}.0.0</span>
              </div>
            </div>
          </div>

          {/* Section 2: Controls Card */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-2">
              Controles do Sistema
            </h2>

            {/* Toggle Enabled */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="text-xs font-semibold text-neutral-900">
                  Ativar Widget Zhaya Match
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Quando desativado, o botão não será renderizado no site da loja.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
              </label>
            </div>

            {/* Toggle Test Mode */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                  <span>Modo de Teste (Test Mode)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-medium">
                    ?zhaya-match-preview=1
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Permite execução em links de preview da Vercel e validações internas antes da publicação definitiva.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.testMode}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, testMode: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
              </label>
            </div>

            {/* Allowed Domains */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-neutral-600" />
                <span>Domínios Permitidos (Separados por vírgula)</span>
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="zhaya.com.br, www.zhaya.com.br, loja.olist.com"
                className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-mono text-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                Apenas requisições vindas destes domínios executarão o widget. Domínios não autorizados são ignorados silenciosamente.
              </p>
            </div>
          </div>

          {/* Section 3: GTM & Installation Code */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-700" />
                <span>Instalação via Google Tag Manager (GTM) ou HTML</span>
              </h2>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Pronto para Produção
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Para instalar o Zhaya Match na sua loja Olist, copie o snippet assíncrono abaixo e crie uma <strong>Tag de HTML Personalizado</strong> no seu Google Tag Manager, configurada para disparar em <strong>Todas as Páginas de Produtos</strong>.
            </p>

            <div className="relative bg-neutral-950 text-neutral-100 rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-x-auto border border-neutral-800 shadow-inner">
              <pre><code>{scriptSnippet}</code></pre>
              <button
                onClick={handleCopyCode}
                className="absolute top-3 right-3 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded text-[11px] font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>

            {/* URL do Widget Publicado */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                URL Direta do Widget JS (Publicado)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={widgetPublicUrl}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-3 py-2 text-xs font-mono text-neutral-600"
                />
                <a
                  href={widgetPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 border border-neutral-200 rounded bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors shrink-0"
                  title="Abrir arquivo do widget"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Instruções curtas */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 text-xs text-neutral-700 space-y-2">
              <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-neutral-800" />
                <span>Instruções de Instalação no GTM:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-600 pl-1">
                <li>No painel do Google Tag Manager, vá em <strong>Tags → Nova Tag</strong>.</li>
                <li>Selecione o tipo <strong>HTML Personalizado</strong>.</li>
                <li>Cole o código acima na caixa de texto.</li>
                <li>Defina o Acionador (Trigger) como <strong>Exibição de Página (Todas as Páginas ou Páginas de Produto)</strong>.</li>
                <li>Salve e publique as alterações da versão no GTM.</li>
              </ol>
            </div>

            {/* Section 4: Monitor de atividade do Supabase */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-neutral-800" />
                  <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Monitor de atividade do Supabase
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {(activityStatus?.lastStatus === 'healthy' || activityStatus?.lastStatus === 'success') && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Operacional</span>
                    </span>
                  )}
                  {(activityStatus?.lastStatus === 'stale' || activityStatus?.lastStatus === 'warning') && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Atividade Desatualizada (&gt; 24h)</span>
                    </span>
                  )}
                  {activityStatus?.lastStatus === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Aguardando primeira execução</span>
                    </span>
                  )}
                  {(activityStatus?.lastStatus === 'error' || activityStatus?.lastStatus === 'database_error') && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-800 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Erro de Banco</span>
                    </span>
                  )}
                  {(!activityStatus || activityStatus.lastStatus === 'not_configured' || activityStatus.lastStatus === 'configuration_error') && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
                      <span>Não Configurado</span>
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                Rotina periódica de verificação de saúde do banco de dados Supabase para manutenção ativa do serviço.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Última Execução
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-900 block">
                    {activityStatus?.lastRunAt
                      ? new Date(activityStatus.lastRunAt).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Último Sucesso
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 block">
                    {activityStatus?.lastSuccessAt
                      ? new Date(activityStatus.lastSuccessAt).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Frequência
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 block">
                    Diária (1x ao dia)
                  </span>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Próxima Execução
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 block">
                    Diariamente às 00:00 (BRT)
                  </span>
                </div>
              </div>

              {activityStatus?.lastError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
                  Detalhe do Erro: {activityStatus.lastError}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-neutral-100">
                <p className="text-[11px] text-neutral-500 max-w-xl leading-normal">
                  No plano gratuito do Supabase, a atividade periódica reduz o risco de pausa automática. A garantia oficial contra suspensão depende da assinatura do plano pago.
                </p>
                <button
                  type="button"
                  onClick={handleVerifyActivity}
                  disabled={checkingActivity}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingActivity ? 'animate-spin' : ''}`} />
                  <span>{checkingActivity ? 'Verificando...' : 'Verificar Agora'}</span>
                </button>
              </div>
            </div>

            {/* Save Footer */}
            <div className="pt-4 border-t border-neutral-200 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
