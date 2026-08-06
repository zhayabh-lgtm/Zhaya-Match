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
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
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
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
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
      message: 'Não encontramos um tamanho adequado nesta tabela. Confira suas medidas ou consulte a equipe da Zhaya.',
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
        message: 'Tabela de tamanhos sem intervalos válidos cadastrados para recomendação.',
      };
    }

    if (val > globalMax) {
      if (category === 'footwear') {
        const isLength = key === 'footLength';
        const isWidth = key === 'footWidth';
        let msg = `Não encontramos um tamanho padrão que acomode sua medida de ${label} com segurança.`;
        if (isLength) {
          msg = `Sua medida de comprimento do pé está acima da maior numeração disponível nesta tabela.`;
        } else if (isWidth) {
          msg = `Sua medida de largura do pé está acima da maior numeração disponível nesta tabela.`;
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
        message: `Não encontramos um tamanho padrão que acomode sua medida de ${label} com segurança.`,
      };
    }

    const underflow = globalMin - val;
    if (category === 'footwear' && underflow > 1.5) {
      const isLength = key === 'footLength';
      const isWidth = key === 'footWidth';
      let msg = `Sua medida de ${label} está abaixo da menor numeração disponível nesta tabela.`;
      if (isLength) {
        msg = `Sua medida de comprimento do pé está abaixo da menor numeração disponível nesta tabela.`;
      } else if (isWidth) {
        msg = `Sua medida de largura do pé está abaixo da menor numeração disponível nesta tabela.`;
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
        message: `Sua medida de ${label} está significativamente abaixo da menor numeração disponível nesta tabela.`,
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
      message: 'Não encontramos um tamanho adequado nesta tabela.',
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
        message: `Recomendamos o tamanho ${mainSizeLabel} porque a largura do seu pé ultrapassa o limite seguro do ${altSizeLabel}.`,
      };
    } else if (difference === 2) {
      const mainSizeLabel = sortedSizes[widthSizeIndex].label;
      const altSizeLabel = sortedSizes[lengthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `Recomendamos o tamanho ${mainSizeLabel} para acomodar a largura do seu pé. Como seu pé é mais largo em relação ao comprimento, o tamanho ${altSizeLabel} ou menor ficaria apertado nas laterais.`,
      };
    } else if (difference >= 3) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho padrão que acomode o comprimento e a largura do seu pé simultaneamente com segurança. Recomendamos buscar modelos com forma especial para pés largos.',
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
        message: `Recomendamos o tamanho ${mainSizeLabel} para garantir o comprimento correto do pé. Como seu pé é mais fino, o tamanho ${altSizeLabel} pode oferecer um caimento justo, mas corre o risco de apertar no comprimento.`,
      };
    } else if (difference === -2) {
      const mainSizeLabel = sortedSizes[lengthSizeIndex].label;
      const altSizeLabel = sortedSizes[lengthSizeIndex - 1] ? sortedSizes[lengthSizeIndex - 1].label : sortedSizes[widthSizeIndex].label;
      return {
        size: mainSizeLabel,
        alternateSize: altSizeLabel,
        status: 'between_sizes',
        message: `Recomendamos o tamanho ${mainSizeLabel} para acomodar o comprimento do pé. Como seu pé é fino em relação ao comprimento, o calçado pode apresentar folga nas laterais.`,
      };
    } else if (difference <= -3) {
      return {
        size: null,
        status: 'not_found',
        message: 'Não encontramos um tamanho padrão que acomode o comprimento e a largura do seu pé simultaneamente com segurança.',
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
        message: `Recomendamos o tamanho ${mainSizeLabel}. Suas medidas de pé estão próximas do limite; se preferir mais folga, escolha o ${altSizeLabel}.`,
      };
    }

    let message = '';
    if (hasLength && hasWidth) {
      message = `Recomendamos o tamanho ${mainSizeLabel} porque comprimento e largura do pé ficam dentro do intervalo seguro.`;
    } else {
      message = `Recomendamos o tamanho ${mainSizeLabel} para acomodar seus pés com conforto e segurança.`;
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
      message: `Não encontramos um tamanho padrão que acomode suas medidas de ${decisiveNames} e ${minKeys} simultaneamente com segurança.`,
    };
  }

  // 5. Caso de medidas entre dois tamanhos vizinhos (divergência == 1)
  if (divergence === 1) {
    const mainSizeLabel = sortedSizes[candidateIdx].label;
    const altSizeLabel = sortedSizes[minCritIdx].label;

    const message = `Recomendamos o tamanho ${mainSizeLabel}. Ele acomoda suas medidas de ${decisiveNames} com conforto e segurança. O tamanho ${altSizeLabel} pode oferecer um caimento mais justo, mas pode ficar apertado no ${decisiveNames}.`;

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
    const message = `Recomendamos o tamanho ${mainSizeLabel}. Suas medidas estão no limite superior deste tamanho; para um caimento mais solto, opte pelo ${altSizeLabel}.`;

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
    message = `Recomendamos o tamanho ${mainSizeLabel} porque apresenta a melhor correspondência com suas medidas de ${decisiveNames}.`;
  } else {
    message = `Recomendamos o tamanho ${mainSizeLabel} que apresenta a melhor correspondência com suas medidas.`;
  }

  return {
    size: mainSizeLabel,
    status: 'recommended',
    message,
  };
}

