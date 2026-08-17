import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import type { PublicBestSellerList, PublicBestSellerProduct } from '../../types/zhaya';

/**
 * Formata a data no padrão '17 AGO 2026' ou '17 DE AGOSTO DE 2026' considerando fuso horário de São Paulo
 */
export function formatBestSellerDate(dateStr: string, timezone = 'America/Sao_Paulo'): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: timezone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
        .format(d)
        .replace('.', '')
        .toUpperCase();
    }

    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
      .format(d)
      .replace('.', '')
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

/**
 * Calcula o tempo restante para o encerramento do timer
 */
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
  formattedString: string;
}

export function calculateTimeRemaining(timerEndIso: string | null | undefined): TimeRemaining {
  if (!timerEndIso) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0, formattedString: '00:00:00' };
  }

  try {
    const endMs = new Date(timerEndIso).getTime();
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;

    if (isNaN(endMs) || diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0, formattedString: '00:00:00' };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const totalHours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(totalHours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const formattedString = `${hh}:${mm}:${ss}`;

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      totalSeconds,
      formattedString,
    };
  } catch {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0, formattedString: '00:00:00' };
  }
}

/**
 * Formata texto de quantidade vendida com singular/plural
 */
export function formatSoldQuantityText(qty: number | null | undefined): string | null {
  if (qty === null || qty === undefined || qty < 1) return null;
  if (qty === 1) return '1 vendido hoje';
  return `${qty} vendidos hoje`;
}

/**
 * Formata texto de estoque disponível com singular/plural
 */
export function formatAvailableQuantityText(qty: number | null | undefined): string | null {
  if (qty === null || qty === undefined || qty < 1) return null;
  if (qty === 1) return '1 unidade disponível';
  if (qty <= 3) return `Últimas ${qty} unidades`;
  return `${qty} unidades disponíveis`;
}

/**
 * Formata valores monetários em Real Brasileiro (R$)
 */
export function formatPriceBRL(price: number | null | undefined): string | null {
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price)) {
    return null;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Normaliza tamanhos legados que possam ter sido salvos em uma única string
 * (ex.: "33,34,35") e remove duplicatas.
 */
function normalizePublicSizes(values: string[] | undefined): string[] {
  const source = Array.isArray(values) ? values : [];
  const parsed = source
    .flatMap((value) => String(value || '').split(/[,;\n]+/g))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(parsed));
}

/**
 * Galeria de imagens com drag/swipe real no mobile.
 */
