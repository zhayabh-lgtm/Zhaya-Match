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

// Test 2: Valor entre duas referências (busto P, cintura M, ombros P -> size=M como seguro, alternateSize=P)
const res2 = calculateRecommendation(demoJacketType, { bust: 87, waist: 76, shoulders: 37 });
console.assert(res2.status === 'between_sizes' && res2.size === 'M' && res2.alternateSize === 'P', 'Teste 2 falhou:', res2);

// Test 3: Medidas que indicam tamanhos distantes (P e G -> not_found por divergência crítica)
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

// Test 7: Vírgula decimal (ex: "94,0", "76,0", "40,0")
const res7 = calculateRecommendation(demoJacketType, { bust: "94,0" as any, waist: "76,0" as any, shoulders: "40,0" as any });
console.assert(res7.status === 'recommended' && res7.size === 'M', 'Teste 7 falhou:', res7);

// Test 8: Ponto decimal (ex: "94.0", "76.0", "40.0")
const res8 = calculateRecommendation(demoJacketType, { bust: "94.0" as any, waist: "76.0" as any, shoulders: "40.0" as any });
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

// Test 12: Tipo sem medidas definidas (not_found)
const noMeasType: ProductType = { ...demoJacketType, measurements: [] };
const res12 = calculateRecommendation(noMeasType, { bust: 94, waist: 76 });
console.assert(res12.status === 'not_found', 'Teste 12 falhou:', res12);

// Test 13: Tipo sem faixas válidas
const missingRefType: ProductType = {
  ...demoJacketType,
  sizes: [
    { id: '1', label: 'P', order: 1, ranges: {} },
    { id: '2', label: 'M', order: 2, ranges: {} }
  ]
};
const res13 = calculateRecommendation(missingRefType, { bust: 94 });
console.assert(res13.status === 'not_found', 'Teste 13 falhou:', res13);

// Test 14: Tabela vazia
const res14 = calculateRecommendation(null as any, { bust: 90 });
console.assert(res14.status === 'not_found', 'Teste 14 falhou:', res14);

// Test 15: Calçado (Comprimento e Largura do Pé)
const demoFootwearType: ProductType = {
  id: 'pt-sapato',
  name: 'Scarpin Couro',
  order: 1,
  active: true,
  category: 'footwear',
  fitType: 'footwear',
  measurements: ['footLength', 'footWidth'],
  sizes: [
    {
      id: 'sz-35',
      label: '35',
      order: 1,
      ranges: {
        footLength: { min: 23.0, max: 23.6 },
        footWidth: { min: 8.5, max: 9.0 },
      },
    },
    {
      id: 'sz-36',
      label: '36',
      order: 2,
      ranges: {
        footLength: { min: 23.7, max: 24.3 },
        footWidth: { min: 9.0, max: 9.4 },
      },
    },
    {
      id: 'sz-37',
      label: '37',
      order: 3,
      ranges: {
        footLength: { min: 24.4, max: 25.0 },
        footWidth: { min: 9.4, max: 9.8 },
      },
    },
  ],
};

const res15 = calculateRecommendation(demoFootwearType, { footLength: 24.0, footWidth: 9.2 });
console.assert(res15.status === 'recommended' && res15.size === '36', 'Teste 15 falhou:', res15);

// Test 16: Calçado com Largura do Pé exigindo número maior (largura exige 37, comprimento aceita 36)
const res16 = calculateRecommendation(demoFootwearType, { footLength: 24.0, footWidth: 9.6 });
console.assert(
  res16.status === 'between_sizes' && res16.size === '37' && res16.alternateSize === '36',
  'Teste 16 falhou:',
  res16
);
console.assert(
  res16.message.includes('largura do seu pé ultrapassa o limite seguro'),
  'Teste 16 mensagem falhou:',
  res16.message
);

