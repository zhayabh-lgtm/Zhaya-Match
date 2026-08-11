import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  PieChart,
  Ruler,
  ShieldAlert,
  Info,
  Layers,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { AnalyticsSummary, PeriodType } from '../../types/zhaya';
import {
  formatCount,
  formatPercent,
  formatRecommendationStatusLabel,
  safePercent,
} from '../../lib/analyticsNormalizer';
import { fetchAdminAnalyticsApi, AnalyticsErrorState } from '../../lib/analyticsApi';
import { AdminErrorBoundary } from '../../components/admin/AdminErrorBoundary';

const AnalyticsContent: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorType, setErrorType] = useState<AnalyticsErrorState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeChartMetric, setActiveChartMetric] = useState<'opened' | 'completed' | 'visitors' | 'sessions'>('opened');

  const loadAnalytics = async () => {
    setLoading(true);
    setErrorType(null);
    setErrorMessage(null);

    const result = await fetchAdminAnalyticsApi(period, customStart, customEnd);

    if (result.errorType) {
      setErrorType(result.errorType);
      setErrorMessage(result.errorMessage);
      setSummary(null);
    } else {
      setSummary(result.summary);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (period === 'custom') {
      loadAnalytics();
    }
  };

  // Conversão direta: Abertura -> Recomendação
  const openToRecRate = summary
    ? safePercent(summary.totalRecommended + summary.totalNotFound, summary.totalOpened)
    : 0;

  // Verifica se o dataset está completamente vazio
  const isZeroDataset = summary
    ? summary.totalViewed === 0 &&
      summary.totalOpened === 0 &&
      summary.totalStarted === 0 &&
      summary.totalRecommended === 0
    : false;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header e Seleção de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-neutral-800 shrink-0" />
            <span>Analytics Zhaya Match</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Métricas reais de engajamento, uso e conversão geradas pelo provador em sua loja.
          </p>
        </div>

        {/* Seletor de Períodos */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === 'today'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '7days'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '30days'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              30 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriod('90days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '90days'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              90 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === 'custom'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Personalizado
            </button>
          </div>

          <button
            type="button"
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Formulário de Período Personalizado */}
      {period === 'custom' && (
        <form
          onSubmit={handleApplyCustomDates}
          className="bg-white p-4 border border-neutral-200 rounded-xl shadow-sm flex flex-wrap items-end gap-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-semibold text-neutral-700">Data de Início</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 block bg-neutral-50"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-neutral-700">Data de Fim</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 block bg-neutral-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Filtrar Período
          </button>
        </form>
      )}

      {/* ESTADO 1: CARREGANDO (Skeleton UI) */}
      {loading && !summary && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-neutral-100 rounded-xl border border-neutral-200" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-72 bg-neutral-100 rounded-xl border border-neutral-200" />
            <div className="lg:col-span-5 h-72 bg-neutral-100 rounded-xl border border-neutral-200" />
          </div>
          <div className="h-64 bg-neutral-100 rounded-xl border border-neutral-200" />
        </div>
      )}

      {/* ESTADO 2: ERRO DE CONFIGURAÇÃO */}
      {errorType === 'CONFIG_ERROR' && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-amber-900">
                Erro de Configuração do Backend de Analytics
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                {errorMessage ||
                  'O servidor não conseguiu conectar ao banco de dados ou as credenciais de serviço do Supabase/Analytics estão ausentes.'}
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={loadAnalytics}
              className="px-4 py-2 bg-amber-900 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 3: ERRO DE AUTENTICAÇÃO OU DE API */}
      {(errorType === 'API_ERROR' || errorType === 'AUTH_ERROR') && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-red-900">
                {errorType === 'AUTH_ERROR' ? 'Acesso Não Autorizado' : 'Falha ao Carregar Analytics'}
              </h3>
              <p className="text-xs text-red-800 leading-relaxed max-w-2xl">
                {errorMessage || 'Não foi possível se comunicar com o endpoint do Analytics.'}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={loadAnalytics}
              className="px-4 py-2 bg-red-800 text-white rounded-lg text-xs font-semibold hover:bg-red-900 transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 4: SUCESSO (COM OU SEM DADOS) */}
      {summary && !errorType && (
        <div className="space-y-8">
          {/* Mensagem discreta para Dataset Vazio (0 Eventos) */}
          {isZeroDataset && (
            <div className="p-4 bg-neutral-900 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  Nenhum evento registrado no período selecionado ({summary.startDate} — {summary.endDate}). As métricas serão atualizadas assim que clientes utilizarem o provador em sua loja.
                </span>
              </div>
            </div>
          )}

          {/* 1. CARDS PRINCIPAIS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: Visitantes */}
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Visitantes
                </span>
                <Users className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {formatCount(summary.uniqueVisitors)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono">
                {formatCount(summary.totalViewed)} exibições
              </div>
            </div>

            {/* Card 2: Sessões */}
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Sessões
                </span>
                <Layers className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {formatCount(summary.uniqueSessions)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono">
                Navegações ativas
              </div>
            </div>

            {/* Card 3: Widget Aberto */}
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Widget Aberto
                </span>
                <MousePointer className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">
                {formatCount(summary.totalOpened)}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold font-mono">
                {formatPercent(summary.openRate)} abertura
              </div>
            </div>

            {/* Card 4: Recomendações Geradas */}
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 rounded-xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Recomendações
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCount(summary.totalRecommended)}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold font-mono">
                {formatPercent(summary.completionRate)} conclusão
              </div>
            </div>

            {/* Card 5: Conversão Abertura -> Recomendação */}
            <div className="bg-white p-4 sm:p-5 border border-neutral-200 rounded-xl shadow-xs space-y-2 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  Abertura → Rec.
                </span>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-indigo-600">
                {formatPercent(openToRecRate)}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono">
                Conversão direta
              </div>
            </div>
          </div>

          {/* KPIs Secundários: Abandono, Fora da Grade, Ajuda e Feedback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Taxa de Abandono
                </span>
                <span className="text-lg font-bold text-amber-600 mt-1 block font-mono">
                  {formatPercent(summary.abandonmentRate)}
                </span>
                <span className="text-[10px] text-neutral-400">Fluxos iniciados não concluídos</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                !
              </div>
            </div>

            <div className="bg-white p-4 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Fora da Tabela / Não Encontrado
                </span>
                <span className="text-lg font-bold text-rose-600 mt-1 block font-mono">
                  {formatCount(summary.totalNotFound)} ({formatPercent(summary.notFoundRate)})
                </span>
                <span className="text-[10px] text-neutral-400">Medidas fora da graduação</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Consultas "Como Medir"
                </span>
                <span className="text-lg font-bold text-neutral-800 mt-1 block font-mono">
                  {formatCount(summary.totalHelpOpened)}
                </span>
                <span className="text-[10px] text-neutral-400">Aberturas do guia de medição</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Pesquisa de Feedback
                </span>
                <span className="text-lg font-bold text-indigo-600 mt-1 block font-mono">
                  {formatCount(summary.totalFeedbackSubmitted ?? 0)} / {formatCount(summary.totalFeedbackStarted ?? 0)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Enviados vs Iniciados ({formatCount(summary.totalFeedbackSkipped ?? 0)} pulados)
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                {safePercent(summary.totalFeedbackSubmitted ?? 0, summary.totalFeedbackStarted ?? 0)}%
              </div>
            </div>
          </div>

          {/* 2. FUNIL DE CONVERSÃO & DISTRIBUIÇÃO DE RESULTADOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Funil Visual (7 Etapas) */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 border border-neutral-200 rounded-xl shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neutral-700" />
                  <span>Funil de Conversão (7 Etapas)</span>
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">Retenção relativa</span>
              </div>

              <div className="space-y-3.5">
                {summary.funnel.map((step, idx) => {
                  const safeRate = typeof step.conversionRate === 'number' ? step.conversionRate : step.rate;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800">{step.label || step.step}</span>
                        <div className="space-x-2 font-mono">
                          <span className="text-neutral-900 font-bold">{formatCount(step.count)}</span>
                          <span className="text-neutral-500">({formatPercent(safeRate)})</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-neutral-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, Math.min(100, safeRate))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribuição de Status de Recomendação */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 border border-neutral-200 rounded-xl shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-neutral-700" />
                  <span>Status das Recomendações</span>
                </h3>
              </div>

              <div className="space-y-3 py-1">
                {Object.entries(summary.recommendationTypes).map(([statusKey, countVal]) => {
                  const label = formatRecommendationStatusLabel(statusKey);
                  let bgClass = 'bg-neutral-50 border-neutral-200 text-neutral-800';
                  let badgeClass = 'text-neutral-700';

                  if (statusKey === 'recommended') {
                    bgClass = 'bg-emerald-50/80 border-emerald-100 text-emerald-900';
                    badgeClass = 'text-emerald-700';
                  } else if (statusKey === 'between_sizes') {
                    bgClass = 'bg-amber-50/80 border-amber-100 text-amber-900';
                    badgeClass = 'text-amber-700';
                  } else if (statusKey === 'not_found') {
                    bgClass = 'bg-rose-50/80 border-rose-100 text-rose-900';
                    badgeClass = 'text-rose-700';
                  }

                  return (
                    <div
                      key={statusKey}
                      className={`p-3.5 border rounded-xl flex items-center justify-between ${bgClass}`}
                    >
                      <div>
                        <span className="text-xs font-semibold block">{label}</span>
                        <span className="text-[10px] opacity-75 font-mono">{statusKey}</span>
                      </div>
                      <span className={`text-lg font-bold font-mono ${badgeClass}`}>
                        {formatCount(countVal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. SÉRIE DIÁRIA (Gráfico & Tabela) */}
          <div className="bg-white p-5 sm:p-6 border border-neutral-200 rounded-xl shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-700" />
                <span>Evolução Diária de Uso</span>
              </h3>

              {/* Controles de métrica do gráfico */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('opened')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    activeChartMetric === 'opened'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Aberturas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('completed')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    activeChartMetric === 'completed'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Recomendações
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartMetric('visitors')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    activeChartMetric === 'visitors'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Visitantes
                </button>
              </div>
            </div>

            {/* Visualização de Gráfico SVG de Barras (Resiliente a 0 ou múltiplos dias) */}
            <div className="pt-2">
              {summary.dailyEvolution.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-32 w-full flex items-end gap-1.5 pt-4 pb-1 px-2 bg-neutral-50 border border-neutral-100 rounded-lg overflow-x-auto">
                    {(() => {
                      const maxVal = Math.max(
                        1,
                        ...summary.dailyEvolution.map((d) => {
                          if (activeChartMetric === 'opened') return d.opened;
                          if (activeChartMetric === 'completed') return d.completed;
                          if (activeChartMetric === 'visitors') return d.visitors || 0;
                          return d.sessions || 0;
                        })
                      );

                      return summary.dailyEvolution.map((day, i) => {
                        const val =
                          activeChartMetric === 'opened'
                            ? day.opened
                            : activeChartMetric === 'completed'
                            ? day.completed
                            : activeChartMetric === 'visitors'
                            ? day.visitors || 0
                            : day.sessions || 0;

                        const heightPct = Math.round((val / maxVal) * 100);

                        return (
                          <div
                            key={i}
                            className="flex-1 min-w-[24px] max-w-[48px] flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="text-[9px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 mb-1 transition-opacity">
                              {val}
                            </div>
                            <div
                              className="w-full bg-neutral-900 group-hover:bg-emerald-600 rounded-t transition-all duration-300"
                              style={{ height: `${Math.max(4, heightPct)}%` }}
                            />
                            <span className="text-[9px] text-neutral-400 font-mono mt-1 truncate w-full text-center">
                              {day.date.slice(0, 5)}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-neutral-400 font-sans">
                  Sem histórico diário disponível para o período selecionado.
                </div>
              )}
            </div>

            {/* Tabela de Evolução Diária */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Visitantes</th>
                    <th className="py-2.5 px-3">Sessões</th>
                    <th className="py-2.5 px-3">Aberturas</th>
                    <th className="py-2.5 px-3">Inícios</th>
                    <th className="py-2.5 px-3">Recomendações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {summary.dailyEvolution.length > 0 ? (
                    summary.dailyEvolution.map((day, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-medium text-neutral-900">{day.date}</td>
                        <td className="py-2.5 px-3">{formatCount(day.visitors || 0)}</td>
                        <td className="py-2.5 px-3">{formatCount(day.sessions || 0)}</td>
                        <td className="py-2.5 px-3">{formatCount(day.opened)}</td>
                        <td className="py-2.5 px-3">{formatCount(day.started)}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold">
                          {formatCount(day.completed)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-neutral-400 font-sans text-xs">
                        Nenhum registro diário para o período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. DESEMPENHO POR PRODUTO / TIPO DE PEÇA */}
          <div className="bg-white p-5 sm:p-6 border border-neutral-200 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-neutral-700" />
                <span>Desempenho por Tipo de Produto</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Tipo de Peça</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Consultas</th>
                    <th className="py-2.5 px-3">Recomendações Concluídas</th>
                    <th className="py-2.5 px-3">Taxa de Sucesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {summary.topTypes.length > 0 ? (
                    summary.topTypes.map((t, idx) => {
                      const successRate = safePercent(t.completed, t.started);
                      return (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="py-2.5 px-3 font-semibold text-neutral-900">
                            {t.typeName || 'Tipo de Produto'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 uppercase text-[10px] tracking-wider font-mono">
                            {t.category || 'Geral'}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{formatCount(t.started)}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">
                            {formatCount(t.completed)}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{formatPercent(successRate)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-400 text-xs">
                        Nenhum tipo de produto consultado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. FEEDBACK DOS CLIENTES */}
          <div className="bg-white p-5 sm:p-6 border border-neutral-200 rounded-xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-700" />
                <span>Feedback dos Clientes</span>
              </h3>
            </div>

            {/* Métrica Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Total de Respostas
                </span>
                <span className="text-xl font-bold text-neutral-900 mt-1 block font-mono">
                  {formatCount(summary.feedbackDetails?.totalResponses ?? 0)}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  % Sim (Serviu)
                </span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block font-mono">
                  {formatPercent(summary.feedbackDetails?.yesPercent ?? 0)}
                </span>
              </div>

              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl">
                <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                  % Não (Não serviu)
                </span>
                <span className="text-xl font-bold text-rose-700 mt-1 block font-mono">
                  {formatPercent(summary.feedbackDetails?.noPercent ?? 0)}
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
                <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                  % Indeciso (Ainda não sei)
                </span>
                <span className="text-xl font-bold text-amber-700 mt-1 block font-mono">
                  {formatPercent(summary.feedbackDetails?.notSurePercent ?? 0)}
                </span>
              </div>

              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
                  Média de Facilidade
                </span>
                <span className="text-xl font-bold text-indigo-700 mt-1 block font-mono">
                  {(summary.feedbackDetails?.averageEaseRating ?? 0).toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            {/* Comentários Recentes */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Comentários Recentes
              </h4>

              {(!summary.feedbackDetails?.recentComments || summary.feedbackDetails.recentComments.length === 0) ? (
                <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-lg text-center text-xs text-neutral-500">
                  Nenhum comentário enviado até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                        <th className="py-2.5 px-3">Comentário</th>
                        <th className="py-2.5 px-3">Tipo de Produto</th>
                        <th className="py-2.5 px-3">Tamanho Recomendado</th>
                        <th className="py-2.5 px-3">Data e Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {summary.feedbackDetails.recentComments.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-neutral-50">
                          <td className="py-2.5 px-3 text-neutral-900 max-w-xs font-medium">
                            "{item.comment}"
                          </td>
                          <td className="py-2.5 px-3 text-neutral-600 font-mono">
                            {item.productTypeName || item.productTypeId || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-800 font-bold font-mono">
                            {item.recommendedSize || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                            {item.submittedAt ? new Date(item.submittedAt).toLocaleString('pt-BR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  return (
    <AdminErrorBoundary fallbackTitle="Não foi possível carregar o Analytics">
      <AnalyticsContent />
    </AdminErrorBoundary>
  );
};
