import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import type { PublicBestSellerList, PublicBestSellerProduct, PublicBestSellerMediaItem } from '../../types/zhaya';

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


const EVERGREEN_TIMER_STORAGE_PREFIX = 'zhaya_best_seller_evergreen_timer_v1';
const evergreenTimerMemoryFallback = new Map<string, { expiresAt: number; durationMinutes: number }>();

function getEvergreenTimerEndMs(
  listId: string,
  durationMinutes: number,
  nowMs: number,
): number {
  const safeDurationMinutes = Math.max(1, Math.min(10080, Math.round(durationMinutes)));
  const durationMs = safeDurationMinutes * 60 * 1000;
  const storageKey = `${EVERGREEN_TIMER_STORAGE_PREFIX}:${listId}`;

  const resolveMemoryFallback = () => {
    const current = evergreenTimerMemoryFallback.get(storageKey);
    if (
      current &&
      current.durationMinutes === safeDurationMinutes &&
      current.expiresAt > nowMs
    ) {
      return current.expiresAt;
    }
    const nextEnd = nowMs + durationMs;
    evergreenTimerMemoryFallback.set(storageKey, {
      expiresAt: nextEnd,
      durationMinutes: safeDurationMinutes,
    });
    return nextEnd;
  };

  if (typeof window === 'undefined') {
    return resolveMemoryFallback();
  }

  try {
    const storage = window.localStorage;
    const raw = storage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const storedEnd = Number(parsed?.expiresAt);
      const storedDuration = Number(parsed?.durationMinutes);

      if (
        Number.isFinite(storedEnd) &&
        storedDuration === safeDurationMinutes &&
        storedEnd > nowMs
      ) {
        return storedEnd;
      }
    }

    // O ciclo só recomeça depois que o anterior termina.
    const nextEnd = nowMs + durationMs;
    storage.setItem(
      storageKey,
      JSON.stringify({
        expiresAt: nextEnd,
        durationMinutes: safeDurationMinutes,
      }),
    );
    return nextEnd;
  } catch {
    // Se o navegador bloquear localStorage, preserva o ciclo enquanto
    // a aba/sessão atual estiver aberta.
    return resolveMemoryFallback();
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
 * Tenta extrair um frame estático do vídeo no próprio navegador.
 * É apenas fallback visual: a capa gerada no upload continua sendo a fonte preferida.
 */
function useRuntimeVideoCover(src: string, enabled: boolean): string | null {
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    setCover(null);
    if (!enabled || !src || typeof document === 'undefined') return;

    let disposed = false;
    let timeoutId: number | null = null;
    const probe = document.createElement('video');
    probe.muted = true;
    probe.playsInline = true;
    probe.preload = 'auto';
    probe.crossOrigin = 'anonymous';

    const cleanup = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      probe.onloadedmetadata = null;
      probe.onseeked = null;
      probe.onerror = null;
      try {
        probe.pause();
        probe.removeAttribute('src');
        probe.load();
      } catch {
        // noop
      }
    };

    const capture = () => {
      if (disposed || !probe.videoWidth || !probe.videoHeight) return;
      try {
        const maxWidth = 960;
        const scale = Math.min(1, maxWidth / probe.videoWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(probe.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(probe.videoHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(probe, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (!disposed && dataUrl && dataUrl !== 'data:,') setCover(dataUrl);
      } catch {
        // Alguns hosts externos não permitem leitura do frame por CORS.
      } finally {
        cleanup();
      }
    };

    probe.onloadedmetadata = () => {
      try {
        const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
        probe.currentTime = duration > 0.2 ? Math.min(0.35, duration * 0.08) : 0;
        if (probe.currentTime === 0) {
          window.setTimeout(capture, 120);
        }
      } catch {
        cleanup();
      }
    };
    probe.onseeked = capture;
    probe.onerror = cleanup;
    timeoutId = window.setTimeout(cleanup, 7000);
    probe.src = src;
    probe.load();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src, enabled]);

  return cover;
}

/**
 * Player de vídeo da galeria.
 * Antes do primeiro play ele NÃO mostra o elemento de vídeo: exibe uma capa
 * estática com um botão de play visual. Isso evita o quadro preto do player em
 * navegadores mobile. O vídeo real só fica visível depois do toque do usuário.
 */
const GalleryVideo: React.FC<{
  src: string;
  label: string;
  onError: () => void;
  posterUrl?: string;
}> = ({ src, label, onError, posterUrl }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);
  const runtimeCover = useRuntimeVideoCover(src, !posterUrl || posterFailed);
  const coverUrl = posterFailed ? runtimeCover : (posterUrl || runtimeCover);

  useEffect(() => {
    setActivated(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPosterFailed(false);
  }, [src, posterUrl]);

  const stopPointer = (event: React.PointerEvent) => event.stopPropagation();

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setActivated(true);
    void video.play().catch(() => {
      setPlaying(false);
    });
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!activated) {
      startPlayback();
      return;
    }
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  };

  const handleVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(1, value));
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <div className="relative w-full h-full bg-neutral-950">
      {/* O vídeo pode carregar em segundo plano, mas nunca fica visível antes do primeiro play. */}
      <video
        ref={videoRef}
        src={src}
        aria-label={label}
        playsInline
        preload="metadata"
        controls={false}
        onLoadedMetadata={(event) => {
          const nextDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
          setDuration(nextDuration);
        }}
        onPlay={() => { setActivated(true); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onVolumeChange={(event) => {
          setMuted(event.currentTarget.muted);
          setVolume(event.currentTarget.volume);
        }}
        onError={onError}
        className={`absolute inset-0 w-full h-full object-cover object-center bg-neutral-950 pointer-events-none transition-opacity duration-200 ${activated ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Capa simulada: é uma <img>, não depende do poster/renderização do player. */}
      {!activated && (
        <div className="absolute inset-0 z-20 bg-neutral-900">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${label} - capa`}
              draggable={false}
              onError={() => setPosterFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-900" aria-hidden="true" />
          )}

          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={(event) => { event.stopPropagation(); startPlayback(); }}
            aria-label="Reproduzir vídeo"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex h-20 w-20 items-center justify-center text-white transition-transform duration-150 active:scale-95"
          >
            <Play size={48} strokeWidth={1.8} fill="currentColor" />
          </button>
        </div>
      )}

      {activated && !playing && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => { event.stopPropagation(); togglePlayback(); }}
          aria-label="Reproduzir vídeo"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex h-16 w-16 items-center justify-center text-white/95 transition-transform duration-150 active:scale-95"
        >
          <Play size={42} strokeWidth={1.7} fill="currentColor" />
        </button>
      )}

      {/* Controles aparecem somente depois que o player foi realmente aberto. */}
      {activated && (
        <div
          className="absolute left-3 right-3 bottom-2.5 z-40 flex items-center gap-2.5 text-white"
          onPointerDown={stopPointer}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={togglePlayback}
            className="shrink-0 inline-flex items-center justify-center text-white/95 hover:text-white"
            aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
          >
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.01)}
            step="0.05"
            value={Math.min(currentTime, Math.max(duration, 0.01))}
            onChange={(event) => handleSeek(Number(event.target.value))}
            aria-label="Progresso do vídeo"
            className="min-w-0 flex-1 h-1 accent-white cursor-pointer"
          />

          <button
            type="button"
            onClick={toggleMute}
            className="shrink-0 inline-flex items-center justify-center text-white/90 hover:text-white"
            aria-label={muted || volume === 0 ? 'Ativar som' : 'Silenciar vídeo'}
          >
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => handleVolume(Number(event.target.value))}
            aria-label="Volume do vídeo"
            className="w-14 sm:w-20 h-1 accent-white cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Galeria editorial unificada de imagens e vídeos.
 * Imagens mantêm swipe/drag no mobile; vídeos também permitem swipe e usam controles próprios para play e volume.
 */
