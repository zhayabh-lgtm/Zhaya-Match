import { classifyKeyFormat, isValidServiceRoleKey } from '../lib/supabaseKeyValidator.js';
import { runProductDetection } from '../domain/productDetector.js';

function runDiagnosticsUnitTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES DA CENTRAL DE DIAGNÓSTICO ===\n');
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

  // 1. Testes de Classificação de Chaves Supabase
  console.log('--- Testes de Validação de Chaves Supabase ---');

  // New sb_secret_ key
  const secretKey = 'sb_secret_1234567890abcdefghijklmnopqrstuvwxyz';
  assert(classifyKeyFormat(secretKey) === 'secret_key', 'Detecta nova sb_secret_ key como secret_key');
  assert(isValidServiceRoleKey(secretKey) === true, 'sb_secret_ key é considerada válida para server-side');

  // New sb_publishable_ key
  const pubKey = 'sb_publishable_1234567890abcdef';
  assert(classifyKeyFormat(pubKey) === 'invalid_publishable', 'Detecta sb_publishable_ key como invalid_publishable');
  assert(isValidServiceRoleKey(pubKey) === false, 'sb_publishable_ key é rejeitada para server-side');

  // Legacy Service Role JWT
  const servicePayload = Buffer.from(JSON.stringify({ role: 'service_role', exp: 2000000000 })).toString('base64');
  const legacyServiceRoleJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${servicePayload}.signature`;
  assert(classifyKeyFormat(legacyServiceRoleJwt) === 'legacy_service_role', 'Detecta JWT com role service_role como legacy_service_role');
  assert(isValidServiceRoleKey(legacyServiceRoleJwt) === true, 'Legacy service role JWT é válida para server-side');

  // Legacy Anon JWT
  const anonPayload = Buffer.from(JSON.stringify({ role: 'anon', exp: 2000000000 })).toString('base64');
  const legacyAnonJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${anonPayload}.signature`;
  assert(classifyKeyFormat(legacyAnonJwt) === 'invalid_anon', 'Detecta JWT anon como invalid_anon');
  assert(isValidServiceRoleKey(legacyAnonJwt) === false, 'Legacy anon JWT é rejeitada para server-side');

  // Empty or invalid string
  assert(classifyKeyFormat('') === 'missing', 'String vazia é classificada como missing');
  assert(classifyKeyFormat('invalid-string') === 'invalid_format', 'String aleatória é classificada como invalid_format');

  // 2. Testes do Detector de Produtos
  console.log('\n--- Testes do Detector de Produtos ---');

  const productTypes = [
    {
      id: 'pt-polo',
      name: 'Camisa Polo',
      category: 'Superior',
      active: true,
      storeTags: ['polo', 'camisa polo'],
      measurements: [],
      sizes: [],
    },
    {
      id: 'pt-calca',
      name: 'Calça Jeans',
      category: 'Inferior',
      active: true,
      storeTags: ['jeans', 'calca'],
      measurements: [],
      sizes: [],
    },
  ];

  // Matching explicit tags
  const matchExplicit = runProductDetection({
    productTypes: productTypes as any,
    customDataLayer: [{ zhayaTag: 'polo' }],
  });
  assert(matchExplicit.selectedTypeName === 'Camisa Polo', 'Corresponde a tag explícita do dataLayer');
  assert(matchExplicit.sourceUsed === '1_gtm_explicit_tags', 'Fonte identificada como 1_gtm_explicit_tags');

  // Matching title / H1
  const matchTitle = runProductDetection({
    productTypes: productTypes as any,
    customTitle: 'Calça Jeans Slim Masculina',
  });
  assert(matchTitle.selectedTypeName === 'Calça Jeans', 'Corresponde a palavra-chave no título da página');
  assert(matchTitle.sourceUsed === '4_page_title', 'Fonte identificada como 4_page_title');

  // Fallback when no match
  const matchFallback = runProductDetection({
    productTypes: productTypes as any,
    customTitle: 'Tênis Esportivo Casual',
  });
  assert(matchFallback.selectedType === null, 'Retorna null quando nenhum tipo é correspondido');
  assert(matchFallback.manualFallbackAvailable === true, 'Habilita fallback de seleção manual');

  console.log(`\n=== RESUMO DOS TESTES DE DIAGNÓSTICO: ${passed} PASSOU, ${failed} FALHOU ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDiagnosticsUnitTests();
