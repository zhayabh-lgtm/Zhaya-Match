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
  const result = Math.round((safeNum / safeDenom) * 100);
  return safeNumber(result, 0);
}

export function formatCount(value: any): string {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return '—';
  return num.toLocaleString('pt-BR');
}

export function formatPercent(value: any): string {
  const num = safeNumber(value);
  return `${Math.round(num)}%`;
}

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
      funnel: [],
      dailyEvolution: [],
      topTypes: [],
    };
  }

  // Extração segura de totais
  const totalViewed = safeNumber(raw.totalViewed ?? raw.totalLauncherClicked ?? raw.viewed);
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

  const totalHelpOpened = safeNumber(raw.totalHelpOpened ?? raw.helpOpened);
  const totalClosed = safeNumber(raw.totalClosed ?? raw.closed);

  const uniqueVisitors = safeNumber(raw.uniqueVisitors);
  const uniqueSessions = safeNumber(raw.uniqueSessions);

  // Taxas percentuais seguras (0 a 100)
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
  else if (notFoundRate === 0 && (totalRecommended + totalNotFound) > 0) notFoundRate = safePercent(totalNotFound, totalRecommended + totalNotFound);

  let abandonmentRate = safeNumber(raw.abandonmentRate);
  if (abandonmentRate <= 1 && abandonmentRate > 0) abandonmentRate = Math.round(abandonmentRate * 100);

  // Tipos de Recomendação
  const betweenSizes = safeNumber(
    raw.recommendationTypes?.between_sizes ??
    raw.recommendationTypes?.betweenSizes ??
    raw.recommendationBreakdown?.betweenSizes
  );

  const recommendationTypes = {
    recommended: totalRecommended,
    between_sizes: betweenSizes,
    not_found: totalNotFound,
  };

  // Funil de conversão
  const rawFunnel = Array.isArray(raw.funnel) ? raw.funnel : (Array.isArray(raw.funnelStages) ? raw.funnelStages : []);
  const funnel = rawFunnel.map((item: any) => ({
    step: String(item.step || item.stage || item.label || 'Etapa'),
    label: String(item.label || item.step || item.stage || 'Etapa'),
    count: safeNumber(item.count),
    rate: safeNumber(item.rate ?? item.percentage),
  }));

  // Evolução Diária
  const rawDaily = Array.isArray(raw.dailyEvolution) ? raw.dailyEvolution : (Array.isArray(raw.dailyMetrics) ? raw.dailyMetrics : []);
  const dailyEvolution = rawDaily.map((item: any) => ({
    date: String(item.date || item.fullDate || ''),
    viewed: safeNumber(item.viewed ?? item.exibicoes),
    opened: safeNumber(item.opened ?? item.aberturas),
    started: safeNumber(item.started ?? item.inicios),
    completed: safeNumber(item.completed ?? item.calculos),
    abandoned: safeNumber(item.abandoned ?? item.abandonos),
  }));

  // Top Tipos
  const rawTopTypes = Array.isArray(raw.topTypes) ? raw.topTypes : (Array.isArray(raw.topCategories) ? raw.topCategories : []);
  const topTypes = rawTopTypes.map((item: any) => ({
    typeId: item.typeId ? String(item.typeId) : undefined,
    typeName: String(item.typeName || item.name || 'Geral'),
    category: item.category ? String(item.category) : undefined,
    started: safeNumber(item.started ?? item.count),
    completed: safeNumber(item.completed ?? item.percentage),
  }));

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
    recommendationTypes,
    funnel,
    dailyEvolution,
    topTypes,
  };
}
