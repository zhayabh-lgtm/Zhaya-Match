export type BestSellerAutoCategoryKey =
  | 'scarpins'
  | 'sandals'
  | 'flats'
  | 'sneakers'
  | 'flat_sandals'
  | 'bags'
  | 'belts'
  | 'loafers'
  | 'mules'
  | 'boots'
  | 'accessories'
  | 'other';

const PT_LABELS: Record<BestSellerAutoCategoryKey, string> = {
  scarpins: 'Scarpins',
  sandals: 'Sandálias',
  flats: 'Sapatilhas',
  sneakers: 'Tênis',
  flat_sandals: 'Rasteiras',
  bags: 'Bolsas',
  belts: 'Cintos',
  loafers: 'Loafers',
  mules: 'Mules',
  boots: 'Botas',
  accessories: 'Acessórios',
  other: 'Outros',
};

const CATEGORY_LABELS: Record<string, Record<BestSellerAutoCategoryKey, string>> = {
  pt: PT_LABELS,
  en: { scarpins: 'Pumps', sandals: 'Sandals', flats: 'Flats', sneakers: 'Sneakers', flat_sandals: 'Flat sandals', bags: 'Bags', belts: 'Belts', loafers: 'Loafers', mules: 'Mules', boots: 'Boots', accessories: 'Accessories', other: 'Other' },
  es: { scarpins: 'Salones', sandals: 'Sandalias', flats: 'Bailarinas', sneakers: 'Zapatillas', flat_sandals: 'Sandalias planas', bags: 'Bolsos', belts: 'Cinturones', loafers: 'Mocasines', mules: 'Mules', boots: 'Botas', accessories: 'Accesorios', other: 'Otros' },
  de: { scarpins: 'Pumps', sandals: 'Sandalen', flats: 'Ballerinas', sneakers: 'Sneaker', flat_sandals: 'Flache Sandalen', bags: 'Taschen', belts: 'Gürtel', loafers: 'Loafer', mules: 'Mules', boots: 'Stiefel', accessories: 'Accessoires', other: 'Andere' },
  fr: { scarpins: 'Escarpins', sandals: 'Sandales', flats: 'Ballerines', sneakers: 'Baskets', flat_sandals: 'Sandales plates', bags: 'Sacs', belts: 'Ceintures', loafers: 'Mocassins', mules: 'Mules', boots: 'Bottes', accessories: 'Accessoires', other: 'Autres' },
  it: { scarpins: 'Décolleté', sandals: 'Sandali', flats: 'Ballerine', sneakers: 'Sneakers', flat_sandals: 'Sandali bassi', bags: 'Borse', belts: 'Cinture', loafers: 'Mocassini', mules: 'Mules', boots: 'Stivali', accessories: 'Accessori', other: 'Altro' },
  nl: { scarpins: 'Pumps', sandals: 'Sandalen', flats: 'Ballerina’s', sneakers: 'Sneakers', flat_sandals: 'Platte sandalen', bags: 'Tassen', belts: 'Riemen', loafers: 'Loafers', mules: 'Mules', boots: 'Laarzen', accessories: 'Accessoires', other: 'Overig' },
  da: { scarpins: 'Pumps', sandals: 'Sandaler', flats: 'Ballerinaer', sneakers: 'Sneakers', flat_sandals: 'Flade sandaler', bags: 'Tasker', belts: 'Bælter', loafers: 'Loafers', mules: 'Mules', boots: 'Støvler', accessories: 'Tilbehør', other: 'Andet' },
  fi: { scarpins: 'Avokkaat', sandals: 'Sandaalit', flats: 'Ballerinat', sneakers: 'Tennarit', flat_sandals: 'Matalat sandaalit', bags: 'Laukut', belts: 'Vyöt', loafers: 'Loaferit', mules: 'Muulit', boots: 'Saappaat', accessories: 'Asusteet', other: 'Muut' },
  no: { scarpins: 'Pumps', sandals: 'Sandaler', flats: 'Ballerinasko', sneakers: 'Sneakers', flat_sandals: 'Flate sandaler', bags: 'Vesker', belts: 'Belter', loafers: 'Loafers', mules: 'Mules', boots: 'Støvler', accessories: 'Tilbehør', other: 'Annet' },
  sv: { scarpins: 'Pumps', sandals: 'Sandaler', flats: 'Ballerinaskor', sneakers: 'Sneakers', flat_sandals: 'Platta sandaler', bags: 'Väskor', belts: 'Bälten', loafers: 'Loafers', mules: 'Mules', boots: 'Stövlar', accessories: 'Accessoarer', other: 'Övrigt' },
  pl: { scarpins: 'Czółenka', sandals: 'Sandały', flats: 'Baleriny', sneakers: 'Sneakersy', flat_sandals: 'Płaskie sandały', bags: 'Torebki', belts: 'Paski', loafers: 'Mokasyny', mules: 'Klapki mule', boots: 'Botki i kozaki', accessories: 'Akcesoria', other: 'Inne' },
  tr: { scarpins: 'Stiletto', sandals: 'Sandalet', flats: 'Babet', sneakers: 'Spor ayakkabı', flat_sandals: 'Düz sandalet', bags: 'Çantalar', belts: 'Kemerler', loafers: 'Loafer', mules: 'Mule', boots: 'Botlar', accessories: 'Aksesuarlar', other: 'Diğer' },
  id: { scarpins: 'Pumps', sandals: 'Sandal', flats: 'Flat shoes', sneakers: 'Sneakers', flat_sandals: 'Sandal datar', bags: 'Tas', belts: 'Ikat pinggang', loafers: 'Loafers', mules: 'Mules', boots: 'Boots', accessories: 'Aksesori', other: 'Lainnya' },
  ms: { scarpins: 'Pumps', sandals: 'Sandal', flats: 'Kasut rata', sneakers: 'Sneakers', flat_sandals: 'Sandal rata', bags: 'Beg', belts: 'Tali pinggang', loafers: 'Loafers', mules: 'Mules', boots: 'But', accessories: 'Aksesori', other: 'Lain-lain' },
  vi: { scarpins: 'Giày cao gót', sandals: 'Sandal', flats: 'Giày bệt', sneakers: 'Sneaker', flat_sandals: 'Sandal bệt', bags: 'Túi', belts: 'Thắt lưng', loafers: 'Loafer', mules: 'Mules', boots: 'Boots', accessories: 'Phụ kiện', other: 'Khác' },
  hi: { scarpins: 'पंप्स', sandals: 'सैंडल', flats: 'फ्लैट्स', sneakers: 'स्नीकर्स', flat_sandals: 'फ्लैट सैंडल', bags: 'बैग', belts: 'बेल्ट', loafers: 'लोफर्स', mules: 'म्यूल्स', boots: 'बूट्स', accessories: 'एक्सेसरीज़', other: 'अन्य' },
  th: { scarpins: 'รองเท้าส้นสูง', sandals: 'รองเท้าแตะ', flats: 'รองเท้าส้นแบน', sneakers: 'สนีกเกอร์', flat_sandals: 'รองเท้าแตะแบน', bags: 'กระเป๋า', belts: 'เข็มขัด', loafers: 'โลฟเฟอร์', mules: 'มูลส์', boots: 'บูท', accessories: 'เครื่องประดับ', other: 'อื่น ๆ' },
  ko: { scarpins: '펌프스', sandals: '샌들', flats: '플랫', sneakers: '스니커즈', flat_sandals: '플랫 샌들', bags: '가방', belts: '벨트', loafers: '로퍼', mules: '뮬', boots: '부츠', accessories: '액세서리', other: '기타' },
  ja: { scarpins: 'パンプス', sandals: 'サンダル', flats: 'フラットシューズ', sneakers: 'スニーカー', flat_sandals: 'フラットサンダル', bags: 'バッグ', belts: 'ベルト', loafers: 'ローファー', mules: 'ミュール', boots: 'ブーツ', accessories: 'アクセサリー', other: 'その他' },
  'zh-Hans': { scarpins: '高跟鞋', sandals: '凉鞋', flats: '平底鞋', sneakers: '运动鞋', flat_sandals: '平底凉鞋', bags: '包袋', belts: '腰带', loafers: '乐福鞋', mules: '穆勒鞋', boots: '靴子', accessories: '配饰', other: '其他' },
  'zh-Hant': { scarpins: '高跟鞋', sandals: '涼鞋', flats: '平底鞋', sneakers: '運動鞋', flat_sandals: '平底涼鞋', bags: '包袋', belts: '腰帶', loafers: '樂福鞋', mules: '穆勒鞋', boots: '靴子', accessories: '配飾', other: '其他' },
  ar: { scarpins: 'أحذية بكعب', sandals: 'صنادل', flats: 'أحذية مسطحة', sneakers: 'أحذية رياضية', flat_sandals: 'صنادل مسطحة', bags: 'حقائب', belts: 'أحزمة', loafers: 'لوفر', mules: 'ميول', boots: 'بوت', accessories: 'إكسسوارات', other: 'أخرى' },
};

