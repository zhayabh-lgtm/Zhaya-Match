import { PopupAppearance } from '../types/zhaya';

export interface FontPreset {
  id: string;
  label: string;
  family: string;
  fallback: string;
  availableWeights: number[];
  stylesheetUrl?: string;
}

export const FONT_PRESETS: Record<string, FontPreset> = {
  'neue-einstellung': {
    id: 'neue-einstellung',
    label: 'Neue Einstellung (Padrão Zhaya)',
    family: '"Neue Einstellung"',
    fallback: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif',
    availableWeights: [400, 500, 700, 900],
  },
  inter: {
    id: 'inter',
    label: 'Inter',
    family: 'Inter',
    fallback: 'Inter, system-ui, -apple-system, sans-serif',
    availableWeights: [400, 500, 700, 900],
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap',
  },
  manrope: {
    id: 'manrope',
    label: 'Manrope',
    family: 'Manrope',
    fallback: 'Manrope, sans-serif',
    availableWeights: [400, 500, 700, 900],
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;900&display=swap',
  },
  'dm-sans': {
    id: 'dm-sans',
    label: 'DM Sans',
    family: '"DM Sans"',
    fallback: '"DM Sans", sans-serif',
    availableWeights: [400, 500, 700, 900],
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap',
  },
  'space-grotesk': {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    family: '"Space Grotesk"',
    fallback: '"Space Grotesk", sans-serif',
    availableWeights: [400, 500, 700],
    stylesheetUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap',
  },
  'helvetica-neue': {
    id: 'helvetica-neue',
    label: 'Helvetica Neue',
    family: '"Helvetica Neue"',
    fallback: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    availableWeights: [400, 500, 700],
  },
};

export const DEFAULT_FONT_PRESET = 'neue-einstellung';

export function getFontPreset(id?: string): FontPreset {
  if (id && FONT_PRESETS[id]) {
    return FONT_PRESETS[id];
  }
  return FONT_PRESETS[DEFAULT_FONT_PRESET];
}

export function getFontFamilyString(id?: string): string {
  const preset = getFontPreset(id);
  return preset.fallback;
}

export function parseFontWeight(val: any, defaultWeight: number): number {
  if (typeof val === 'number') {
    if ([400, 500, 700, 900].includes(val)) return val;
    if (val < 450) return 400;
    if (val < 600) return 500;
    if (val < 850) return 700;
    return 900;
  }
  if (typeof val === 'string') {
    const s = val.toLowerCase().trim();
    if (s === '400' || s === 'normal' || s === 'regular') return 400;
    if (s === '500' || s === 'medium' || s === 'semibold') return 500;
    if (s === '700' || s === 'bold') return 700;
    if (s === '900' || s === 'black' || s === 'heavy' || s === 'extra-bold') return 900;
  }
  return defaultWeight;
}

export function migrateLegacyTypography(app?: Partial<PopupAppearance> | null) {
  const rawPreset = app?.fontPreset;
  const legacyFontFamily = app?.titleFontFamily || app?.bodyFontFamily || '';
  const customFontUrl = app?.customFontUrl || '';

  let presetId = DEFAULT_FONT_PRESET;

  if (rawPreset && FONT_PRESETS[rawPreset]) {
    presetId = rawPreset;
  } else if (customFontUrl && customFontUrl.toLowerCase().includes('neue')) {
    presetId = 'neue-einstellung';
  } else if (legacyFontFamily) {
    const f = legacyFontFamily.toLowerCase();
    if (f.includes('inter')) presetId = 'inter';
    else if (f.includes('manrope')) presetId = 'manrope';
    else if (f.includes('dm sans')) presetId = 'dm-sans';
    else if (f.includes('space grotesk')) presetId = 'space-grotesk';
    else if (f.includes('helvetica')) presetId = 'helvetica-neue';
    else presetId = 'neue-einstellung';
  }

  const titleWeight = parseFontWeight(app?.titleFontWeight, 700);
  const bodyWeight = parseFontWeight(app?.bodyFontWeight, 400);
  const buttonWeight = parseFontWeight(app?.buttonFontWeight, 500);
  const resultWeight = parseFontWeight(app?.resultFontWeight, 900);

  return {
    fontPreset: presetId,
    titleFontWeight: titleWeight,
    bodyFontWeight: bodyWeight,
    buttonFontWeight: buttonWeight,
    resultFontWeight: resultWeight,
  };
}
