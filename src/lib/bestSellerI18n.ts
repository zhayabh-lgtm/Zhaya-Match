export interface BestSellerUiText {
  locale: string;
  dir: 'ltr' | 'rtl';
  pageTitle: string;
  loadingSelection: string;
  loadError: string;
  retry: string;
  bestSellers: string;
  selectionUnavailable: string;
  bestSellersToday: string;
  noProducts: string;
  mediaUnavailable: string;
  watchVideo: string;
  pauseVideo: string;
  playVideo: string;
  videoProgress: string;
  enableSound: string;
  muteVideo: string;
  videoVolume: string;
  previousMedia: string;
  nextMedia: string;
  mediaGallery: string;
  viewVideo: string;
  viewImage: string;
  position: string;
  outOfStock: string;
  endsIn: string;
  closed: string;
  gift: string;
  presentationVideo: string;
  seeProductBelow: string;
  checkItOut: string;
  advantages: string;
  soldCount: string;
  stockCount: string;
  lowStockCount: string;
  installments: string;
  defaultCta: string;
  approximateConversion: string;
  cover: string;
  formOpenCta: string;
  formDefaultTitle: string;
  formDefaultMessage: string;
  formProductLabel: string;
  formNameLabel: string;
  formEmailLabel: string;
  formPhoneLabel: string;
  formSubmit: string;
  formSending: string;
  formSuccessTitle: string;
  formSuccessMessage: string;
  formError: string;
  formRequired: string;
  formInvalidEmail: string;
  formClose: string;
  organizedTitle: string;
  organizedSubtitle: string;
  organizedAll: string;
  organizedProducts: string;
  organizedContinue: string;
  organizedBack: string;
}


type BestSellerFormUiTextKeys =
  | 'formOpenCta'
  | 'formDefaultTitle'
  | 'formDefaultMessage'
  | 'formProductLabel'
  | 'formNameLabel'
  | 'formEmailLabel'
  | 'formPhoneLabel'
  | 'formSubmit'
  | 'formSending'
  | 'formSuccessTitle'
  | 'formSuccessMessage'
  | 'formError'
  | 'formRequired'
  | 'formInvalidEmail'
  | 'formClose';

type BestSellerOrganizedUiTextKeys =
  | 'organizedTitle'
  | 'organizedSubtitle'
  | 'organizedAll'
  | 'organizedProducts'
  | 'organizedContinue'
  | 'organizedBack';

type BestSellerBaseUiText = Omit<BestSellerUiText, BestSellerFormUiTextKeys | BestSellerOrganizedUiTextKeys>;

