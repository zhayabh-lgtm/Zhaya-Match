import { ProductType, PopupAppearance, MeasurementKey } from '../types/zhaya';

export type MeasurementGroup = 'upper_body' | 'lower_body' | 'footwear' | 'unknown';

const UPPER_BODY_EXCLUSIVE: MeasurementKey[] = ['bust', 'shoulders', 'torsoLength', 'sleeveLength'];
const LOWER_BODY_EXCLUSIVE: MeasurementKey[] = ['hip', 'thigh'];
const FOOTWEAR_EXCLUSIVE: MeasurementKey[] = ['footLength', 'footWidth'];

const UPPER_BODY_KEYWORDS = [
  'camisa', 'blusa', 'jaqueta', 'blazer', 'casaco', 'colete',
  'top', 'cropped', 'body', 'vestido', 'macacao', 'macacão'
];

const LOWER_BODY_KEYWORDS = [
  'calca', 'calça', 'short', 'shorts', 'saia', 'bermuda', 'legging'
];

const FOOTWEAR_KEYWORDS = [
  'sapato', 'calcado', 'calçado', 'tenis', 'tênis', 'sandalia', 'sandália',
  'bota', 'rasteira', 'scarpin', 'sapatilha', 'mule', 'mocassim'
];

function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function detectMeasurementGroup(productType?: ProductType | null): MeasurementGroup {
  if (!productType) return 'unknown';

  const measurements = Array.isArray(productType.measurements) ? productType.measurements : [];
  const nameNorm = normalizeName(productType.name);

  // Rule 1: Footwear measurements take immediate priority
  const hasFootwear = measurements.some((m) => FOOTWEAR_EXCLUSIVE.includes(m));
  if (hasFootwear) {
    return 'footwear';
  }

  // Rule 2 & 3: Count upper and lower exclusive measurements
  let upperCount = 0;
  let lowerCount = 0;

  measurements.forEach((m) => {
    if (UPPER_BODY_EXCLUSIVE.includes(m)) upperCount++;
    if (LOWER_BODY_EXCLUSIVE.includes(m)) lowerCount++;
  });

  // Rule 4: Upper score > lower score
  if (upperCount > lowerCount) {
    return 'upper_body';
  }

  // Rule 5: Lower score > upper score
  if (lowerCount > upperCount) {
    return 'lower_body';
  }

  // Rule 6: Tiebreaker using normalized name
  if (nameNorm) {
    for (const kw of FOOTWEAR_KEYWORDS) {
      if (nameNorm.includes(normalizeName(kw))) return 'footwear';
    }
    for (const kw of UPPER_BODY_KEYWORDS) {
      if (nameNorm.includes(normalizeName(kw))) return 'upper_body';
    }
    for (const kw of LOWER_BODY_KEYWORDS) {
      if (nameNorm.includes(normalizeName(kw))) return 'lower_body';
    }
  }

  // Rule 7: Unknown category if tie cannot be resolved or no exclusive measurements / neutral only
  return 'unknown';
}

export interface ResolvedMeasurementImage {
  group: MeasurementGroup;
  imageUrl?: string;
  caption?: string;
  isFallback: boolean;
}

export function resolveMeasurementImage(
  productType: ProductType | null | undefined,
  appearance: PopupAppearance
): ResolvedMeasurementImage {
  const group = detectMeasurementGroup(productType);

  if (productType?.measurementImageUrl && productType.measurementImageUrl.trim()) {
    return {
      group,
      imageUrl: productType.measurementImageUrl.trim(),
      caption: productType.measurementImageCaption || `Guia de medição para ${productType.name}`,
      isFallback: false,
    };
  }

  let imageUrl: string | undefined = undefined;
  let caption: string | undefined = undefined;

  switch (group) {
    case 'upper_body':
      imageUrl =
        appearance.upperBodyMeasurementImageUrl ||
        appearance.apparelMeasurementImageUrl ||
        appearance.mainMeasurementImageUrl ||
        undefined;
      caption =
        appearance.upperBodyMeasurementImageCaption ||
        appearance.apparelMeasurementImageCaption ||
        appearance.mainMeasurementImageCaption ||
        'Referência para busto, cintura, ombros e comprimento do tronco.';
      break;

    case 'lower_body':
      imageUrl = appearance.lowerBodyMeasurementImageUrl || undefined;
      caption =
        appearance.lowerBodyMeasurementImageCaption ||
        'Referência para cintura, quadril e coxa.';
      break;

    case 'footwear':
      imageUrl =
        appearance.footwearMeasurementImageUrl ||
        undefined;
      caption =
        appearance.footwearMeasurementImageCaption ||
        'Referência para comprimento e largura do pé.';
      break;

    case 'unknown':
    default:
      imageUrl = undefined;
      caption = undefined;
      break;
  }

  return {
    group,
    imageUrl: imageUrl && imageUrl.trim() ? imageUrl : undefined,
    caption: appearance.showMeasurementCaption !== false ? caption : undefined,
    isFallback: !imageUrl || !imageUrl.trim(),
  };
}