const ProductImageGallery: React.FC<{
  images: string[];
  productName: string;
  isFirst: boolean;
  rankLabel: string;
  rankColor: string;
  sizeColor: string;
  badgeContent?: React.ReactNode;
  sizes: string[];
  outOfStockSizes: string[];
}> = ({ images, productName, isFirst, rankLabel, rankColor, sizeColor, badgeContent, sizes, outOfStockSizes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [direction, setDirection] = useState(0);
  const totalImages = images.length;

  useEffect(() => {
    if (currentIndex >= totalImages) setCurrentIndex(0);
  }, [currentIndex, totalImages]);

  const goToIndex = (nextIndex: number, nextDirection = 0) => {
    if (totalImages <= 1) return;
    const normalized = (nextIndex + totalImages) % totalImages;
    setDirection(nextDirection);
    setCurrentIndex(normalized);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    goToIndex(currentIndex + 1, 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    goToIndex(currentIndex - 1, -1);
  };

  const handleDragEnd = (_event: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (totalImages <= 1) return;
    const swipeStrength = Math.abs(info.offset.x) + Math.abs(info.velocity.x) * 0.08;
    if (swipeStrength < 48) return;
    if (info.offset.x < 0) handleNext();
    else handlePrev();
  };

  const currentImageUrl = images[currentIndex];
  const hasError = failedImages[currentIndex];
  const unavailableSet = new Set(outOfStockSizes);

  return (
    <div className="relative w-full aspect-[4/5] bg-neutral-950 rounded-xl overflow-hidden border border-white/[0.08] mb-5 select-none touch-pan-y group shadow-[0_16px_45px_rgba(0,0,0,0.34)]">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={`${currentIndex}-${currentImageUrl || 'empty'}`}
          className="absolute inset-0"
          custom={direction}
          initial={{ opacity: 0, x: direction === 0 ? 0 : direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === 0 ? 0 : direction * -22 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          drag={totalImages > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.22}
          onDragEnd={handleDragEnd}
        >
          {currentImageUrl && !hasError ? (
            <img
              src={currentImageUrl}
              alt={`${productName} - imagem ${currentIndex + 1}`}
              loading={isFirst && currentIndex === 0 ? 'eager' : 'lazy'}
              onError={() => setFailedImages((prev) => ({ ...prev, [currentIndex]: true }))}
              className="w-full h-full object-cover object-center pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-600 px-4 text-center">
              <span className="text-xs tracking-[0.14em] uppercase">Imagem indisponível</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {badgeContent}

      {/* Ranking: todos usam o mesmo tamanho e a mesma cor definida na lista. */}
      <div
        className="absolute left-3.5 top-3 z-20 pointer-events-none text-[27px] sm:text-[29px] leading-none font-semibold tracking-[-0.045em]"
        style={{
          color: rankColor,
          textShadow: 'none',
          WebkitTextStroke: '0px transparent',
          filter: 'none',
        }}
        aria-label={`Posição ${rankLabel}`}
      >
        #{rankLabel}
      </div>

      {/* Tamanhos: texto puro em coluna na lateral esquerda da foto. */}
      {sizes.length > 0 && (
        <div className="absolute left-3.5 bottom-4 z-20 pointer-events-none">
          <div className="flex flex-col items-start gap-y-2">
            {sizes.map((size) => {
              const unavailable = unavailableSet.has(size);
              return (
                <span
                  key={size}
                  className="relative inline-flex items-center text-[12px] sm:text-[13px] leading-none font-medium"
                  style={{
                    color: sizeColor,
                    opacity: unavailable ? 0.38 : 1,
                    textShadow: 'none',
                    filter: 'none',
                  }}
                >
                  {size}
                  {unavailable && (
                    <span
                      className="absolute left-full ml-1 -top-1 text-[12px] leading-none font-semibold text-red-500"
                      style={{ textShadow: 'none', filter: 'none' }}
                      aria-label="Fora de estoque"
                    >
                      ×
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {totalImages > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Imagem anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 border border-white/10 text-white hidden sm:flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-30 cursor-pointer"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima imagem"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 border border-white/10 text-white hidden sm:flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-30 cursor-pointer"
          >
            ›
          </button>

          {/* Sem contador numérico: apenas pontos discretos. */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3.5 z-20 flex items-center justify-center gap-1.5" aria-label="Galeria de imagens">
            {images.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToIndex(dotIndex, dotIndex > currentIndex ? 1 : -1);
                }}
                aria-label={`Ver imagem ${dotIndex + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  dotIndex === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Card editorial minimalista do produto.
 */
const ProductItem: React.FC<{
  product: PublicBestSellerProduct;
  index: number;
  isFirst: boolean;
  ctaText: string;
  rankColor: string;
  sizeColor: string;
}> = ({ product, index, isFirst, ctaText, rankColor, sizeColor }) => {
  const formattedPos = String(product.position || index + 1).padStart(2, '0');
  const soldText = product.showSoldQuantity ? formatSoldQuantityText(product.soldQuantity) : null;
  const availableText = formatAvailableQuantityText(product.availableQuantity);
  const hasBadge = Boolean(product.badgeEnabled && product.badgeText && product.badgeText.trim());
  const sizes = useMemo(() => normalizePublicSizes(product.sizes), [product.sizes]);
  const outOfStockSizes = useMemo(() => normalizePublicSizes(product.outOfStockSizes), [product.outOfStockSizes]);

  const galleryImages = useMemo(() => {
    const allImages = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
      .map((url) => (url || '').trim())
      .filter(Boolean);
    return Array.from(new Set(allImages));
  }, [product.imageUrls, product.imageUrl]);

  const badgeBgColor = product.badgeColor || '#FFFFFF';
  const badgeTextColor = useMemo(() => getReadableTextColor(badgeBgColor), [badgeBgColor]);

  const handleProductClick = () => {
    Repository.trackBestSellerProductClick(product.id);
  };

  const badgeElement = hasBadge ? (
    <div
      id={`product-badge-${product.id}`}
      style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
      className="absolute top-3 right-3 z-30 text-[9px] sm:text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-[2px] shadow-md select-none pointer-events-none"
    >
      {product.badgeText}
    </div>
  ) : undefined;

  const hasInstallment = Boolean(
    product.installmentsCount &&
      product.installmentsCount > 0 &&
      product.installmentValue !== null &&
      product.installmentValue !== undefined
  );

  return (
    <motion.article
      id={`best-seller-product-${product.id}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="w-full flex flex-col pb-12 last:pb-4"
    >
      <ProductImageGallery
        images={galleryImages}
        productName={product.name}
        isFirst={isFirst}
        rankLabel={formattedPos}
        rankColor={rankColor}
        sizeColor={sizeColor}
        badgeContent={badgeElement}
        sizes={sizes}
        outOfStockSizes={outOfStockSizes}
      />

      <div className="flex flex-col items-center text-center px-2 sm:px-4">
        <h2 className="max-w-md text-[18px] sm:text-[21px] font-semibold text-white tracking-[-0.01em] leading-[1.22] break-words">
          {product.name}
        </h2>

        {((product.promotionalPrice !== null && product.promotionalPrice !== undefined) ||
          (product.originalPrice !== null && product.originalPrice !== undefined)) && (
          <div className="mt-3 flex flex-col items-center gap-0.5">
            {product.promotionalPrice !== null && product.promotionalPrice !== undefined ? (
              <>
                {product.originalPrice !== null &&
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.promotionalPrice && (
                    <span className="text-[12px] text-neutral-500 line-through font-normal">
                      {formatPriceBRL(product.originalPrice)}
                    </span>
                  )}
                <span className="text-[23px] sm:text-[26px] font-bold text-white tracking-[-0.03em] leading-none">
                  {formatPriceBRL(product.promotionalPrice)}
                </span>
              </>
            ) : (
              <span className="text-[23px] sm:text-[26px] font-bold text-white tracking-[-0.03em] leading-none">
                {formatPriceBRL(product.originalPrice)}
              </span>
            )}
          </div>
        )}

        {hasInstallment && (
          <p className="mt-2 text-[12px] text-neutral-400 font-normal">
            Parcele em {product.installmentsCount}x de {formatPriceBRL(product.installmentValue)}
          </p>
        )}

        {(soldText || availableText) && (
          <div className="mt-3 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
            {soldText && <span className="text-neutral-300 font-medium">{soldText}</span>}
            {soldText && availableText && <span className="text-neutral-700">·</span>}
            {availableText && <span>{availableText}</span>}
          </div>
        )}

        {product.colors && product.colors.length > 0 && (
          <div className="mt-5 flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 font-semibold mb-2">Cores</span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {product.colors.map((color, cIdx) => (
                <span
                  key={`${color}-${cIdx}`}
                  className="px-2.5 py-1 rounded-[3px] bg-transparent text-neutral-300 border border-white/[0.12] text-[11px]"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {product.productUrl && (
          <div className="w-full pt-6">
            <a
              id={`btn-ver-produto-${product.id}`}
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleProductClick}
              className="inline-flex min-h-12 items-center justify-center w-full py-3 px-6 rounded-[3px] bg-white text-black font-bold text-[11px] tracking-[0.14em] uppercase hover:bg-neutral-200 active:scale-[0.995] transition-all duration-150 text-center cursor-pointer"
            >
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </motion.article>
  );
};

export const MaisVendidosPage: React.FC = () => {
  const [listData, setListData] = useState<PublicBestSellerList | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const lastDataRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);
  const hasLoadedInitiallyRef = useRef<boolean>(false);

  // Atualiza relógio local para o timer (apenas cálculo visual a cada 1s)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // SEO e Título da Página
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Mais Vendidos do Dia | Zhaya';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // Busca dados da lista pública com suporte a polling silencioso
  const fetchPublicList = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;

    // Evita múltiplas requisições simultâneas concorrentes
    if (isFetchingRef.current) return;

    if (!isSilent) {
      setLoading(true);
      setErrorMessage(null);
    }

    isFetchingRef.current = true;

    try {
      const data = await Repository.getPublicBestSellers();
      const serialized = JSON.stringify(data ?? null);

      // Atualiza o estado somente se houver alteração real nos dados
      if (serialized !== lastDataRef.current) {
        lastDataRef.current = serialized;
        setListData(data);
      }

      hasLoadedInitiallyRef.current = true;
      if (!isSilent) {
        setErrorMessage(null);
      }
    } catch (err) {
      console.error('[MaisVendidosPage] Erro ao carregar dados:', err);
      // Se for no primeiro carregamento falho e explícito, exibe a mensagem de erro
      if (!hasLoadedInitiallyRef.current && !isSilent) {
        setErrorMessage('Não foi possível carregar os produtos agora.');
      }
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Carregamento inicial e Polling silencioso a cada ~3 segundos
  useEffect(() => {
    // 1. Carregamento inicial explícito
    fetchPublicList({ silent: false });

    // 2. Polling silencioso a cada 3 segundos
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchPublicList({ silent: true });
      }
    }, 3000);

    // 3. Atualização imediata ao voltar à aba ou focar na janela
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPublicList({ silent: true });
      }
    };

    const handleWindowFocus = () => {
      fetchPublicList({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Cálculo do Timer
  const timeRemaining = useMemo(() => {
    if (!listData?.timerEnabled || !listData?.timerEnd) return null;
    return calculateTimeRemaining(listData.timerEnd);
  }, [listData, now]);

  const formattedDate = useMemo(() => {
    if (!listData?.listDate) return '';
    return formatBestSellerDate(listData.listDate, listData.timezone);
  }, [listData]);

  return (
    <div
      id="mais-vendidos-page-container"
      className="min-h-screen w-full bg-black text-white selection:bg-neutral-800 selection:text-white flex flex-col items-center antialiased"
      style={{
        backgroundColor: '#000000',
        fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <main className="w-full max-w-xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* ========================================================================= */}
        {/* ESTADO 1: LOADING                                                         */}
        {/* ========================================================================= */}
        {loading && (
          <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-6 h-6 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
            <p className="text-xs text-neutral-400 tracking-widest uppercase font-light">
              Carregando seleção...
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 2: ERRO DE REDE                                                    */}
        {/* ========================================================================= */}
        {!loading && errorMessage && (
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center space-y-5 px-4">
            <p className="text-sm text-neutral-300 font-light tracking-wide max-w-xs">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => fetchPublicList({ silent: false })}
              className="py-2.5 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[4px] text-xs font-semibold tracking-wider uppercase border border-neutral-800 transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 3: SEM LISTA ATIVA                                                 */}
        {/* ========================================================================= */}
        {!loading && !errorMessage && !listData && (
          <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 px-4">
            <span className="text-[11px] tracking-[0.25em] text-neutral-400 uppercase font-medium">
              ZHAYA
            </span>
            <h1 className="text-2xl font-light tracking-tight text-white">
              Mais Vendidos
            </h1>
            <p className="text-xs text-neutral-300 font-light tracking-wide max-w-xs">
              Nossa seleção de hoje ainda não está disponível.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 4: LISTA ATIVA COM PRODUTOS                                        */}
        {/* ========================================================================= */}
        {!loading && !errorMessage && listData && (
          <div className="w-full flex flex-col items-center">
            {/* Header Editorial: data primeiro, depois logo e timer. */}
            <header className="w-full text-center mb-7 sm:mb-9">
              {formattedDate && (
                <p className="mb-4 text-[10px] sm:text-[11px] tracking-[0.20em] text-neutral-500 font-medium leading-none">
                  {formattedDate}
                </p>
              )}

              {listData.logoUrl ? (
                <div className="w-full flex justify-center items-center overflow-hidden">
                  <img
                    src={listData.logoUrl}
                    alt={listData.title || 'Zhaya'}
                    className="w-auto max-w-[230px] sm:max-w-[280px] max-h-32 sm:max-h-40 object-contain block mx-auto"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-white uppercase leading-tight">
                    {listData.title || 'Mais Vendidos do Dia'}
                  </h1>
                </div>
              )}

              {listData.subtitle && (
                <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-normal tracking-wide max-w-sm mx-auto">
                  {listData.subtitle}
                </p>
              )}

              {listData.timerEnabled && timeRemaining && (
                <div id="best-sellers-timer-container" className="mt-4 flex flex-col items-center text-center">
                  <span className="text-[8px] sm:text-[9px] tracking-[0.24em] text-neutral-500 uppercase font-semibold leading-none mb-1.5">
                    {timeRemaining.isExpired ? 'ENCERRADO' : 'TERMINA EM'}
                  </span>
                  <span className="text-[25px] sm:text-[29px] leading-none font-semibold text-white tracking-[0.06em] tabular-nums">
                    {timeRemaining.formattedString}
                  </span>
                </div>
              )}
            </header>

            {/* Vitrine de Produtos */}
            {listData.products && listData.products.length > 0 ? (
              <div className="w-full flex flex-col space-y-8 sm:space-y-12">
                {listData.products.map((prod, idx) => (
                  <ProductItem
                    key={prod.id}
                    product={prod}
                    index={idx}
                    isFirst={idx === 0}
                    ctaText={(listData.ctaText || '').trim() || 'VER PRODUTO'}
                    rankColor={listData.rankColor || '#FFFFFF'}
                    sizeColor={listData.sizeColor || '#FFFFFF'}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full py-12 text-center text-xs text-neutral-400 font-light">
                Nenhum produto cadastrado para esta seleção.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
