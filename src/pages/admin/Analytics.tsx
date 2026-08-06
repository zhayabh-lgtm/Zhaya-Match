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
} from 'lucide-react';
import { Repository } from '../../lib/repository';
import { AnalyticsSummary, PeriodType } from '../../types/zhaya';
import { normalizeAnalyticsSummary, formatCount, formatPercent } from '../../lib/analyticsNormalizer';
import { AdminErrorBoundary } from '../../components/admin/AdminErrorBoundary';

const AnalyticsContent: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawData = await Repository.getAnalyticsSummary(period, customStart, customEnd);
      const normalized = normalizeAnalyticsSummary(rawData, period);
      setSummary(normalized);
    } catch (err: any) {
      console.error('Erro ao carregar analytics:', err);
      setError('Não foi possível carregar os dados analíticos do banco de dados.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-neutral-800" />
            <span>Analytics Zhaya Match</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Métricas de engajamento, uso e conversão reais geradas pelo widget publicado em sua loja.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 shadow-sm text-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === 'today'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '7days'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '30days'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('90days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === '90days'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              90 Dias
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                period === 'custom'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Personalizado
            </button>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="p-2 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer shadow-sm"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Form */}
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
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 block"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-neutral-700">Data de Fim</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 block"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Filtrar Período
          </button>
        </form>
      )}

      {/* Loading state */}
      {loading && !summary && (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
          <p className="text-sm text-neutral-500">Buscando métricas e relatórios do Zhaya Match...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 text-xs font-semibold cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Dashboard Data Display */}
      {summary && (
        <div className="space-y-8">
          {/* Main KPI Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Exibições do Botão</span>
                <Eye className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">{formatCount(summary.totalViewed)}</div>
              <div className="text-[11px] text-neutral-500 font-mono">
                {formatCount(summary.uniqueVisitors)} visitantes únicos
              </div>
            </div>

            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Aberturas do Widget</span>
                <MousePointer className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">{formatCount(summary.totalOpened)}</div>
              <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                {formatPercent(summary.openRate)} taxa de abertura
              </div>
            </div>

            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Inícios de Curadoria</span>
                <Play className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-neutral-900">{formatCount(summary.totalStarted)}</div>
              <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                {formatPercent(summary.startRate)} taxa de início
              </div>
            </div>

            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Recomendações Geradas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">{formatCount(summary.totalRecommended)}</div>
              <div className="text-[11px] text-emerald-700 font-semibold font-mono">
                {formatPercent(summary.completionRate)} taxa de conclusão
              </div>
            </div>
          </div>

          {/* Secondary KPIs: Abandonment & Not Found */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Taxa de Abandono
                </span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">
                  {formatPercent(summary.abandonmentRate)}
                </span>
                <span className="text-[11px] text-neutral-400">Fluxos iniciados não concluídos</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                !
              </div>
            </div>

            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Não Encontrado
                </span>
                <span className="text-xl font-bold text-red-600 mt-1 block">
                  {formatCount(summary.totalNotFound)} ({formatPercent(summary.notFoundRate)})
                </span>
                <span className="text-[11px] text-neutral-400">Fora da tabela de medidas</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Ajuda "Como Medir"
                </span>
                <span className="text-xl font-bold text-neutral-800 mt-1 block">
                  {formatCount(summary.totalHelpOpened)}
                </span>
                <span className="text-[11px] text-neutral-400">Consultas ao guia de medição</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Zero State Notice if 0 total views */}
          {summary.totalViewed === 0 && summary.totalOpened === 0 && (
            <div className="bg-neutral-900 text-white p-8 rounded-2xl shadow-xl text-center space-y-4 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold">Ainda não há dados suficientes neste período</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                Os dados analíticos serão coletados automaticamente à medida que clientes navegarem pelo seu widget publicado no site oficial ou loja integrada.
              </p>
            </div>
          )}

          {/* Funnel & Distribution Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Conversion Funnel */}
            <div className="lg:col-span-7 bg-white p-6 border border-neutral-200 rounded-xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-neutral-700" />
                  <span>Funil de Conversão do Widget</span>
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono">Retenção por etapa</span>
              </div>

              <div className="space-y-3.5">
                {summary.funnel.map((step, idx) => {
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-700">{step.label || step.step}</span>
                        <div className="space-x-2 font-mono">
                          <span className="text-neutral-900 font-bold">{formatCount(step.count)}</span>
                          <span className="text-neutral-500">({formatPercent(step.rate)})</span>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-neutral-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(2, Math.min(100, step.rate))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendation Status Distribution */}
            <div className="lg:col-span-5 bg-white p-6 border border-neutral-200 rounded-xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-neutral-700" />
                  <span>Distribuição de Resultados</span>
                </h3>
              </div>

              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 block">Tamanho Único Recomendado</span>
                    <span className="text-xs text-emerald-700 font-mono">Correspondência exata</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCount(summary.recommendationTypes.recommended)}
                  </span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-amber-900 block">Entre Dois Tamanhos</span>
                    <span className="text-xs text-amber-700 font-mono">Recomendação dupla</span>
                  </div>
                  <span className="text-xl font-bold text-amber-700">
                    {formatCount(summary.recommendationTypes.between_sizes)}
                  </span>
                </div>

                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-red-900 block">Não Encontrado</span>
                    <span className="text-xs text-red-700 font-mono">Fora de graduação</span>
                  </div>
                  <span className="text-xl font-bold text-red-700">
                    {formatCount(summary.recommendationTypes.not_found)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Evolution Table */}
          <div className="bg-white p-6 border border-neutral-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-700" />
                <span>Evolução Diária de Uso</span>
              </h3>
              <span className="text-[11px] text-neutral-400 font-mono">Fuso horário: America/Sao_Paulo</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Exibições</th>
                    <th className="py-2.5 px-3">Aberturas</th>
                    <th className="py-2.5 px-3">Inícios</th>
                    <th className="py-2.5 px-3">Conclusões</th>
                    <th className="py-2.5 px-3">Abandonos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {summary.dailyEvolution.length > 0 ? (
                    summary.dailyEvolution.map((day, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-medium text-neutral-900">{day.date}</td>
                        <td className="py-2.5 px-3">{formatCount(day.viewed)}</td>
                        <td className="py-2.5 px-3">{formatCount(day.opened)}</td>
                        <td className="py-2.5 px-3">{formatCount(day.started)}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold">{formatCount(day.completed)}</td>
                        <td className="py-2.5 px-3 text-amber-600">{formatCount(day.abandoned)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-neutral-400 font-sans text-xs">
                        Nenhum registro diário para o período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Categories / Types */}
          <div className="bg-white p-6 border border-neutral-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-700" />
                <span>Categorias e Tipos Mais Consultados</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Tipo de Peça</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Consultas Iniciadas</th>
                    <th className="py-2.5 px-3">Recomendações Concluídas</th>
                    <th className="py-2.5 px-3">Taxa de Sucesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {summary.topTypes.length > 0 ? (
                    summary.topTypes.map((t, idx) => {
                      const successRate = t.started > 0 ? Math.round((t.completed / t.started) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="py-2.5 px-3 font-semibold text-neutral-900">{t.typeName}</td>
                          <td className="py-2.5 px-3 text-neutral-500 uppercase text-[10px] tracking-wider">{t.category || 'Geral'}</td>
                          <td className="py-2.5 px-3 font-mono">{formatCount(t.started)}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">{formatCount(t.completed)}</td>
                          <td className="py-2.5 px-3 font-mono">{formatPercent(successRate)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-neutral-400 text-xs">
                        Nenhuma categoria ou tipo consultado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

