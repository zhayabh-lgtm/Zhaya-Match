import React, { useState, useEffect, useRef } from 'react';
import { useConfigDraft } from '../../context/ConfigDraftContext';
import { AppConfig, SystemActivityStatus, DiagnosticContract } from '../../types/zhaya';
import { Repository } from '../../lib/repository';
import { CentralDeDiagnostico } from '../../components/admin/CentralDeDiagnostico';
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
  Upload,
  Download,
  Package,
} from 'lucide-react';

export const Configuracoes: React.FC = () => {
  const { config, updateConfig, publish, loading, errorMessage: draftError } = useConfigDraft();
  const [domainInput, setDomainInput] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Estados do Monitor de Atividade do Supabase e Diagnóstico
  const [activityStatus, setActivityStatus] = useState<SystemActivityStatus | null>(null);
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticContract | null>(null);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(true);
  const [checkingActivity, setCheckingActivity] = useState<boolean>(false);
  const [sendingTestEvent, setSendingTestEvent] = useState<boolean>(false);
  const [testEventResult, setTestEventResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Publicação do ZIP da extensão Zhaya Match no Supabase Storage.
  const extensionFileInputRef = useRef<HTMLInputElement>(null);
  const [publishingExtension, setPublishingExtension] = useState(false);
  const [extensionInfo, setExtensionInfo] = useState<{ available: boolean; bucket?: string; fileName?: string; size?: number | null; updatedAt?: string | null; downloadUrl?: string | null } | null>(null);
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);


  const loadExtensionInfo = async () => {
    const result = await Repository.getZhayaExtensionInfo();
    if (result.success) {
      setExtensionInfo({
        available: result.available,
        bucket: result.bucket,
        fileName: result.fileName,
        size: result.size ?? null,
        updatedAt: result.updatedAt ?? null,
        downloadUrl: result.downloadUrl ?? null,
      });
      setExtensionError(null);
    } else {
      setExtensionInfo({ available: false, bucket: result.bucket });
      setExtensionError(result.error || 'Não foi possível consultar a extensão publicada.');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });

  const handlePublishExtension = async (file: File) => {
    setExtensionMessage(null);
    setExtensionError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setExtensionError('Selecione o arquivo .zip da extensão.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setExtensionError('O ZIP da extensão deve ter no máximo 2 MB.');
      return;
    }
    setPublishingExtension(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await Repository.publishZhayaExtension({ fileName: file.name, fileSize: file.size, base64 });
      if (!result.success) {
        setExtensionError(result.error || 'Não foi possível publicar a extensão.');
        return;
      }
      setExtensionInfo({
        available: true,
        bucket: result.bucket,
        fileName: result.fileName,
        size: result.size ?? file.size,
        updatedAt: result.updatedAt ?? new Date().toISOString(),
        downloadUrl: result.downloadUrl ?? null,
      });
      setExtensionMessage('Extensão publicada. O botão “Baixar extensão” passa a entregar esta versão.');
    } catch (e: any) {
      setExtensionError(e?.message || 'Erro ao publicar a extensão.');
    } finally {
      setPublishingExtension(false);
      if (extensionFileInputRef.current) extensionFileInputRef.current.value = '';
    }
  };

  const handleDownloadExtension = async () => {
    setExtensionError(null);
    const result = await Repository.getZhayaExtensionInfo();
    if (!result.success || !result.available || !result.downloadUrl) {
      setExtensionError(result.error || 'Nenhuma extensão foi publicada ainda.');
      return;
    }
    window.location.assign(result.downloadUrl);
  };

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

  const loadDiagnostics = async () => {
    try {
      const data = await Repository.getDiagnostics();
      setDiagnosticsData(data);
    } catch (e) {
      console.warn('Erro ao carregar diagnósticos:', e);
    }
  };

  const handleSendTestEvent = async () => {
    setSendingTestEvent(true);
    setTestEventResult(null);
    const testId = `test-evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    try {
      const res = await fetch('/api/public/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: testId,
          eventName: 'launcher_clicked',
          productTypeName: 'Evento Teste Diagnóstico',
          sourceDomain: window.location.hostname || 'admin.zhaya.com.br',
          sessionId: 'diag-session-1',
          occurredAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        // Confirmação REAL no banco de dados
        const verified = await Repository.verifyAnalyticsEvent(testId);
        const diagData = await Repository.getDiagnostics();
        setDiagnosticsData(diagData);

        if (verified) {
          setTestEventResult({
            id: testId,
            success: true,
            message: `Evento de teste enviado e confirmado no banco de dados. ID: ${testId}`,
          });
        } else {
          setTestEventResult({
            id: testId,
            success: false,
            message: `Evento de teste enviado (API 200), porém NÃO foi encontrado no banco de dados após verificação. ID: ${testId}`,
          });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setTestEventResult({
          id: testId,
          success: false,
          message: errJson.message || 'Falha ao enviar evento de teste para a API.',
        });
      }
    } catch (err: any) {
      setTestEventResult({
        id: testId,
        success: false,
        message: err?.message || 'Erro de rede ao enviar evento de teste.',
      });
    } finally {
      setSendingTestEvent(false);
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
      await loadDiagnostics();
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
    loadDiagnostics();
    void loadExtensionInfo();
  }, [config.allowedDomains]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const parsedDomains = domainInput
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const updatedConfig: AppConfig = {
        ...config,
        allowedDomains: parsedDomains.length > 0 ? parsedDomains : ['zhaya.com.br', 'www.zhaya.com.br'],
      };

      updateConfig(() => updatedConfig);

      await publish({ config: updatedConfig });
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
          {/* Central de Diagnóstico Completa */}
          <CentralDeDiagnostico config={config} />

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

            {/* Toggle Feedback Survey */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <div className="text-xs font-semibold text-neutral-900">
                  Ativar pesquisa de feedback
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Exibe uma breve pesquisa de satisfação após o usuário concluir a recomendação no widget.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableFeedbackSurvey !== false}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, enableFeedbackSurvey: e.target.checked }))}
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

            {/* Section 4: Diagnóstico do Sistema */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-neutral-800" />
                  <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Diagnóstico de API, Supabase & Eventos
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestEvent}
                    disabled={sendingTestEvent}
                    className="text-xs bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${sendingTestEvent ? 'animate-spin' : ''}`} />
                    <span>{sendingTestEvent ? 'Enviando...' : 'Enviar evento de teste'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadDiagnostics}
                    className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 font-medium px-2 py-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>

              {testEventResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    testEventResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testEventResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{testEventResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestEventResult(null)}
                    className="text-[11px] underline opacity-70 hover:opacity-100 ml-2"
                  >
                    Fechar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* API Status */}
                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Status da API Base
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {diagnosticsData?.api?.status === 'healthy' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Online & Responsiva</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Indisponível</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Supabase Status */}
                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Status do Supabase
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {diagnosticsData?.supabase?.status === 'healthy' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Conectado & Gravando</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Erro de Conexão</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Service Role Status */}
                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Status da Service Role Key
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {diagnosticsData?.serviceRole?.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Service Role Válida</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700" title={diagnosticsData?.serviceRole?.status || ''}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Chave Ausente / Anon Usada</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps dos Últimos Eventos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Último Evento de Analytics
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 block">
                    {diagnosticsData?.lastEvents?.analytics
                      ? new Date(diagnosticsData.lastEvents.analytics).toLocaleString('pt-BR')
                      : 'Nenhum evento registrado'}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Última Recomendação / Clique
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 block">
                    {diagnosticsData?.lastEvents?.recommendation
                      ? new Date(diagnosticsData.lastEvents.recommendation).toLocaleString('pt-BR')
                      : 'Nenhuma recomendação registrada'}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block">
                    Último Feedback Recebido
                  </span>
                  <span className="text-xs font-mono font-semibold text-neutral-800 block">
                    {diagnosticsData?.lastEvents?.feedback
                      ? new Date(diagnosticsData.lastEvents.feedback).toLocaleString('pt-BR')
                      : 'Nenhum feedback registrado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Publicar extensão */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 gap-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-neutral-800" />
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Publicar extensão</h2>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Envie o ZIP que será oferecido pelo botão “Baixar extensão” dentro da Vitrine Personalizada.</p>
                  </div>
                </div>
                {extensionInfo?.available && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 shrink-0">Publicada</span>
                )}
              </div>

              <input
                ref={extensionFileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePublishExtension(file);
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-neutral-800">Versão disponível</div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    {extensionInfo?.available
                      ? `${extensionInfo.fileName || 'Zhaya-Match-Extensao.zip'}${extensionInfo.updatedAt ? ` · publicada em ${new Date(extensionInfo.updatedAt).toLocaleString('pt-BR')}` : ''}`
                      : 'Nenhum ZIP publicado ainda.'}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                    Bucket: {extensionInfo?.bucket || 'zhaya-match-extension'}
                    {extensionInfo?.size ? ` · ${(extensionInfo.size / 1024).toFixed(1)} KB` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => extensionFileInputRef.current?.click()}
                    disabled={publishingExtension}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                  >
                    {publishingExtension ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {publishingExtension ? 'Publicando...' : 'Publicar extensão'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadExtension}
                    disabled={!extensionInfo?.available}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-800 rounded-md text-xs font-semibold hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar extensão
                  </button>
                </div>
              </div>

              {extensionMessage && <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">{extensionMessage}</div>}
              {extensionError && <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-3">{extensionError}</div>}
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Configure <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">ZHAYA_EXTENSION_BUCKET</code> na Vercel se quiser outro nome. Na primeira publicação o backend tenta criar esse bucket privado no Supabase Storage automaticamente; o download usa URL assinada temporária.
              </p>
            </div>

            {/* Section 5: Monitor de atividade do Supabase */}
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
