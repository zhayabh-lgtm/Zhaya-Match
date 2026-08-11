import { AnalyticsSummary, PeriodType } from '../types/zhaya';

export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return fallback;
  return num;
}

export function safePercent(num: number, denom: number): number {
  const safeNum = safeNumber(num);
  const safeDenom = safeNumber(denom);
  if (safeDenom <= 0) return 0;
  const result = Math.round((safeNum / safeDenom) * 1000) / 10;
  return safeNumber(result, 0);
}

export function formatCount(value: any): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return '0';
  return num.toLocaleString('pt-BR');
}

export function formatPercent(value: any): string {
  if (value === null || value === undefined) return '0%';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return '0%';
  const formatted = num.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `${formatted}%`;
}

export function formatRecommendationStatusLabel(status: string): string {
  if (!status || typeof status !== 'string') return 'Status Desconhecido';
  const s = status.toLowerCase().trim();
  if (s === 'recommended' || s === 'recomendado' || s === 'exact') return 'Recomendado (Tamanho Exato)';
  if (s === 'between_sizes' || s === 'between' || s === 'entre_tamanhos') return 'Entre Dois Tamanhos';
  if (s === 'not_found' || s === 'nao_encontrado' || s === 'out_of_range') return 'Fora da Grade / Não Encontrado';
  // Fallback legível para status dinâmicos desconhecidos
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEFAULT_FUNNEL_LABELS: Record<string, string> = {
  launcher_viewed: 'Visualizações do acionador',
  launcher_clicked: 'Cliques no acionador',
  widget_opened: 'Widget aberto',
  flow_started: 'Fluxo iniciado',
  measurements_started: 'Medições iniciadas',
  recommendation_processing_started: 'Cálculo solicitado',
  recommendation_result_viewed: 'Resultado visualizado',
  recommendation_generated: 'Recomendações',
};

export function normalizeAnalyticsSummary(raw: any, period: PeriodType = '7days'): AnalyticsSummary {
  if (!raw || typeof raw !== 'object') {
    return {
      period,
      startDate: new Date().toLocaleDateString('pt-BR'),
      endDate: new Date().toLocaleDateString('pt-BR'),
      totalViewed: 0,
      totalClicked: 0,
      totalOpened: 0,
      totalStarted: 0,
      totalTypeSelected: 0,
      totalMeasurementsStarted: 0,
      totalRecommended: 0,
      totalNotFound: 0,
      totalHelpOpened: 0,
      totalClosed: 0,
      uniqueVisitors: 0,
      uniqueSessions: 0,
      openRate: 0,
      startRate: 0,
      completionRate: 0,
      notFoundRate: 0,
      abandonmentRate: 0,
      recommendationTypes: {
        recommended: 0,
        between_sizes: 0,
        not_found: 0,
      },
      funnel: [
        { step: 'launcher_viewed', stage: 'launcher_viewed', label: 'Visualizações do acionador', count: 0, rate: 0, conversionRate: 0 },
        { step: 'launcher_clicked', stage: 'launcher_clicked', label: 'Cliques no acionador', count: 0, rate: 0, conversionRate: 0 },
        { step: 'widget_opened', stage: 'widget_opened', label: 'Widget aberto', count: 0, rate: 0, conversionRate: 0 },
        { step: 'flow_started', stage: 'flow_started', label: 'Fluxo iniciado', count: 0, rate: 0, conversionRate: 0 },
        { step: 'measurements_started', stage: 'measurements_started', label: 'Medições iniciadas', count: 0, rate: 0, conversionRate: 0 },
        { step: 'recommendation_processing_started', stage: 'recommendation_processing_started', label: 'Cálculo solicitado', count: 0, rate: 0, conversionRate: 0 },
        { step: 'recommendation_result_viewed', stage: 'recommendation_result_viewed', label: 'Resultado visualizado', count: 0, rate: 0, conversionRate: 0 },
      ],
      dailyEvolution: [],
      topTypes: [],
    };
  }

  // Totais
  const totalViewed = safeNumber(raw.totalViewed ?? raw.totalLauncherViewed ?? raw.viewed);
  const totalClicked = safeNumber(raw.totalClicked ?? raw.totalLauncherClicked ?? raw.clicked);
  const totalOpened = safeNumber(raw.totalOpened ?? raw.totalWidgetOpened ?? raw.opened);
  const totalStarted = safeNumber(raw.totalStarted ?? raw.totalFlowStarted ?? raw.started);
  const totalTypeSelected = safeNumber(raw.totalTypeSelected ?? raw.totalProductTypeSelected);
  const totalMeasurementsStarted = safeNumber(raw.totalMeasurementsStarted);

  const totalRecommended = safeNumber(
    raw.totalRecommended ??
      raw.totalRecommendedFound ??
      raw.recommendationTypes?.recommended ??
      raw.recommendationBreakdown?.recommended
  );

  const totalNotFound = safeNumber(
    raw.totalNotFound ??
      raw.recommendationTypes?.not_found ??
      raw.recommendationBreakdown?.notFound
  );

  const totalHelpOpened = safeNumber(raw.totalHelpOpened ?? raw.totalMeasurementHelpOpened ?? raw.helpOpened);
  const totalClosed = safeNumber(raw.totalClosed ?? raw.totalWidgetClosed ?? raw.closed);

  const uniqueVisitors = safeNumber(raw.uniqueVisitors);
  const uniqueSessions = safeNumber(raw.uniqueSessions);

  // Taxas
  let openRate = safeNumber(raw.openRate);
  if (openRate <= 1 && openRate > 0) openRate = Math.round(openRate * 100);
  else if (openRate === 0 && totalClicked > 0) openRate = safePercent(totalOpened, totalClicked);

  let startRate = safeNumber(raw.startRate);
  if (startRate <= 1 && startRate > 0) startRate = Math.round(startRate * 100);
  else if (startRate === 0 && totalOpened > 0) startRate = safePercent(totalStarted, totalOpened);

  let completionRate = safeNumber(raw.completionRate);
  if (completionRate <= 1 && completionRate > 0) completionRate = Math.round(completionRate * 100);
  else if (completionRate === 0 && totalStarted > 0) completionRate = safePercent(totalRecommended + totalNotFound, totalStarted);

  let notFoundRate = safeNumber(raw.notFoundRate);
  if (notFoundRate <= 1 && notFoundRate > 0) notFoundRate = Math.round(notFoundRate * 100);

  let abandonmentRate = safeNumber(raw.abandonmentRate);
  if (abandonmentRate <= 1 && abandonmentRate > 0) abandonmentRate = Math.round(abandonmentRate * 100);

  // Status de Recomendação (incluindo chaves conhecidas + chaves dinâmicas desconhecidas)
  const betweenSizes = safeNumber(
    raw.recommendationTypes?.between_sizes ??
      raw.recommendationTypes?.betweenSizes ??
      raw.recommendationBreakdown?.betweenSizes
  );

  const recommendationTypes: {
    recommended: number;
    between_sizes: number;
    not_found: number;
    [key: string]: number;
  } = {
    recommended: totalRecommended,
    between_sizes: betweenSizes,
    not_found: totalNotFound,
  };

  // Preserva outros status se retornados pelo backend
  if (raw.recommendationTypes && typeof raw.recommendationTypes === 'object') {
    Object.keys(raw.recommendationTypes).forEach((k) => {
      if (!['recommended', 'between_sizes', 'betweenSizes', 'not_found', 'notFound'].includes(k)) {
        recommendationTypes[k] = safeNumber(raw.recommendationTypes[k]);
      }
    });
  }

  // Funil de Conversão de 6 etapas
  const rawFunnel = Array.isArray(raw.funnel)
    ? raw.funnel
    : Array.isArray(raw.funnelStages)
    ? raw.funnelStages
    : [];

  const stageOrder = [
    'launcher_viewed',
    'launcher_clicked',
    'widget_opened',
    'flow_started',
    'measurements_started',
    'recommendation_processing_started',
    'recommendation_result_viewed',
  ];

  const funnelMap: Record<string, { count: number; rate: number }> = {};
  rawFunnel.forEach((item: any) => {
    const key = String(item.event || item.stage || item.step || '');
    if (key) {
      funnelMap[key] = {
        count: safeNumber(item.count),
        rate: safeNumber(item.conversionRate ?? item.rate ?? item.percentage),
      };
    }
  });

  const funnel = stageOrder.map((stageKey) => {
    const found = funnelMap[stageKey];
    let count = found ? found.count : 0;
    let rate = found ? found.rate : 0;

    // Fallbacks para contagens se não vier do mapa
    if (!found) {
      if (stageKey === 'launcher_viewed') count = totalViewed;
      if (stageKey === 'launcher_clicked') count = totalClicked;
      if (stageKey === 'widget_opened') count = totalOpened;
      if (stageKey === 'flow_started') count = totalStarted;
      if (stageKey === 'measurements_started') count = totalMeasurementsStarted;
      if (stageKey === 'recommendation_generated') count = totalRecommended;
    }

    const label = DEFAULT_FUNNEL_LABELS[stageKey] || stageKey;
    return {
      step: stageKey,
      stage: stageKey,
      event: stageKey,
      label,
      count,
      rate,
      conversionRate: rate,
    };
  });

  // Evolução Diária
  const rawDaily = Array.isArray(raw.dailySeries)
    ? raw.dailySeries
    : Array.isArray(raw.dailyEvolution)
    ? raw.dailyEvolution
    : Array.isArray(raw.dailyMetrics)
    ? raw.dailyMetrics
    : [];

  const dailyEvolution = rawDaily.map((item: any) => {
    const date = String(item.displayDate || item.date || item.fullDate || '');
    const fullDate = String(item.fullDate || item.date || '');
    return {
      date,
      displayDate: date,
      fullDate,
      visitors: safeNumber(item.visitors ?? item.uniqueVisitors),
      sessions: safeNumber(item.sessions ?? item.uniqueSessions),
      viewed: safeNumber(item.viewed ?? item.exibicoes ?? item.launcherViewed),
      opened: safeNumber(item.opened ?? item.aberturas ?? item.widgetOpened),
      started: safeNumber(item.started ?? item.inicios ?? item.flowStarted),
      completed: safeNumber(item.completed ?? item.calculos ?? item.recommendations),
      abandoned: safeNumber(item.abandoned ?? item.abandonos),
      recommendations: safeNumber(item.recommendations ?? item.completed ?? item.calculos),
      aberturas: safeNumber(item.opened ?? item.aberturas ?? item.widgetOpened),
      inicios: safeNumber(item.started ?? item.inicios ?? item.flowStarted),
      calculos: safeNumber(item.completed ?? item.calculos ?? item.recommendations),
    };
  });

  // Desempenho por Produtos / Tipos
  const rawTopTypes = Array.isArray(raw.recommendationsByProductType)
    ? raw.recommendationsByProductType
    : Array.isArray(raw.topTypes)
    ? raw.topTypes
    : Array.isArray(raw.topCategories)
    ? raw.topCategories
    : [];

  const topTypes = rawTopTypes.map((item: any) => {
    const typeName = String(
      item.productTypeName || item.typeName || item.name || 'Tipo de Produto'
    ).trim();
    const category = item.category ? String(item.category).trim() : 'Geral';
    const started = safeNumber(item.started ?? item.count ?? item.total);
    const completed = safeNumber(item.completed ?? item.recommended);
    const recommended = safeNumber(item.recommended ?? item.completed);
    const betweenSizes = safeNumber(item.betweenSizes);
    const notFound = safeNumber(item.notFound);

    return {
      typeId: item.productTypeId || item.typeId ? String(item.productTypeId || item.typeId) : undefined,
      typeName: typeName || 'Tipo de Produto',
      category: category || 'Geral',
      started,
      completed,
      recommended,
      betweenSizes,
      notFound,
    };
  });

  const rawFeedbackDetails = raw.feedbackDetails || {};
  const feedbackDetails = {
    totalResponses: safeNumber(rawFeedbackDetails.totalResponses),
    yesPercent: safeNumber(rawFeedbackDetails.yesPercent),
    noPercent: safeNumber(rawFeedbackDetails.noPercent),
    notSurePercent: safeNumber(rawFeedbackDetails.notSurePercent),
    averageEaseRating: safeNumber(rawFeedbackDetails.averageEaseRating),
    recentComments: Array.isArray(rawFeedbackDetails.recentComments)
      ? rawFeedbackDetails.recentComments.map((c: any) => ({
          id: c.id ? String(c.id) : undefined,
          comment: String(c.comment || '').trim(),
          productTypeId: c.productTypeId ? String(c.productTypeId) : undefined,
          productTypeName: c.productTypeName ? String(c.productTypeName) : undefined,
          recommendedSize: c.recommendedSize ? String(c.recommendedSize) : undefined,
          adequacyResponse: c.adequacyResponse ? String(c.adequacyResponse) : undefined,
          easeRating: c.easeRating ? safeNumber(c.easeRating) : undefined,
          submittedAt: String(c.submittedAt || c.created_at || ''),
        }))
      : [],
  };

  return {
    period: raw.period || period,
    startDate: String(raw.startDate || raw.startDateStr || ''),
    endDate: String(raw.endDate || raw.endDateStr || ''),
    totalViewed,
    totalClicked,
    totalOpened,
    totalStarted,
    totalTypeSelected,
    totalMeasurementsStarted,
    totalRecommended,
    totalNotFound,
    totalHelpOpened,
    totalClosed,
    uniqueVisitors,
    uniqueSessions,
    openRate,
    startRate,
    completionRate,
    notFoundRate,
    abandonmentRate,
    feedbackDetails,
    recommendationTypes,
    funnel,
    dailyEvolution,
    topTypes,
  };
}
