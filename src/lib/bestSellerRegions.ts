import { resolveBestSellerUiLocale } from './bestSellerI18n.js';

/**
 * Idioma editorial padrão por país.
 *
 * Regras importantes para a Vitrine Internacional:
 * - Brasil permanece em português.
 * - Países cujo idioma principal é suportado recebem esse idioma.
 * - Qualquer país internacional sem mapeamento específico cai em inglês.
 *   Assim, um pacote de tradução em inglês funciona como fallback mundial.
 *
 * O mapa usa ISO-3166 alpha-2. Países multilíngues recebem o idioma comercial
 * mais útil para a experiência da Zhaya; uma regra exata do país no painel
 * sempre pode sobrescrever esse idioma.
 */
const COUNTRY_LOCALE_GROUPS: Record<string, string[]> = {
  pt: [
    'BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL',
  ],
  es: [
    'ES', 'MX', 'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ',
    'GT', 'HN', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE',
  ],
  ar: [
    'AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'MR', 'OM',
    'PS', 'QA', 'SA', 'SD', 'SY', 'TN', 'YE', 'DJ', 'KM', 'TD',
  ],
  fr: [
    'FR', 'BE', 'LU', 'MC', 'CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GN',
    'CD', 'CG', 'GA', 'CM', 'CF', 'DJ', 'KM', 'MG', 'MU', 'SC', 'HT', 'RW',
    'BI', 'VU', 'NC', 'PF', 'GP', 'MQ', 'RE', 'YT', 'BL', 'MF', 'PM',
  ],
  de: ['DE', 'AT', 'LI', 'CH'],
  it: ['IT', 'SM', 'VA'],
  'zh-Hans': ['CN'],
  'zh-Hant': ['TW', 'HK', 'MO'],
  ko: ['KR', 'KP'],
  da: ['DK', 'FO'],
  fi: ['FI'],
  hi: ['IN'],
  nl: ['NL', 'AW', 'CW', 'SX', 'SR'],
  id: ['ID'],
  ja: ['JP'],
  ms: ['MY', 'BN'],
  no: ['NO', 'SJ'],
  pl: ['PL'],
  sv: ['SE', 'AX'],
  th: ['TH'],
  tr: ['TR'],
  vi: ['VN'],
  en: [
    'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'SG', 'AG', 'AI', 'AS', 'BB',
    'BS', 'BZ', 'BM', 'BW', 'CC', 'CK', 'CX', 'DM', 'ER', 'FJ', 'FK', 'FM',
    'GD', 'GG', 'GH', 'GI', 'GM', 'GU', 'GY', 'IM', 'IO', 'JE', 'JM', 'KE',
    'KI', 'KN', 'KY', 'LC', 'LR', 'LS', 'MH', 'MP', 'MS', 'MT', 'MW', 'NA',
    'NF', 'NG', 'NR', 'NU', 'PG', 'PH', 'PN', 'PW', 'SB', 'SH', 'SL', 'SS',
    'SZ', 'TC', 'TK', 'TO', 'TT', 'TV', 'TZ', 'UG', 'VC', 'VG', 'VI', 'WS',
    'ZM', 'ZW',
  ],
};

const COUNTRY_LOCALE_MAP = Object.freeze(
  Object.entries(COUNTRY_LOCALE_GROUPS).reduce<Record<string, string>>((acc, [locale, countries]) => {
    countries.forEach((country) => {
      // O primeiro grupo vence para países multilíngues listados em mais de um grupo.
      if (!acc[country]) acc[country] = locale;
    });
    return acc;
  }, {}),
);

export function normalizeBestSellerRegionLocale(locale?: string | null): string {
  return resolveBestSellerUiLocale(locale);
}

export function resolveBestSellerCountryLocale(countryCode?: string | null): string {
  const code = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return 'pt';
  if (code === 'BR') return 'pt';
  return COUNTRY_LOCALE_MAP[code] || 'en';
}

export function isBestSellerForeignCountry(countryCode?: string | null): boolean {
  const code = String(countryCode || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'BR';
}
