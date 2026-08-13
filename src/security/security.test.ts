import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * ZHAYA MATCH - REGRESSION SUITE DE SEGURANÇA, RLS E ENDPOINTS ADMIN
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runSecurityTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES DE SEGURANÇA E REGRESSÃO ===\n');
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

  const projectRoot = path.resolve(__dirname, '../../');

  // Teste A: VITE_SUPABASE_SERVICE_ROLE_KEY não existe no codebase
  console.log('--- Teste A: Ausência de VITE_SUPABASE_SERVICE_ROLE_KEY ---');
  let foundViteServiceRole = false;
  function searchViteServiceRole(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchViteServiceRole(fullPath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.env') || file.endsWith('.json'))) {
        if (file.endsWith('.test.ts')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('VITE_SUPABASE_SERVICE_ROLE_KEY')) {
          foundViteServiceRole = true;
          console.error(`  Encontrado VITE_SUPABASE_SERVICE_ROLE_KEY em: ${fullPath}`);
        }
      }
    }
  }
  searchViteServiceRole(projectRoot);
  assert(!foundViteServiceRole, 'Nenhum arquivo contém a chave insegura VITE_SUPABASE_SERVICE_ROLE_KEY');

  // Teste B: Código do frontend (src/) não importa nem lê SUPABASE_SERVICE_ROLE_KEY diretamente
  console.log('\n--- Teste B: Frontend Isolado da Service Role ---');
  let foundFrontendServiceRole = false;
  const srcDir = path.join(projectRoot, 'src');
  function searchFrontendServiceRole(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchFrontendServiceRole(fullPath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        if (file.endsWith('.test.ts')) continue;
        // Exceções permitidas: arquivos de auth/validação utilitários do servidor em src
        if (file === 'adminAuth.ts' || file === 'supabaseKeyValidator.ts') continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          foundFrontendServiceRole = true;
          console.error(`  Encontrado SUPABASE_SERVICE_ROLE_KEY em componente/lib frontend: ${fullPath}`);
        }
      }
    }
  }
  searchFrontendServiceRole(srcDir);
  assert(!foundFrontendServiceRole, 'Nenhum componente ou visualização do frontend lê SUPABASE_SERVICE_ROLE_KEY');

  // Teste C: Migração de RLS revoga INSERT público em widget_analytics_events
  console.log('\n--- Teste C: Proteção de RLS e Revogação de INSERT em Analytics ---');
  const migrationAnalyticsPath = path.join(projectRoot, 'supabase/migrations/20260807000000_secure_analytics_rls.sql');
  const migrationAnalyticsContent = fs.readFileSync(migrationAnalyticsPath, 'utf8');
  assert(
    migrationAnalyticsContent.includes("REVOKE INSERT ON public.widget_analytics_events FROM anon, authenticated") ||
    migrationAnalyticsContent.includes("REVOKE INSERT ON public.widget_analytics_events FROM anon"),
    'A migração do Supabase revoga explicitamente o privilégio de INSERT público da tabela widget_analytics_events'
  );

  // Teste D: Hardening de SECURITY DEFINER na migração incremental
  console.log('\n--- Teste D: Hardening da função SECURITY DEFINER ---');
  const securityHardeningPath = path.join(projectRoot, 'supabase/migrations/20260807100000_security_hardening.sql');
  const securityHardeningContent = fs.readFileSync(securityHardeningPath, 'utf8');
  assert(
    securityHardeningContent.includes("SET search_path = public, pg_temp"),
    'Função execute_system_activity_check define search_path seguro (public, pg_temp)'
  );
  assert(
    securityHardeningContent.includes("REVOKE EXECUTE ON FUNCTION public.execute_system_activity_check() FROM PUBLIC, anon"),
    'Execução da RPC execute_system_activity_check revogada para o perfil público/anon'
  );

  // Teste E: Helper de Autenticação Admin
  console.log('\n--- Teste E: Proteção de Endpoints Administrativos Server-Side ---');
  const adminAuthPath = path.join(projectRoot, 'src/lib/adminAuth.ts');
  const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf8');
  assert(
    adminAuthContent.includes('verifyAdminAuth') && adminAuthContent.includes('authClient.auth.getUser(token)'),
    'Mecanismo server-side de validação de token JWT de administrador configurado'
  );

  // Teste F: Integridade de Módulos Serverless para Vercel ESM
  console.log('\n--- Teste F: Integridade e Isolamento ESM das Funções Serverless (Vercel) ---');
  const apiDir = path.join(projectRoot, 'api');
  let serverlessErrorCount = 0;

  function auditServerlessFile(filePath: string) {
    const relPath = path.relative(projectRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    if (content.includes("from '../../src/lib/repository'") || content.includes('from "../src/lib/repository"') || content.includes('Repository')) {
      console.error(`  [ERRO SERVERLESS] ${relPath} importa Repository!`);
      serverlessErrorCount++;
    }

    if (content.includes("src/lib/supabase'") || content.includes('src/lib/supabase"') || content.includes('src/lib/supabase.js') || content.includes('src/lib/supabase.ts')) {
      console.error(`  [ERRO SERVERLESS] ${relPath} importa cliente browser src/lib/supabase!`);
      serverlessErrorCount++;
    }

    if (content.includes('import.meta.env')) {
      console.error(`  [ERRO SERVERLESS] ${relPath} utiliza import.meta.env em contexto serverless!`);
      serverlessErrorCount++;
    }

    // Verifica se todos os imports relativos possuem extensão .js
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
    for (const line of importLines) {
      if (line.includes('type ') || line.includes('type{')) continue; // Ignore import type
      const fromMatch = line.match(/from\s+['"](\..*?)['"]/);
      if (fromMatch) {
        const specifier = fromMatch[1];
        if (!specifier.endsWith('.js')) {
          console.error(`  [ERRO SERVERLESS] ${relPath} contém import relativo sem extensão .js: "${specifier}"`);
          serverlessErrorCount++;
        }
      }
    }
  }

  function walkApiDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkApiDir(fullPath);
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        auditServerlessFile(fullPath);
      }
    }
  }

  walkApiDir(apiDir);
  assert(serverlessErrorCount === 0, 'Todas as funções serverless em /api são puras, sem Repository, sem import.meta.env e com imports ESM-safe (.js)');

  // Teste G: RPC publish_all_config e isolamento de versão server-side
  console.log('\n--- Teste G: Atomicidade e RPC publish_all_config sem Fallback ---');
  const repoContent = fs.readFileSync(path.join(projectRoot, 'src/lib/repository.ts'), 'utf8');
  assert(
    !repoContent.includes("client.from('popup_settings').insert") && !repoContent.includes("client.from('popup_settings').update"),
    'publishAllAtomic no repository.ts não realiza gravações individuais manuais em tabelas como fallback'
  );

  const draftContextContent = fs.readFileSync(path.join(projectRoot, 'src/context/ConfigDraftContext.tsx'), 'utf8');
  assert(
    !draftContextContent.includes('const nextVersion = (version || 1) + 1') && !draftContextContent.includes('updatedConfigPayload'),
    'ConfigDraftContext.tsx não altera versão nem config localmente antes do retorno de publishAllAtomic'
  );

  // Teste H: Exclusão de Tipos via RPC sem deleteProductType prévio
  console.log('\n--- Teste H: Exclusão Transacional de Tipos de Peça ---');
  const tiposContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/TiposEMedidas.tsx'), 'utf8');
  assert(
    !tiposContent.includes('await Repository.deleteProductType'),
    'TiposEMedidas.tsx não executa deleteProductType antes de publicar'
  );

  const rpcMigrationContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20260812100000_publish_all_config_rpc.sql'), 'utf8');
  assert(
    rpcMigrationContent.includes('DELETE FROM public.product_types') && rpcMigrationContent.includes('WHERE id NOT IN'),
    'A função publish_all_config executa sincronização e deleção dos tipos removidos na mesma transação'
  );

  // Teste I: Exigência de Service Role Key em Feedback e Health API
  console.log('\n--- Teste I: Validação Rigorosa de Service Role Key em Feedback e Health ---');
  const feedbackApiContent = fs.readFileSync(path.join(projectRoot, 'api/public/feedback.ts'), 'utf8');
  assert(
    feedbackApiContent.includes('isValidServiceRoleKey') && !feedbackApiContent.includes('process.env.SUPABASE_ANON_KEY') && !feedbackApiContent.includes('process.env.VITE_SUPABASE_ANON_KEY'),
    'api/public/feedback.ts exige Service Role e não possui fallback para chaves anon'
  );

  const healthApiContent = fs.readFileSync(path.join(projectRoot, 'api/public/health.ts'), 'utf8');
  assert(
    healthApiContent.includes('hasValidServiceRole') && healthApiContent.includes('isServiceRoleHealthy') && healthApiContent.includes('isServiceRoleHealthy;'),
    'api/public/health.ts inclui a saúde da Service Role na validação de isDbHealthy'
  );

  // Teste J: Confirmação Real de Evento de Teste no Banco
  console.log('\n--- Teste J: Confirmação do Evento de Teste ---');
  const configPageContent = fs.readFileSync(path.join(projectRoot, 'src/pages/admin/Configuracoes.tsx'), 'utf8');
  assert(
    configPageContent.includes('Repository.verifyAnalyticsEvent(testId)'),
    'handleSendTestEvent em Configuracoes.tsx verifica a existência do evento no banco de dados'
  );

  console.log(`\n=== RESUMO DOS TESTES DE SEGURANÇA: ${passed} PASSOU, ${failed} FALHOU ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