function normalize(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function detectBestSellerCategoryKey(product: { name?: string | null; category?: string | null }): BestSellerAutoCategoryKey {
  const text = normalize(`${product.name || ''} ${product.category || ''}`);
  if (/\bscarpin|pump|stiletto\b/.test(text)) return 'scarpins';
  if (/\brasteira|rasteirinha|slide\b/.test(text)) return 'flat_sandals';
  if (/\bsandalia|sandal\b/.test(text)) return 'sandals';
  if (/\bsapatilha|bailarina|flat\b/.test(text)) return 'flats';
  if (/\btenis|sneaker\b/.test(text)) return 'sneakers';
  if (/\bbolsa|bag|carteira|clutch\b/.test(text)) return 'bags';
  if (/\bcinto|belt\b/.test(text)) return 'belts';
  if (/\bloafer|mocassim\b/.test(text)) return 'loafers';
  if (/\bmule\b/.test(text)) return 'mules';
  if (/\bbota|boot\b/.test(text)) return 'boots';
  if (/\bacessorio|accessor|colar|brinco|pulseira|anel\b/.test(text)) return 'accessories';
  return 'other';
}

export function getBestSellerCategoryBaseLabel(key: BestSellerAutoCategoryKey): string {
  return PT_LABELS[key] || PT_LABELS.other;
}

export function getBestSellerCategoryLabel(locale: string | null | undefined, key: BestSellerAutoCategoryKey): string {
  const raw = String(locale || '').replace('_', '-').trim();
  const lower = raw.toLowerCase();
  const resolved = lower.startsWith('zh') ? (/hant|tw|hk|mo/.test(lower) ? 'zh-Hant' : 'zh-Hans') : lower.split('-')[0];
  return (CATEGORY_LABELS[resolved] || CATEGORY_LABELS.en)[key] || CATEGORY_LABELS.en.other;
}

export const BEST_SELLER_CATEGORY_KEYS = Object.keys(PT_LABELS) as BestSellerAutoCategoryKey[];