const PACKS: Record<string, BestSellerBaseUiText> = {
  pt: {
    locale: 'pt', dir: 'ltr', pageTitle: 'Mais Vendidos do Dia | Zhaya', loadingSelection: 'Carregando seleção...', loadError: 'Não foi possível carregar os produtos agora.', retry: 'Tentar novamente', bestSellers: 'Mais Vendidos', selectionUnavailable: 'Nossa seleção de hoje ainda não está disponível.', bestSellersToday: 'Mais Vendidos do Dia', noProducts: 'Nenhum produto cadastrado para esta seleção.', mediaUnavailable: 'Mídia indisponível', watchVideo: 'ASSISTIR VÍDEO', pauseVideo: 'Pausar vídeo', playVideo: 'Reproduzir vídeo', videoProgress: 'Progresso do vídeo', enableSound: 'Ativar som', muteVideo: 'Silenciar vídeo', videoVolume: 'Volume do vídeo', previousMedia: 'Mídia anterior', nextMedia: 'Próxima mídia', mediaGallery: 'Galeria de mídia', viewVideo: 'Ver vídeo {index}', viewImage: 'Ver imagem {index}', position: 'Posição {position}', outOfStock: 'Fora de estoque', endsIn: 'TERMINA EM', closed: 'ENCERRADO', gift: 'Presente', presentationVideo: 'Vídeo de apresentação do produto', seeProductBelow: 'Ver produto abaixo', checkItOut: 'Confira', advantages: 'Vantagens Zhaya', soldCount: '{count} vendidos hoje', stockCount: '{count} unidades disponíveis', lowStockCount: 'Últimas {count} unidades', installments: 'Até {count}x de {value} sem juros', defaultCta: 'GARANTIR MEU PAR', approximateConversion: 'Conversão aproximada', cover: 'capa',
  },
  en: {
    locale: 'en', dir: 'ltr', pageTitle: 'Today’s Best Sellers | Zhaya', loadingSelection: 'Loading selection...', loadError: 'We couldn’t load the products right now.', retry: 'Try again', bestSellers: 'Best Sellers', selectionUnavailable: 'Today’s selection is not available yet.', bestSellersToday: 'Today’s Best Sellers', noProducts: 'No products have been added to this selection.', mediaUnavailable: 'Media unavailable', watchVideo: 'WATCH VIDEO', pauseVideo: 'Pause video', playVideo: 'Play video', videoProgress: 'Video progress', enableSound: 'Turn sound on', muteVideo: 'Mute video', videoVolume: 'Video volume', previousMedia: 'Previous media', nextMedia: 'Next media', mediaGallery: 'Media gallery', viewVideo: 'View video {index}', viewImage: 'View image {index}', position: 'Position {position}', outOfStock: 'Out of stock', endsIn: 'ENDS IN', closed: 'ENDED', gift: 'Gift', presentationVideo: 'Product presentation video', seeProductBelow: 'See product below', checkItOut: 'Take a look', advantages: 'Zhaya Benefits', soldCount: '{count} sold today', stockCount: '{count} units available', lowStockCount: 'Only {count} units left', installments: 'Up to {count}x of {value} interest-free', defaultCta: 'GET MY PAIR', approximateConversion: 'Approximate conversion', cover: 'cover',
  },
  es: {
    locale: 'es', dir: 'ltr', pageTitle: 'Más vendidos de hoy | Zhaya', loadingSelection: 'Cargando selección...', loadError: 'No pudimos cargar los productos en este momento.', retry: 'Intentar de nuevo', bestSellers: 'Más vendidos', selectionUnavailable: 'La selección de hoy aún no está disponible.', bestSellersToday: 'Más vendidos de hoy', noProducts: 'No hay productos registrados en esta selección.', mediaUnavailable: 'Contenido no disponible', watchVideo: 'VER VIDEO', pauseVideo: 'Pausar video', playVideo: 'Reproducir video', videoProgress: 'Progreso del video', enableSound: 'Activar sonido', muteVideo: 'Silenciar video', videoVolume: 'Volumen del video', previousMedia: 'Contenido anterior', nextMedia: 'Contenido siguiente', mediaGallery: 'Galería multimedia', viewVideo: 'Ver video {index}', viewImage: 'Ver imagen {index}', position: 'Posición {position}', outOfStock: 'Agotado', endsIn: 'TERMINA EN', closed: 'FINALIZADO', gift: 'Regalo', presentationVideo: 'Video de presentación del producto', seeProductBelow: 'Ver producto abajo', checkItOut: 'Descubre', advantages: 'Ventajas Zhaya', soldCount: '{count} vendidos hoy', stockCount: '{count} unidades disponibles', lowStockCount: 'Últimas {count} unidades', installments: 'Hasta {count}x de {value} sin intereses', defaultCta: 'QUIERO MI PAR', approximateConversion: 'Conversión aproximada', cover: 'portada',
  },
  de: {
    locale: 'de', dir: 'ltr', pageTitle: 'Bestseller des Tages | Zhaya', loadingSelection: 'Auswahl wird geladen...', loadError: 'Die Produkte konnten gerade nicht geladen werden.', retry: 'Erneut versuchen', bestSellers: 'Bestseller', selectionUnavailable: 'Die heutige Auswahl ist noch nicht verfügbar.', bestSellersToday: 'Bestseller des Tages', noProducts: 'Für diese Auswahl sind keine Produkte eingetragen.', mediaUnavailable: 'Medium nicht verfügbar', watchVideo: 'VIDEO ANSEHEN', pauseVideo: 'Video pausieren', playVideo: 'Video abspielen', videoProgress: 'Videofortschritt', enableSound: 'Ton einschalten', muteVideo: 'Video stummschalten', videoVolume: 'Videolautstärke', previousMedia: 'Vorheriges Medium', nextMedia: 'Nächstes Medium', mediaGallery: 'Mediengalerie', viewVideo: 'Video {index} ansehen', viewImage: 'Bild {index} ansehen', position: 'Position {position}', outOfStock: 'Nicht auf Lager', endsIn: 'ENDET IN', closed: 'BEENDET', gift: 'Geschenk', presentationVideo: 'Produktpräsentationsvideo', seeProductBelow: 'Produkt darunter ansehen', checkItOut: 'Ansehen', advantages: 'Zhaya Vorteile', soldCount: 'Heute verkauft: {count}', stockCount: 'Verfügbar: {count}', lowStockCount: 'Nur noch {count} verfügbar', installments: 'Bis zu {count}x {value} zinsfrei', defaultCta: 'MEIN PAAR SICHERN', approximateConversion: 'Ungefähre Umrechnung', cover: 'Cover',
  },
  ar: {
    locale: 'ar', dir: 'rtl', pageTitle: 'الأكثر مبيعًا اليوم | Zhaya', loadingSelection: 'جارٍ تحميل التشكيلة...', loadError: 'تعذر تحميل المنتجات الآن.', retry: 'إعادة المحاولة', bestSellers: 'الأكثر مبيعًا', selectionUnavailable: 'تشكيلة اليوم غير متاحة بعد.', bestSellersToday: 'الأكثر مبيعًا اليوم', noProducts: 'لا توجد منتجات مضافة إلى هذه التشكيلة.', mediaUnavailable: 'الوسائط غير متاحة', watchVideo: 'مشاهدة الفيديو', pauseVideo: 'إيقاف الفيديو مؤقتًا', playVideo: 'تشغيل الفيديو', videoProgress: 'تقدم الفيديو', enableSound: 'تشغيل الصوت', muteVideo: 'كتم الفيديو', videoVolume: 'مستوى صوت الفيديو', previousMedia: 'الوسائط السابقة', nextMedia: 'الوسائط التالية', mediaGallery: 'معرض الوسائط', viewVideo: 'عرض الفيديو {index}', viewImage: 'عرض الصورة {index}', position: 'الترتيب {position}', outOfStock: 'غير متوفر', endsIn: 'ينتهي خلال', closed: 'انتهى', gift: 'هدية', presentationVideo: 'فيديو تقديم المنتج', seeProductBelow: 'عرض المنتج أدناه', checkItOut: 'شاهد', advantages: 'مزايا Zhaya', soldCount: 'تم بيع {count} اليوم', stockCount: 'المتاح: {count}', lowStockCount: 'متبقي {count} فقط', installments: 'حتى {count} دفعات بقيمة {value} بدون فوائد', defaultCta: 'احصل على زوجي', approximateConversion: 'تحويل تقريبي', cover: 'الغلاف',
  },
  fr: {
    locale: 'fr', dir: 'ltr', pageTitle: 'Meilleures ventes du jour | Zhaya', loadingSelection: 'Chargement de la sélection...', loadError: 'Impossible de charger les produits pour le moment.', retry: 'Réessayer', bestSellers: 'Meilleures ventes', selectionUnavailable: 'La sélection du jour n’est pas encore disponible.', bestSellersToday: 'Meilleures ventes du jour', noProducts: 'Aucun produit n’a été ajouté à cette sélection.', mediaUnavailable: 'Média indisponible', watchVideo: 'VOIR LA VIDÉO', pauseVideo: 'Mettre la vidéo en pause', playVideo: 'Lire la vidéo', videoProgress: 'Progression de la vidéo', enableSound: 'Activer le son', muteVideo: 'Couper le son', videoVolume: 'Volume de la vidéo', previousMedia: 'Média précédent', nextMedia: 'Média suivant', mediaGallery: 'Galerie média', viewVideo: 'Voir la vidéo {index}', viewImage: 'Voir l’image {index}', position: 'Position {position}', outOfStock: 'Rupture de stock', endsIn: 'SE TERMINE DANS', closed: 'TERMINÉ', gift: 'Cadeau', presentationVideo: 'Vidéo de présentation du produit', seeProductBelow: 'Voir le produit ci-dessous', checkItOut: 'Découvrir', advantages: 'Avantages Zhaya', soldCount: '{count} vendus aujourd’hui', stockCount: '{count} unités disponibles', lowStockCount: 'Plus que {count} unités', installments: 'Jusqu’à {count}x de {value} sans intérêts', defaultCta: 'OBTENIR MA PAIRE', approximateConversion: 'Conversion approximative', cover: 'couverture',
  },
  'zh-Hans': {
    locale: 'zh-Hans', dir: 'ltr', pageTitle: '今日热销 | Zhaya', loadingSelection: '正在加载精选...', loadError: '暂时无法加载商品。', retry: '重试', bestSellers: '热销商品', selectionUnavailable: '今日精选尚未开放。', bestSellersToday: '今日热销', noProducts: '此精选中暂无商品。', mediaUnavailable: '媒体不可用', watchVideo: '观看视频', pauseVideo: '暂停视频', playVideo: '播放视频', videoProgress: '视频进度', enableSound: '开启声音', muteVideo: '静音视频', videoVolume: '视频音量', previousMedia: '上一个媒体', nextMedia: '下一个媒体', mediaGallery: '媒体画廊', viewVideo: '查看视频 {index}', viewImage: '查看图片 {index}', position: '排名 {position}', outOfStock: '缺货', endsIn: '剩余时间', closed: '已结束', gift: '赠品', presentationVideo: '商品介绍视频', seeProductBelow: '查看下方商品', checkItOut: '查看', advantages: 'Zhaya 优势', soldCount: '今日已售 {count}', stockCount: '可售 {count} 件', lowStockCount: '仅剩 {count} 件', installments: '最多 {count} 期，每期 {value}，免息', defaultCta: '立即购买', approximateConversion: '近似换算', cover: '封面',
  },
  'zh-Hant': {
    locale: 'zh-Hant', dir: 'ltr', pageTitle: '今日熱銷 | Zhaya', loadingSelection: '正在載入精選...', loadError: '目前無法載入商品。', retry: '再試一次', bestSellers: '熱銷商品', selectionUnavailable: '今日精選尚未開放。', bestSellersToday: '今日熱銷', noProducts: '此精選中尚無商品。', mediaUnavailable: '媒體無法使用', watchVideo: '觀看影片', pauseVideo: '暫停影片', playVideo: '播放影片', videoProgress: '影片進度', enableSound: '開啟聲音', muteVideo: '影片靜音', videoVolume: '影片音量', previousMedia: '上一個媒體', nextMedia: '下一個媒體', mediaGallery: '媒體藝廊', viewVideo: '查看影片 {index}', viewImage: '查看圖片 {index}', position: '排名 {position}', outOfStock: '缺貨', endsIn: '剩餘時間', closed: '已結束', gift: '贈品', presentationVideo: '商品介紹影片', seeProductBelow: '查看下方商品', checkItOut: '查看', advantages: 'Zhaya 優勢', soldCount: '今日已售 {count}', stockCount: '可售 {count} 件', lowStockCount: '僅剩 {count} 件', installments: '最多 {count} 期，每期 {value}，免息', defaultCta: '立即購買', approximateConversion: '約略換算', cover: '封面',
  },
  ko: {
    locale: 'ko', dir: 'ltr', pageTitle: '오늘의 베스트셀러 | Zhaya', loadingSelection: '선택 상품을 불러오는 중...', loadError: '현재 상품을 불러올 수 없습니다.', retry: '다시 시도', bestSellers: '베스트셀러', selectionUnavailable: '오늘의 선택 상품은 아직 준비되지 않았습니다.', bestSellersToday: '오늘의 베스트셀러', noProducts: '이 선택에 등록된 상품이 없습니다.', mediaUnavailable: '미디어를 사용할 수 없습니다', watchVideo: '영상 보기', pauseVideo: '영상 일시정지', playVideo: '영상 재생', videoProgress: '영상 진행률', enableSound: '소리 켜기', muteVideo: '영상 음소거', videoVolume: '영상 볼륨', previousMedia: '이전 미디어', nextMedia: '다음 미디어', mediaGallery: '미디어 갤러리', viewVideo: '영상 {index} 보기', viewImage: '이미지 {index} 보기', position: '순위 {position}', outOfStock: '품절', endsIn: '종료까지', closed: '종료됨', gift: '선물', presentationVideo: '상품 소개 영상', seeProductBelow: '아래 상품 보기', checkItOut: '확인하기', advantages: 'Zhaya 혜택', soldCount: '오늘 {count}개 판매', stockCount: '{count}개 구매 가능', lowStockCount: '단 {count}개 남음', installments: '최대 {count}회, 회당 {value}, 무이자', defaultCta: '내 상품 구매하기', approximateConversion: '대략적인 환산', cover: '커버',
  },
  da: {
    locale: 'da', dir: 'ltr', pageTitle: 'Dagens bestsellere | Zhaya', loadingSelection: 'Indlæser udvalg...', loadError: 'Produkterne kunne ikke indlæses lige nu.', retry: 'Prøv igen', bestSellers: 'Bestsellere', selectionUnavailable: 'Dagens udvalg er ikke tilgængeligt endnu.', bestSellersToday: 'Dagens bestsellere', noProducts: 'Der er ingen produkter i dette udvalg.', mediaUnavailable: 'Medie ikke tilgængeligt', watchVideo: 'SE VIDEO', pauseVideo: 'Sæt video på pause', playVideo: 'Afspil video', videoProgress: 'Videoforløb', enableSound: 'Slå lyd til', muteVideo: 'Slå lyd fra', videoVolume: 'Videolydstyrke', previousMedia: 'Forrige medie', nextMedia: 'Næste medie', mediaGallery: 'Mediegalleri', viewVideo: 'Se video {index}', viewImage: 'Se billede {index}', position: 'Placering {position}', outOfStock: 'Udsolgt', endsIn: 'SLUTTER OM', closed: 'SLUT', gift: 'Gave', presentationVideo: 'Produktpræsentationsvideo', seeProductBelow: 'Se produktet nedenfor', checkItOut: 'Se mere', advantages: 'Zhaya fordele', soldCount: '{count} solgt i dag', stockCount: '{count} enheder tilgængelige', lowStockCount: 'Kun {count} tilbage', installments: 'Op til {count}x {value} uden renter', defaultCta: 'FÅ MIT PAR', approximateConversion: 'Omtrentlig omregning', cover: 'cover',
  },
  fi: {
    locale: 'fi', dir: 'ltr', pageTitle: 'Päivän myydyimmät | Zhaya', loadingSelection: 'Valikoimaa ladataan...', loadError: 'Tuotteita ei voitu ladata juuri nyt.', retry: 'Yritä uudelleen', bestSellers: 'Myydyimmät', selectionUnavailable: 'Päivän valikoima ei ole vielä saatavilla.', bestSellersToday: 'Päivän myydyimmät', noProducts: 'Tähän valikoimaan ei ole lisätty tuotteita.', mediaUnavailable: 'Media ei ole saatavilla', watchVideo: 'KATSO VIDEO', pauseVideo: 'Keskeytä video', playVideo: 'Toista video', videoProgress: 'Videon eteneminen', enableSound: 'Ota ääni käyttöön', muteVideo: 'Mykistä video', videoVolume: 'Videon äänenvoimakkuus', previousMedia: 'Edellinen media', nextMedia: 'Seuraava media', mediaGallery: 'Mediagalleria', viewVideo: 'Katso video {index}', viewImage: 'Katso kuva {index}', position: 'Sija {position}', outOfStock: 'Loppuunmyyty', endsIn: 'PÄÄTTYY', closed: 'PÄÄTTYNYT', gift: 'Lahja', presentationVideo: 'Tuotteen esittelyvideo', seeProductBelow: 'Katso tuote alta', checkItOut: 'Katso', advantages: 'Zhaya-edut', soldCount: 'Myyty tänään: {count}', stockCount: 'Saatavilla: {count}', lowStockCount: 'Vain {count} jäljellä', installments: 'Enintään {count} × {value} ilman korkoa', defaultCta: 'HANKI PARINI', approximateConversion: 'Arvioitu muunnos', cover: 'kansikuva',
  },
  hi: {
    locale: 'hi', dir: 'ltr', pageTitle: 'आज के बेस्ट सेलर्स | Zhaya', loadingSelection: 'चयन लोड हो रहा है...', loadError: 'अभी उत्पाद लोड नहीं हो सके।', retry: 'फिर कोशिश करें', bestSellers: 'बेस्ट सेलर्स', selectionUnavailable: 'आज का चयन अभी उपलब्ध नहीं है।', bestSellersToday: 'आज के बेस्ट सेलर्स', noProducts: 'इस चयन में कोई उत्पाद नहीं जोड़ा गया है।', mediaUnavailable: 'मीडिया उपलब्ध नहीं है', watchVideo: 'वीडियो देखें', pauseVideo: 'वीडियो रोकें', playVideo: 'वीडियो चलाएँ', videoProgress: 'वीडियो प्रगति', enableSound: 'आवाज़ चालू करें', muteVideo: 'वीडियो म्यूट करें', videoVolume: 'वीडियो वॉल्यूम', previousMedia: 'पिछला मीडिया', nextMedia: 'अगला मीडिया', mediaGallery: 'मीडिया गैलरी', viewVideo: 'वीडियो {index} देखें', viewImage: 'चित्र {index} देखें', position: 'स्थान {position}', outOfStock: 'स्टॉक में नहीं', endsIn: 'समाप्त होने में', closed: 'समाप्त', gift: 'उपहार', presentationVideo: 'उत्पाद प्रस्तुति वीडियो', seeProductBelow: 'नीचे उत्पाद देखें', checkItOut: 'देखें', advantages: 'Zhaya लाभ', soldCount: 'आज {count} बिके', stockCount: '{count} उपलब्ध', lowStockCount: 'केवल {count} बचे', installments: '{count} किस्तों तक, प्रत्येक {value}, बिना ब्याज', defaultCta: 'अपनी जोड़ी लें', approximateConversion: 'अनुमानित रूपांतरण', cover: 'कवर',
  },
  nl: {
    locale: 'nl', dir: 'ltr', pageTitle: 'Bestsellers van vandaag | Zhaya', loadingSelection: 'Selectie laden...', loadError: 'De producten konden nu niet worden geladen.', retry: 'Opnieuw proberen', bestSellers: 'Bestsellers', selectionUnavailable: 'De selectie van vandaag is nog niet beschikbaar.', bestSellersToday: 'Bestsellers van vandaag', noProducts: 'Er zijn geen producten aan deze selectie toegevoegd.', mediaUnavailable: 'Media niet beschikbaar', watchVideo: 'VIDEO BEKIJKEN', pauseVideo: 'Video pauzeren', playVideo: 'Video afspelen', videoProgress: 'Videovoortgang', enableSound: 'Geluid aanzetten', muteVideo: 'Video dempen', videoVolume: 'Videovolume', previousMedia: 'Vorige media', nextMedia: 'Volgende media', mediaGallery: 'Mediagalerij', viewVideo: 'Video {index} bekijken', viewImage: 'Afbeelding {index} bekijken', position: 'Positie {position}', outOfStock: 'Niet op voorraad', endsIn: 'EINDIGT OVER', closed: 'AFGELOPEN', gift: 'Cadeau', presentationVideo: 'Productpresentatievideo', seeProductBelow: 'Bekijk product hieronder', checkItOut: 'Bekijk', advantages: 'Zhaya voordelen', soldCount: 'Vandaag verkocht: {count}', stockCount: 'Beschikbaar: {count}', lowStockCount: 'Nog maar {count} beschikbaar', installments: 'Tot {count}x {value} renteloos', defaultCta: 'MIJN PAAR KOPEN', approximateConversion: 'Geschatte conversie', cover: 'cover',
  },
  id: {
    locale: 'id', dir: 'ltr', pageTitle: 'Terlaris Hari Ini | Zhaya', loadingSelection: 'Memuat pilihan...', loadError: 'Produk tidak dapat dimuat saat ini.', retry: 'Coba lagi', bestSellers: 'Terlaris', selectionUnavailable: 'Pilihan hari ini belum tersedia.', bestSellersToday: 'Terlaris Hari Ini', noProducts: 'Belum ada produk pada pilihan ini.', mediaUnavailable: 'Media tidak tersedia', watchVideo: 'TONTON VIDEO', pauseVideo: 'Jeda video', playVideo: 'Putar video', videoProgress: 'Progres video', enableSound: 'Nyalakan suara', muteVideo: 'Bisukan video', videoVolume: 'Volume video', previousMedia: 'Media sebelumnya', nextMedia: 'Media berikutnya', mediaGallery: 'Galeri media', viewVideo: 'Lihat video {index}', viewImage: 'Lihat gambar {index}', position: 'Posisi {position}', outOfStock: 'Stok habis', endsIn: 'BERAKHIR DALAM', closed: 'BERAKHIR', gift: 'Hadiah', presentationVideo: 'Video presentasi produk', seeProductBelow: 'Lihat produk di bawah', checkItOut: 'Lihat', advantages: 'Keuntungan Zhaya', soldCount: '{count} terjual hari ini', stockCount: '{count} unit tersedia', lowStockCount: 'Tersisa {count} unit', installments: 'Hingga {count}x {value} tanpa bunga', defaultCta: 'DAPATKAN PASANGAN SAYA', approximateConversion: 'Konversi perkiraan', cover: 'sampul',
  },
  it: {
    locale: 'it', dir: 'ltr', pageTitle: 'Più venduti di oggi | Zhaya', loadingSelection: 'Caricamento selezione...', loadError: 'Non è stato possibile caricare i prodotti al momento.', retry: 'Riprova', bestSellers: 'Più venduti', selectionUnavailable: 'La selezione di oggi non è ancora disponibile.', bestSellersToday: 'Più venduti di oggi', noProducts: 'Nessun prodotto è stato aggiunto a questa selezione.', mediaUnavailable: 'Contenuto non disponibile', watchVideo: 'GUARDA IL VIDEO', pauseVideo: 'Metti in pausa il video', playVideo: 'Riproduci video', videoProgress: 'Avanzamento video', enableSound: 'Attiva audio', muteVideo: 'Disattiva audio', videoVolume: 'Volume video', previousMedia: 'Contenuto precedente', nextMedia: 'Contenuto successivo', mediaGallery: 'Galleria multimediale', viewVideo: 'Guarda video {index}', viewImage: 'Guarda immagine {index}', position: 'Posizione {position}', outOfStock: 'Esaurito', endsIn: 'TERMINA TRA', closed: 'TERMINATO', gift: 'Regalo', presentationVideo: 'Video di presentazione del prodotto', seeProductBelow: 'Vedi il prodotto qui sotto', checkItOut: 'Scopri', advantages: 'Vantaggi Zhaya', soldCount: '{count} venduti oggi', stockCount: '{count} unità disponibili', lowStockCount: 'Solo {count} unità rimaste', installments: 'Fino a {count} rate da {value} senza interessi', defaultCta: 'VOGLIO IL MIO PAIO', approximateConversion: 'Conversione approssimativa', cover: 'copertina',
  },
  ja: {
    locale: 'ja', dir: 'ltr', pageTitle: '本日のベストセラー | Zhaya', loadingSelection: 'セレクションを読み込み中...', loadError: '現在商品を読み込めません。', retry: 'もう一度試す', bestSellers: 'ベストセラー', selectionUnavailable: '本日のセレクションはまだ公開されていません。', bestSellersToday: '本日のベストセラー', noProducts: 'このセレクションには商品が登録されていません。', mediaUnavailable: 'メディアを利用できません', watchVideo: '動画を見る', pauseVideo: '動画を一時停止', playVideo: '動画を再生', videoProgress: '動画の進行状況', enableSound: '音声をオン', muteVideo: '動画をミュート', videoVolume: '動画の音量', previousMedia: '前のメディア', nextMedia: '次のメディア', mediaGallery: 'メディアギャラリー', viewVideo: '動画 {index} を見る', viewImage: '画像 {index} を見る', position: '順位 {position}', outOfStock: '在庫切れ', endsIn: '終了まで', closed: '終了', gift: 'プレゼント', presentationVideo: '商品紹介動画', seeProductBelow: '下の商品を見る', checkItOut: 'チェック', advantages: 'Zhaya の特典', soldCount: '本日 {count} 点販売', stockCount: '在庫 {count} 点', lowStockCount: '残り {count} 点', installments: '最大 {count} 回、1回 {value}、金利なし', defaultCta: 'この商品を購入', approximateConversion: '概算換算', cover: 'カバー',
  },
  ms: {
    locale: 'ms', dir: 'ltr', pageTitle: 'Paling Laris Hari Ini | Zhaya', loadingSelection: 'Memuatkan pilihan...', loadError: 'Produk tidak dapat dimuatkan sekarang.', retry: 'Cuba lagi', bestSellers: 'Paling Laris', selectionUnavailable: 'Pilihan hari ini belum tersedia.', bestSellersToday: 'Paling Laris Hari Ini', noProducts: 'Tiada produk ditambah pada pilihan ini.', mediaUnavailable: 'Media tidak tersedia', watchVideo: 'TONTON VIDEO', pauseVideo: 'Jeda video', playVideo: 'Mainkan video', videoProgress: 'Kemajuan video', enableSound: 'Hidupkan bunyi', muteVideo: 'Senyapkan video', videoVolume: 'Kelantangan video', previousMedia: 'Media sebelumnya', nextMedia: 'Media seterusnya', mediaGallery: 'Galeri media', viewVideo: 'Lihat video {index}', viewImage: 'Lihat imej {index}', position: 'Kedudukan {position}', outOfStock: 'Kehabisan stok', endsIn: 'BERAKHIR DALAM', closed: 'TAMAT', gift: 'Hadiah', presentationVideo: 'Video persembahan produk', seeProductBelow: 'Lihat produk di bawah', checkItOut: 'Lihat', advantages: 'Kelebihan Zhaya', soldCount: '{count} terjual hari ini', stockCount: '{count} unit tersedia', lowStockCount: 'Tinggal {count} unit', installments: 'Sehingga {count}x {value} tanpa faedah', defaultCta: 'DAPATKAN PASANGAN SAYA', approximateConversion: 'Penukaran anggaran', cover: 'kulit',
  },
  no: {
    locale: 'no', dir: 'ltr', pageTitle: 'Dagens bestselgere | Zhaya', loadingSelection: 'Laster utvalg...', loadError: 'Produktene kunne ikke lastes akkurat nå.', retry: 'Prøv igjen', bestSellers: 'Bestselgere', selectionUnavailable: 'Dagens utvalg er ikke tilgjengelig ennå.', bestSellersToday: 'Dagens bestselgere', noProducts: 'Ingen produkter er lagt til i dette utvalget.', mediaUnavailable: 'Mediet er ikke tilgjengelig', watchVideo: 'SE VIDEO', pauseVideo: 'Sett video på pause', playVideo: 'Spill av video', videoProgress: 'Videofremdrift', enableSound: 'Slå på lyd', muteVideo: 'Demp video', videoVolume: 'Videovolum', previousMedia: 'Forrige medium', nextMedia: 'Neste medium', mediaGallery: 'Mediegalleri', viewVideo: 'Se video {index}', viewImage: 'Se bilde {index}', position: 'Plassering {position}', outOfStock: 'Utsolgt', endsIn: 'SLUTTER OM', closed: 'AVSLUTTET', gift: 'Gave', presentationVideo: 'Produktpresentasjonsvideo', seeProductBelow: 'Se produktet nedenfor', checkItOut: 'Se', advantages: 'Zhaya fordeler', soldCount: '{count} solgt i dag', stockCount: '{count} enheter tilgjengelig', lowStockCount: 'Kun {count} igjen', installments: 'Opptil {count}x {value} uten renter', defaultCta: 'FÅ MITT PAR', approximateConversion: 'Omtrentlig konvertering', cover: 'omslag',
  },
  pl: {
    locale: 'pl', dir: 'ltr', pageTitle: 'Dzisiejsze bestsellery | Zhaya', loadingSelection: 'Ładowanie wyboru...', loadError: 'Nie udało się teraz wczytać produktów.', retry: 'Spróbuj ponownie', bestSellers: 'Bestsellery', selectionUnavailable: 'Dzisiejszy wybór nie jest jeszcze dostępny.', bestSellersToday: 'Dzisiejsze bestsellery', noProducts: 'Do tego wyboru nie dodano produktów.', mediaUnavailable: 'Media niedostępne', watchVideo: 'OBEJRZYJ WIDEO', pauseVideo: 'Wstrzymaj wideo', playVideo: 'Odtwórz wideo', videoProgress: 'Postęp wideo', enableSound: 'Włącz dźwięk', muteVideo: 'Wycisz wideo', videoVolume: 'Głośność wideo', previousMedia: 'Poprzednie media', nextMedia: 'Następne media', mediaGallery: 'Galeria mediów', viewVideo: 'Zobacz wideo {index}', viewImage: 'Zobacz obraz {index}', position: 'Pozycja {position}', outOfStock: 'Brak w magazynie', endsIn: 'KOŃCZY SIĘ ZA', closed: 'ZAKOŃCZONE', gift: 'Prezent', presentationVideo: 'Film prezentujący produkt', seeProductBelow: 'Zobacz produkt poniżej', checkItOut: 'Zobacz', advantages: 'Korzyści Zhaya', soldCount: 'Sprzedano dziś: {count}', stockCount: 'Dostępne: {count}', lowStockCount: 'Zostało tylko {count}', installments: 'Do {count} rat po {value} bez odsetek', defaultCta: 'KUP MOJĄ PARĘ', approximateConversion: 'Przybliżone przeliczenie', cover: 'okładka',
  },
  sv: {
    locale: 'sv', dir: 'ltr', pageTitle: 'Dagens bästsäljare | Zhaya', loadingSelection: 'Laddar urval...', loadError: 'Produkterna kunde inte laddas just nu.', retry: 'Försök igen', bestSellers: 'Bästsäljare', selectionUnavailable: 'Dagens urval är inte tillgängligt ännu.', bestSellersToday: 'Dagens bästsäljare', noProducts: 'Inga produkter har lagts till i detta urval.', mediaUnavailable: 'Media ej tillgängligt', watchVideo: 'SE VIDEO', pauseVideo: 'Pausa video', playVideo: 'Spela video', videoProgress: 'Videoförlopp', enableSound: 'Slå på ljud', muteVideo: 'Stäng av ljud', videoVolume: 'Videovolym', previousMedia: 'Föregående media', nextMedia: 'Nästa media', mediaGallery: 'Mediegalleri', viewVideo: 'Se video {index}', viewImage: 'Se bild {index}', position: 'Placering {position}', outOfStock: 'Slut i lager', endsIn: 'SLUTAR OM', closed: 'AVSLUTAD', gift: 'Gåva', presentationVideo: 'Produktpresentationsvideo', seeProductBelow: 'Se produkten nedan', checkItOut: 'Se', advantages: 'Zhaya fördelar', soldCount: '{count} sålda idag', stockCount: '{count} enheter tillgängliga', lowStockCount: 'Endast {count} kvar', installments: 'Upp till {count}x {value} räntefritt', defaultCta: 'FÅ MITT PAR', approximateConversion: 'Ungefärlig omräkning', cover: 'omslag',
  },
  th: {
    locale: 'th', dir: 'ltr', pageTitle: 'สินค้าขายดีวันนี้ | Zhaya', loadingSelection: 'กำลังโหลดรายการ...', loadError: 'ไม่สามารถโหลดสินค้าได้ในขณะนี้', retry: 'ลองอีกครั้ง', bestSellers: 'สินค้าขายดี', selectionUnavailable: 'รายการวันนี้ยังไม่พร้อมใช้งาน', bestSellersToday: 'สินค้าขายดีวันนี้', noProducts: 'ยังไม่มีสินค้าในรายการนี้', mediaUnavailable: 'ไม่สามารถแสดงสื่อได้', watchVideo: 'ดูวิดีโอ', pauseVideo: 'หยุดวิดีโอชั่วคราว', playVideo: 'เล่นวิดีโอ', videoProgress: 'ความคืบหน้าวิดีโอ', enableSound: 'เปิดเสียง', muteVideo: 'ปิดเสียงวิดีโอ', videoVolume: 'ระดับเสียงวิดีโอ', previousMedia: 'สื่อก่อนหน้า', nextMedia: 'สื่อถัดไป', mediaGallery: 'แกลเลอรีสื่อ', viewVideo: 'ดูวิดีโอ {index}', viewImage: 'ดูภาพ {index}', position: 'อันดับ {position}', outOfStock: 'สินค้าหมด', endsIn: 'สิ้นสุดใน', closed: 'สิ้นสุดแล้ว', gift: 'ของขวัญ', presentationVideo: 'วิดีโอแนะนำสินค้า', seeProductBelow: 'ดูสินค้าด้านล่าง', checkItOut: 'ดูเพิ่มเติม', advantages: 'สิทธิประโยชน์ Zhaya', soldCount: 'ขายแล้ววันนี้ {count}', stockCount: 'มีสินค้า {count} ชิ้น', lowStockCount: 'เหลือเพียง {count} ชิ้น', installments: 'สูงสุด {count} งวด งวดละ {value} ไม่มีดอกเบี้ย', defaultCta: 'รับคู่ของฉัน', approximateConversion: 'การแปลงโดยประมาณ', cover: 'ภาพปก',
  },
  tr: {
    locale: 'tr', dir: 'ltr', pageTitle: 'Günün Çok Satanları | Zhaya', loadingSelection: 'Seçki yükleniyor...', loadError: 'Ürünler şu anda yüklenemedi.', retry: 'Tekrar dene', bestSellers: 'Çok Satanlar', selectionUnavailable: 'Bugünün seçkisi henüz hazır değil.', bestSellersToday: 'Günün Çok Satanları', noProducts: 'Bu seçkiye ürün eklenmemiş.', mediaUnavailable: 'Medya kullanılamıyor', watchVideo: 'VİDEOYU İZLE', pauseVideo: 'Videoyu duraklat', playVideo: 'Videoyu oynat', videoProgress: 'Video ilerlemesi', enableSound: 'Sesi aç', muteVideo: 'Videoyu sessize al', videoVolume: 'Video sesi', previousMedia: 'Önceki medya', nextMedia: 'Sonraki medya', mediaGallery: 'Medya galerisi', viewVideo: 'Video {index} görüntüle', viewImage: 'Görsel {index} görüntüle', position: 'Sıra {position}', outOfStock: 'Stokta yok', endsIn: 'BİTMESİNE', closed: 'SONA ERDİ', gift: 'Hediye', presentationVideo: 'Ürün tanıtım videosu', seeProductBelow: 'Aşağıdaki ürünü gör', checkItOut: 'İncele', advantages: 'Zhaya avantajları', soldCount: 'Bugün {count} satıldı', stockCount: '{count} adet mevcut', lowStockCount: 'Yalnızca {count} adet kaldı', installments: '{count} taksite kadar, taksit başına {value}, faizsiz', defaultCta: 'ÇİFTİMİ AL', approximateConversion: 'Yaklaşık dönüşüm', cover: 'kapak',
  },
  vi: {
    locale: 'vi', dir: 'ltr', pageTitle: 'Bán chạy hôm nay | Zhaya', loadingSelection: 'Đang tải lựa chọn...', loadError: 'Hiện không thể tải sản phẩm.', retry: 'Thử lại', bestSellers: 'Bán chạy', selectionUnavailable: 'Lựa chọn hôm nay chưa có sẵn.', bestSellersToday: 'Bán chạy hôm nay', noProducts: 'Chưa có sản phẩm trong lựa chọn này.', mediaUnavailable: 'Không có phương tiện', watchVideo: 'XEM VIDEO', pauseVideo: 'Tạm dừng video', playVideo: 'Phát video', videoProgress: 'Tiến trình video', enableSound: 'Bật âm thanh', muteVideo: 'Tắt tiếng video', videoVolume: 'Âm lượng video', previousMedia: 'Phương tiện trước', nextMedia: 'Phương tiện tiếp theo', mediaGallery: 'Thư viện phương tiện', viewVideo: 'Xem video {index}', viewImage: 'Xem ảnh {index}', position: 'Vị trí {position}', outOfStock: 'Hết hàng', endsIn: 'KẾT THÚC SAU', closed: 'ĐÃ KẾT THÚC', gift: 'Quà tặng', presentationVideo: 'Video giới thiệu sản phẩm', seeProductBelow: 'Xem sản phẩm bên dưới', checkItOut: 'Xem ngay', advantages: 'Quyền lợi Zhaya', soldCount: 'Đã bán {count} hôm nay', stockCount: 'Còn {count} sản phẩm', lowStockCount: 'Chỉ còn {count} sản phẩm', installments: 'Tối đa {count} kỳ, mỗi kỳ {value}, không lãi suất', defaultCta: 'NHẬN ĐÔI CỦA TÔI', approximateConversion: 'Quy đổi ước tính', cover: 'ảnh bìa',
  },
};

