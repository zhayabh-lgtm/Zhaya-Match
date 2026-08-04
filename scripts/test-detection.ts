import { detectMeasurementGroup, resolveMeasurementImage } from '../src/lib/measurementGroup';
import { ProductType, PopupAppearance } from '../src/types/zhaya';
import { migrateLegacyTypography, parseFontWeight } from '../src/lib/fontRegistry';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    process.exit(1);
  } else {
    console.log('✅ PASS:', msg);
  }
}

console.log('--- TEST: detectMeasurementGroup ---');

// Jaqueta: bust, waist, shoulders -> upper_body
assert(
  detectMeasurementGroup({
    id: '1',
    name: 'Jaqueta couro',
    active: true,
    order: 1,
    measurements: ['bust', 'waist', 'shoulders'],
    sizes: [],
  }) === 'upper_body',
  'Jaqueta -> upper_body'
);

// Blazer -> upper_body
assert(
  detectMeasurementGroup({
    id: '2',
    name: 'Blazer Alfaiataria',
    active: true,
    order: 1,
    measurements: ['bust', 'shoulders'],
    sizes: [],
  }) === 'upper_body',
  'Blazer -> upper_body'
);

// Camisa -> upper_body
assert(
  detectMeasurementGroup({
    id: '3',
    name: 'Camisa Linho',
    active: true,
    order: 1,
    measurements: ['bust', 'waist'],
    sizes: [],
  }) === 'upper_body',
  'Camisa -> upper_body'
);

// Body: bust, waist, hip, torsoLength -> upper_body (bust + torsoLength = 2 vs hip = 1)
assert(
  detectMeasurementGroup({
    id: '4',
    name: 'Body Manga Longa',
    active: true,
    order: 1,
    measurements: ['bust', 'waist', 'hip', 'torsoLength'],
    sizes: [],
  }) === 'upper_body',
  'Body -> upper_body (2 upper vs 1 lower)'
);

// Vestido: bust, waist, hip -> tie (1 vs 1), tiebreaker name 'vestido' -> upper_body
assert(
  detectMeasurementGroup({
    id: '5',
    name: 'Vestido Midi',
    active: true,
    order: 1,
    measurements: ['bust', 'waist', 'hip'],
    sizes: [],
  }) === 'upper_body',
  'Vestido -> upper_body (tiebreaker name)'
);

// Macacão: bust, waist, hip, torsoLength -> upper_body
assert(
  detectMeasurementGroup({
    id: '6',
    name: 'Macacão Pantalona',
    active: true,
    order: 1,
    measurements: ['bust', 'waist', 'hip', 'torsoLength'],
    sizes: [],
  }) === 'upper_body',
  'Macacão -> upper_body'
);

// Calça: waist, hip, thigh -> lower_body
assert(
  detectMeasurementGroup({
    id: '7',
    name: 'Calça Jeans',
    active: true,
    order: 1,
    measurements: ['waist', 'hip', 'thigh'],
    sizes: [],
  }) === 'lower_body',
  'Calça -> lower_body'
);

// Short -> lower_body
assert(
  detectMeasurementGroup({
    id: '8',
    name: 'Short Linho',
    active: true,
    order: 1,
    measurements: ['waist', 'hip'],
    sizes: [],
  }) === 'lower_body',
  'Short -> lower_body'
);

// Shorts -> lower_body
assert(
  detectMeasurementGroup({
    id: '9',
    name: 'Shorts de Praia',
    active: true,
    order: 1,
    measurements: ['waist', 'hip'],
    sizes: [],
  }) === 'lower_body',
  'Shorts -> lower_body'
);

// Saia -> lower_body
assert(
  detectMeasurementGroup({
    id: '10',
    name: 'Saia Plissada',
    active: true,
    order: 1,
    measurements: ['waist', 'hip'],
    sizes: [],
  }) === 'lower_body',
  'Saia -> lower_body'
);

// Sapato -> footwear
assert(
  detectMeasurementGroup({
    id: '11',
    name: 'Sapato Social',
    active: true,
    order: 1,
    measurements: ['footLength', 'footWidth'],
    sizes: [],
  }) === 'footwear',
  'Sapato -> footwear'
);

// Sandália -> footwear
assert(
  detectMeasurementGroup({
    id: '12',
    name: 'Sandália Salto',
    active: true,
    order: 1,
    measurements: ['footLength'],
    sizes: [],
  }) === 'footwear',
  'Sandália -> footwear'
);

// Rasteira -> footwear
assert(
  detectMeasurementGroup({
    id: '13',
    name: 'Rasteira Couro',
    active: true,
    order: 1,
    measurements: ['footLength'],
    sizes: [],
  }) === 'footwear',
  'Rasteira -> footwear'
);

// Tipo somente com waist e nome genérico -> unknown
assert(
  detectMeasurementGroup({
    id: '14',
    name: 'Item Especial',
    active: true,
    order: 1,
    measurements: ['waist'],
    sizes: [],
  }) === 'unknown',
  'Waist + generic name -> unknown'
);

// Tipo com footWidth e hip -> footwear (footwear measurements take priority)
assert(
  detectMeasurementGroup({
    id: '15',
    name: 'Acessório de Pé',
    active: true,
    order: 1,
    measurements: ['footWidth', 'hip'],
    sizes: [],
  }) === 'footwear',
  'footWidth + hip -> footwear'
);

// Detecção por medidas vencendo nome incorreto (e.g. name says 'calca' but measurements are bust, shoulders)
assert(
  detectMeasurementGroup({
    id: '16',
    name: 'Calça de Teste',
    active: true,
    order: 1,
    measurements: ['bust', 'shoulders'],
    sizes: [],
  }) === 'upper_body',
  'Measurements win over incorrect name'
);

console.log('--- TEST: fontRegistry & legacy migration ---');
const legacyApp: Partial<PopupAppearance> = {
  customFontUrl: 'https://example.com/NeueEinstellung.woff2',
  titleFontWeight: 'bold',
  bodyFontWeight: 'normal',
};
const migrated = migrateLegacyTypography(legacyApp);
assert(migrated.fontPreset === 'neue-einstellung', 'Migrates Neue Einstellung preset');
assert(migrated.titleFontWeight === 700, 'Migrates bold -> 700');
assert(migrated.bodyFontWeight === 400, 'Migrates normal -> 400');

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! ✨');