// Test 17: Dados legados com apenas `value` (expansão automática de intervalo sem falhar por faixa 0)
const demoLegacyType: ProductType = {
  id: 'pt-legacy',
  name: 'Camiseta Básica',
  order: 1,
  active: true,
  measurements: ['bust', 'waist'],
  sizes: [
    {
      id: 'sz-p',
      label: 'P',
      order: 1,
      ranges: {
        bust: { value: 88 },
        waist: { value: 70 },
      },
    },
    {
      id: 'sz-m',
      label: 'M',
      order: 2,
      ranges: {
        bust: { value: 94 },
        waist: { value: 76 },
      },
    },
  ],
};

const res17 = calculateRecommendation(demoLegacyType, { bust: 87, waist: 69 });
console.assert(res17.status === 'recommended' && res17.size === 'P', 'Teste 17 falhou:', res17);

// Test 18: Calçado com pé fino (comprimento exige 36, largura exige 35 -> size=36 pelo comprimento, alt=35)
const res18 = calculateRecommendation(demoFootwearType, { footLength: 24.0, footWidth: 8.8 });
console.assert(res18.status === 'between_sizes' && res18.size === '36' && res18.alternateSize === '35', 'Teste 18 falhou:', res18);
console.assert(res18.message.includes('garantir o comprimento correto do pé'), 'Teste 18 mensagem falhou:', res18.message);

// Test 19: Calçado com pé muito largo (comprimento exige 35, largura exige 37 -> size=37, alt=35)
const res19 = calculateRecommendation(demoFootwearType, { footLength: 23.5, footWidth: 9.6 });
console.assert(res19.status === 'between_sizes' && res19.size === '37' && res19.alternateSize === '35', 'Teste 19 falhou:', res19);
console.assert(res19.message.includes('para acomodar a largura do seu pé'), 'Teste 19 mensagem falhou:', res19.message);

// Test 20: Calçado com pé muito fino (comprimento exige 37, largura exige 35 -> size=37 pelo comprimento, alt=36)
const res20 = calculateRecommendation(demoFootwearType, { footLength: 24.8, footWidth: 8.8 });
console.assert(res20.status === 'between_sizes' && res20.size === '37' && res20.alternateSize === '36', 'Teste 20 falhou:', res20);
console.assert(res20.message.includes('folga nas laterais'), 'Teste 20 mensagem falhou:', res20.message);

// Test 21: Calçado com comprimento acima da tabela (26.5 -> not_found com mensagem de comprimento)
const res21 = calculateRecommendation(demoFootwearType, { footLength: 26.5, footWidth: 9.2 });
console.assert(res21.status === 'not_found', 'Teste 21 falhou:', res21);
console.assert(res21.message.includes('comprimento do pé está acima da maior numeração'), 'Teste 21 mensagem falhou:', res21.message);

// Test 22: Calçado com largura acima da tabela (11.0 -> not_found com mensagem de largura)
const res22 = calculateRecommendation(demoFootwearType, { footLength: 24.0, footWidth: 11.0 });
console.assert(res22.status === 'not_found', 'Teste 22 falhou:', res22);
console.assert(res22.message.includes('largura do pé está acima da maior numeração'), 'Teste 22 mensagem falhou:', res22.message);

// Test 23: Calçado com comprimento abaixo da tabela (20.0 -> not_found com mensagem de comprimento)
const res23 = calculateRecommendation(demoFootwearType, { footLength: 20.0, footWidth: 9.0 });
console.assert(res23.status === 'not_found', 'Teste 23 falhou:', res23);
console.assert(res23.message.includes('comprimento do pé está abaixo da menor numeração'), 'Teste 23 mensagem falhou:', res23.message);

// Test 24: Calçado com largura abaixo da tabela (6.0 -> not_found com mensagem de largura)
const res24 = calculateRecommendation(demoFootwearType, { footLength: 24.0, footWidth: 6.0 });
console.assert(res24.status === 'not_found', 'Teste 24 falhou:', res24);
console.assert(res24.message.includes('largura do pé está abaixo da menor numeração'), 'Teste 24 mensagem falhou:', res24.message);

console.log('Todos os testes do algoritmo passaram com sucesso!');

