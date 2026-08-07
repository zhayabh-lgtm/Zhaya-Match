import fs from 'fs';
import path from 'path';
import { computeAnalyticsSummary, RawAnalyticsRecord } from '../lib/analyticsAggregator';
import {
  normalizeAnalyticsSummary,
  formatCount,
  formatPercent,
  formatRecommendationStatusLabel,
  safeNumber,
  safePercent,
} from '../lib/analyticsNormalizer';

function runAnalyticsArchitectureTest() {
  console.log('[Analytics Test] Checking analytics ingestion architecture integrity...');

  // 1. Verify official endpoint file exists
  const apiEndpointPath = path.resolve(process.cwd(), 'api/public/analytics.ts');
  if (!fs.existsSync(apiEndpointPath)) {
    throw new Error('[Test Failure] Endpoint file api/public/analytics.ts does not exist!');
  }

  const endpointCode = fs.readFileSync(apiEndpointPath, 'utf-8');

  // 2. Ensure endpoint references SUPABASE_SERVICE_ROLE_KEY
  if (!endpointCode.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('[Test Failure] api/public/analytics.ts must reference SUPABASE_SERVICE_ROLE_KEY!');
  }

  // 3. Ensure endpoint does NOT reference VITE_SUPABASE_SERVICE_ROLE_KEY
  if (endpointCode.includes('VITE_SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('[Test Failure] api/public/analytics.ts MUST NOT reference VITE_SUPABASE_SERVICE_ROLE_KEY!');
  }

  // 4. Check definitive migration file
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260807000000_secure_analytics_rls.sql');
  if (!fs.existsSync(migrationPath)) {
    throw new Error('[Test Failure] Migration file 20260807000000_secure_analytics_rls.sql does not exist!');
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // 5. Ensure migration drops public insert policy and does not grant public insert
  if (!migrationSql.includes('DROP POLICY IF EXISTS "Allow insert for analytics"')) {
    throw new Error('[Test Failure] Definitive migration must drop "Allow insert for analytics" policy!');
  }

  if (migrationSql.toUpperCase().includes('WITH CHECK (TRUE)') && migrationSql.toUpperCase().includes('FOR INSERT TO ANON')) {
    throw new Error('[Test Failure] Definitive migration MUST NOT allow public insert for anon!');
  }

  console.log('[Analytics Test Success] Analytics ingestion architecture verified cleanly.');
}

function runAnalyticsAggregationsTest() {
  console.log('[Analytics Aggregations Test] Running unit tests for analytics aggregations...');

  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const endDate = new Date('2026-08-07T23:59:59.999Z');

  // A. Dataset Vazio
  const emptySummary = computeAnalyticsSummary([], '7days', startDate, endDate);
  if (emptySummary.totalEvents !== 0) throw new Error('A. Expected totalEvents === 0 for empty dataset');
  if (emptySummary.uniqueVisitors !== 0) throw new Error('A. Expected uniqueVisitors === 0');
  if (emptySummary.uniqueSessions !== 0) throw new Error('A. Expected uniqueSessions === 0');
  if (emptySummary.openRate !== 0) throw new Error('A. Expected openRate === 0');
  if (emptySummary.completionRate !== 0) throw new Error('A. Expected completionRate === 0');
  if (emptySummary.abandonmentRate !== 0) throw new Error('A. Expected abandonmentRate === 0');
  if (!Array.isArray(emptySummary.funnel) || emptySummary.funnel.length !== 6) {
    throw new Error('A. Funnel must contain 6 stages even on empty dataset');
  }
  if (emptySummary.funnel[0].conversionRate !== 0) {
    throw new Error('A. Funnel conversion rate must be 0 for empty dataset');
  }
  console.log('✓ A. Dataset vazio verificado com sucesso.');

  // B. Funil Completo
  const funnelRecords: RawAnalyticsRecord[] = [];
  // 100 launcher_viewed
  for (let i = 0; i < 100; i++) funnelRecords.push({ event_name: 'launcher_viewed', occurred_at: '2026-08-02T10:00:00Z' });
  // 80 launcher_clicked
  for (let i = 0; i < 80; i++) funnelRecords.push({ event_name: 'launcher_clicked', occurred_at: '2026-08-02T10:01:00Z' });
  // 60 widget_opened
  for (let i = 0; i < 60; i++) funnelRecords.push({ event_name: 'widget_opened', occurred_at: '2026-08-02T10:02:00Z' });
  // 40 flow_started
  for (let i = 0; i < 40; i++) funnelRecords.push({ event_name: 'flow_started', occurred_at: '2026-08-02T10:03:00Z' });
  // 30 measurements_started
  for (let i = 0; i < 30; i++) funnelRecords.push({ event_name: 'measurements_started', occurred_at: '2026-08-02T10:04:00Z' });
  // 20 recommendation_generated
  for (let i = 0; i < 20; i++) funnelRecords.push({ event_name: 'recommendation_generated', occurred_at: '2026-08-02T10:05:00Z' });

  const funnelSummary = computeAnalyticsSummary(funnelRecords, '7days', startDate, endDate);
  const f = funnelSummary.funnel;
  if (f[0].count !== 100 || f[0].conversionRate !== 100) throw new Error('B. Stage 1 calculation error');
  if (f[1].count !== 80 || f[1].conversionRate !== 80) throw new Error('B. Stage 2 conversion rate should be 80%');
  if (f[2].count !== 60 || f[2].conversionRate !== 75) throw new Error('B. Stage 3 conversion rate should be 75%');
  if (f[3].count !== 40 || f[3].conversionRate !== 66.7) throw new Error('B. Stage 4 conversion rate should be 66.7%');
  if (f[4].count !== 30 || f[4].conversionRate !== 75) throw new Error('B. Stage 5 conversion rate should be 75%');
  if (f[5].count !== 20 || f[5].conversionRate !== 66.7) throw new Error('B. Stage 6 conversion rate should be 66.7%');
  console.log('✓ B. Funil completo verificado com sucesso.');

  // C. Abandono
  const abandonmentRecords: RawAnalyticsRecord[] = [
    { event_name: 'flow_started', session_id: 's1', occurred_at: '2026-08-03T10:00:00Z' },
    { event_name: 'flow_started', session_id: 's2', occurred_at: '2026-08-03T10:00:00Z' },
    { event_name: 'flow_started', session_id: 's3', occurred_at: '2026-08-03T10:00:00Z' },
    { event_name: 'flow_started', session_id: 's4', occurred_at: '2026-08-03T10:00:00Z' },
    { event_name: 'flow_started', session_id: 's5', occurred_at: '2026-08-03T10:00:00Z' },
    { event_name: 'recommendation_generated', session_id: 's1', occurred_at: '2026-08-03T10:05:00Z' },
    { event_name: 'recommendation_generated', session_id: 's2', occurred_at: '2026-08-03T10:05:00Z' },
  ];
  const ambSummary = computeAnalyticsSummary(abandonmentRecords, '7days', startDate, endDate);
  if (ambSummary.abandonmentCount !== 3) throw new Error('C. Expected abandonmentCount === 3');
  if (ambSummary.abandonmentRate !== 60) throw new Error('C. Expected abandonmentRate === 60%');
  console.log('✓ C. Abandono verificado com sucesso.');

  // D. Visitantes e Sessões
  const sessionRecords: RawAnalyticsRecord[] = [
    { visitor_id: 'v1', session_id: 's1', occurred_at: '2026-08-04T10:00:00Z' },
    { visitor_id: 'v1', session_id: 's2', occurred_at: '2026-08-04T11:00:00Z' },
    { visitor_id: 'v1', session_id: 's3', occurred_at: '2026-08-04T12:00:00Z' },
    { visitor_id: 'v2', session_id: 's4', occurred_at: '2026-08-04T13:00:00Z' },
  ];
  const sessSummary = computeAnalyticsSummary(sessionRecords, '7days', startDate, endDate);
  if (sessSummary.uniqueVisitors !== 2) throw new Error('D. Expected 2 unique visitors');
  if (sessSummary.uniqueSessions !== 4) throw new Error('D. Expected 4 unique sessions');
  console.log('✓ D. Visitantes e sessões únicos verificados com sucesso.');

  // E. Status de Recomendação
  const statusRecords: RawAnalyticsRecord[] = [
    { event_name: 'recommendation_generated', recommendation_status: 'recommended', product_type_name: 'Calçado', occurred_at: '2026-08-05T10:00:00Z' },
    { event_name: 'recommendation_generated', recommendation_status: 'recommended', product_type_name: 'Calçado', occurred_at: '2026-08-05T10:01:00Z' },
    { event_name: 'recommendation_generated', recommendation_status: 'between_sizes', product_type_name: 'Calçado', occurred_at: '2026-08-05T10:02:00Z' },
    { event_name: 'recommendation_not_found', recommendation_status: 'not_found', product_type_name: 'Calçado', occurred_at: '2026-08-05T10:03:00Z' },
  ];
  const stSummary = computeAnalyticsSummary(statusRecords, '7days', startDate, endDate);
  if (stSummary.recommendationTypes.recommended !== 2) throw new Error('E. Expected 2 recommended');
  if (stSummary.recommendationTypes.between_sizes !== 1) throw new Error('E. Expected 1 between_sizes');
  if (stSummary.recommendationTypes.not_found !== 1) throw new Error('E. Expected 1 not_found');
  console.log('✓ E. Status de recomendação verificados com sucesso.');

  console.log('[Analytics Aggregations Test Success] Todos os testes unitários de analytics passaram perfeitamente.');
}

function runAnalyticsNormalizerAndUITests() {
  console.log('[Analytics UI & Normalizer Test] Testing defensive normalization, formatters and status fallback...');

  // A. Dados completos
  const completeRaw = {
    totalViewed: 500,
    totalOpened: 200,
    totalStarted: 150,
    totalRecommended: 100,
    totalNotFound: 10,
    uniqueVisitors: 300,
    uniqueSessions: 400,
    openRate: 40,
    completionRate: 66.7,
    recommendationTypes: { recommended: 100, between_sizes: 20, not_found: 10 },
    funnel: [
      { step: 'launcher_viewed', count: 500, rate: 100 },
      { step: 'widget_opened', count: 200, rate: 40 },
      { step: 'recommendation_generated', count: 100, rate: 50 },
    ],
  };
  const normComplete = normalizeAnalyticsSummary(completeRaw, '7days');
  if (normComplete.totalViewed !== 500) throw new Error('UI Test A: totalViewed mismatch');
  if (normComplete.totalOpened !== 200) throw new Error('UI Test A: totalOpened mismatch');
  if (normComplete.totalRecommended !== 100) throw new Error('UI Test A: totalRecommended mismatch');
  if (normComplete.funnel.length !== 6) throw new Error('UI Test A: funnel must contain 6 stages');
  console.log('✓ UI Test A: Dados completos normalizados com sucesso.');

  // B. Dataset vazio
  const emptyNorm = normalizeAnalyticsSummary({}, '30days');
  if (emptyNorm.totalViewed !== 0 || emptyNorm.totalOpened !== 0 || emptyNorm.uniqueVisitors !== 0) {
    throw new Error('UI Test B: Empty dataset must normalize all metrics to 0');
  }
  if (formatCount(emptyNorm.totalViewed) !== '0') throw new Error('UI Test B: formatCount(0) should be "0"');
  if (formatPercent(emptyNorm.openRate) !== '0%') throw new Error('UI Test B: formatPercent(0) should be "0%"');
  console.log('✓ UI Test B: Dataset vazio normalizado com zeros sem erros.');

  // C. Valores inesperados (null, undefined, strings numéricas, NaN, Infinity)
  const dirtyRaw = {
    totalViewed: '1500',
    totalOpened: null,
    totalStarted: undefined,
    totalRecommended: 'invalid_number',
    openRate: Infinity,
    completionRate: NaN,
  };
  const normDirty = normalizeAnalyticsSummary(dirtyRaw, '7days');
  if (normDirty.totalViewed !== 1500) throw new Error('UI Test C: String "1500" should convert to 1500');
  if (normDirty.totalOpened !== 0) throw new Error('UI Test C: null should convert to 0');
  if (normDirty.totalStarted !== 0) throw new Error('UI Test C: undefined should convert to 0');
  if (normDirty.totalRecommended !== 0) throw new Error('UI Test C: "invalid_number" should convert to 0');
  if (formatCount(null) !== '0' || formatCount(undefined) !== '0' || formatCount(NaN) !== '0') {
    throw new Error('UI Test C: formatCount failed on invalid values');
  }
  if (formatPercent(null) !== '0%' || formatPercent(NaN) !== '0%' || formatPercent(Infinity) !== '0%') {
    throw new Error('UI Test C: formatPercent failed on invalid values');
  }
  console.log('✓ UI Test C: Valores inesperados tratados defensivamente sem NaN/Infinity.');

  // D. Status de Recomendação Desconhecido
  const labelKnown = formatRecommendationStatusLabel('recommended');
  if (!labelKnown.includes('Recomendado')) throw new Error('UI Test D: Label for recommended incorrect');

  const labelUnknown = formatRecommendationStatusLabel('custom_promotion_fit');
  if (labelUnknown !== 'Custom Promotion Fit') {
    throw new Error(`UI Test D: Label for unknown status should fallback legibly, got: "${labelUnknown}"`);
  }
  console.log('✓ UI Test D: Status de recomendação desconhecido renderiza fallback legível.');

  console.log('[Analytics UI & Normalizer Test Success] Todos os testes da UI e normalizador passaram.');
}

async function runAdminAnalyticsServerSideTest() {
  console.log('[Admin Analytics Server-Side Test] Checking api/admin/analytics.ts server-side architecture and error responses...');

  const adminAnalyticsPath = path.resolve(process.cwd(), 'api/admin/analytics.ts');
  if (!fs.existsSync(adminAnalyticsPath)) {
    throw new Error('[Test Failure] api/admin/analytics.ts does not exist!');
  }

  const code = fs.readFileSync(adminAnalyticsPath, 'utf-8');

  // 1. Must use SUPABASE_SERVICE_ROLE_KEY
  if (!code.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    throw new Error('[Test Failure] api/admin/analytics.ts must reference SUPABASE_SERVICE_ROLE_KEY!');
  }

  // 2. Must NOT import Repository for analytics queries
  if (code.includes('Repository.')) {
    throw new Error('[Test Failure] api/admin/analytics.ts MUST NOT depend on Repository.getAnalyticsSummary!');
  }

  // 3. Must NOT import src/lib/supabase.ts
  if (code.includes('../src/lib/supabase') || code.includes('../../src/lib/supabase')) {
    throw new Error('[Test Failure] api/admin/analytics.ts MUST NOT import client-side src/lib/supabase!');
  }

  // 4. Must reuse computeAnalyticsSummary
  if (!code.includes('computeAnalyticsSummary')) {
    throw new Error('[Test Failure] api/admin/analytics.ts MUST reuse computeAnalyticsSummary from analyticsAggregator!');
  }

  // 5. Functional test of handler response when config is missing
  const adminHandlerModule = await import('../../api/admin/analytics');
  const handler = adminHandlerModule.default;

  let statusCode = 0;
  let jsonResponse: any = null;

  const mockReq = {
    method: 'GET',
    headers: {},
    query: { period: '7days' },
  };

  const mockRes = {
    setHeader: () => {},
    status: (code: number) => {
      statusCode = code;
      return mockRes;
    },
    json: (data: any) => {
      jsonResponse = data;
      return mockRes;
    },
    end: () => mockRes,
  };

  // Ensure environment variables are clear for config missing test
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    await handler(mockReq, mockRes);

    if (statusCode !== 503) {
      throw new Error(`[Test Failure] Expected status 503 for missing configuration, got ${statusCode}`);
    }

    if (jsonResponse?.error !== 'CONFIG_ERROR') {
      throw new Error(`[Test Failure] Expected error "CONFIG_ERROR", got ${JSON.stringify(jsonResponse)}`);
    }

    console.log('✓ Missing config explicitly returns HTTP 503 CONFIG_ERROR as required.');
  } finally {
    // Restore env
    if (savedUrl) process.env.SUPABASE_URL = savedUrl;
    if (savedKey) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  }

  console.log('[Admin Analytics Server-Side Test Success] Endpoint server-side behavior verified cleanly.');
}

runAnalyticsArchitectureTest();
runAnalyticsAggregationsTest();
runAnalyticsNormalizerAndUITests();
await runAdminAnalyticsServerSideTest();

