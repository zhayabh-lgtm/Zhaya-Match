/**
 * Utility for WCAG contrast ratio calculations and contrast warnings
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 21; // fallback max contrast

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

export function checkContrastWarning(bgColor: string, textColor: string, minRatio = 3.0): string | null {
  const ratio = getContrastRatio(bgColor, textColor);
  if (ratio < minRatio) {
    return `Contraste reduzido (${ratio.toFixed(1)}:1). Recomendado no mínimo ${minRatio}:1 para legibilidade.`;
  }
  return null;
}

/**
 * Retorna '#000000' ou '#FFFFFF' para garantir o maior contraste contra a cor de fundo fornecida.
 */
export function getReadableTextColor(bgColor: string): '#000000' | '#FFFFFF' {
  if (!bgColor) return '#000000';
  const ratioBlack = getContrastRatio(bgColor, '#000000');
  const ratioWhite = getContrastRatio(bgColor, '#FFFFFF');
  return ratioBlack >= ratioWhite ? '#000000' : '#FFFFFF';
}