const FORM_PACKS: Record<string, Pick<BestSellerUiText, BestSellerFormUiTextKeys>> = {
  pt: {
    formOpenCta: 'FALAR COM A ZHAYA',
    formDefaultTitle: 'Compra internacional',
    formDefaultMessage: 'Nossa compra online ainda não está adaptada ao seu país, mas a Zhaya vende e envia para o exterior. Preencha seus dados e nossa equipe entrará em contato para finalizar sua compra.',
    formProductLabel: 'Produto', formNameLabel: 'Nome', formEmailLabel: 'E-mail', formPhoneLabel: 'Telefone / WhatsApp',
    formSubmit: 'ENVIAR SOLICITAÇÃO', formSending: 'ENVIANDO...', formSuccessTitle: 'Solicitação recebida',
    formSuccessMessage: 'Nossa equipe entrará em contato com você em breve.', formError: 'Não foi possível enviar agora. Tente novamente.',
    formRequired: 'Preencha todos os campos.', formInvalidEmail: 'Digite um e-mail válido.', formClose: 'Fechar',
  },
  en: {
    formOpenCta: 'CONTACT ZHAYA',
    formDefaultTitle: 'International purchase',
    formDefaultMessage: 'Our online checkout is not yet adapted to your country, but Zhaya sells and ships internationally. Fill in your details and our team will contact you to complete your purchase.',
    formProductLabel: 'Product', formNameLabel: 'Name', formEmailLabel: 'Email', formPhoneLabel: 'Phone / WhatsApp',
    formSubmit: 'SEND REQUEST', formSending: 'SENDING...', formSuccessTitle: 'Request received',
    formSuccessMessage: 'Our team will contact you soon.', formError: 'We could not send your request right now. Please try again.',
    formRequired: 'Please fill in all fields.', formInvalidEmail: 'Enter a valid email address.', formClose: 'Close',
  },
  es: {
    formOpenCta: 'CONTACTAR A ZHAYA',
    formDefaultTitle: 'Compra internacional',
    formDefaultMessage: 'Nuestra compra online aún no está adaptada a tu país, pero Zhaya vende y realiza envíos internacionales. Completa tus datos y nuestro equipo se pondrá en contacto contigo para finalizar la compra.',
    formProductLabel: 'Producto', formNameLabel: 'Nombre', formEmailLabel: 'Correo electrónico', formPhoneLabel: 'Teléfono / WhatsApp',
    formSubmit: 'ENVIAR SOLICITUD', formSending: 'ENVIANDO...', formSuccessTitle: 'Solicitud recibida',
    formSuccessMessage: 'Nuestro equipo se pondrá en contacto contigo pronto.', formError: 'No pudimos enviar tu solicitud ahora. Inténtalo de nuevo.',
    formRequired: 'Completa todos los campos.', formInvalidEmail: 'Introduce un correo electrónico válido.', formClose: 'Cerrar',
  },
  de: {
    formOpenCta: 'ZHAYA KONTAKTIEREN',
    formDefaultTitle: 'Internationaler Einkauf',
    formDefaultMessage: 'Unser Online-Checkout ist noch nicht an Ihr Land angepasst, aber Zhaya verkauft und versendet international. Füllen Sie Ihre Kontaktdaten aus, und unser Team meldet sich, um den Kauf abzuschließen.',
    formProductLabel: 'Produkt', formNameLabel: 'Name', formEmailLabel: 'E-Mail', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'ANFRAGE SENDEN', formSending: 'WIRD GESENDET...', formSuccessTitle: 'Anfrage erhalten',
    formSuccessMessage: 'Unser Team wird sich in Kürze bei Ihnen melden.', formError: 'Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut.',
    formRequired: 'Bitte füllen Sie alle Felder aus.', formInvalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.', formClose: 'Schließen',
  },
  ar: {
    formOpenCta: 'تواصل مع ZHAYA',
    formDefaultTitle: 'شراء دولي',
    formDefaultMessage: 'لم يتم تكييف عملية الشراء عبر الإنترنت لبلدك بعد، لكن Zhaya تبيع وتشحن دوليًا. أدخل بيانات التواصل وسيتواصل معك فريقنا لإتمام عملية الشراء.',
    formProductLabel: 'المنتج', formNameLabel: 'الاسم', formEmailLabel: 'البريد الإلكتروني', formPhoneLabel: 'الهاتف / واتساب',
    formSubmit: 'إرسال الطلب', formSending: 'جارٍ الإرسال...', formSuccessTitle: 'تم استلام الطلب',
    formSuccessMessage: 'سيتواصل معك فريقنا قريبًا.', formError: 'تعذر إرسال طلبك الآن. حاول مرة أخرى.',
    formRequired: 'يرجى تعبئة جميع الحقول.', formInvalidEmail: 'أدخل بريدًا إلكترونيًا صالحًا.', formClose: 'إغلاق',
  },
  fr: {
    formOpenCta: 'CONTACTER ZHAYA',
    formDefaultTitle: 'Achat international',
    formDefaultMessage: 'Notre paiement en ligne n’est pas encore adapté à votre pays, mais Zhaya vend et expédie à l’international. Renseignez vos coordonnées et notre équipe vous contactera pour finaliser votre achat.',
    formProductLabel: 'Produit', formNameLabel: 'Nom', formEmailLabel: 'E-mail', formPhoneLabel: 'Téléphone / WhatsApp',
    formSubmit: 'ENVOYER LA DEMANDE', formSending: 'ENVOI...', formSuccessTitle: 'Demande reçue',
    formSuccessMessage: 'Notre équipe vous contactera bientôt.', formError: 'Impossible d’envoyer votre demande pour le moment. Réessayez.',
    formRequired: 'Veuillez remplir tous les champs.', formInvalidEmail: 'Saisissez une adresse e-mail valide.', formClose: 'Fermer',
  },
  'zh-Hans': {
    formOpenCta: '联系 ZHAYA',
    formDefaultTitle: '国际购买',
    formDefaultMessage: '我们的在线结账目前尚未完全适配您所在的国家/地区，但 Zhaya 支持国际销售和配送。请填写联系方式，我们的团队将联系您完成购买。',
    formProductLabel: '商品', formNameLabel: '姓名', formEmailLabel: '电子邮箱', formPhoneLabel: '电话 / WhatsApp',
    formSubmit: '提交申请', formSending: '正在提交...', formSuccessTitle: '申请已收到',
    formSuccessMessage: '我们的团队会尽快与您联系。', formError: '暂时无法提交申请，请重试。',
    formRequired: '请填写所有字段。', formInvalidEmail: '请输入有效的电子邮箱地址。', formClose: '关闭',
  },
  'zh-Hant': {
    formOpenCta: '聯絡 ZHAYA',
    formDefaultTitle: '國際購買',
    formDefaultMessage: '我們的線上結帳目前尚未完全支援您所在的國家/地區，但 Zhaya 提供國際銷售與配送。請填寫聯絡資料，我們的團隊將聯絡您完成購買。',
    formProductLabel: '商品', formNameLabel: '姓名', formEmailLabel: '電子郵件', formPhoneLabel: '電話 / WhatsApp',
    formSubmit: '提交申請', formSending: '正在提交...', formSuccessTitle: '已收到申請',
    formSuccessMessage: '我們的團隊會盡快與您聯絡。', formError: '目前無法提交申請，請再試一次。',
    formRequired: '請填寫所有欄位。', formInvalidEmail: '請輸入有效的電子郵件地址。', formClose: '關閉',
  },
  ko: {
    formOpenCta: 'ZHAYA에 문의하기',
    formDefaultTitle: '해외 구매',
    formDefaultMessage: '현재 온라인 결제가 고객님의 국가에 완전히 맞춰져 있지는 않지만 Zhaya는 해외 판매 및 배송을 지원합니다. 연락처를 남겨주시면 구매 완료를 위해 담당 팀이 연락드리겠습니다.',
    formProductLabel: '상품', formNameLabel: '이름', formEmailLabel: '이메일', formPhoneLabel: '전화 / WhatsApp',
    formSubmit: '문의 보내기', formSending: '전송 중...', formSuccessTitle: '문의가 접수되었습니다',
    formSuccessMessage: '담당 팀이 곧 연락드리겠습니다.', formError: '지금은 문의를 보낼 수 없습니다. 다시 시도해 주세요.',
    formRequired: '모든 항목을 입력해 주세요.', formInvalidEmail: '올바른 이메일 주소를 입력해 주세요.', formClose: '닫기',
  },
  da: {
    formOpenCta: 'KONTAKT ZHAYA',
    formDefaultTitle: 'Internationalt køb',
    formDefaultMessage: 'Vores online checkout er endnu ikke tilpasset dit land, men Zhaya sælger og sender internationalt. Udfyld dine kontaktoplysninger, så kontakter vores team dig for at færdiggøre købet.',
    formProductLabel: 'Produkt', formNameLabel: 'Navn', formEmailLabel: 'E-mail', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'SEND FORESPØRGSEL', formSending: 'SENDER...', formSuccessTitle: 'Forespørgsel modtaget',
    formSuccessMessage: 'Vores team kontakter dig snart.', formError: 'Vi kunne ikke sende din forespørgsel nu. Prøv igen.',
    formRequired: 'Udfyld alle felter.', formInvalidEmail: 'Indtast en gyldig e-mailadresse.', formClose: 'Luk',
  },
  fi: {
    formOpenCta: 'OTA YHTEYTTÄ ZHAYAAN',
    formDefaultTitle: 'Kansainvälinen osto',
    formDefaultMessage: 'Verkkokaupan kassamme ei ole vielä täysin mukautettu maahasi, mutta Zhaya myy ja toimittaa kansainvälisesti. Täytä yhteystietosi, niin tiimimme ottaa sinuun yhteyttä ostoksen viimeistelemiseksi.',
    formProductLabel: 'Tuote', formNameLabel: 'Nimi', formEmailLabel: 'Sähköposti', formPhoneLabel: 'Puhelin / WhatsApp',
    formSubmit: 'LÄHETÄ PYYNTÖ', formSending: 'LÄHETETÄÄN...', formSuccessTitle: 'Pyyntö vastaanotettu',
    formSuccessMessage: 'Tiimimme ottaa sinuun pian yhteyttä.', formError: 'Pyyntöä ei voitu lähettää juuri nyt. Yritä uudelleen.',
    formRequired: 'Täytä kaikki kentät.', formInvalidEmail: 'Anna kelvollinen sähköpostiosoite.', formClose: 'Sulje',
  },
  hi: {
    formOpenCta: 'ZHAYA से संपर्क करें',
    formDefaultTitle: 'अंतरराष्ट्रीय खरीद',
    formDefaultMessage: 'हमारा ऑनलाइन चेकआउट अभी आपके देश के लिए पूरी तरह अनुकूलित नहीं है, लेकिन Zhaya अंतरराष्ट्रीय बिक्री और शिपिंग करती है। अपनी संपर्क जानकारी भरें और खरीद पूरी करने के लिए हमारी टीम आपसे संपर्क करेगी।',
    formProductLabel: 'उत्पाद', formNameLabel: 'नाम', formEmailLabel: 'ईमेल', formPhoneLabel: 'फोन / WhatsApp',
    formSubmit: 'अनुरोध भेजें', formSending: 'भेजा जा रहा है...', formSuccessTitle: 'अनुरोध प्राप्त हुआ',
    formSuccessMessage: 'हमारी टीम जल्द आपसे संपर्क करेगी।', formError: 'अभी अनुरोध नहीं भेजा जा सका। कृपया फिर कोशिश करें।',
    formRequired: 'कृपया सभी फ़ील्ड भरें।', formInvalidEmail: 'मान्य ईमेल पता दर्ज करें।', formClose: 'बंद करें',
  },
  nl: {
    formOpenCta: 'CONTACT MET ZHAYA',
    formDefaultTitle: 'Internationale aankoop',
    formDefaultMessage: 'Onze online checkout is nog niet aangepast aan jouw land, maar Zhaya verkoopt en verzendt internationaal. Vul je contactgegevens in en ons team neemt contact met je op om de aankoop af te ronden.',
    formProductLabel: 'Product', formNameLabel: 'Naam', formEmailLabel: 'E-mail', formPhoneLabel: 'Telefoon / WhatsApp',
    formSubmit: 'AANVRAAG VERSTUREN', formSending: 'VERZENDEN...', formSuccessTitle: 'Aanvraag ontvangen',
    formSuccessMessage: 'Ons team neemt binnenkort contact met je op.', formError: 'Je aanvraag kon nu niet worden verzonden. Probeer het opnieuw.',
    formRequired: 'Vul alle velden in.', formInvalidEmail: 'Vul een geldig e-mailadres in.', formClose: 'Sluiten',
  },
  id: {
    formOpenCta: 'HUBUNGI ZHAYA',
    formDefaultTitle: 'Pembelian internasional',
    formDefaultMessage: 'Checkout online kami belum sepenuhnya disesuaikan untuk negara Anda, tetapi Zhaya melayani penjualan dan pengiriman internasional. Isi data kontak Anda dan tim kami akan menghubungi Anda untuk menyelesaikan pembelian.',
    formProductLabel: 'Produk', formNameLabel: 'Nama', formEmailLabel: 'Email', formPhoneLabel: 'Telepon / WhatsApp',
    formSubmit: 'KIRIM PERMINTAAN', formSending: 'MENGIRIM...', formSuccessTitle: 'Permintaan diterima',
    formSuccessMessage: 'Tim kami akan segera menghubungi Anda.', formError: 'Permintaan belum dapat dikirim. Silakan coba lagi.',
    formRequired: 'Isi semua kolom.', formInvalidEmail: 'Masukkan alamat email yang valid.', formClose: 'Tutup',
  },
  it: {
    formOpenCta: 'CONTATTA ZHAYA',
    formDefaultTitle: 'Acquisto internazionale',
    formDefaultMessage: 'Il nostro checkout online non è ancora adattato al tuo Paese, ma Zhaya vende e spedisce a livello internazionale. Inserisci i tuoi contatti e il nostro team ti contatterà per completare l’acquisto.',
    formProductLabel: 'Prodotto', formNameLabel: 'Nome', formEmailLabel: 'E-mail', formPhoneLabel: 'Telefono / WhatsApp',
    formSubmit: 'INVIA RICHIESTA', formSending: 'INVIO...', formSuccessTitle: 'Richiesta ricevuta',
    formSuccessMessage: 'Il nostro team ti contatterà presto.', formError: 'Non è stato possibile inviare la richiesta. Riprova.',
    formRequired: 'Compila tutti i campi.', formInvalidEmail: 'Inserisci un indirizzo e-mail valido.', formClose: 'Chiudi',
  },
  ja: {
    formOpenCta: 'ZHAYAに問い合わせる',
    formDefaultTitle: '海外購入',
    formDefaultMessage: '現在、オンライン決済はお客様の国向けに完全対応していませんが、Zhaya は海外販売・発送に対応しています。連絡先をご入力いただければ、購入完了のため担当チームからご連絡します。',
    formProductLabel: '商品', formNameLabel: 'お名前', formEmailLabel: 'メール', formPhoneLabel: '電話 / WhatsApp',
    formSubmit: '問い合わせを送信', formSending: '送信中...', formSuccessTitle: 'お問い合わせを受け付けました',
    formSuccessMessage: '担当チームより近日中にご連絡します。', formError: '現在送信できません。もう一度お試しください。',
    formRequired: 'すべての項目を入力してください。', formInvalidEmail: '有効なメールアドレスを入力してください。', formClose: '閉じる',
  },
  ms: {
    formOpenCta: 'HUBUNGI ZHAYA',
    formDefaultTitle: 'Pembelian antarabangsa',
    formDefaultMessage: 'Checkout dalam talian kami belum disesuaikan sepenuhnya untuk negara anda, tetapi Zhaya menjual dan menghantar ke peringkat antarabangsa. Isi maklumat hubungan anda dan pasukan kami akan menghubungi anda untuk melengkapkan pembelian.',
    formProductLabel: 'Produk', formNameLabel: 'Nama', formEmailLabel: 'E-mel', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'HANTAR PERMINTAAN', formSending: 'MENGHANTAR...', formSuccessTitle: 'Permintaan diterima',
    formSuccessMessage: 'Pasukan kami akan menghubungi anda tidak lama lagi.', formError: 'Permintaan tidak dapat dihantar sekarang. Cuba lagi.',
    formRequired: 'Isi semua medan.', formInvalidEmail: 'Masukkan alamat e-mel yang sah.', formClose: 'Tutup',
  },
  no: {
    formOpenCta: 'KONTAKT ZHAYA',
    formDefaultTitle: 'Internasjonalt kjøp',
    formDefaultMessage: 'Nettkassen vår er ennå ikke tilpasset landet ditt, men Zhaya selger og sender internasjonalt. Fyll inn kontaktopplysningene dine, så tar teamet vårt kontakt for å fullføre kjøpet.',
    formProductLabel: 'Produkt', formNameLabel: 'Navn', formEmailLabel: 'E-post', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'SEND FORESPØRSEL', formSending: 'SENDER...', formSuccessTitle: 'Forespørsel mottatt',
    formSuccessMessage: 'Teamet vårt tar kontakt snart.', formError: 'Vi kunne ikke sende forespørselen nå. Prøv igjen.',
    formRequired: 'Fyll ut alle feltene.', formInvalidEmail: 'Skriv inn en gyldig e-postadresse.', formClose: 'Lukk',
  },
  pl: {
    formOpenCta: 'SKONTAKTUJ SIĘ Z ZHAYA',
    formDefaultTitle: 'Zakup międzynarodowy',
    formDefaultMessage: 'Nasz koszyk online nie jest jeszcze w pełni dostosowany do Twojego kraju, ale Zhaya prowadzi sprzedaż i wysyłkę międzynarodową. Podaj dane kontaktowe, a nasz zespół skontaktuje się z Tobą, aby dokończyć zakup.',
    formProductLabel: 'Produkt', formNameLabel: 'Imię i nazwisko', formEmailLabel: 'E-mail', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'WYŚLIJ ZAPYTANIE', formSending: 'WYSYŁANIE...', formSuccessTitle: 'Zapytanie otrzymane',
    formSuccessMessage: 'Nasz zespół wkrótce się z Tobą skontaktuje.', formError: 'Nie udało się teraz wysłać zapytania. Spróbuj ponownie.',
    formRequired: 'Wypełnij wszystkie pola.', formInvalidEmail: 'Wpisz prawidłowy adres e-mail.', formClose: 'Zamknij',
  },
  sv: {
    formOpenCta: 'KONTAKTA ZHAYA',
    formDefaultTitle: 'Internationellt köp',
    formDefaultMessage: 'Vår onlinekassa är ännu inte anpassad för ditt land, men Zhaya säljer och skickar internationellt. Fyll i dina kontaktuppgifter så kontaktar vårt team dig för att slutföra köpet.',
    formProductLabel: 'Produkt', formNameLabel: 'Namn', formEmailLabel: 'E-post', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'SKICKA FÖRFRÅGAN', formSending: 'SKICKAR...', formSuccessTitle: 'Förfrågan mottagen',
    formSuccessMessage: 'Vårt team kontaktar dig snart.', formError: 'Det gick inte att skicka förfrågan nu. Försök igen.',
    formRequired: 'Fyll i alla fält.', formInvalidEmail: 'Ange en giltig e-postadress.', formClose: 'Stäng',
  },
  th: {
    formOpenCta: 'ติดต่อ ZHAYA',
    formDefaultTitle: 'การสั่งซื้อระหว่างประเทศ',
    formDefaultMessage: 'ระบบชำระเงินออนไลน์ของเรายังไม่ได้ปรับให้รองรับประเทศของคุณอย่างเต็มรูปแบบ แต่ Zhaya จำหน่ายและจัดส่งระหว่างประเทศ กรุณากรอกข้อมูลติดต่อ แล้วทีมงานของเราจะติดต่อกลับเพื่อดำเนินการสั่งซื้อให้เสร็จสมบูรณ์',
    formProductLabel: 'สินค้า', formNameLabel: 'ชื่อ', formEmailLabel: 'อีเมล', formPhoneLabel: 'โทรศัพท์ / WhatsApp',
    formSubmit: 'ส่งคำขอ', formSending: 'กำลังส่ง...', formSuccessTitle: 'ได้รับคำขอแล้ว',
    formSuccessMessage: 'ทีมงานของเราจะติดต่อคุณในเร็ว ๆ นี้', formError: 'ไม่สามารถส่งคำขอได้ในขณะนี้ กรุณาลองอีกครั้ง',
    formRequired: 'กรุณากรอกข้อมูลให้ครบทุกช่อง', formInvalidEmail: 'กรุณากรอกอีเมลที่ถูกต้อง', formClose: 'ปิด',
  },
  tr: {
    formOpenCta: 'ZHAYA İLE İLETİŞİME GEÇ',
    formDefaultTitle: 'Uluslararası satın alma',
    formDefaultMessage: 'Online ödeme sistemimiz henüz ülkenize tam olarak uyarlanmadı, ancak Zhaya uluslararası satış ve gönderim yapıyor. İletişim bilgilerinizi doldurun; ekibimiz satın alma işlemini tamamlamak için sizinle iletişime geçsin.',
    formProductLabel: 'Ürün', formNameLabel: 'Ad Soyad', formEmailLabel: 'E-posta', formPhoneLabel: 'Telefon / WhatsApp',
    formSubmit: 'TALEP GÖNDER', formSending: 'GÖNDERİLİYOR...', formSuccessTitle: 'Talep alındı',
    formSuccessMessage: 'Ekibimiz yakında sizinle iletişime geçecek.', formError: 'Talebiniz şu anda gönderilemedi. Lütfen tekrar deneyin.',
    formRequired: 'Tüm alanları doldurun.', formInvalidEmail: 'Geçerli bir e-posta adresi girin.', formClose: 'Kapat',
  },
  vi: {
    formOpenCta: 'LIÊN HỆ ZHAYA',
    formDefaultTitle: 'Mua hàng quốc tế',
    formDefaultMessage: 'Quy trình thanh toán trực tuyến của chúng tôi chưa được điều chỉnh hoàn toàn cho quốc gia của bạn, nhưng Zhaya có bán và giao hàng quốc tế. Hãy điền thông tin liên hệ và đội ngũ của chúng tôi sẽ liên hệ để hoàn tất đơn hàng.',
    formProductLabel: 'Sản phẩm', formNameLabel: 'Họ tên', formEmailLabel: 'Email', formPhoneLabel: 'Điện thoại / WhatsApp',
    formSubmit: 'GỬI YÊU CẦU', formSending: 'ĐANG GỬI...', formSuccessTitle: 'Đã nhận yêu cầu',
    formSuccessMessage: 'Đội ngũ của chúng tôi sẽ sớm liên hệ với bạn.', formError: 'Hiện chưa thể gửi yêu cầu. Vui lòng thử lại.',
    formRequired: 'Vui lòng điền đầy đủ các trường.', formInvalidEmail: 'Nhập địa chỉ email hợp lệ.', formClose: 'Đóng',
  },
};