const ProductMediaGallery: React.FC<{
  mediaItems: PublicBestSellerMediaItem[];
  productName: string;
  isFirst: boolean;
  rankLabel: string;
  rankColor: string;
  sizeColor: string;
  badgeContent?: React.ReactNode;
  sizes: string[];
  outOfStockSizes: string[];
}> = ({ mediaItems, productName, isFirst, rankLabel, rankColor, sizeColor, badgeContent, sizes, outOfStockSizes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedMedia, setFailedMedia] = useState<Record<number, boolean>>({});
  const [direction, setDirection] = useState(0);
  const totalItems = mediaItems.length;

  useEffect(() => {
    if (currentIndex >= totalItems) setCurrentIndex(0);
  }, [currentIndex, totalItems]);

  const goToIndex = (nextIndex: number, nextDirection = 0) => {
    if (totalItems <= 1) return;
    const normalized = (nextIndex + totalItems) % totalItems;
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
    if (totalItems <= 1) return;
    const swipeStrength = Math.abs(info.offset.x) + Math.abs(info.velocity.x) * 0.08;
    if (swipeStrength < 48) return;
    if (info.offset.x < 0) handleNext();
    else handlePrev();
  };

  const currentMedia = mediaItems[currentIndex];
  const fallbackVideoPoster = mediaItems.find((item) => item.type === 'image' && item.url)?.url;
  const hasError = failedMedia[currentIndex];
  const unavailableSet = new Set(outOfStockSizes);
  const canSwipe = totalItems > 1;

  return (
    <div className="relative w-full aspect-[4/5] bg-neutral-950 rounded-[10px] overflow-hidden mb-5 select-none touch-pan-y group">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={`${currentIndex}-${currentMedia?.id || currentMedia?.url || 'empty'}`}
          className="absolute inset-0"
          custom={direction}
          initial={{ opacity: 0, x: direction === 0 ? 0 : direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === 0 ? 0 : direction * -22 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          drag={canSwipe ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.22}
          onDragEnd={handleDragEnd}
        >
          {currentMedia && !hasError ? (
            currentMedia.type === 'video' ? (
              <GalleryVideo
                src={currentMedia.url}
                label={`${productName} - vídeo ${currentIndex + 1}`}
                onError={() => setFailedMedia((prev) => ({ ...prev, [currentIndex]: true }))}
                posterUrl={currentMedia.posterUrl || fallbackVideoPoster}
              />
            ) : (
              <img
                src={currentMedia.url}
                alt={`${productName} - imagem ${currentIndex + 1}`}
                loading={isFirst && currentIndex === 0 ? 'eager' : 'lazy'}
                onError={() => setFailedMedia((prev) => ({ ...prev, [currentIndex]: true }))}
                className="w-full h-full object-cover object-center pointer-events-none"
                draggable={false}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-600 px-4 text-center">
              <span className="text-xs tracking-[0.14em] uppercase">Mídia indisponível</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {badgeContent}

      <div
        className="absolute left-3.5 top-3 z-20 pointer-events-none text-[27px] sm:text-[29px] leading-none font-black tracking-[-0.055em]"
        style={{ color: rankColor, textShadow: 'none', WebkitTextStroke: '0px transparent', filter: 'none' }}
        aria-label={`Posição ${rankLabel}`}
      >
        #{rankLabel}
      </div>

      {sizes.length > 0 && (
        <div className={`absolute left-3.5 z-20 pointer-events-none ${currentMedia?.type === 'video' ? 'bottom-[76px]' : 'bottom-4'}`}>
          <div className="flex flex-col items-start gap-y-2">
            {sizes.map((size) => {
              const unavailable = unavailableSet.has(size);
              return (
                <span
                  key={size}
                  className="relative inline-flex items-center text-[12px] sm:text-[13px] leading-none font-bold"
                  style={{ color: sizeColor, opacity: unavailable ? 0.38 : 1, textShadow: 'none', filter: 'none' }}
                >
                  {size}
                  {unavailable && (
                    <span className="absolute left-full ml-1 -top-1 text-[12px] leading-none font-semibold text-red-500" style={{ textShadow: 'none', filter: 'none' }} aria-label="Fora de estoque">×</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {totalItems > 1 && (
        <>
          <button type="button" onClick={handlePrev} aria-label="Mídia anterior" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/65 z-30 cursor-pointer">‹</button>
          <button type="button" onClick={handleNext} aria-label="Próxima mídia" className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/65 z-30 cursor-pointer">›</button>
          <div className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1.5 ${currentMedia?.type === 'video' ? 'bottom-[58px]' : 'bottom-3.5'}`} aria-label="Galeria de mídia">
            {mediaItems.map((item, dotIndex) => (
              <button
                key={item.id || dotIndex}
                type="button"
                onClick={(e) => { e.stopPropagation(); goToIndex(dotIndex, dotIndex > currentIndex ? 1 : -1); }}
                aria-label={`Ver ${item.type === 'video' ? 'vídeo' : 'imagem'} ${dotIndex + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${dotIndex === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
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

  const galleryMedia = useMemo<PublicBestSellerMediaItem[]>(() => {
    if (Array.isArray(product.mediaItems) && product.mediaItems.length > 0) {
      return product.mediaItems.filter((item) => item && item.url && (item.type === 'image' || item.type === 'video'));
    }
    const allImages = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
      .map((url) => (url || '').trim())
      .filter(Boolean);
    return Array.from(new Set(allImages)).map((url, index) => ({ id: `legacy-image-${index + 1}`, type: 'image' as const, url }));
  }, [product.mediaItems, product.imageUrls, product.imageUrl]);

  const badgeBgColor = product.badgeColor || '#FFFFFF';
  const badgeTextColor = useMemo(() => getReadableTextColor(badgeBgColor), [badgeBgColor]);

  const handleProductClick = () => {
    Repository.trackBestSellerProductClick(product.id);
  };

  const badgeElement = hasBadge ? (
    <div
      id={`product-badge-${product.id}`}
      style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
      className="absolute top-3 right-3 z-30 text-[9px] sm:text-[10px] font-black tracking-[0.12em] uppercase px-2.5 py-1 rounded-[2px] select-none pointer-events-none"
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
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="w-full flex flex-col pb-12 last:pb-4"
    >
      <ProductMediaGallery
        mediaItems={galleryMedia}
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
        <h2 className="max-w-md text-[19px] sm:text-[22px] font-bold text-white tracking-[-0.025em] leading-[1.16] break-words">
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
                    <span className="text-[12px] text-neutral-500 line-through font-medium">
                      {formatPriceBRL(product.originalPrice)}
                    </span>
                  )}
                <span className="text-[26px] sm:text-[30px] font-black text-white tracking-[-0.045em] leading-none">
                  {formatPriceBRL(product.promotionalPrice)}
                </span>
              </>
            ) : (
              <span className="text-[26px] sm:text-[30px] font-black text-white tracking-[-0.045em] leading-none">
                {formatPriceBRL(product.originalPrice)}
              </span>
            )}
          </div>
        )}

        {hasInstallment && (
          <p className="mt-2 text-[12px] text-neutral-300 font-semibold tracking-[-0.01em]">
            Até {product.installmentsCount}x de {formatPriceBRL(product.installmentValue)} sem juros
          </p>
        )}

        {(soldText || availableText) && (
          <div className="mt-3 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] text-neutral-500 font-medium">
            {soldText && <span className="text-neutral-300 font-medium">{soldText}</span>}
            {soldText && availableText && <span className="text-neutral-700">·</span>}
            {availableText && <span>{availableText}</span>}
          </div>
        )}

        {product.colors && product.colors.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] uppercase tracking-[0.10em] text-neutral-400 font-semibold">
            {product.colors.map((color, cIdx) => (
              <React.Fragment key={`${color}-${cIdx}`}>
                <span>{color}</span>
                {cIdx < product.colors.length - 1 && <span className="text-neutral-700">·</span>}
              </React.Fragment>
            ))}
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
              className="inline-flex min-h-12 items-center justify-center w-full py-3.5 px-6 rounded-[2px] bg-white text-black font-black text-[11px] tracking-[0.12em] uppercase hover:bg-neutral-200 active:scale-[0.995] transition-all duration-150 text-center cursor-pointer"
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

  // Cálculo do timer fixo ou evergreen/looping por navegador.
  const timeRemaining = useMemo(() => {
    if (!listData?.timerEnabled) return null;

    if (listData.timerLooping && listData.timerDurationMinutes && listData.timerDurationMinutes > 0) {
      const evergreenEndMs = getEvergreenTimerEndMs(
        listData.id,
        listData.timerDurationMinutes,
        now,
      );
      return calculateTimeRemaining(new Date(evergreenEndMs).toISOString());
    }

    if (!listData.timerEnd) return null;
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
      {listData?.backgroundVideoUrl && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black" aria-hidden="true">
          <video
            key={listData.backgroundVideoUrl}
            src={listData.backgroundVideoUrl}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            style={{ opacity: Math.min(0.9, Math.max(0, Number(listData.backgroundVideoOpacity ?? 0.22))) }}
          />
        </div>
      )}
      <main className="relative z-10 w-full max-w-[540px] px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center">
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
            <header className="w-full text-center mb-6 sm:mb-8">
              {formattedDate && (
                <p className="mb-3 text-[10px] sm:text-[11px] tracking-[0.18em] text-neutral-500 font-bold leading-none">
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
                  <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-white uppercase leading-tight">
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
                <div
                  id="best-sellers-timer-container"
                  className="mt-3 flex flex-col items-center text-center"
                  aria-live="polite"
                >
                  <span className="text-[8px] sm:text-[9px] tracking-[0.28em] text-neutral-500 uppercase font-bold leading-none mb-1.5">
                    {timeRemaining.isExpired ? 'ENCERRADO' : 'TERMINA EM'}
                  </span>
                  <div
                    className="flex items-baseline justify-center text-[35px] sm:text-[42px] leading-none font-black text-white tracking-[-0.045em] tabular-nums"
                    aria-label={timeRemaining.formattedString}
                  >
                    {timeRemaining.formattedString.split(':').map((part, index, parts) => (
                      <React.Fragment key={`${part}-${index}`}>
                        <span>{part}</span>
                        {index < parts.length - 1 && (
                          <span className="mx-1 sm:mx-1.5 text-neutral-600 font-bold">:</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </header>

            {/* Vitrine de Produtos */}
            {listData.products && listData.products.length > 0 ? (
              <div className="w-full flex flex-col space-y-6 sm:space-y-10">
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
