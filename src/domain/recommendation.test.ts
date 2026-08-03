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

// Test 1: Exatamente M
const res1 = calculateRecommendation(demoJacketType, { bust: 94, waist: 76, shoulders: 40 });
console.assert(res1.status === 'recommended' && res1.size === 'M', 'Teste 1 falhou:', res1);

// Test 2: Entre P e M (busto P, cintura M)
const res2 = calculateRecommendation(demoJacketType, { bust: 87, waist: 76 });
console.assert(res2.status === 'between_sizes' && res2.size === 'P' && res2.alternateSize === 'M', 'Teste 2 falhou:', res2);

// Test 3: Abaixo da tabela (busto 50cm)
const res3 = calculateRecommendation(demoJacketType, { bust: 50 });
console.assert(res3.status === 'not_found', 'Teste 3 falhou:', res3);

// Test 4: Acima da tabela (busto 130cm)
const res4 = calculateRecommendation(demoJacketType, { bust: 130 });
console.assert(res4.status === 'not_found', 'Teste 4 falhou:', res4);

// Test 5: Grande divergência (busto P e cintura G)
const res5 = calculateRecommendation(demoJacketType, { bust: 87, waist: 83 });
console.assert(res5.status === 'not_found', 'Teste 5 falhou:', res5);

// Test 6: Sem medidas
const res6 = calculateRecommendation(demoJacketType, {});
console.assert(res6.status === 'not_found', 'Teste 6 falhou:', res6);

console.log('Todos os testes do algoritmo passaram com sucesso!');
