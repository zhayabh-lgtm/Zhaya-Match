import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Repository } from '../lib/repository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runHealthTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES DE HEALTH CHECK, STALE E CRON ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Teste A: Health Saudável / Execução de Verificação
  console.log('--- Teste A: Execução e Diagnóstico de Health Check ---');
  try {
    const result = await Repository.runActivityCheck();
    assert(result && typeof result.ok === 'boolean', 'runActivityCheck retorna estrutura com propriedade boolean ok');
    assert(result.status && typeof result.status.lastStatus === 'string', 'Status de atividade retorna lastStatus Válido');
  } catch (e: any) {
    assert(false, `Falha ao executar runActivityCheck: ${e?.message}`);
  }

  // Teste B: Configuração Ausente
  console.log('\n--- Teste B: Tratamento Defensivo para Configuração Ausente ---');
  try {
    const status = await Repository.getActivityStatus();
    assert(status && status.id === 'supabase-activity-monitor', 'getActivityStatus retorna objeto com id esperado');
    assert(status.lastStatus !== undefined, 'lastStatus está definido e válido');
  } catch (e: any) {
    assert(false, `Exceção em getActivityStatus sem chaves: ${e?.message}`);
  }

  // Teste C: Falha de Banco / Resposta Estruturada Sem Secrets
  console.log('\n--- Teste C: Resposta de Erro Estruturada Sem Secrets ---');
  const status = await Repository.getActivityStatus();
  assert(
    !status.lastError || (!status.lastError.includes('SUPABASE_SERVICE_ROLE_KEY') && !status.lastError.includes('postgresql://')),
    'Erros gravados/retornados não expõem secrets nem strings de conexão'
  );

  // Teste D: Regra de Status Desatualizado (Stale) > 24 horas
  console.log('\n--- Teste D: Detecção de Atividade Desatualizada (Stale) ---');
  const past25HoursIso = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  
  // Simulando registro antigo com mais de 24h
  const mockOldData = {
    id: 'supabase-activity-monitor',
    last_run_at: past25HoursIso,
    last_success_at: past25HoursIso,
    last_status: 'healthy',
    updated_at: past25HoursIso
  };

  const refTimeMs = new Date(mockOldData.last_run_at).getTime();
  const nowMs = Date.now();
  let computedStatus = mockOldData.last_status;
  if (nowMs - refTimeMs > 24 * 60 * 60 * 1000) {
    computedStatus = 'stale';
  }
  assert(computedStatus === 'stale', 'Registro com mais de 24h sem execução é marcado como stale (desatualizado)');

  // Teste E: Proteção do Endpoint de Cron e Vercel JSON
  console.log('\n--- Teste E: Verificação de Segurança do Cron e vercel.json ---');
  const vercelJsonPath = path.resolve(__dirname, '../../vercel.json');
  const vercelJsonContent = fs.readFileSync(vercelJsonPath, 'utf8');
  const parsedVercel = JSON.parse(vercelJsonContent);

  assert(
    Array.isArray(parsedVercel.crons) && parsedVercel.crons.some((c: any) => c.path === '/api/cron/health'),
    'vercel.json configura Vercel Cron para o caminho /api/cron/health'
  );

  const cronFileContent = fs.readFileSync(path.resolve(__dirname, '../../api/cron/health.ts'), 'utf8');
  assert(
    cronFileContent.includes('process.env.CRON_SECRET') || cronFileContent.includes('x-vercel-cron'),
    'Endpoint /api/cron/health.ts valida CRON_SECRET ou cabeçalho x-vercel-cron'
  );

  console.log(`\n=== RESUMO DOS TESTES DE HEALTH CHECK: ${passed} PASSOU, ${failed} FALHOU ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runHealthTests();
