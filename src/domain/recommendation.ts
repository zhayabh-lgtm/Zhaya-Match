import {
  ProductType,
  MeasurementKey,
  RecommendationResult,
  SizeRange,
  SizeRow,
  ProductCategory,
  ProductFitType,
} from '../types/zhaya';

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  bust: 'busto',
  waist: 'cintura',
  hip: 'quadril',
  shoulders: 'ombros',
  thigh: 'coxa',
  torsoLength: 'tronco',
  footLength: 'comprimento do pé',
  footWidth: 'largura do pé',
};

/**
 * Normaliza qualquer valor numérico ou string com vírgula/ponto para float.
 * Rejeita zero, negativos, NaN, Infinity e textos inválidos.
 */
export function parseNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return isNaN(value) || value <= 0 || !isFinite(value) ? null : value;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    if (!cleaned) return null;
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 || !isFinite(num) ? null : num;
  }
  return null;
}

/**
 * Formata um número em formato brasileiro com vírgula (ex: 22.5 -> "22,5").
 */
export function formatMeasurementDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return value;
    return String(num).replace('.', ',');
  }
  return String(value).replace('.', ',');
}

/**
 * Identifica a categoria e o tipo de caimento do produto.
 */
export function getProductCategoryAndFit(productType: ProductType): {
  category: ProductCategory;
  fitType: ProductFitType;
} {
  if (productType.category && productType.fitType) {
    return { category: productType.category, fitType: productType.fitType };
  }

  const nameLower = (productType.name || '').toLowerCase();
  const keys = productType.measurements || [];

  const hasFoot =
    keys.includes('footLength') ||
    keys.includes('footWidth') ||
    /sapato|calcado|calçado|tenis|tênis|sapatilha|sandalia|sandália|mocassim|bota|rasteira|scarpin|mule/.test(nameLower);

  if (hasFoot) {
    const cat: ProductCategory = productType.category || 'footwear';
    const fit: ProductFitType = productType.fitType || 'footwear';
    return { category: cat, fitType: fit };
  }

  const isStructured = /jaqueta|blazer|casaco|colete|paleto|paletó/.test(nameLower);
  const isFullBody = /vestido|macacao|macacão|body|conjunto/.test(nameLower);
  const isLower = /calca|calça|short|shorts|saia|bermuda|legging/.test(nameLower);

  const category: ProductCategory =
    productType.category ||
    (isStructured
      ? 'upper_body'
      : isFullBody
      ? 'full_body'
      : isLower
      ? 'lower_body'
      : keys.includes('bust') || keys.includes('shoulders') || keys.includes('torsoLength')
      ? 'upper_body'
      : keys.includes('hip') || keys.includes('thigh')
      ? 'lower_body'
      : 'generic');

  const fitType: ProductFitType =
    productType.fitType ||
    (isStructured ? 'structured' : 'regular');

  return { category, fitType };
}

/**
 * Retorna as medidas críticas para a categoria especificada.
 */
export function getCriticalMeasurements(category: ProductCategory, keys: MeasurementKey[]): MeasurementKey[] {
  switch (category) {
    case 'upper_body': {
      const critical: MeasurementKey[] = [];
      if (keys.includes('bust')) critical.push('bust');
      if (keys.includes('shoulders')) critical.push('shoulders');
      if (keys.includes('waist')) critical.push('waist');
      if (keys.includes('torsoLength')) critical.push('torsoLength');
      return critical.length > 0 ? critical : keys;
    }
    case 'lower_body': {
      const critical: MeasurementKey[] = [];
      if (keys.includes('hip')) critical.push('hip');
      if (keys.includes('waist')) critical.push('waist');
      if (keys.includes('thigh')) critical.push('thigh');
      return critical.length > 0 ? critical : keys;
    }
    case 'full_body': {
      const critical: MeasurementKey[] = [];
      if (keys.includes('bust')) critical.push('bust');
      if (keys.includes('hip')) critical.push('hip');
      if (keys.includes('waist')) critical.push('waist');
      if (keys.includes('torsoLength')) critical.push('torsoLength');
      return critical.length > 0 ? critical : keys;
    }
    case 'footwear': {
      const critical: MeasurementKey[] = [];
      if (keys.includes('footLength')) critical.push('footLength');
      if (keys.includes('footWidth')) critical.push('footWidth');
      return critical.length > 0 ? critical : keys;
    }
    case 'generic':
    default:
      return keys;
  }
}

/**
 * Retorna os limites efetivos [min, max] para uma faixa, tratando dados legados (apenas `value`).
 */
