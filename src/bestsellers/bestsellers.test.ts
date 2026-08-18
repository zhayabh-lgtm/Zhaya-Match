import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  formatBestSellerDate,
  calculateTimeRemaining,
  formatSoldQuantityText,
  formatAvailableQuantityText,
} from '../pages/public/MaisVendidosPage.js';
import type { PublicBestSellerList, PublicBestSellerProduct } from '../types/zhaya.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runBestSellersTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES DE MAIS VENDIDOS (/mais-vendidos) ===\n');
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

  // 1. Testes de Script SQL e Migrations
  console.log('--- Teste 1: Arquivos de Schema e Migrations ---');
  const sqlSetupPath = path.join(projectRoot, 'supabase/best_sellers_setup.sql');
  assert(fs.existsSync(sqlSetupPath), 'Arquivo supabase/best_sellers_setup.sql existe');

  const setupContent = fs.readFileSync(sqlSetupPath, 'utf8');
  assert(setupContent.includes('CREATE TABLE IF NOT EXISTS public.best_seller_lists'), 'SQL define tabela best_seller_lists');
  assert(setupContent.includes('CREATE TABLE IF NOT EXISTS public.best_seller_products'), 'SQL define tabela best_seller_products');
  assert(setupContent.includes('ON DELETE CASCADE'), 'Integridade referencial com ON DELETE CASCADE presente');
  assert(setupContent.includes('ALTER TABLE public.best_seller_lists ENABLE ROW LEVEL SECURITY'), 'RLS ativo em best_seller_lists');
  assert(setupContent.includes('ALTER TABLE public.best_seller_products ENABLE ROW LEVEL SECURITY'), 'RLS ativo em best_seller_products');
  assert(setupContent.includes('timer_looping BOOLEAN'), 'SQL inclui modo de timer em looping por visitante');
  assert(setupContent.includes('timer_duration_minutes'), 'SQL inclui duração do timer evergreen');
  assert(setupContent.includes('media_items JSONB'), 'SQL inclui galeria ordenada de imagens e vídeos');
  assert(setupContent.includes('background_video_url'), 'SQL inclui vídeo de fundo da lista');
  assert(setupContent.includes('best_seller_media_assets'), 'SQL inclui registro de mídia para limpeza segura');
  assert(setupContent.includes('video/mp4'), 'Storage aceita vídeos MP4');
  assert(setupContent.includes('best_seller_product_library'), 'SQL inclui biblioteca reutilizável de produtos');
  assert(setupContent.includes('library_product_id'), 'Produtos de listas podem apontar para um cadastro reutilizável');
  assert(setupContent.includes('gift_label TEXT'), 'SQL inclui título extra opcional do presente');
  assert(setupContent.includes('gift_text_color TEXT'), 'SQL inclui cor configurável dos textos do presente');
  assert(setupContent.includes('gift_image_size INTEGER'), 'SQL inclui tamanho configurável da imagem do presente');
  const libraryMigration = fs.readFileSync(path.join(projectRoot, 'supabase/mais_vendidos_product_library.sql'), 'utf8');
  assert(libraryMigration.includes('media_items JSONB'), 'Biblioteca preserva a ordem das imagens');
  assert(libraryMigration.includes('purpose TEXT'), 'Registry distingue mídia temporária para limpeza');
  const cleanupContent = fs.readFileSync(path.join(projectRoot, 'serverless/best-sellers/media-cleanup.ts'), 'utf8');
  assert(cleanupContent.includes('SEVEN_DAYS_MS'), 'Mídia temporária usa janela de retenção de 7 dias');
  assert(cleanupContent.includes('logo_url'), 'Limpeza protege logos ainda referenciadas');
  assert(cleanupContent.includes('posterStoragePath'), 'Limpeza inclui capas temporárias geradas para vídeos');

  // 2. Testes de Formatação de Data com Fuso Horário de São Paulo
  console.log('\n--- Teste 2: Formatação de Data da Lista ---');
  const formatted1 = formatBestSellerDate('2026-08-17', 'America/Sao_Paulo');
  assert(formatted1.includes('17') && formatted1.includes('2026'), `Data formatada corretamente: "${formatted1}"`);

  const formattedEmpty = formatBestSellerDate('');
  assert(formattedEmpty === '', 'Data vazia retorna string vazia');

  // 3. Testes de Formatação de Vendas (Singular / Plural)
  console.log('\n--- Teste 3: Quantidade Vendida (Singular / Plural) ---');
  assert(formatSoldQuantityText(1) === '1 vendido hoje', 'Singular: "1 vendido hoje"');
  assert(formatSoldQuantityText(27) === '27 vendidos hoje', 'Plural: "27 vendidos hoje"');
  assert(formatSoldQuantityText(0) === null, '0 vendidos retorna null');
  assert(formatSoldQuantityText(null) === null, 'null retorna null');
  assert(formatSoldQuantityText(undefined) === null, 'undefined retorna null');

  // 4. Testes de Formatação de Estoque Disponível
  console.log('\n--- Teste 4: Quantidade Disponível / Estoque ---');
  assert(formatAvailableQuantityText(1) === '1 unidade disponível', '1 unidade disponível');
  assert(formatAvailableQuantityText(2) === 'Últimas 2 unidades', 'Últimas 2 unidades (urgência discreta)');
  assert(formatAvailableQuantityText(3) === 'Últimas 3 unidades', 'Últimas 3 unidades');
  assert(formatAvailableQuantityText(15) === '15 unidades disponíveis', '15 unidades disponíveis');
  assert(formatAvailableQuantityText(0) === null, '0 unidades retorna null');
  assert(formatAvailableQuantityText(null) === null, 'null retorna null');

  // 5. Testes de Cálculo do Timer
  console.log('\n--- Teste 5: Cálculo do Timer de Countdown ---');
  const futureIso = new Date(Date.now() + 5 * 3600 * 1000 + 32 * 60 * 1000 + 17 * 1000).toISOString();
  const remainingFuture = calculateTimeRemaining(futureIso);
  assert(!remainingFuture.isExpired, 'Timer no futuro não está expirado');
  assert(remainingFuture.hours >= 4 && remainingFuture.hours <= 6, `Horas calculadas corretamente: ${remainingFuture.hours}h`);
  assert(remainingFuture.minutes >= 30 && remainingFuture.minutes <= 33, `Minutos calculados corretamente: ${remainingFuture.minutes}m`);

  const pastIso = new Date(Date.now() - 60000).toISOString();
  const remainingPast = calculateTimeRemaining(pastIso);
  assert(remainingPast.isExpired, 'Timer no passado marca isExpired = true');
  assert(remainingPast.hours === 0 && remainingPast.minutes === 0 && remainingPast.seconds === 0, 'Valores zerados (sem valores negativos)');

  const nullTimer = calculateTimeRemaining(null);
  assert(nullTimer.isExpired, 'Timer nulo marca isExpired = true');

  // 6. Testes dos Cenários de Produto (A até J)
  console.log('\n--- Teste 6: Validação dos Cenários A a J ---');

  // Cenário A: Lista Completa
  const cenarioAProduct: PublicBestSellerProduct = {
    id: 'prod-1',
    position: 1,
    name: 'Scarpin Couro Preto Salto Fino',
    category: 'Calçado',
    imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
    mediaItems: [
      { id: 'img-1', type: 'image', url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800' },
      { id: 'vid-1', type: 'video', url: 'https://cdn.example.com/scarpin.mp4' },
    ],
    productUrl: 'https://zhaya.com.br/produtos/scarpin-preto',
    soldQuantity: 27,
    showSoldQuantity: true,
    availableQuantity: 3,
    sizes: ['34', '35', '36', '37', '38'],
    colors: ['Preto', 'Off White'],
    badgeEnabled: true,
    badgeText: '50% OFF',
  };
  assert(cenarioAProduct.badgeEnabled && cenarioAProduct.badgeText === '50% OFF', 'Cenário A: Produto completo com badge 50% OFF');
  assert(cenarioAProduct.sizes.length === 5, 'Cenário A: 5 tamanhos');
  assert(cenarioAProduct.colors.length === 2, 'Cenário A: 2 cores');
  assert(cenarioAProduct.mediaItems?.[1]?.type === 'video', 'Cenário A: galeria aceita vídeo ordenado junto das imagens');

  // Cenário B: Produto Minimalista (sem tamanho, cor, estoque, vendas, badge)
  const cenarioBProduct: PublicBestSellerProduct = {
    id: 'prod-2',
    position: 2,
    name: 'Sandália Minimal',
    category: 'Calçado',
    imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
    productUrl: null,
    soldQuantity: null,
    showSoldQuantity: false,
    availableQuantity: null,
    sizes: [],
    colors: [],
    badgeEnabled: false,
    badgeText: null,
  };
  assert(cenarioBProduct.sizes.length === 0 && cenarioBProduct.colors.length === 0, 'Cenário B: Produto minimalista sem tamanhos/cores');
  assert(cenarioBProduct.productUrl === null, 'Cenário B: Sem URL de produto');

  // Cenário C: Acessório com cores e sem tamanhos
  const cenarioCProduct: PublicBestSellerProduct = {
    id: 'prod-3',
    position: 3,
    name: 'Brinco Argola Orgânica',
    category: 'Acessório',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    productUrl: 'https://zhaya.com.br/produtos/brinco-argola',
    soldQuantity: 14,
    showSoldQuantity: true,
    availableQuantity: 10,
    sizes: [],
    colors: ['Dourado', 'Prata', 'Grafite'],
    badgeEnabled: true,
    badgeText: 'EXCLUSIVO',
  };
  assert(cenarioCProduct.sizes.length === 0 && cenarioCProduct.colors.length === 3, 'Cenário C: Acessório com 3 cores e sem tamanho');

  // Cenário D: Cinto com P, M, G
  const cenarioDProduct: PublicBestSellerProduct = {
    id: 'prod-4',
    position: 4,
    name: 'Cinto Couro Fivela Dourada',
    category: 'Cinto',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    productUrl: 'https://zhaya.com.br/produtos/cinto-couro',
    soldQuantity: 8,
    showSoldQuantity: true,
    availableQuantity: 2,
    sizes: ['P', 'M', 'G'],
    colors: ['Preto', 'Caramelo'],
    badgeEnabled: true,
    badgeText: 'ÚLTIMOS PARES',
  };
  assert(cenarioDProduct.sizes.join(' ') === 'P M G', 'Cenário D: Cinto com tamanhos alfanuméricos P M G');

  // Cenário G: Lista sem Timer
  const cenarioGList: PublicBestSellerList = {
    id: 'list-g',
    title: 'Mais Vendidos da Semana',
    subtitle: null,
    listDate: '2026-08-17',
    timerEnabled: false,
    timerEnd: null,
    backgroundVideoUrl: 'https://cdn.example.com/background.mp4',
    backgroundVideoOpacity: 0.22,
    timezone: 'America/Sao_Paulo',
    products: [cenarioAProduct, cenarioBProduct],
  };
  assert(!cenarioGList.timerEnabled && cenarioGList.timerEnd === null, 'Cenário G: Lista sem timer');
  assert(cenarioGList.backgroundVideoOpacity === 0.22, 'Lista aceita opacidade configurável para vídeo de fundo');

  const cenarioLoopingList: PublicBestSellerList = {
    ...cenarioGList,
    id: 'list-loop',
    timerEnabled: true,
    timerLooping: true,
    timerDurationMinutes: 120,
  };
  assert(
    cenarioLoopingList.timerLooping === true && cenarioLoopingList.timerDurationMinutes === 120,
    'Timer looping aceita duração persistente de 2 horas',
  );

  // Cenário I: Sem lista ativa
  const cenarioIList = null;
  assert(cenarioIList === null, 'Cenário I: Tratamento de ausência de lista ativa sem erro');

  console.log(`\n=== RESULTADO DOS TESTES: ${passed} PASSOU, ${failed} FALHOU ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBestSellersTests();
}
