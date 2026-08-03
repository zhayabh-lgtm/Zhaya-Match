import {
  ProductType,
  MeasurementKey,
  RecommendationResult,
  SizeRange,
} from '../types/zhaya';

function getRefValue(range?: SizeRange): number | null {
  if (!range) return null;
  if (range.value !== undefined && !isNaN(range.value) && range.value > 0) {
    return range.value;
  }
  if (range.min !== undefined && range.max !== undefined && !isNaN(range.min) && !isNaN(range.max)) {
    return (range.min + range.max) / 2;
  }
  if (range.min !== undefined && !isNaN(range.min)) return range.min;
  if (range.max !== undefined && !isNaN(range.max)) return range.max;
  return null;
}

export function calculateRecommendation(
  productType: ProductType,
  userMeasurements: Partial<Record<MeasurementKey, number>>
): RecommendationResult {
  if (!productType || !productType.sizes || productType.sizes.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Nenhuma grade de tamanhos cadastrada para esta categoria.',
    };
  }

  // Active measurement keys provided by user with valid numbers > 0
  const activeKeys = (productType.measurements || []).filter(
    (k) => userMeasurements[k] !== undefined && !isNaN(Number(userMeasurements[k])) && Number(userMeasurements[k]) > 0
  );

  if (activeKeys.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Por favor, informe suas medidas em cm para calcular o tamanho.',
    };
  }

  // Sort sizes by order
  const sortedSizes = [...productType.sizes].sort((a, b) => a.order - b.order);

  const requiredSizeIndexes: number[] = [];
  let isOutAbove = false;
  let isOutBelow = false;

  for (const key of activeKeys) {
    const val = Number(userMeasurements[key]);

    // Extract reference values for each size for this measurement key
    const refValues: { index: number; ref: number; min?: number; max?: number }[] = [];
    sortedSizes.forEach((sRow, idx) => {
      const range = sRow.ranges ? sRow.ranges[key] : undefined;
      const ref = getRefValue(range);
      if (ref !== null && !isNaN(ref)) {
        refValues.push({ index: idx, ref, min: range?.min, max: range?.max });
      }
    });

    if (refValues.length === 0) continue;

    // Check bounds against lowest and highest ref
    const minRef = refValues[0].ref;
    const maxRef = refValues[refValues.length - 1].ref;

    if (val < minRef - 10) {
      isOutBelow = true;
    }
    if (val > maxRef + 12) {
      isOutAbove = true;
    }

    // Check if user value falls directly inside a min-max range
    let directRangeMatch = -1;
    for (const item of refValues) {
      if (item.min !== undefined && item.max !== undefined && val >= item.min && val <= item.max) {
        directRangeMatch = item.index;
        break;
      }
    }

    if (directRangeMatch !== -1) {
      requiredSizeIndexes.push(directRangeMatch);
      continue;
    }

    // Single Reference Value Calculation: Find closest reference size
    let closestIdx = refValues[0].index;
    let minDiff = Math.abs(val - refValues[0].ref);

    for (let i = 1; i < refValues.length; i++) {
      const diff = Math.abs(val - refValues[i].ref);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = refValues[i].index;
      }
    }

    requiredSizeIndexes.push(closestIdx);
  }

  if (requiredSizeIndexes.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não foi possível calcular o tamanho com base nas medidas informadas.',
    };
  }

  if (isOutBelow) {
    return {
      size: null,
      status: 'not_found',
      message: 'Suas medidas são menores do que a menor proporção disponível nesta tabela.',
    };
  }

  if (isOutAbove) {
    return {
      size: null,
      status: 'not_found',
      message: 'Suas medidas excedem a maior proporção disponível nesta tabela.',
    };
  }

  const minIdx = Math.min(...requiredSizeIndexes);
  const maxIdx = Math.max(...requiredSizeIndexes);
  const indexDiff = maxIdx - minIdx;

  // Single size recommendation
  if (indexDiff === 0) {
    const sizeLabel = sortedSizes[maxIdx].label;
    return {
      size: sizeLabel,
      status: 'recommended',
      message: `Com base nas suas medidas, o tamanho ${sizeLabel} oferece o melhor caimento.`,
    };
  }

  // Adjacent sizes recommendation (e.g. between P and M)
  if (indexDiff === 1) {
    const lowerSizeLabel = sortedSizes[minIdx].label;
    const upperSizeLabel = sortedSizes[maxIdx].label;
    return {
      size: lowerSizeLabel,
      alternateSize: upperSizeLabel,
      status: 'between_sizes',
      message: `Você está entre dois tamanhos: o ${lowerSizeLabel} ficará mais ajustado e o ${upperSizeLabel} mais solto.`,
    };
  }

  // High variation divergence across multiple measurements
  return {
    size: null,
    status: 'not_found',
    message: 'Suas medidas apresentam variação expressiva entre categorias. Recomendamos consultar o atendimento para apoio personalizado.',
  };
}
