import {
  ProductType,
  MeasurementKey,
  RecommendationResult,
  SizeRange,
  SizeRow,
} from '../types/zhaya';

function parseNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 ? null : value;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? null : num;
  }
  return null;
}

function getRefValue(range?: SizeRange): number | null {
  if (!range) return null;
  if (range.value !== undefined && !isNaN(range.value) && range.value > 0) {
    return range.value;
  }
  if (range.min !== undefined && range.max !== undefined && !isNaN(range.min) && !isNaN(range.max)) {
    return (range.min + range.max) / 2;
  }
  if (range.min !== undefined && !isNaN(range.min) && range.min > 0) return range.min;
  if (range.max !== undefined && !isNaN(range.max) && range.max > 0) return range.max;
  return null;
}

export function calculateRecommendation(
  productType: ProductType,
  userMeasurements: Partial<Record<MeasurementKey, number | string>>
): RecommendationResult {
  if (!productType || !productType.sizes || productType.sizes.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
    };
  }

  const measurementsToEvaluate = (productType.measurements || []).length > 0
    ? productType.measurements
    : (['bust', 'waist', 'hip', 'shoulders', 'thigh', 'torsoLength', 'footLength', 'footWidth'] as MeasurementKey[]);

  // Parse and validate user measurements
  const activeMeasurements: { key: MeasurementKey; val: number }[] = [];
  for (const k of measurementsToEvaluate) {
    const raw = userMeasurements[k];
    const parsed = parseNumber(raw);
    if (parsed !== null) {
      activeMeasurements.push({ key: k, val: parsed });
    }
  }

  if (activeMeasurements.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
    };
  }

  // Sort sizes by order
  const sortedSizes: SizeRow[] = [...productType.sizes].sort((a, b) => a.order - b.order);

  const matchedSizeIndexes: number[] = [];

  for (const { key, val } of activeMeasurements) {
    // Collect references across sizes for this key
    const refValues: { index: number; ref: number; min?: number; max?: number }[] = [];
    sortedSizes.forEach((sRow, idx) => {
      const range = sRow.ranges ? sRow.ranges[key] : undefined;
      const ref = getRefValue(range);
      if (ref !== null && !isNaN(ref)) {
        refValues.push({ index: idx, ref, min: range?.min, max: range?.max });
      }
    });

    if (refValues.length === 0) continue;

    // Check overall bounds for this measurement
    const minRef = refValues[0].min !== undefined ? refValues[0].min : refValues[0].ref;
    const maxRef = refValues[refValues.length - 1].max !== undefined ? refValues[refValues.length - 1].max : refValues[refValues.length - 1].ref;

    // If value is too far below lowest size or too far above highest size
    if (val < minRef - 8 || val > maxRef + 10) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
      };
    }

    // Direct range match
    let directMatchIdx = -1;
    for (const item of refValues) {
      if (item.min !== undefined && item.max !== undefined && val >= item.min && val <= item.max) {
        directMatchIdx = item.index;
        break;
      }
    }

    if (directMatchIdx !== -1) {
      matchedSizeIndexes.push(directMatchIdx);
      continue;
    }

    // Closest reference match
    let closestIdx = refValues[0].index;
    let minDiff = Math.abs(val - refValues[0].ref);

    for (let i = 1; i < refValues.length; i++) {
      const diff = Math.abs(val - refValues[i].ref);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = refValues[i].index;
      }
    }

    matchedSizeIndexes.push(closestIdx);
  }

  if (matchedSizeIndexes.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
    };
  }

  const minIdx = Math.min(...matchedSizeIndexes);
  const maxIdx = Math.max(...matchedSizeIndexes);
  const diff = maxIdx - minIdx;

  if (diff === 0) {
    const sizeLabel = sortedSizes[minIdx].label;
    return {
      size: sizeLabel,
      status: 'recommended',
      message: 'Este tamanho apresenta a melhor correspondência com as medidas informadas.',
    };
  }

  if (diff === 1) {
    const lowerLabel = sortedSizes[minIdx].label;
    const upperLabel = sortedSizes[maxIdx].label;
    return {
      size: lowerLabel,
      alternateSize: upperLabel,
      status: 'between_sizes',
      message: `Você está entre ${lowerLabel} e ${upperLabel}. ${lowerLabel} pode ficar mais ajustado, enquanto ${upperLabel} pode oferecer mais conforto.`,
    };
  }

  // Too distant (diff >= 2)
  return {
    size: null,
    status: 'not_found',
    message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
  };
}

