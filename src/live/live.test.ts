import { generateLiveSlug } from '../lib/slugGenerator.js';
import { LiveInvitesStore } from '../lib/liveInvitesStore.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runLiveInviteTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES DO CONVITE DE LIVE ===\n');
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

  // 1. Testes de Geração de Slugs Criptograficamente Seguros
  console.log('--- Teste 1: Gerador de Slugs Criptográficos Não Enumeráveis ---');
  const slug1 = generateLiveSlug(16);
  const slug2 = generateLiveSlug(16);
  const slug3 = generateLiveSlug(20);

  assert(slug1.length === 16, 'Slug gerado tem comprimento padrão de 16 caracteres');
  assert(slug3.length === 20, 'Slug com tamanho customizado respeita o parâmetro');
  assert(slug1 !== slug2, 'Slugs gerados consecutivamente são únicos e aleatórios');
  assert(/^[a-zA-Z0-9]+$/.test(slug1), 'Slug contém apenas caracteres alfanuméricos URL-safe seguros');

  // Testar unicidade em amostra de 1.000 slugs
  const slugSet = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    slugSet.add(generateLiveSlug(16));
  }
  assert(slugSet.size === 1000, 'Nenhuma colisão em 1.000 slugs gerados consecutivamente');

  // 2. Testes de Migration e RLS do Supabase
  console.log('\n--- Teste 2: Migration e Script SQL Opcional ---');
  const migrationPath = path.join(projectRoot, 'supabase/migrations/20260813130000_create_live_invites.sql');
  assert(fs.existsSync(migrationPath), 'Migration 20260813130000_create_live_invites.sql existe');

  const setupSqlPath = path.join(projectRoot, 'supabase/live_invites_setup.sql');
  assert(fs.existsSync(setupSqlPath), 'Arquivo autônomo supabase/live_invites_setup.sql existe');

  const setupSqlContent = fs.readFileSync(setupSqlPath, 'utf8');
  assert(setupSqlContent.includes('CREATE TABLE IF NOT EXISTS public.live_invites'), 'Define tabela live_invites');
  assert(setupSqlContent.includes('ALTER TABLE public.live_invites ENABLE ROW LEVEL SECURITY'), 'Ativa RLS na tabela live_invites');
  assert(setupSqlContent.includes('GRANT ALL ON public.live_invites TO service_role'), 'Concede permissão ao service_role');
  assert(setupSqlContent.includes("NOTIFY pgrst, 'reload schema'"), 'Emite NOTIFY pgrst para recarregar o cache');

  // 3. Testes do Store em Memória e Detecção de Erro de Tabela Ausente
  console.log('\n--- Teste 3: LiveInvitesStore (Fallback em Memória e Tolerância a Falhas) ---');
  const testInvite = {
    id: 'test-inv-1',
    slug: 'slugtest12345678',
    title: 'Live de Teste Zhaya',
    description: 'Descrição de teste',
    startsAt: new Date(Date.now() + 3600000).toISOString(),
    endsAt: new Date(Date.now() + 7200000).toISOString(),
    timezone: 'America/Sao_Paulo',
    active: true,
    clicks: 0,
    createdAt: new Date().toISOString(),
    createdBy: 'admin@zhaya.com.br',
  };

  LiveInvitesStore.save(testInvite);
  const retrieved = LiveInvitesStore.getBySlug('slugtest12345678');
  assert(retrieved?.id === 'test-inv-1', 'Recupera convite por slug no store em memória');

  const publicData = LiveInvitesStore.getPublicBySlug('slugtest12345678');
  assert(publicData?.status === 'active' && publicData?.title === 'Live de Teste Zhaya', 'Gera formato público correto');

  const is42P01 = LiveInvitesStore.isTableMissingError({ code: '42P01', message: 'relation does not exist' });
  const isPGRST = LiveInvitesStore.isTableMissingError({ message: "Could not find the table 'public.live_invites' in the schema cache" });
  assert(is42P01, 'Detecta código 42P01 como tabela ausente');
  assert(isPGRST, 'Detecta mensagem de schema cache como tabela ausente');

  // 4. Testes de Isolamento da Página Pública
  console.log('\n--- Teste 4: Isolamento da Página Pública (/live/:slug) ---');
  const livePagePath = path.join(projectRoot, 'src/pages/public/LiveInvitePage.tsx');
  const livePageContent = fs.readFileSync(livePagePath, 'utf8');

  assert(!livePageContent.includes('AdminLayout'), 'Página pública NÃO utiliza AdminLayout');
  assert(!livePageContent.includes('Sidebar'), 'Página pública NÃO renderiza Sidebar');
  assert(livePageContent.includes('btn-adicionar-agenda'), 'Página pública possui botão de adicionar à agenda');

  // 5. Testes do Guard de Bloqueio de Visitante
  console.log('\n--- Teste 5: VisitorLockGuard e Proteção de Navegação Interna ---');
  const guardPath = path.join(projectRoot, 'src/components/VisitorLockGuard.tsx');
  const guardContent = fs.readFileSync(guardPath, 'utf8');

  assert(guardContent.includes('zhaya_live_visitor_slug'), 'VisitorLockGuard monitora a chave de sessão do visitante');
  assert(guardContent.includes('sessionStorage.removeItem'), 'VisitorLockGuard remove o bloqueio se autenticado');

  // 6. Testes do Contador de Cliques no Botão "ADICIONAR À AGENDA"
  console.log('\n--- Teste 6: Contador de Cliques no Botão "ADICIONAR À AGENDA" ---');
  const initialClicks = LiveInvitesStore.getBySlug('slugtest12345678')?.clicks || 0;
  const count1 = LiveInvitesStore.incrementClicks('slugtest12345678');
  assert(count1 === initialClicks + 1, 'Incrementa cliques no store em memória');
  const count2 = LiveInvitesStore.incrementClicks('slugtest12345678');
  assert(count2 === initialClicks + 2, 'Incrementos subsequentes acumulam corretamente');

  const clickMigrationPath = path.join(projectRoot, 'supabase/migrations/20260813140000_add_clicks_to_live_invites.sql');
  assert(fs.existsSync(clickMigrationPath), 'Migration 20260813140000_add_clicks_to_live_invites.sql existe');

  const clickApiPath = path.join(projectRoot, 'api/public/live-click.ts');
  assert(fs.existsSync(clickApiPath), 'Endpoint /api/public/live-click existe');

  const adminPagePath = path.join(projectRoot, 'src/pages/admin/ConviteLive.tsx');
  const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');
  assert(adminPageContent.includes('Cliques:'), 'Aba administrativa exibe o contador de cliques');

  console.log(`\n=== RESUMO DOS TESTES DE CONVITE DE LIVE: ${passed} PASSOU, ${failed} FALHOU ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runLiveInviteTests();
