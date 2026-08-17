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
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    let formattedString = `${hh}:${mm}:${ss}`;
    if (days > 0) {
      const dd = String(days).padStart(2, '0');
      formattedString = `${dd}d ${hh}:${mm}:${ss}`;
    }

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
 * Carrossel / Galeria de Imagens de Produto com suporte a Swipe Mobile
 */
const ProductImageGallery: React.FC<{
  images: string[];
  productName: string;
  isFirst: boolean;
  badgeContent?: React.ReactNode;
}> = ({ images, productName, isFirst, badgeContent }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalImages = images.length;

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex < totalImages - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(totalImages - 1);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > 40;
    if (isSwipe) {
      if (distance > 0) {
        // Swipe para esquerda (próxima foto)
        handleNext();
      } else {
        // Swipe para direita (foto anterior)
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentImageUrl = images[currentIndex];
  const hasError = failedImages[currentIndex];

  return (
    <div
      className="relative w-full aspect-[4/5] bg-neutral-950 rounded-[4px] overflow-hidden border border-neutral-900 mb-5 select-none touch-pan-y group"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Imagem Atual */}
      {currentImageUrl && !hasError ? (
        <img
          key={currentImageUrl}
          src={currentImageUrl}
          alt={`${productName} - Imagem ${currentIndex + 1}`}
          loading={isFirst && currentIndex === 0 ? 'eager' : 'lazy'}
          onError={() => setFailedImages((prev) => ({ ...prev, [currentIndex]: true }))}
          className="w-full h-full object-cover object-center transition-opacity duration-300 pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-600 px-4 text-center">
          <span className="text-xs tracking-widest uppercase font-light">Imagem indisponível</span>
        </div>
      )}

      {/* Badge / Tag no Canto Superior Direito */}
      {badgeContent}

      {/* Navegação por Setas (Desktop / Hover) */}
      {totalImages > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-20 cursor-pointer"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-20 cursor-pointer"
          >
            ›
          </button>
        </>
      )}

      {/* Indicadores / Dots no Rodapé da Imagem */}
      {totalImages > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-20 pointer-events-auto">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentIndex ? 'w-5 bg-white shadow-sm' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Componente do Card Editorial de Produto
 */
const ProductItem: React.FC<{
  product: PublicBestSellerProduct;
  index: number;
  isFirst: boolean;
}> = ({ product, index, isFirst }) => {
  const formattedPos = String(product.position || index + 1).padStart(2, '0');
  const soldText = product.showSoldQuantity ? formatSoldQuantityText(product.soldQuantity) : null;
  const availableText = formatAvailableQuantityText(product.availableQuantity);
  const hasBadge = Boolean(product.badgeEnabled && product.badgeText && product.badgeText.trim());

  // Tratamento da galeria de imagens
  const galleryImages = useMemo(() => {
    if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
      return product.imageUrls.filter(Boolean);
    }
    if (product.imageUrl) {
      return [product.imageUrl];
    }
    return [];
  }, [product.imageUrls, product.imageUrl]);

  // Contraste automático da cor do badge
  const badgeBgColor = product.badgeColor || '#FFFFFF';
  const badgeTextColor = useMemo(() => getReadableTextColor(badgeBgColor), [badgeBgColor]);

  // Dispara evento de clique e abre URL da loja
  const handleProductClick = () => {
    Repository.trackBestSellerProductClick(product.id);
  };

  const badgeElement = hasBadge ? (
    <div
      id={`product-badge-${product.id}`}
      style={{
        backgroundColor: badgeBgColor,
        color: badgeTextColor,
      }}
      className="absolute top-3 right-3 z-10 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-[2px] shadow-md select-none pointer-events-none"
    >
      {product.badgeText}
    </div>
  ) : undefined;

  return (
    <article
      id={`best-seller-product-${product.id}`}
      className="w-full flex flex-col pt-2 pb-10 border-b border-neutral-900 last:border-b-0"
    >
      {/* Galeria de Fotos / Imagem */}
      <ProductImageGallery
        images={galleryImages}
        productName={product.name}
        isFirst={isFirst}
        badgeContent={badgeElement}
      />

      {/* Conteúdo Editorial do Produto */}
      <div className="flex flex-col space-y-3 px-0.5">
        {/* Posição no Ranking & Categoria */}
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-semibold tracking-tight ${
              isFirst ? 'text-sm text-neutral-200' : 'text-xs text-neutral-400'
            }`}
          >
            #{formattedPos}
          </span>
          {product.category && (
            <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium">
              · {product.category}
            </span>
          )}
        </div>

        {/* Nome do Produto */}
        <h2 className="text-base sm:text-lg font-medium text-white tracking-wide leading-snug break-words">
          {product.name}
        </h2>

        {/* Preço (Original e Promocional) */}
        {((product.promotionalPrice !== null && product.promotionalPrice !== undefined) ||
          (product.originalPrice !== null && product.originalPrice !== undefined)) && (
          <div className="flex items-baseline gap-2.5 pt-0.5">
            {product.promotionalPrice !== null && product.promotionalPrice !== undefined ? (
              <>
                <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {formatPriceBRL(product.promotionalPrice)}
                </span>
                {product.originalPrice !== null &&
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.promotionalPrice && (
                    <span className="text-xs sm:text-sm text-neutral-400 line-through font-light">
                      {formatPriceBRL(product.originalPrice)}
                    </span>
                  )}
              </>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {formatPriceBRL(product.originalPrice)}
              </span>
            )}
          </div>
        )}

        {/* Informações de Vendas & Estoque */}
        {(soldText || availableText) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400 font-light pt-0.5">
            {soldText && <span className="text-neutral-300 font-medium">{soldText}</span>}
            {soldText && availableText && <span className="text-neutral-700">·</span>}
            {availableText && <span className="text-neutral-400">{availableText}</span>}
          </div>
        )}

        {/* Cores Disponíveis */}
        {product.colors && product.colors.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block mb-1.5">
              Cores
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((color, cIdx) => (
                <span
                  key={cIdx}
                  className="px-2.5 py-0.5 rounded-[2px] bg-neutral-900 text-neutral-300 border border-neutral-800 text-[11px] font-light"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tamanhos Disponíveis */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium block mb-1.5">
              Tamanhos
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((size, sIdx) => (
                <span
                  key={sIdx}
                  className="min-w-[28px] text-center px-2 py-0.5 rounded-[2px] bg-neutral-900 text-neutral-300 border border-neutral-800 text-[11px] font-mono font-medium"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA: Botão Ver Produto na Loja */}
        {product.productUrl && (
          <div className="pt-3">
            <a
              id={`btn-ver-produto-${product.id}`}
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleProductClick}
              className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-[4px] bg-white text-black font-semibold text-xs tracking-widest uppercase hover:bg-neutral-200 active:scale-[0.99] transition-all duration-150 shadow-sm text-center cursor-pointer"
            >
              Ver Produto →
            </a>
          </div>
        )}
      </div>
    </article>
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
        fontFamily: 'var(--font-zhaya, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
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
            {/* Header Editorial */}
            <header className="w-full text-center space-y-3 mb-8 sm:mb-10">
              {/* Logo customizada ou Logo padrão / Nome */}
              {listData.logoUrl ? (
                <div className="w-full flex justify-center items-center pt-2 pb-2 overflow-hidden">
                  <img
                    src={listData.logoUrl}
                    alt={listData.title || 'Zhaya'}
                    className="w-full h-auto max-h-60 sm:max-h-80 object-contain block mx-auto"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[11px] tracking-[0.28em] text-neutral-400 uppercase font-medium block">
                    ZHAYA
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white uppercase leading-tight pt-0.5">
                    {listData.title || 'Mais Vendidos do Dia'}
                  </h1>
                </div>
              )}

              {/* Data da Lista */}
              {formattedDate && (
                <p className="text-[11px] tracking-widest text-neutral-400 font-mono pt-0.5">
                  {formattedDate}
                </p>
              )}

              {/* Subtítulo Opcional */}
              {listData.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-300 font-light tracking-wide pt-1 max-w-sm mx-auto">
                  {listData.subtitle}
                </p>
              )}

              {/* Timer de Encerramento Limpo (Formato TERMINA EM HH:MM:SS) */}
              {listData.timerEnabled && timeRemaining && (
                <div
                  id="best-sellers-timer-container"
                  className="mt-5 py-3 px-5 rounded-[4px] bg-neutral-950 border border-neutral-900 w-full max-w-xs mx-auto flex items-center justify-center space-x-2 text-center"
                >
                  <span className="text-[11px] tracking-[0.2em] text-neutral-400 uppercase font-semibold">
                    {timeRemaining.isExpired ? 'ENCERRADO' : 'TERMINA EM'}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-widest">
                    {timeRemaining.formattedString}
                  </span>
                </div>
              )}
            </header>

            {/* Divisória Editorial Discreta */}
            <div className="w-full border-t border-neutral-900 mb-8" />

            {/* Vitrine de Produtos */}
            {listData.products && listData.products.length > 0 ? (
              <div className="w-full flex flex-col space-y-8 sm:space-y-12">
                {listData.products.map((prod, idx) => (
                  <ProductItem
                    key={prod.id}
                    product={prod}
                    index={idx}
                    isFirst={idx === 0}
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
