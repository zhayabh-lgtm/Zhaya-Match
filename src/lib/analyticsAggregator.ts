import type { AnalyticsSummary, PeriodType } from '../types/zhaya.js';

export interface RawAnalyticsRecord {
  event_id?: string;
  event_name?: string;
  visitor_id?: string | null;
  session_id?: string | null;
  product_type_id?: string | null;
  product_type_name?: string | null;
  product_category?: string | null;
  recommendation_status?: string | null;
  source_domain?: string | null;
  page_path?: string | null;
  device_type?: string | null;
  config_version?: number | null;
  metadata?: Record<string, any> | null;
  occurred_at?: string | null;
  created_at?: string | null;
}

export function safeDivRate(num: number, denom: number): number {
  if (!denom || denom <= 0 || !Number.isFinite(denom)) return 0;
  if (!num || num <= 0 || !Number.isFinite(num)) return 0;
  const rate = (num / denom) * 100;
  if (!Number.isFinite(rate) || Number.isNaN(rate)) return 0;
  return Math.round(rate * 10) / 10;
}

export function computeAnalyticsSummary(
  rawRecords: RawAnalyticsRecord[],
  period: PeriodType = '7days',
  startDate: Date,
  endDate: Date
): AnalyticsSummary & Record<string, any> {
  const records = (Array.isArray(rawRecords) ? rawRecords : []).filter(
    (r) => !r.metadata || (r.metadata.preview !== true && r.metadata.is_preview !== true)
  );

  // Counts por evento
  const totalLauncherViewed = records.filter((r) => r.event_name === 'launcher_viewed').length;
  const totalLauncherClicked = records.filter((r) => r.event_name === 'launcher_clicked').length;
  const totalWidgetOpened = records.filter((r) => r.event_name === 'widget_opened').length;
  const totalFlowStarted = records.filter((r) => r.event_name === 'flow_started').length;
  const totalProductTypeSelected = records.filter((r) => r.event_name === 'product_type_selected').length;
  const totalMeasurementsStarted = records.filter((r) => r.event_name === 'measurements_started').length;
  const totalRecommendationGenerated = records.filter((r) => r.event_name === 'recommendation_generated').length;
  const totalRecommendationNotFound = records.filter((r) => r.event_name === 'recommendation_not_found').length;
  const totalMeasurementHelpOpened = records.filter((r) => r.event_name === 'measurement_help_opened').length;
  const totalWidgetClosed = records.filter((r) => r.event_name === 'widget_closed').length;

  const totalCalculations = totalRecommendationGenerated + totalRecommendationNotFound;

  // Visitantes e Sessões
  const visitorIdSet = new Set<string>();
  const sessionIdSet = new Set<string>();
  records.forEach((r) => {
    if (r.visitor_id && typeof r.visitor_id === 'string' && r.visitor_id.trim()) {
      visitorIdSet.add(r.visitor_id.trim());
    }
    if (r.session_id && typeof r.session_id === 'string' && r.session_id.trim()) {
      sessionIdSet.add(r.session_id.trim());
    }
  });

  const uniqueVisitors = visitorIdSet.size > 0 ? visitorIdSet.size : sessionIdSet.size;
  const uniqueSessions = sessionIdSet.size;

  // Taxas diretas
  const openRate = safeDivRate(totalWidgetOpened, totalLauncherClicked);
  const startRate = safeDivRate(totalFlowStarted, totalWidgetOpened);
  const completionRate = safeDivRate(totalCalculations, totalFlowStarted);
  const notFoundRate = safeDivRate(totalRecommendationNotFound, totalCalculations);

  // Abandono por sessão
  const sessionsWithFlowStarted = new Set<string>();
  const sessionsWithCalculation = new Set<string>();

  records.forEach((r) => {
    if (r.session_id && typeof r.session_id === 'string') {
      const sid = r.session_id.trim();
      if (r.event_name === 'flow_started') {
        sessionsWithFlowStarted.add(sid);
      }
      if (
        r.event_name === 'recommendation_generated' ||
        r.event_name === 'recommendation_not_found'
      ) {
        sessionsWithCalculation.add(sid);
      }
    }
  });

  let abandonmentCount = 0;
  sessionsWithFlowStarted.forEach((sid) => {
    if (!sessionsWithCalculation.has(sid)) {
      abandonmentCount++;
    }
  });

  const abandonmentRate = safeDivRate(abandonmentCount, sessionsWithFlowStarted.size);

  // Recomendações por Status
  let exactCount = 0;
  let betweenSizesCount = 0;
  let notFoundCount = totalRecommendationNotFound;

  records
    .filter((r) => r.event_name === 'recommendation_generated')
    .forEach((r) => {
      const status = (r.recommendation_status || '').toLowerCase();
      if (status === 'between_sizes') {
        betweenSizesCount++;
      } else if (status === 'not_found') {
        notFoundCount++;
      } else {
        exactCount++;
      }
    });

  const recommendationTypes = {
    recommended: exactCount,
    between_sizes: betweenSizesCount,
    not_found: notFoundCount,
  };

  const recommendationBreakdown = {
    recommended: exactCount,
    betweenSizes: betweenSizesCount,
    notFound: notFoundCount,
  };

  // Recomendações agregadas por Tipo de Produto
  const productTypeAggMap: Record<
    string,
    {
      productTypeId?: string;
      productTypeName: string;
      category?: string;
      recommended: number;
      betweenSizes: number;
      notFound: number;
      total: number;
    }
  > = {};

  records
    .filter(
      (r) =>
        r.event_name === 'recommendation_generated' ||
        r.event_name === 'recommendation_not_found' ||
        r.event_name === 'product_type_selected'
    )
    .forEach((r) => {
      const typeName = (r.product_type_name || 'Geral').trim();
      const typeId = r.product_type_id || undefined;
      const key = typeId || typeName;

      if (!productTypeAggMap[key]) {
        productTypeAggMap[key] = {
          productTypeId: typeId,
          productTypeName: typeName,
          category: r.product_category || undefined,
          recommended: 0,
          betweenSizes: 0,
          notFound: 0,
          total: 0,
        };
      }

      if (r.event_name === 'recommendation_generated') {
        const st = (r.recommendation_status || '').toLowerCase();
        if (st === 'between_sizes') productTypeAggMap[key].betweenSizes++;
        else if (st === 'not_found') productTypeAggMap[key].notFound++;
        else productTypeAggMap[key].recommended++;
        productTypeAggMap[key].total++;
      } else if (r.event_name === 'recommendation_not_found') {
        productTypeAggMap[key].notFound++;
        productTypeAggMap[key].total++;
      }
    });

  const recommendationsByProductType = Object.values(productTypeAggMap);

  // Categorias/Tipos mais escolhidos
  const categoryCounts: Record<string, { typeId?: string; name: string; category?: string; count: number }> = {};
  records
    .filter((r) => r.event_name === 'product_type_selected')
    .forEach((r) => {
      const name = (r.product_type_name || 'Geral').trim();
      const typeId = r.product_type_id || undefined;
      const key = typeId || name;

      if (!categoryCounts[key]) {
        categoryCounts[key] = {
          typeId,
          name,
          category: r.product_category || undefined,
          count: 0,
        };
      }
      categoryCounts[key].count++;
    });

  const totalCategorySelections = Object.values(categoryCounts).reduce((acc, c) => acc + c.count, 0);
  const topCategories = Object.values(categoryCounts)
    .sort((a, b) => b.count - a.count)
    .map((cat) => ({
      typeId: cat.typeId,
      name: cat.name,
      category: cat.category,
      count: cat.count,
      percentage: safeDivRate(cat.count, totalCategorySelections),
    }));

  const topTypes = topCategories.map((cat) => ({
    typeId: cat.typeId,
    typeName: cat.name,
    category: cat.category,
    started: cat.count,
    completed: Math.round(cat.count * (completionRate / 100)),
  }));

  // Série Diária (Construção contínua de datas entre startDate e endDate)
  const dailyRecordsMap: Record<
    string,
    {
      visitorsSet: Set<string>;
      sessionsSet: Set<string>;
      launcherViewed: number;
      launcherClicked: number;
      widgetOpened: number;
      flowStarted: number;
      recommendations: number;
    }
  > = {};

  const curr = new Date(startDate);
  curr.setHours(0, 0, 0, 0);

  const finalDate = new Date(endDate);
  finalDate.setHours(23, 59, 59, 999);

  while (curr.getTime() <= finalDate.getTime()) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateIsoStr = `${yyyy}-${mm}-${dd}`;

    dailyRecordsMap[dateIsoStr] = {
      visitorsSet: new Set<string>(),
      sessionsSet: new Set<string>(),
      launcherViewed: 0,
      launcherClicked: 0,
      widgetOpened: 0,
      flowStarted: 0,
      recommendations: 0,
    };

    curr.setDate(curr.getDate() + 1);
  }

  records.forEach((r) => {
    const occurred = r.occurred_at || r.created_at;
    if (!occurred) return;

    const dt = new Date(occurred);
    if (isNaN(dt.getTime())) return;

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const dateIsoStr = `${yyyy}-${mm}-${dd}`;

    if (!dailyRecordsMap[dateIsoStr]) {
      dailyRecordsMap[dateIsoStr] = {
        visitorsSet: new Set<string>(),
        sessionsSet: new Set<string>(),
        launcherViewed: 0,
        launcherClicked: 0,
        widgetOpened: 0,
        flowStarted: 0,
        recommendations: 0,
      };
    }

    const dayObj = dailyRecordsMap[dateIsoStr];
    if (r.visitor_id && r.visitor_id.trim()) dayObj.visitorsSet.add(r.visitor_id.trim());
    if (r.session_id && r.session_id.trim()) dayObj.sessionsSet.add(r.session_id.trim());

    if (r.event_name === 'launcher_viewed') dayObj.launcherViewed++;
    else if (r.event_name === 'launcher_clicked') dayObj.launcherClicked++;
    else if (r.event_name === 'widget_opened') dayObj.widgetOpened++;
    else if (r.event_name === 'flow_started') dayObj.flowStarted++;
    else if (
      r.event_name === 'recommendation_generated' ||
      r.event_name === 'recommendation_not_found'
    ) {
      dayObj.recommendations++;
    }
  });

  const dailySeries = Object.entries(dailyRecordsMap).map(([dateStr, obj]) => {
    const parts = dateStr.split('-');
    const ddmm = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;

    return {
      date: dateStr,
      displayDate: ddmm,
      fullDate: dateStr,
      visitors: obj.visitorsSet.size,
      sessions: obj.sessionsSet.size,
      widgetOpened: obj.widgetOpened,
      recommendations: obj.recommendations,
      // Suporte retrô a componentes UI existentes
      viewed: obj.launcherClicked || obj.launcherViewed,
      opened: obj.widgetOpened,
      started: obj.flowStarted,
      completed: obj.recommendations,
      abandoned: 0,
      aberturas: obj.widgetOpened,
      inicios: obj.flowStarted,
      calculos: obj.recommendations,
    };
  });

  // Funil de Conversão (6 etapas em sequência relativa)
  // 1. launcher_viewed -> 2. launcher_clicked -> 3. widget_opened -> 4. flow_started -> 5. measurements_started -> 6. recommendation_generated
  const funnel = [
    {
      event: 'launcher_viewed',
      stage: 'launcher_viewed',
      step: 'launcher_viewed',
      label: 'Visualização do Botão',
      count: totalLauncherViewed,
      conversionRate: totalLauncherViewed > 0 ? 100 : 0,
      rate: totalLauncherViewed > 0 ? 100 : 0,
    },
    {
      event: 'launcher_clicked',
      stage: 'launcher_clicked',
      step: 'launcher_clicked',
      label: 'Clique no Botão',
      count: totalLauncherClicked,
      conversionRate: safeDivRate(totalLauncherClicked, totalLauncherViewed),
      rate: safeDivRate(totalLauncherClicked, totalLauncherViewed),
    },
    {
      event: 'widget_opened',
      stage: 'widget_opened',
      step: 'widget_opened',
      label: 'Widget Aberto',
      count: totalWidgetOpened,
      conversionRate: safeDivRate(totalWidgetOpened, totalLauncherClicked),
      rate: safeDivRate(totalWidgetOpened, totalLauncherClicked),
    },
    {
      event: 'flow_started',
      stage: 'flow_started',
      step: 'flow_started',
      label: 'Fluxo Iniciado',
      count: totalFlowStarted,
      conversionRate: safeDivRate(totalFlowStarted, totalWidgetOpened),
      rate: safeDivRate(totalFlowStarted, totalWidgetOpened),
    },
    {
      event: 'measurements_started',
      stage: 'measurements_started',
      step: 'measurements_started',
      label: 'Medidas Iniciadas',
      count: totalMeasurementsStarted,
      conversionRate: safeDivRate(totalMeasurementsStarted, totalFlowStarted),
      rate: safeDivRate(totalMeasurementsStarted, totalFlowStarted),
    },
    {
      event: 'recommendation_generated',
      stage: 'recommendation_generated',
      step: 'recommendation_generated',
      label: 'Recomendação Gerada',
      count: totalRecommendationGenerated,
      conversionRate: safeDivRate(totalRecommendationGenerated, totalMeasurementsStarted),
      rate: safeDivRate(totalRecommendationGenerated, totalMeasurementsStarted),
    },
  ];

  const startDateFormatted = startDate.toLocaleDateString('pt-BR');
  const endDateFormatted = endDate.toLocaleDateString('pt-BR');

  return {
    period,
    startDate: startDateFormatted,
    endDate: endDateFormatted,
    startDateStr: startDateFormatted,
    endDateStr: endDateFormatted,
    totalRecords: records.length,
    totalEvents: records.length,
    uniqueVisitors,
    uniqueSessions,
    totalViewed: totalLauncherViewed,
    totalClicked: totalLauncherClicked,
    totalLauncherClicked,
    totalWidgetOpened,
    totalOpened: totalWidgetOpened,
    totalFlowStarted,
    totalStarted: totalFlowStarted,
    totalProductTypeSelected,
    totalTypeSelected: totalProductTypeSelected,
    totalMeasurementsStarted,
    totalRecommendationGenerated,
    totalRecommendationNotFound,
    totalCalculations,
    totalRecommendedFound: exactCount,
    totalRecommended: exactCount,
    totalNotFound: notFoundCount,
    totalHelpOpened: totalMeasurementHelpOpened,
    totalClosed: totalWidgetClosed,
    openRate,
    startRate,
    completionRate,
    notFoundRate,
    abandonmentCount,
    abandonmentRate,
    recommendationTypes,
    recommendationBreakdown,
    recommendationsByProductType,
    dailySeries,
    dailyEvolution: dailySeries,
    dailyMetrics: dailySeries,
    funnel,
    funnelStages: funnel,
    topCategories,
    topTypes,
  };
}