type BestSellerOrganizedUiText = Pick<BestSellerUiText, BestSellerOrganizedUiTextKeys>;

const ORGANIZED_PACKS: Record<string, BestSellerOrganizedUiText> = {
  pt: { organizedTitle: 'O que você quer encontrar?', organizedSubtitle: '', organizedAll: 'Ver tudo', organizedProducts: '{count} produtos', organizedContinue: 'Continuar explorando', organizedBack: 'Trocar categoria' },
  en: { organizedTitle: 'What are you looking for?', organizedSubtitle: '', organizedAll: 'View all', organizedProducts: '{count} products', organizedContinue: 'Keep exploring', organizedBack: 'Change category' },
  es: { organizedTitle: '¿Qué estás buscando?', organizedSubtitle: '', organizedAll: 'Ver todo', organizedProducts: '{count} productos', organizedContinue: 'Seguir explorando', organizedBack: 'Cambiar categoría' },
  de: { organizedTitle: 'Was suchen Sie?', organizedSubtitle: '', organizedAll: 'Alle anzeigen', organizedProducts: '{count} Produkte', organizedContinue: 'Weiter entdecken', organizedBack: 'Kategorie wechseln' },
  ar: { organizedTitle: 'عمّ تبحث؟', organizedSubtitle: '', organizedAll: 'عرض الكل', organizedProducts: '{count} منتجات', organizedContinue: 'متابعة الاستكشاف', organizedBack: 'تغيير الفئة' },
  fr: { organizedTitle: 'Que recherchez-vous ?', organizedSubtitle: '', organizedAll: 'Tout voir', organizedProducts: '{count} produits', organizedContinue: 'Continuer à explorer', organizedBack: 'Changer de catégorie' },
  'zh-Hans': { organizedTitle: '你在寻找什么？', organizedSubtitle: '', organizedAll: '查看全部', organizedProducts: '{count} 件商品', organizedContinue: '继续浏览', organizedBack: '更换类别' },
  'zh-Hant': { organizedTitle: '你在找什麼？', organizedSubtitle: '', organizedAll: '查看全部', organizedProducts: '{count} 件商品', organizedContinue: '繼續瀏覽', organizedBack: '更換類別' },
  ko: { organizedTitle: '무엇을 찾고 계신가요?', organizedSubtitle: '', organizedAll: '전체 보기', organizedProducts: '상품 {count}개', organizedContinue: '계속 둘러보기', organizedBack: '카테고리 변경' },
  da: { organizedTitle: 'Hvad leder du efter?', organizedSubtitle: '', organizedAll: 'Se alle', organizedProducts: '{count} produkter', organizedContinue: 'Fortsæt med at udforske', organizedBack: 'Skift kategori' },
  fi: { organizedTitle: 'Mitä etsit?', organizedSubtitle: '', organizedAll: 'Näytä kaikki', organizedProducts: '{count} tuotetta', organizedContinue: 'Jatka selaamista', organizedBack: 'Vaihda kategoriaa' },
  hi: { organizedTitle: 'आप क्या ढूंढ रहे हैं?', organizedSubtitle: '', organizedAll: 'सभी देखें', organizedProducts: '{count} उत्पाद', organizedContinue: 'और देखें', organizedBack: 'श्रेणी बदलें' },
  nl: { organizedTitle: 'Waar ben je naar op zoek?', organizedSubtitle: '', organizedAll: 'Alles bekijken', organizedProducts: '{count} producten', organizedContinue: 'Verder ontdekken', organizedBack: 'Categorie wijzigen' },
  id: { organizedTitle: 'Apa yang Anda cari?', organizedSubtitle: '', organizedAll: 'Lihat semua', organizedProducts: '{count} produk', organizedContinue: 'Lanjut jelajahi', organizedBack: 'Ganti kategori' },
  it: { organizedTitle: 'Cosa stai cercando?', organizedSubtitle: '', organizedAll: 'Vedi tutto', organizedProducts: '{count} prodotti', organizedContinue: 'Continua a esplorare', organizedBack: 'Cambia categoria' },
  ja: { organizedTitle: '何をお探しですか？', organizedSubtitle: '', organizedAll: 'すべて見る', organizedProducts: '{count} 商品', organizedContinue: 'さらに見る', organizedBack: 'カテゴリーを変更' },
  ms: { organizedTitle: 'Apa yang anda cari?', organizedSubtitle: '', organizedAll: 'Lihat semua', organizedProducts: '{count} produk', organizedContinue: 'Terus meneroka', organizedBack: 'Tukar kategori' },
  no: { organizedTitle: 'Hva leter du etter?', organizedSubtitle: '', organizedAll: 'Se alle', organizedProducts: '{count} produkter', organizedContinue: 'Fortsett å utforske', organizedBack: 'Bytt kategori' },
  pl: { organizedTitle: 'Czego szukasz?', organizedSubtitle: '', organizedAll: 'Zobacz wszystko', organizedProducts: '{count} produktów', organizedContinue: 'Przeglądaj dalej', organizedBack: 'Zmień kategorię' },
  sv: { organizedTitle: 'Vad letar du efter?', organizedSubtitle: '', organizedAll: 'Visa alla', organizedProducts: '{count} produkter', organizedContinue: 'Fortsätt utforska', organizedBack: 'Byt kategori' },
  th: { organizedTitle: 'คุณกำลังมองหาอะไร?', organizedSubtitle: '', organizedAll: 'ดูทั้งหมด', organizedProducts: '{count} สินค้า', organizedContinue: 'เลือกดูต่อ', organizedBack: 'เปลี่ยนหมวดหมู่' },
  tr: { organizedTitle: 'Ne arıyorsunuz?', organizedSubtitle: '', organizedAll: 'Tümünü gör', organizedProducts: '{count} ürün', organizedContinue: 'Keşfetmeye devam et', organizedBack: 'Kategoriyi değiştir' },
  vi: { organizedTitle: 'Bạn đang tìm gì?', organizedSubtitle: '', organizedAll: 'Xem tất cả', organizedProducts: '{count} sản phẩm', organizedContinue: 'Tiếp tục khám phá', organizedBack: 'Đổi danh mục' },
};

export function resolveBestSellerUiLocale(locale?: string | null): string {
  const raw = String(locale || '').trim().replace('_', '-');
  if (!raw) return 'pt';
  const lower = raw.toLowerCase();
  if (lower.startsWith('zh')) return /hant|tw|hk|mo/.test(lower) ? 'zh-Hant' : 'zh-Hans';
  const base = lower.split('-')[0];
  return PACKS[base] ? base : 'en';
}

export function getBestSellerUiText(locale?: string | null): BestSellerUiText {
  const resolved = resolveBestSellerUiLocale(locale);
  const base = PACKS[resolved] || PACKS.en;
  const form = FORM_PACKS[resolved] || FORM_PACKS.en;
  const organized = ORGANIZED_PACKS[resolved] || ORGANIZED_PACKS.en;
  return { ...base, ...form, ...organized };
}

export function formatBestSellerUiText(template: string, values: Record<string, string | number>): string {
  return String(template || '').replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ''));
}