export function getEffectiveRange(
  range: SizeRange | undefined,
  key: MeasurementKey
): { min: number; max: number } | null {
  if (!range) return null;

  let min = parseNumber(range.min);
  let max = parseNumber(range.max);
  const val = parseNumber(range.value);

  if (min !== null && max !== null) {
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    return { min, max };
  }

  if (min !== null && max === null) {
    return { min, max: min };
  }
  if (max !== null && min === null) {
    return { min: max, max };
  }

  if (val !== null) {
    // Expansão segura de dados legados (impede faixas artificiais de largura zero)
    if (key === 'footLength' || key === 'footWidth') {
      return { min: Math.max(0.1, val - 0.5), max: val + 0.5 };
    }
    return { min: Math.max(0.1, val - 3.0), max: val + 3.0 };
  }

  return null;
}

/**
 * Motor Canônico e Conservador de Recomendação de Tamanhos do Zhaya Match.
 */
export function calculateRecommendation(
  productType: ProductType,
  userMeasurements: Partial<Record<MeasurementKey, number | string>>
): RecommendationResult {
  if (!productType || !productType.sizes || productType.sizes.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não conseguimos indicar um tamanho a partir destas medidas. Confira os valores e tente novamente.',
    };
  }

  const sortedSizes: SizeRow[] = [...productType.sizes].sort((a, b) => a.order - b.order);

  const keysToEvaluate: MeasurementKey[] =
    (productType.measurements || []).length > 0
      ? productType.measurements
      : (Object.keys(sortedSizes[0]?.ranges || {}) as MeasurementKey[]);

  if (keysToEvaluate.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não conseguimos indicar um tamanho a partir destas medidas. Confira os valores e tente novamente.',
    };
  }

  // Parse e validação de todas as medidas requeridas
  const activeMeasurements: { key: MeasurementKey; val: number }[] = [];
  const missingKeys: MeasurementKey[] = [];

  for (const k of keysToEvaluate) {
    const raw = userMeasurements[k];
    const parsed = parseNumber(raw);
    if (parsed === null) {
      missingKeys.push(k);
    } else {
      activeMeasurements.push({ key: k, val: parsed });
    }
  }

  if (missingKeys.length > 0 || activeMeasurements.length === 0) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não conseguimos indicar um tamanho a partir destas medidas. Confira os valores e tente novamente.',
    };
  }

  const { category, fitType } = getProductCategoryAndFit(productType);
  const criticalKeys = getCriticalMeasurements(category, keysToEvaluate);

  // 1. Verificação de limites globais da tabela (extrema check)
  for (const { key, val } of activeMeasurements) {
    const label = MEASUREMENT_LABELS[key] || key;
    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (const size of sortedSizes) {
      const r = getEffectiveRange(size.ranges ? size.ranges[key] : undefined, key);
      if (r) {
        if (r.min < globalMin) globalMin = r.min;
        if (r.max > globalMax) globalMax = r.max;
      }
    }

    if (!isFinite(globalMin) || !isFinite(globalMax)) {
      return {
        size: null,
        status: 'not_found',
        message: 'Ainda não há dados suficientes para calcular uma recomendação para este modelo.',
      };
    }

    if (val > globalMax) {
      if (category === 'footwear') {
        const isLength = key === 'footLength';
        const isWidth = key === 'footWidth';
        let msg = `Sua medida de ${label} fica acima das opções disponíveis para este modelo.`;
        if (isLength) {
          msg = `O comprimento do seu pé fica acima da maior numeração disponível para este modelo.`;
        } else if (isWidth) {
          msg = `A largura do seu pé fica acima da maior numeração disponível para este modelo.`;
        }
        return {
          size: null,
          status: 'not_found',
          message: msg,
        };
      }
      return {
        size: null,
        status: 'not_found',
        message: `Sua medida de ${label} fica acima das opções disponíveis para este modelo.`,
      };
    }

    const underflow = globalMin - val;
    if (category === 'footwear' && underflow > 1.5) {
      const isLength = key === 'footLength';
      const isWidth = key === 'footWidth';
      let msg = `Sua medida de ${label} fica abaixo da menor numeração disponível para este modelo.`;
      if (isLength) {
        msg = `Pelo comprimento informado, a menor numeração disponível para este modelo ainda pode ficar grande para você.`;
      } else if (isWidth) {
        msg = `Pela largura informada, a menor numeração disponível para este modelo ainda pode ficar mais larga do que o ideal.`;
      }
      return {
        size: null,
        status: 'not_found',
        message: msg,
      };
    } else if (category !== 'footwear' && underflow > 5.0) {
      return {
        size: null,
        status: 'not_found',
        message: `Sua medida de ${label} fica abaixo das opções disponíveis para este modelo.`,
      };
    }
  }

  // 2. Determinar para cada medida o MENOR tamanho cujo máximo a acomoda (garantia contra aperto)
  const requiredMinSizeIndex: Record<string, number> = {};

  for (const { key, val } of activeMeasurements) {
    let reqIdx = -1;

    for (let i = 0; i < sortedSizes.length; i++) {
      const r = getEffectiveRange(sortedSizes[i].ranges ? sortedSizes[i].ranges[key] : undefined, key);
      if (r && val <= r.max) {
        reqIdx = i;
        break; // Seleciona o primeiro (menor) tamanho seguro
      }
    }

    if (reqIdx === -1) {
      // Se não encontrou no loop (mesmo passando globalMax), usa o maior
      reqIdx = sortedSizes.length - 1;
    }

    requiredMinSizeIndex[key] = reqIdx;
  }

  // 3. O tamanho principal recomendado DEVE ser no mínimo o maior tamanho exigido por qualquer medida
  const candidateIdx = Math.max(...Object.values(requiredMinSizeIndex));

  if (candidateIdx >= sortedSizes.length) {
    return {
      size: null,
      status: 'not_found',
      message: 'Não conseguimos indicar um tamanho com estas medidas.',
    };
  }

  // TRATAMENTO ESPECÍFICO PARA CALÇADOS (Comprimento e Largura do pé)
  if (category === 'footwear') {
    const hasLength = activeMeasurements.some((m) => m.key === 'footLength');
    const hasWidth = activeMeasurements.some((m) => m.key === 'footWidth');

    const lengthSizeIndex = hasLength ? requiredMinSizeIndex['footLength'] : requiredMinSizeIndex[activeMeasurements[0].key];
    const widthSizeIndex = hasWidth ? requiredMinSizeIndex['footWidth'] : lengthSizeIndex;

    const difference = widthSizeIndex - lengthSizeIndex;

    // A. Pé Largo (widthSizeIndex > lengthSizeIndex)
    if (difference === 1) {
      const mainSizeLabel = sortedSizes[widthSizeIndex].label;
      const altSizeLabel = sortedSizes[lengthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `Pelas suas medidas, o ${mainSizeLabel} tende a vestir melhor. O ${altSizeLabel} pode ficar mais justo nas laterais.`,
      };
    } else if (difference === 2) {
      const mainSizeLabel = sortedSizes[widthSizeIndex].label;
      const altSizeLabel = sortedSizes[lengthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `Para dar espaço à largura do seu pé, a melhor escolha é o ${mainSizeLabel}. O ${altSizeLabel} tende a ficar apertado nas laterais.`,
      };
    } else if (difference >= 3) {
      return {
        size: null,
        status: 'not_found',
        message: 'O comprimento e a largura do seu pé indicam numerações bem diferentes. Confira se as duas medidas foram preenchidas corretamente. Se estiverem certas, este modelo pode não ter o ajuste ideal para você.',
      };
    }

    // B. Pé Fino (widthSizeIndex < lengthSizeIndex)
    if (difference === -1) {
      const mainSizeLabel = sortedSizes[lengthSizeIndex].label;
      const altSizeLabel = sortedSizes[widthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `O ${mainSizeLabel} é a melhor escolha para preservar o comprimento. O ${altSizeLabel} fica mais ajustado, mas pode apertar na frente.`,
      };
    } else if (difference === -2) {
      const mainSizeLabel = sortedSizes[lengthSizeIndex].label;
      const altSizeLabel = sortedSizes[lengthSizeIndex - 1] ? sortedSizes[lengthSizeIndex - 1].label : sortedSizes[widthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `O ${mainSizeLabel} é a melhor escolha pelo comprimento. Como seu pé é mais fino, pode haver um pouco mais de folga nas laterais.`,
      };
    } else if (difference <= -3) {
      return {
        size: null,
        status: 'not_found',
        message: 'O comprimento e a largura do seu pé indicam numerações bem diferentes. Confira se as duas medidas foram preenchidas corretamente. Se estiverem certas, este modelo pode não ter o ajuste ideal para você.',
      };
    }

    // C. Difference === 0 (Comprimento e largura exigem o mesmo tamanho)
    let isAtUpperEdge = false;
    for (const { key, val } of activeMeasurements) {
      const r = getEffectiveRange(sortedSizes[lengthSizeIndex].ranges ? sortedSizes[lengthSizeIndex].ranges[key] : undefined, key);
      if (r && r.max - val < 0.15 && val > r.min) {
        isAtUpperEdge = true;
        break;
      }
    }

    const mainSizeLabel = sortedSizes[lengthSizeIndex].label;

    if (isAtUpperEdge && lengthSizeIndex + 1 < sortedSizes.length) {
      const altSizeLabel = sortedSizes[lengthSizeIndex + 1].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `O ${mainSizeLabel} funciona bem pelas suas medidas. Se você gosta de um pouco mais de folga, o ${altSizeLabel} também pode ser uma boa opção.`,
      };
    }

    let message = '';
    if (hasLength && hasWidth) {
      message = `Pelas suas medidas, o ${mainSizeLabel} é a opção mais equilibrada.`;
    } else {
      message = `Pelas suas medidas, o ${mainSizeLabel} é a opção que melhor se encaixa.`;
    }

    return {
      size: mainSizeLabel,
      status: 'recommended',
      message,
    };
  }

  // Medidas críticas e análise de divergência
  const criticalReqIndices = criticalKeys
    .filter((k) => requiredMinSizeIndex[k] !== undefined)
    .map((k) => requiredMinSizeIndex[k]);

  const activeIndices = criticalReqIndices.length > 0 ? criticalReqIndices : Object.values(requiredMinSizeIndex);
  const minCritIdx = Math.min(...activeIndices);
  const maxCritIdx = Math.max(...activeIndices);
  const divergence = maxCritIdx - minCritIdx;

  // Medidas decisivas que exigiram o tamanho final candidato
  const decisiveKeys = activeMeasurements
    .filter(({ key }) => requiredMinSizeIndex[key] === candidateIdx)
    .map(({ key }) => key);

  const decisiveNames = decisiveKeys.map((k) => MEASUREMENT_LABELS[k] || k).join(' e ');

  // 4. Caso de divergência crítica (>= 2 tamanhos de diferença)
  if (divergence >= 2) {
    const minKeys = activeMeasurements
      .filter(({ key }) => requiredMinSizeIndex[key] === minCritIdx)
      .map(({ key }) => MEASUREMENT_LABELS[key] || key)
      .join(' e ');

    return {
      size: null,
      status: 'not_found',
      message: `As medidas de ${decisiveNames} e ${minKeys} apontam para tamanhos diferentes. Por isso, este modelo pode não ter uma opção única que fique equilibrada para você.`,
    };
  }

  // 5. Caso de medidas entre dois tamanhos vizinhos (divergência == 1)
  if (divergence === 1) {
    const mainSizeLabel = sortedSizes[candidateIdx].label;
    const altSizeLabel = sortedSizes[minCritIdx].label;

    const message = `O ${mainSizeLabel} é a opção mais equilibrada para suas medidas. O ${altSizeLabel} fica mais ajustado e pode apertar em ${decisiveNames}.`;

    return {
      size: mainSizeLabel,
      alternateSize: altSizeLabel,
      status: 'between_sizes',
      message,
    };
  }

  // 6. Caso sem divergência entre medidas (todas exigem o mesmo tamanho `candidateIdx`)
  // Verificar se alguma medida está na borda superior (limite de folga)
  let isAtUpperEdge = false;
  const edgeThreshold = 0.5;

  for (const { key, val } of activeMeasurements) {
    const r = getEffectiveRange(sortedSizes[candidateIdx].ranges ? sortedSizes[candidateIdx].ranges[key] : undefined, key);
    if (r && r.max - val < edgeThreshold && val > r.min) {
      isAtUpperEdge = true;
      break;
    }
  }

  const mainSizeLabel = sortedSizes[candidateIdx].label;

  if (isAtUpperEdge && candidateIdx + 1 < sortedSizes.length) {
    const altSizeLabel = sortedSizes[candidateIdx + 1].label;
    const message = `O ${mainSizeLabel} funciona pelas suas medidas. Se preferir um caimento mais solto, o ${altSizeLabel} pode ser uma escolha melhor.`;

    return {
      size: mainSizeLabel,
      alternateSize: altSizeLabel,
      status: 'between_sizes',
      message,
    };
  }

  // 7. Recomendação Direta e Confortável
  let message = '';
  if (decisiveNames) {
    message = `Pelas suas medidas de ${decisiveNames}, o ${mainSizeLabel} é a opção mais equilibrada.`;
  } else {
    message = `Pelas suas medidas, o ${mainSizeLabel} é a opção que melhor se encaixa.`;
  }

  return {
    size: mainSizeLabel,
    status: 'recommended',
    message,
  };
}

