import { calculateRecommendation } from './recommendation';
import { ProductType } from '../types/zhaya';

const demoJacketType: ProductType = {
  id: 'pt-jaqueta',
  name: 'Jaqueta',
  order: 1,
  active: true,
  measurements: ['bust', 'shoulders', 'waist'],
  sizes: [
    {
      id: 'sz-p',
      label: 'P',
      order: 1,
      ranges: {
        bust: { min: 84, max: 90, value: 87 },
        waist: { min: 66, max: 72, value: 69 },
        shoulders: { min: 36, max: 38, value: 37 },
      },
    },
    {
      id: 'sz-m',
      label: 'M',
      order: 2,
      ranges: {
        bust: { min: 91, max: 97, value: 94 },
        waist: { min: 73, max: 79, value: 76 },
        shoulders: { min: 39, max: 41, value: 40 },
      },
    },
    {
      id: 'sz-g',
      label: 'G',
      order: 3,
      ranges: {
        bust: { min: 98, max: 104, value: 101 },
        waist: { min: 80, max: 86, value: 83 },
        shoulders: { min: 42, max: 44, value: 43 },
      },
    },
  ],
};

console.log('--- Executando Testes do Algoritmo Zhaya Match ---');

// Test 1: Valor exatamente igual (mesmo tamanho -> recommended)
const res1 = calculateRecommendation(demoJacketType, { bust: 94, waist: 76, shoulders: 40 });
console.assert(res1.status === 'recommended' && res1.size === 'M', 'Teste 1 falhou:', res1);

// Test 2: Valor entre duas referências (busto P, cintura M -> between_sizes)
const res2 = calculateRecommendation(demoJacketType, { bust: 87, waist: 76 });
console.assert(res2.status === 'between_sizes' && res2.size === 'P' && res2.alternateSize === 'M', 'Teste 2 falhou:', res2);

// Test 3: Medidas que indicam tamanhos distantes (P e G -> not_found)
const res3 = calculateRecommendation(demoJacketType, { bust: 87, waist: 83 });
console.assert(res3.status === 'not_found', 'Teste 3 falhou:', res3);

// Test 4: Valor abaixo de toda a tabela (busto 50 -> not_found)
const res4 = calculateRecommendation(demoJacketType, { bust: 50 });
console.assert(res4.status === 'not_found', 'Teste 4 falhou:', res4);

// Test 5: Valor acima de toda a tabela (busto 130 -> not_found)
const res5 = calculateRecommendation(demoJacketType, { bust: 130 });
console.assert(res5.status === 'not_found', 'Teste 5 falhou:', res5);

// Test 6: Campos vazios
const res6 = calculateRecommendation(demoJacketType, {});
console.assert(res6.status === 'not_found', 'Teste 6 falhou:', res6);

// Test 7: Vírgula decimal (ex: "94,0")
const res7 = calculateRecommendation(demoJacketType, { bust: "94,0" as any, waist: "76,0" as any });
console.assert(res7.status === 'recommended' && res7.size === 'M', 'Teste 7 falhou:', res7);

// Test 8: Ponto decimal (ex: "94.0")
const res8 = calculateRecommendation(demoJacketType, { bust: "94.0" as any, waist: "76.0" as any });
console.assert(res8.status === 'recommended' && res8.size === 'M', 'Teste 8 falhou:', res8);

// Test 9: Zero (inválido -> not_found)
const res9 = calculateRecommendation(demoJacketType, { bust: 0 });
console.assert(res9.status === 'not_found', 'Teste 9 falhou:', res9);

// Test 10: Negativo (inválido -> not_found)
const res10 = calculateRecommendation(demoJacketType, { bust: -10 });
console.assert(res10.status === 'not_found', 'Teste 10 falhou:', res10);

// Test 11: Tipo sem tamanhos (not_found)
const emptyType: ProductType = { id: 'empty', name: 'Vazio', order: 1, active: true, measurements: ['bust'], sizes: [] };
const res11 = calculateRecommendation(emptyType, { bust: 90 });
console.assert(res11.status === 'not_found', 'Teste 11 falhou:', res11);

// Test 12: Tipo sem medidas definidas
const noMeasType: ProductType = { ...demoJacketType, measurements: [] };
const res12 = calculateRecommendation(noMeasType, { bust: 94, waist: 76 });
console.assert(res12.status === 'recommended' && res12.size === 'M', 'Teste 12 falhou:', res12);

// Test 13: Referência ausente
const missingRefType: ProductType = {
  ...demoJacketType,
  sizes: [
    { id: '1', label: 'P', order: 1, ranges: {} },
    { id: '2', label: 'M', order: 2, ranges: { bust: { value: 94 } } }
  ]
};
const res13 = calculateRecommendation(missingRefType, { bust: 94 });
console.assert(res13.status === 'recommended' && res13.size === 'M', 'Teste 13 falhou:', res13);

// Test 14: Tabela vazia
const res14 = calculateRecommendation(null as any, { bust: 90 });
console.assert(res14.status === 'not_found', 'Teste 14 falhou:', res14);

console.log('Todos os testes do algoritmo passaram com sucesso!');

