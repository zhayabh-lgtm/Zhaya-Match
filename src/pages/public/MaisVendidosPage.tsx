import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import { getBestSellerUiText, formatBestSellerUiText, type BestSellerUiText } from '../../lib/bestSellerI18n';
import { detectBestSellerCategoryKey, getBestSellerCategoryLabel } from '../../lib/bestSellerCategories';
import type { PublicBestSellerList, PublicBestSellerProduct, PublicBestSellerMediaItem } from '../../types/zhaya';

/**
 * Formata a data no padrão '17 AGO 2026' ou '17 DE AGOSTO DE 2026' considerando fuso horário de São Paulo
 */
export function formatBestSellerDate(dateStr: string, timezone = 'America/Sao_Paulo', locale = 'pt-BR'): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
      return new Intl.DateTimeFormat(locale || 'pt-BR', {
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
    return new Intl.DateTimeFormat(locale || 'pt-BR', {
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
export function formatSoldQuantityText(
  qty: number | null | undefined,
  ui: BestSellerUiText = getBestSellerUiText('pt-BR'),
): string | null {
  if (qty === null || qty === undefined || qty < 1) return null;
  if (ui.locale === 'pt' && qty === 1) return '1 vendido hoje';
  return formatBestSellerUiText(ui.soldCount, { count: qty });
}

/**
 * Formata texto de estoque disponível no idioma da vitrine.
 */
export function formatAvailableQuantityText(
  qty: number | null | undefined,
  ui: BestSellerUiText = getBestSellerUiText('pt-BR'),
): string | null {
  if (qty === null || qty === undefined || qty < 1) return null;
  if (ui.locale === 'pt' && qty === 1) return '1 unidade disponível';
  if (qty <= 3) return formatBestSellerUiText(ui.lowStockCount, { count: qty });
  return formatBestSellerUiText(ui.stockCount, { count: qty });
}

/**
 * Formata valores monetários em Real Brasileiro (R$)
 */
export function formatPriceBRL(
  price: number | null | undefined,
  currency = 'BRL',
  locale = 'pt-BR',
): string | null {
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(locale || 'pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
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

const BEST_SELLER_ACTIVITY_EVENT = 'zhaya-best-seller-activity';

function signalBestSellerActivity(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BEST_SELLER_ACTIVITY_EVENT));
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
  fallbackPosterUrl?: string;
  onPlaybackStarted?: () => void;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  ui?: BestSellerUiText;
}> = ({ src, label, onError, posterUrl, fallbackPosterUrl, onPlaybackStarted, autoPlay = false, loop = false, showControls = true, ui = getBestSellerUiText('pt-BR') }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(autoPlay);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);
  const playReportedRef = useRef(false);
  const playerIdRef = useRef(`video-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const runtimeCover = useRuntimeVideoCover(src, (!posterUrl && !fallbackPosterUrl) || (posterFailed && !fallbackPosterUrl));
  const coverUrl = posterFailed ? (fallbackPosterUrl || runtimeCover) : (posterUrl || fallbackPosterUrl || runtimeCover);

  useEffect(() => {
    setActivated(false);
    setVideoReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPosterFailed(false);
    setMuted(autoPlay);
    playReportedRef.current = false;
  }, [src, posterUrl, fallbackPosterUrl, autoPlay]);


  // Auto-play só começa quando o vídeo realmente entra na área visível.
  // Ao sair, pausa e volta para a capa para não manter vários players ativos.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.42 && autoPlay) {
        setMuted(true);
        setActivated(true);
        const video = videoRef.current;
        if (video) {
          video.muted = true;
          void video.play().catch(() => undefined);
        }
        return;
      }

      if (!entry.isIntersecting || entry.intersectionRatio < 0.08) {
        const video = videoRef.current;
        if (video) {
          try {
            video.pause();
            video.currentTime = 0;
          } catch {
            // noop
          }
        }
        setPlaying(false);
        setCurrentTime(0);
        setActivated(false);
        setVideoReady(false);
      }
    }, { threshold: [0, 0.08, 0.42, 0.7] });

    observer.observe(node);
    return () => observer.disconnect();
  }, [src, autoPlay]);

  // Garante que apenas um vídeo em auto-play/reprodução toque por vez na vitrine.
  useEffect(() => {
    const handleOtherVideoStarted = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id || detail.id === playerIdRef.current) return;
      const video = videoRef.current;
      if (video && !video.paused) video.pause();
    };
    window.addEventListener('zhaya:video-started', handleOtherVideoStarted as EventListener);
    return () => window.removeEventListener('zhaya:video-started', handleOtherVideoStarted as EventListener);
  }, []);

  const stopPointer = (event: React.PointerEvent) => event.stopPropagation();

  const startPlayback = () => {
    // Antes do toque não existe <video> no DOM: só a capa estática é carregada.
    setActivated(true);
  };

  useEffect(() => {
    if (!activated) return;
    const frame = window.requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      if (autoPlay) video.muted = true;
      void video.play().catch(() => setPlaying(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activated, src, autoPlay]);

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
    <div ref={containerRef} className="relative w-full h-full bg-transparent">
      {/* O player real só é criado depois do toque. No iPhone isso evita que
          o download/decodificação do vídeo concorra com a capa estática. */}
      {activated && (
        <video
          ref={videoRef}
          src={src}
          aria-label={label}
          playsInline
          muted={muted}
          loop={loop}
          preload="auto"
          controls={false}
          onLoadedData={() => setVideoReady(true)}
          onLoadedMetadata={(event) => {
            const nextDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
            setDuration(nextDuration);
          }}
          onPlay={() => {
            setPlaying(true);
            window.dispatchEvent(new CustomEvent('zhaya:video-started', { detail: { id: playerIdRef.current } }));
            signalBestSellerActivity();
            if (!playReportedRef.current) {
              playReportedRef.current = true;
              onPlaybackStarted?.();
            }
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime || 0);
            // Assistir ativamente a um vídeo também conta como atividade, mesmo
            // sem mouse/toque durante a reprodução.
            if (!event.currentTarget.paused) signalBestSellerActivity();
          }}
          onVolumeChange={(event) => {
            setMuted(event.currentTarget.muted);
            setVolume(event.currentTarget.volume);
          }}
          onError={onError}
          className={`absolute inset-0 w-full h-full object-cover object-bottom bg-transparent pointer-events-none transition-opacity duration-200 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Capa é uma imagem comum. Ela permanece visível inclusive enquanto o
          player aberto ainda carrega o primeiro frame. */}
      {(!activated || !videoReady) && (
        <div className="absolute inset-0 z-20 bg-transparent">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${label} - ${ui.cover}`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
              onError={() => setPosterFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 bg-transparent" aria-hidden="true" />
          )}

          {!activated && <button
            type="button"
            onPointerDown={stopPointer}
            onClick={(event) => { event.stopPropagation(); startPlayback(); }}
            aria-label={ui.watchVideo}
            className="zhaya-video-watch-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 inline-flex min-h-12 min-w-[170px] items-center justify-center rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-[0.14em] backdrop-blur-[2px] transition-transform duration-150 active:scale-[0.98]"
          >
            {ui.watchVideo}
          </button>}
        </div>
      )}

      {activated && videoReady && !showControls && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => { event.stopPropagation(); togglePlayback(); }}
          aria-label={playing ? ui.pauseVideo : ui.playVideo}
          className="absolute inset-0 z-20 cursor-pointer bg-transparent"
        />
      )}

      {activated && videoReady && !playing && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={(event) => { event.stopPropagation(); togglePlayback(); }}
          aria-label={ui.playVideo}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex h-16 w-16 items-center justify-center text-white/95 transition-transform duration-150 active:scale-95"
        >
          <Play size={42} strokeWidth={1.7} fill="currentColor" />
        </button>
      )}

      {/* Controles aparecem somente depois que o player foi realmente aberto. */}
      {activated && videoReady && showControls && (
        <div
          className="absolute left-3 right-3 bottom-10 z-40 flex items-center gap-2.5 text-white"
          onPointerDown={stopPointer}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={togglePlayback}
            className="shrink-0 inline-flex items-center justify-center text-white/95 hover:text-white"
            aria-label={playing ? ui.pauseVideo : ui.playVideo}
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
            aria-label={ui.videoProgress}
            className="min-w-0 flex-1 h-1 accent-white cursor-pointer"
          />

          <button
            type="button"
            onClick={toggleMute}
            className="shrink-0 inline-flex items-center justify-center text-white/90 hover:text-white"
            aria-label={muted || volume === 0 ? ui.enableSound : ui.muteVideo}
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
            aria-label={ui.videoVolume}
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
  showRanking: boolean;
  badgeContent?: React.ReactNode;
  giftContent?: React.ReactNode;
  sizes: string[];
  outOfStockSizes: string[];
  timerContent?: React.ReactNode;
  videoAutoplay?: boolean;
  onVideoStarted?: () => void;
  onSlideSeen?: (index: number, total: number) => void;
  ui?: BestSellerUiText;
}> = ({ mediaItems, productName, isFirst, rankLabel, rankColor, sizeColor, showRanking, badgeContent, giftContent, sizes, outOfStockSizes, timerContent, videoAutoplay = false, onVideoStarted, onSlideSeen, ui = getBestSellerUiText('pt-BR') }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedMedia, setFailedMedia] = useState<Record<number, boolean>>({});
  const [direction, setDirection] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const autoVideoSelectedRef = useRef(false);
  const totalItems = mediaItems.length;
  const firstImageUrl = useMemo(() => mediaItems.find((item) => item.type === 'image')?.url || '', [mediaItems]);

  // Pré-carrega imagens e capas de vídeo como imagens comuns. Assim, no iPhone,
  // a capa do vídeo entra na mesma fila das demais fotos e o arquivo de vídeo
  // só começa a carregar depois do toque no Play.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urls: string[] = Array.from(new Set<string>(
      mediaItems
        .map((item) => item.type === 'video' ? item.posterUrl : item.url)
        .filter((url): url is string => typeof url === 'string' && url.length > 0),
    ));
    const preloaders = urls.map((url) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      return image;
    });
    return () => {
      preloaders.forEach((image) => { image.onload = null; image.onerror = null; });
    };
  }, [mediaItems]);

  useEffect(() => {
    if (currentIndex >= totalItems) setCurrentIndex(0);
  }, [currentIndex, totalItems]);

  const onSlideSeenRef = useRef(onSlideSeen);
  useEffect(() => {
    onSlideSeenRef.current = onSlideSeen;
  }, [onSlideSeen]);

  useEffect(() => {
    if (totalItems > 0) onSlideSeenRef.current?.(currentIndex, totalItems);
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


  useEffect(() => {
    const node = galleryRef.current;
    if (!videoAutoplay || !node || typeof IntersectionObserver === 'undefined') return;
    const firstVideoIndex = mediaItems.findIndex((item) => item.type === 'video');
    if (firstVideoIndex < 0) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.42 && !autoVideoSelectedRef.current) {
        autoVideoSelectedRef.current = true;
        if (currentIndex !== firstVideoIndex) {
          setDirection(firstVideoIndex > currentIndex ? 1 : -1);
          setCurrentIndex(firstVideoIndex);
        }
      } else if (!entry.isIntersecting || entry.intersectionRatio < 0.08) {
        autoVideoSelectedRef.current = false;
      }
    }, { threshold: [0, 0.08, 0.42, 0.7] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [videoAutoplay, mediaItems, currentIndex]);

  const currentMedia = mediaItems[currentIndex];
  const hasError = failedMedia[currentIndex];
  const unavailableSet = new Set(outOfStockSizes);
  const canSwipe = totalItems > 1;

  return (
    <div ref={galleryRef} className="relative w-full aspect-[4/5] bg-transparent rounded-[10px] overflow-hidden mb-3 sm:mb-5 select-none touch-pan-y group">
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
                posterUrl={currentMedia.posterUrl || undefined}
                fallbackPosterUrl={firstImageUrl || undefined}
                onPlaybackStarted={onVideoStarted}
                autoPlay={videoAutoplay}
                loop={false}
                showControls
                ui={ui}
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
            <div className="w-full h-full flex items-center justify-center bg-transparent text-neutral-500 px-4 text-center">
              <span className="text-xs tracking-[0.14em] uppercase">{ui.mediaUnavailable}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {badgeContent}
      {giftContent}

      {showRanking && (
        <div
          className="absolute left-3.5 top-3 z-20 pointer-events-none text-[27px] sm:text-[29px] leading-none font-black tracking-[-0.055em]"
          style={{ color: rankColor, textShadow: 'none', WebkitTextStroke: '0px transparent', filter: 'none' }}
          aria-label={formatBestSellerUiText(ui.position, { position: rankLabel })}
        >
          #{rankLabel}
        </div>
      )}

      {sizes.length > 0 && (
        <div className="absolute left-3.5 bottom-4 z-20 pointer-events-none">
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
                    <span className="absolute left-full ml-1 -top-1 text-[12px] leading-none font-semibold text-red-500" style={{ textShadow: 'none', filter: 'none' }} aria-label={ui.outOfStock}>×</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {timerContent && (
        <div className="absolute right-3.5 bottom-4 z-30 pointer-events-none">
          {timerContent}
        </div>
      )}


      {totalItems > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label={ui.previousMedia}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-10 items-center justify-center text-white/95 transition-transform duration-150 active:scale-95 cursor-pointer"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.72))' }}
          >
            <ChevronLeft size={32} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label={ui.nextMedia}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex h-12 w-10 items-center justify-center text-white/95 transition-transform duration-150 active:scale-95 cursor-pointer"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.72))' }}
          >
            <ChevronRight size={32} strokeWidth={2.4} />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-30 flex items-center justify-center gap-1.5" aria-label={ui.mediaGallery}>
            {mediaItems.map((item, dotIndex) => {
              const active = dotIndex === currentIndex;
              if (item.type === 'video') {
                return (
                  <button
                    key={item.id || dotIndex}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToIndex(dotIndex, dotIndex > currentIndex ? 1 : -1); }}
                    aria-label={formatBestSellerUiText(ui.viewVideo, { index: dotIndex + 1 })}
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-all duration-200 ${active ? 'border-white bg-white text-black' : 'border-white/55 bg-black/35 text-white hover:bg-black/55'}`}
                  >
                    <Play size={7} fill="currentColor" strokeWidth={2.2} />
                  </button>
                );
              }
              return (
                <button
                  key={item.id || dotIndex}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToIndex(dotIndex, dotIndex > currentIndex ? 1 : -1); }}
                  aria-label={formatBestSellerUiText(ui.viewImage, { index: dotIndex + 1 })}
                  className={`h-1.5 rounded-full transition-all duration-200 ${active ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
                />
              );
            })}
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
  displayRank: number;
  isFirst: boolean;
  ctaText: string;
  rankColor: string;
  sizeColor: string;
  showRanking: boolean;
  now: number;
  listId: string;
  listTimerEnabled?: boolean;
  listTimerLooping?: boolean;
  listTimerDurationMinutes?: number | null;
  listTimerEnd?: string | null;
  currencyCode?: string;
  currencyLocale?: string;
  approximateConversion?: boolean;
  approximateLabel?: string | null;
  ui?: BestSellerUiText;
  showPrices?: boolean;
  showInstallments?: boolean;
  showCta?: boolean;
  showSoldQuantity?: boolean;
  showAvailableQuantity?: boolean;
  showSizes?: boolean;
  showColors?: boolean;
  showBadges?: boolean;
  showGift?: boolean;
  showProductTimers?: boolean;
  buttonDestination?: 'product' | 'whatsapp' | 'custom' | 'form';
  onOpenForm?: (product: PublicBestSellerProduct) => void;
}> = ({ product, index, displayRank, isFirst, ctaText, rankColor, sizeColor, showRanking, now, listId, listTimerEnabled, listTimerLooping, listTimerDurationMinutes, listTimerEnd, currencyCode = 'BRL', currencyLocale = 'pt-BR', approximateConversion = false, approximateLabel, ui = getBestSellerUiText('pt-BR'), showPrices = true, showInstallments = true, showCta = true, showSoldQuantity = true, showAvailableQuantity = true, showSizes = true, showColors = true, showBadges = true, showGift = true, showProductTimers = true, buttonDestination = 'product', onOpenForm }) => {
  const formattedPos = String(displayRank || 1).padStart(2, '0');
  const soldText = showSoldQuantity && product.showSoldQuantity ? formatSoldQuantityText(product.soldQuantity, ui) : null;
  const availableText = showAvailableQuantity ? formatAvailableQuantityText(product.availableQuantity, ui) : null;
  const hasBadge = Boolean(showBadges && product.badgeEnabled && product.badgeText && product.badgeText.trim());
  const hasGift = Boolean(showGift && product.giftEnabled && product.giftImageUrl);
  const sizes = useMemo(() => showSizes ? normalizePublicSizes(product.sizes) : [], [product.sizes, showSizes]);
  const outOfStockSizes = useMemo(() => showSizes ? normalizePublicSizes(product.outOfStockSizes) : [], [product.outOfStockSizes, showSizes]);

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

  const productTimeRemaining = useMemo(() => {
    if (!showProductTimers || !product.timerEnabled) return null;

    const usesSharedListTimer = Boolean(!product.timerSeparate && listTimerEnabled);
    const effectiveLooping = usesSharedListTimer ? Boolean(listTimerLooping) : Boolean(product.timerLooping);
    const effectiveDuration = usesSharedListTimer ? listTimerDurationMinutes : product.timerDurationMinutes;
    const effectiveEnd = usesSharedListTimer ? listTimerEnd : product.timerEnd;

    if (effectiveLooping && effectiveDuration && effectiveDuration > 0) {
      // Quando sincronizado, usa exatamente a mesma chave do timer do topo.
      const timerStorageKey = usesSharedListTimer ? listId : `product:${product.id}`;
      const evergreenEndMs = getEvergreenTimerEndMs(timerStorageKey, effectiveDuration, now);
      return calculateTimeRemaining(new Date(evergreenEndMs).toISOString());
    }
    if (!effectiveEnd) return null;
    return calculateTimeRemaining(effectiveEnd);
  }, [
    product.id,
    showProductTimers,
    product.timerEnabled,
    product.timerSeparate,
    product.timerLooping,
    product.timerDurationMinutes,
    product.timerEnd,
    listTimerEnabled,
    listTimerLooping,
    listTimerDurationMinutes,
    listTimerEnd,
    listId,
    now,
  ]);

  const productTimerBg = product.timerColor || '#FFFFFF';
  const productTimerText = useMemo(() => getReadableTextColor(productTimerBg), [productTimerBg]);
  const productTimerElement = productTimeRemaining ? (
    <div className="flex flex-col items-end gap-1" aria-label={`${ui.endsIn} ${productTimeRemaining.formattedString}`}>
      <span
        className="text-[7px] sm:text-[8px] leading-none font-bold uppercase tracking-[0.16em]"
        style={{ color: productTimerBg, textShadow: 'none', filter: 'none' }}
      >
        {ui.endsIn}
      </span>
      <div
        className="px-2 py-1 rounded-[3px] text-[10px] sm:text-[11px] leading-none font-black tabular-nums tracking-[0.035em]"
        style={{
          backgroundColor: productTimerBg,
          color: productTimerText,
          boxShadow: 'none',
          textShadow: 'none',
          filter: 'none',
        }}
      >
        {productTimeRemaining.formattedString}
      </div>
    </div>
  ) : null;

  const handleProductClick = () => {
    Repository.trackBestSellerProductClick(product.id, listId);
  };

  const handleVideoStarted = () => {
    // Conta play somente quando o navegador confirma que o vídeo realmente iniciou.
    Repository.trackBestSellerAnalyticsEvent({ eventType: 'product_play', listId, productId: product.id });
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


  const giftTextColor = product.giftTextColor || '#FFFFFF';
  const giftImageSize = Math.max(36, Math.min(80, Number(product.giftImageSize || 48)));
  const giftElement = hasGift ? (
    <div
      className={`absolute right-3 ${hasBadge ? 'top-12' : 'top-3'} z-30 flex flex-col items-center pointer-events-none`}
      aria-label={product.giftTitle ? `${ui.gift}: ${product.giftTitle}` : ui.gift}
      style={{ filter: 'none', width: `${giftImageSize + 18}px` }}
    >
      {product.giftLabel && (
        <span
          className="mb-1 max-w-[72px] text-center text-[7px] sm:text-[8px] leading-[1.05] font-bold"
          style={{ color: giftTextColor, textShadow: 'none', filter: 'none' }}
        >
          {product.giftLabel}
        </span>
      )}
      <img
        src={product.giftImageUrl || ''}
        alt={product.giftTitle || ui.gift}
        className="object-contain rounded-[9px]"
        style={{ width: `${giftImageSize}px`, height: `${giftImageSize}px`, boxShadow: 'none', filter: 'none' }}
        loading="lazy"
        draggable={false}
      />
      {product.giftTitle && (
        <span
          className="mt-1 max-w-[72px] text-center text-[8px] sm:text-[9px] leading-[1.05] font-bold"
          style={{ color: giftTextColor, textShadow: 'none', filter: 'none' }}
        >
          {product.giftTitle}
        </span>
      )}
    </div>
  ) : undefined;

  const hasInstallment = Boolean(
    showPrices &&
      showInstallments &&
      product.installmentsCount &&
      product.installmentsCount > 0 &&
      product.installmentValue !== null &&
      product.installmentValue !== undefined
  );

  return (
    <motion.article
      id={`best-seller-product-${product.id}`}
      data-best-seller-product-id={product.id}
      data-best-seller-position={product.position || index + 1}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="w-full flex flex-col pb-7 sm:pb-12 last:pb-3 sm:last:pb-4"
    >
      <ProductMediaGallery
        mediaItems={galleryMedia}
        productName={product.name}
        isFirst={isFirst}
        rankLabel={formattedPos}
        rankColor={rankColor}
        sizeColor={sizeColor}
        showRanking={showRanking}
        badgeContent={badgeElement}
        giftContent={giftElement}
        sizes={sizes}
        outOfStockSizes={outOfStockSizes}
        timerContent={productTimerElement}
        videoAutoplay={Boolean(product.videoAutoplay)}
        onVideoStarted={handleVideoStarted}
        ui={ui}
        onSlideSeen={(slideIndex, slideCount) => {
          Repository.trackBestSellerAnalyticsEvent({
            eventType: 'product_behavior',
            listId,
            productId: product.id,
            slidesSeen: [slideIndex],
            slideCount,
          });
        }}
      />

      <div className="flex flex-col items-center text-center px-2 sm:px-4">
        <h2 className="max-w-md text-[19px] sm:text-[22px] font-bold text-white tracking-[-0.025em] leading-[1.10] sm:leading-[1.16] break-words">
          {product.name}
        </h2>

        {product.description && product.description.trim() && (
          <p className="mt-1.5 w-full max-w-[430px] px-1 text-[11px] sm:text-[12px] leading-[1.5] text-neutral-500 font-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {product.description.trim()}
          </p>
        )}

        {showPrices && ((product.promotionalPrice !== null && product.promotionalPrice !== undefined) ||
          (product.originalPrice !== null && product.originalPrice !== undefined)) && (
          <div className="mt-1.5 sm:mt-3 flex flex-col items-center gap-0.5">
            {product.promotionalPrice !== null && product.promotionalPrice !== undefined ? (
              <>
                {product.originalPrice !== null &&
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.promotionalPrice && (
                    <span className="text-[12px] text-neutral-500 line-through font-medium">
                      {formatPriceBRL(product.originalPrice, currencyCode, currencyLocale)}
                    </span>
                  )}
                <span className="text-[26px] sm:text-[30px] font-black text-white tracking-[-0.045em] leading-none">
                  {formatPriceBRL(product.promotionalPrice, currencyCode, currencyLocale)}
                </span>
              </>
            ) : (
              <span className="text-[26px] sm:text-[30px] font-black text-white tracking-[-0.045em] leading-none">
                {formatPriceBRL(product.originalPrice, currencyCode, currencyLocale)}
              </span>
            )}
          </div>
        )}

        {hasInstallment && (
          <p className="mt-1 sm:mt-2 text-[12px] leading-tight text-neutral-300 font-semibold tracking-[-0.01em]">
            {formatBestSellerUiText(ui.installments, {
              count: product.installmentsCount || 0,
              value: formatPriceBRL(product.installmentValue, currencyCode, currencyLocale) || '',
            })}
          </p>
        )}

        {showPrices && approximateConversion && approximateLabel && (
          <p className="mt-1 text-[9px] sm:text-[10px] text-neutral-600 font-medium">
            {approximateLabel}
          </p>
        )}

        {(soldText || availableText) && (
          <div className="mt-1.5 sm:mt-3 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-[11px] leading-tight text-neutral-500 font-medium">
            {soldText && <span className="text-neutral-300 font-medium">{soldText}</span>}
            {soldText && availableText && <span className="text-neutral-700">·</span>}
            {availableText && <span>{availableText}</span>}
          </div>
        )}

        {showColors && product.colors && product.colors.length > 0 && (
          <div className="mt-2 sm:mt-4 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-[11px] leading-tight uppercase tracking-[0.10em] text-neutral-400 font-semibold">
            {product.colors.map((color, cIdx) => (
              <React.Fragment key={`${color}-${cIdx}`}>
                <span>{color}</span>
                {cIdx < product.colors.length - 1 && <span className="text-neutral-700">·</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        {showCta && (buttonDestination === 'form' || Boolean(product.productUrl)) && (
          <div className="w-full pt-3 sm:pt-6">
            {buttonDestination === 'form' ? (
              <button
                id={`btn-ver-produto-${product.id}`}
                data-best-seller-native-cta={product.id}
                type="button"
                onClick={() => {
                  handleProductClick();
                  onOpenForm?.(product);
                }}
                className="inline-flex min-h-12 items-center justify-center w-full py-3.5 px-6 rounded-[2px] bg-white text-black font-black text-[11px] tracking-[0.12em] uppercase hover:bg-neutral-200 active:scale-[0.995] transition-all duration-150 text-center cursor-pointer"
              >
                {ctaText}
              </button>
            ) : (
              <a
                id={`btn-ver-produto-${product.id}`}
                data-best-seller-native-cta={product.id}
                href={product.productUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleProductClick}
                className="inline-flex min-h-12 items-center justify-center w-full py-3.5 px-6 rounded-[2px] bg-white text-black font-black text-[11px] tracking-[0.12em] uppercase hover:bg-neutral-200 active:scale-[0.995] transition-all duration-150 text-center cursor-pointer"
              >
                {ctaText}
              </a>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
};

const InternationalLeadModal: React.FC<{
  list: PublicBestSellerList;
  product: PublicBestSellerProduct;
  ui: BestSellerUiText;
  onClose: () => void;
}> = ({ list, product, ui, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanEmail || !cleanPhone) {
      setError(ui.formRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanEmail)) {
      setError(ui.formInvalidEmail);
      return;
    }
    setSending(true);
    setError(null);
    const result = await Repository.submitBestSellerInternationalForm({
      listId: list.id,
      productId: product.id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      locale: list.uiLocale || list.currencyLocale || ui.locale,
    });
    setSending(false);
    if (!result.success) {
      setError(ui.formError);
      return;
    }
    setSuccess(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) onClose();
      }}
    >
      <motion.div
        dir={ui.dir}
        initial={{ opacity: 0, y: 24, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.99 }}
        transition={{ duration: 0.18 }}
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          aria-label={ui.formClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-neutral-800 bg-black/70 text-neutral-400 hover:text-white disabled:opacity-50 cursor-pointer"
        >
          ×
        </button>

        <div className="p-5 sm:p-6">
          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-xl font-black">✓</div>
              <h2 className="text-xl font-black tracking-tight">{ui.formSuccessTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{ui.formSuccessMessage}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full min-h-12 rounded bg-white text-black text-xs font-black uppercase tracking-[0.12em] cursor-pointer"
              >
                {ui.formClose}
              </button>
            </div>
          ) : (
            <>
              <div className="pr-10">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-500">ZHAYA</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  {(list.formTitle || '').trim() || ui.formDefaultTitle}
                </h2>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-neutral-400 whitespace-pre-wrap">
                  {(list.formMessage || '').trim() || ui.formDefaultMessage}
                </p>
              </div>

              <div className="mt-5 rounded-lg border border-neutral-800 bg-black/40 p-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-600">{ui.formProductLabel}</span>
                <span className="mt-1 block text-sm font-bold text-white">{product.name}</span>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{ui.formNameLabel}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={120}
                    className="w-full min-h-12 rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{ui.formEmailLabel}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    maxLength={180}
                    className="w-full min-h-12 rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{ui.formPhoneLabel}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={60}
                    className="w-full min-h-12 rounded border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-500"
                  />
                </label>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                {error && (
                  <div className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full min-h-12 rounded bg-white text-black text-xs font-black uppercase tracking-[0.12em] hover:bg-neutral-200 disabled:opacity-60 cursor-pointer"
                >
                  {sending ? ui.formSending : ui.formSubmit}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Bloco editorial de vídeo 9:16. Ele participa da mesma ordem da vitrine,
 * mas visualmente fica separado dos cards comerciais de produto.
 */
const VideoHighlightItem: React.FC<{
  item: PublicBestSellerProduct;
  listId: string;
  hasProductBelow?: boolean;
  nextProductId?: string | null;
  isHero?: boolean;
  timerContent?: React.ReactNode;
  ui?: BestSellerUiText;
}> = ({ item, listId, hasProductBelow = false, nextProductId = null, isHero = false, timerContent = null, ui = getBestSellerUiText('pt-BR') }) => {
  const video = useMemo(
    () => (item.mediaItems || []).find((media) => media.type === 'video'),
    [item.mediaItems],
  );

  const description = item.category && item.category.toLowerCase() !== 'vídeo'
    ? item.category
    : '';

  const scrollToNextProduct = () => {
    if (!nextProductId || typeof document === 'undefined') return;
    const target = document.getElementById(`best-seller-product-${nextProductId}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!video?.url) return null;

  return (
    <motion.section
      id={`best-seller-video-${item.id}`}
      data-best-seller-product-id={item.id}
      data-best-seller-position={item.position}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`w-full flex flex-col items-center ${isHero ? 'pt-0 pb-7 sm:pb-10' : 'py-2 pb-9 sm:pb-14'}`}
    >
      <div className={`relative ${isHero ? 'w-[94%]' : 'w-[92%]'} max-w-[430px] aspect-[9/16] overflow-hidden rounded-[14px] bg-neutral-950 ring-1 ring-white/5`}>
        <GalleryVideo
          src={video.url}
          label={item.videoTitle || ui.presentationVideo}
          onError={() => undefined}
          posterUrl={video.posterUrl || undefined}
          autoPlay={Boolean(item.videoAutoplay)}
          loop={item.videoLoop !== false}
          showControls={item.videoControls !== false}
          ui={ui}
          onPlaybackStarted={() => {
            Repository.trackBestSellerAnalyticsEvent({ eventType: 'product_play', listId, productId: item.id });
          }}
        />
      </div>

      {(item.videoTitle || description) && (
        <div className="w-full max-w-[430px] min-w-0 text-center mt-4 px-4 sm:px-2 overflow-visible">
          {item.videoTitle && (
            <h2 className="w-full max-w-full text-[15px] sm:text-base font-semibold leading-snug tracking-normal text-white normal-case whitespace-normal break-words [overflow-wrap:anywhere]">
              {item.videoTitle}
            </h2>
          )}
          {description && (
            <p className={`${item.videoTitle ? 'mt-1.5' : ''} w-full max-w-full text-[12px] sm:text-[13px] leading-[1.55] font-normal text-neutral-400 whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-visible`}>
              {description}
            </p>
          )}
        </div>
      )}

      {timerContent && (
        <div className="w-full mt-4 sm:mt-5">
          {timerContent}
        </div>
      )}

      {hasProductBelow && nextProductId && (
        <button
          type="button"
          onClick={scrollToNextProduct}
          className="mt-3 sm:mt-4 inline-flex flex-col items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label={ui.seeProductBelow}
        >
          {!description && (
            <span className="mb-1 text-[10px] sm:text-[11px] font-medium tracking-[0.08em]">{ui.checkItOut}</span>
          )}
          <motion.span
            aria-hidden="true"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center justify-center"
          >
            <ChevronDown className="w-5 h-5" strokeWidth={1.8} />
          </motion.span>
        </button>
      )}
    </motion.section>
  );
};


const BenefitsBlockItem: React.FC<{ item: PublicBestSellerProduct; ui?: BestSellerUiText }> = ({ item, ui = getBestSellerUiText('pt-BR') }) => {
  const benefits = (item.benefits || []).map((value) => value.trim()).filter(Boolean);
  if (benefits.length === 0) return null;

  return (
    <motion.section
      id={`best-seller-benefits-${item.id}`}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full pb-7 sm:pb-10"
    >
      <div className="w-full rounded-[14px] border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-center text-[14px] sm:text-[15px] font-semibold text-white tracking-[-0.01em]">
          {item.name || ui.advantages}
        </h2>
        <div className="mt-3 pt-3 border-t border-white/8 space-y-2.5">
          {benefits.map((benefit, index) => (
            <div key={`${benefit}-${index}`} className="flex items-start gap-2.5 text-[11px] sm:text-[12px] leading-relaxed text-neutral-300">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-neutral-500 shrink-0" />
              <span className="break-words [overflow-wrap:anywhere]">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export const MaisVendidosPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [listData, setListData] = useState<PublicBestSellerList | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [leadProduct, setLeadProduct] = useState<PublicBestSellerProduct | null>(null);
  const [organizedCategory, setOrganizedCategory] = useState<string | null>(null);
  const ui = useMemo(() => getBestSellerUiText(listData?.uiLocale || listData?.currencyLocale || (typeof navigator !== 'undefined' ? navigator.language : 'pt-BR')), [listData?.uiLocale, listData?.currencyLocale]);

  const lastDataRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);
  const hasLoadedInitiallyRef = useRef<boolean>(false);
  const pageViewTrackedRef = useRef<string>('');

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
    document.title = ui.pageTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [ui.pageTitle]);

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
      const data = await Repository.getPublicBestSellers(slug);
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
        setErrorMessage('load-error');
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
    // Ao trocar de slug, não reaproveita o snapshot da lista anterior.
    lastDataRef.current = '';
    hasLoadedInitiallyRef.current = false;
    pageViewTrackedRef.current = '';
    setListData(null);
    setLeadProduct(null);
    setOrganizedCategory(null);
    setErrorMessage(null);

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
  }, [slug]);

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
    return formatBestSellerDate(listData.listDate, listData.timezone, ui.locale);
  }, [listData, ui.locale]);

  // Registra uma entrada por carregamento da lista. O visitorId fica persistente
  // no navegador para permitir uma estimativa simples de visitantes únicos.
  useEffect(() => {
    if (!listData?.id || pageViewTrackedRef.current === listData.id) return;
    pageViewTrackedRef.current = listData.id;
    Repository.trackBestSellerAnalyticsEvent({ eventType: 'page_view', listId: listData.id });
  }, [listData?.id]);

  // Mede tempo realmente engajado por visitante único. Além de exigir a aba
  // visível, a contagem para após 60s sem qualquer atividade real (toque, mouse,
  // scroll, teclado ou vídeo em reprodução). Ao voltar a interagir, ela retoma.
  // O storage v2 evita reaproveitar totais antigos que podiam ter contado horas
  // com o computador simplesmente deixado aberto.
  useEffect(() => {
    if (!listData?.id || typeof window === 'undefined' || typeof document === 'undefined') return;

    const listId = listData.id;
    const storageKey = `zhaya_best_seller_engagement_v2:${listId}`;
    const IDLE_TIMEOUT_MS = 60_000;

    const readStored = () => {
      try {
        const value = Number(window.localStorage.getItem(storageKey) || 0);
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
      } catch {
        return 0;
      }
    };

    let baseSeconds = readStored();
    let activeSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
    let lastActivityAt = activeSince ?? 0;
    let lastReportedSeconds = baseSeconds;
    let idleTimer: number | null = null;
    let lastActivityHandledAt = 0;

    const segmentSeconds = (nowMs = Date.now()) => {
      if (activeSince === null) return 0;
      const idleDeadline = lastActivityAt + IDLE_TIMEOUT_MS;
      const effectiveEnd = Math.min(nowMs, idleDeadline);
      return Math.max(0, Math.floor((effectiveEnd - activeSince) / 1000));
    };

    const currentTotal = () => {
      return Math.max(baseSeconds + segmentSeconds(), readStored());
    };

    const persistAndReport = (force = false) => {
      const total = currentTotal();
      try {
        const existing = readStored();
        window.localStorage.setItem(storageKey, String(Math.max(existing, total)));
      } catch {
        // Analytics nunca deve quebrar a página.
      }

      if (force || total - lastReportedSeconds >= 5) {
        lastReportedSeconds = Math.max(lastReportedSeconds, total);
        Repository.trackBestSellerAnalyticsEvent({
          eventType: 'engagement',
          listId,
          engagedSecondsTotal: total,
        });
      }
    };

    const clearIdleTimer = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const pauseAt = (endMs = Date.now(), report = true) => {
      clearIdleTimer();
      if (activeSince !== null) {
        const effectiveEnd = Math.min(endMs, lastActivityAt + IDLE_TIMEOUT_MS);
        const elapsed = Math.max(0, Math.floor((effectiveEnd - activeSince) / 1000));
        baseSeconds = Math.max(baseSeconds + elapsed, readStored());
        activeSince = null;
      }
      if (report) persistAndReport(true);
    };

    const scheduleIdlePause = () => {
      clearIdleTimer();
      if (activeSince === null || document.visibilityState !== 'visible') return;
      const idleDeadline = lastActivityAt + IDLE_TIMEOUT_MS;
      const delay = Math.max(0, idleDeadline - Date.now());
      idleTimer = window.setTimeout(() => {
        // Usa exatamente o instante do limite, então uma aba esquecida aberta
        // nunca acrescenta minutos/horas extras depois da inatividade.
        pauseAt(idleDeadline, true);
      }, delay + 25);
    };

    const markActivity = () => {
      if (document.visibilityState !== 'visible') return;
      const activityNow = Date.now();

      // pointermove/scroll podem disparar dezenas de vezes por segundo.
      if (activityNow - lastActivityHandledAt < 500) return;
      lastActivityHandledAt = activityNow;

      baseSeconds = Math.max(baseSeconds, readStored());
      if (activeSince === null) activeSince = activityNow;
      lastActivityAt = activityNow;
      scheduleIdlePause();
    };

    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      baseSeconds = Math.max(baseSeconds, readStored());
      const resumeNow = Date.now();
      if (activeSince === null) activeSince = resumeNow;
      lastActivityAt = resumeNow;
      scheduleIdlePause();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') resume();
      else pauseAt(Date.now(), true);
    };

    const handlePageHide = () => pauseAt(Date.now(), true);

    // A primeira abertura é uma interação válida, mas se o usuário abandonar o
    // computador sem tocar em nada, a contagem para automaticamente em 60s.
    if (activeSince !== null) scheduleIdlePause();

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'pointermove',
      'scroll',
      'wheel',
      'keydown',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener(BEST_SELLER_ACTIVITY_EVENT, markActivity);

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible' && activeSince !== null) {
        persistAndReport(false);
      }
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      clearIdleTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.removeEventListener(BEST_SELLER_ACTIVITY_EVENT, markActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      pauseAt(Date.now(), true);
    };
  }, [listData?.id]);

  // Atenção por produto: mede somente o produto mais visível na tela e apenas
  // enquanto existe atividade real. Isso permite saber quais peças seguraram
  // mais atenção sem somar dois cards ao mesmo tempo ou tempo de tela abandonada.
  useEffect(() => {
    if (!listData?.id || !listData.products?.length || typeof window === 'undefined' || typeof document === 'undefined') return;

    const listId = listData.id;
    const storageKey = `zhaya_best_seller_product_attention_v1:${listId}`;
    const IDLE_MS = 60_000;
    const ratios = new Map<string, number>();
    const seen = new Set<string>();
    let lastActivityAt = Date.now();
    let totals: Record<string, number> = {};
    let lastReported: Record<string, number> = {};

    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
      if (parsed && typeof parsed === 'object') totals = parsed;
    } catch { /* noop */ }

    const persist = () => {
      try { window.localStorage.setItem(storageKey, JSON.stringify(totals)); } catch { /* noop */ }
    };

    const report = (productId: string, force = false) => {
      const total = Math.max(0, Math.floor(Number(totals[productId] || 0)));
      const previous = Math.max(0, Math.floor(Number(lastReported[productId] || 0)));
      if (!force && total - previous < 5) return;
      lastReported[productId] = total;
      Repository.trackBestSellerAnalyticsEvent({
        eventType: 'product_behavior',
        listId,
        productId,
        visibleSecondsTotal: total,
        seen: seen.has(productId),
      });
    };

    const markActivity = () => { lastActivityAt = Date.now(); };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'pointermove', 'scroll', 'wheel', 'keydown', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener(BEST_SELLER_ACTIVITY_EVENT, markActivity);

    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-best-seller-product-id]'));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const productId = node.dataset.bestSellerProductId || '';
        if (!productId) continue;
        ratios.set(productId, entry.isIntersecting ? entry.intersectionRatio : 0);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35 && !seen.has(productId)) {
          seen.add(productId);
          Repository.trackBestSellerAnalyticsEvent({ eventType: 'product_behavior', listId, productId, seen: true });
        }
      }
    }, { threshold: [0, 0.25, 0.35, 0.5, 0.75, 1] });
    nodes.forEach((node) => observer.observe(node));

    const tick = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - lastActivityAt > IDLE_MS) return;
      let bestId = '';
      let bestRatio = 0;
      ratios.forEach((ratio, productId) => {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = productId; }
      });
      if (!bestId || bestRatio < 0.4) return;
      totals[bestId] = Math.max(0, Number(totals[bestId] || 0)) + 1;
      persist();
      report(bestId, false);
    }, 1000);

    const flush = () => {
      persist();
      Object.keys(totals).forEach((productId) => report(productId, true));
    };
    window.addEventListener('pagehide', flush);

    return () => {
      window.clearInterval(tick);
      observer.disconnect();
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener(BEST_SELLER_ACTIVITY_EVENT, markActivity);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [listData?.id, listData?.products?.length, organizedCategory]);

  const firstItemIsHeroVideo = Boolean(
    listData?.products?.[0]?.itemType === 'video' &&
    listData.products[0].mediaItems?.some((media) => media.type === 'video' && Boolean(media.url))
  );

  const listTimerElement = listData?.timerEnabled && timeRemaining ? (
    <div
      id="best-sellers-timer-container"
      className="flex flex-col items-center text-center"
      aria-live="polite"
    >
      <span className="text-[8px] sm:text-[9px] tracking-[0.28em] text-neutral-500 uppercase font-bold leading-none mb-1.5">
        {timeRemaining.isExpired ? ui.closed : ui.endsIn}
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
  ) : null;

  const organizedModel = useMemo(() => {
    const items = listData?.products || [];
    const productIndexes = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.itemType !== 'video' && item.itemType !== 'benefits');
    const introCount = Math.min(12, Math.max(1, Number(listData?.organizedIntroCount) || 3));
    const cutoff = productIndexes.length >= introCount ? productIndexes[introCount - 1].index : items.length - 1;
    const introItems = cutoff >= 0 ? items.slice(0, cutoff + 1) : [];
    const remainingItems = cutoff >= 0 ? items.slice(cutoff + 1) : items;
    const remainingProducts = remainingItems.filter((item) => item.itemType !== 'video' && item.itemType !== 'benefits');
    const counts = new Map<string, number>();
    remainingProducts.forEach((product) => {
      const key = (product.autoCategoryKey || detectBestSellerCategoryKey(product)) as any;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const categories = Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        count,
        label: listData?.categoryTranslations?.[key] || getBestSellerCategoryLabel(ui.locale, key as any),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const active = listData?.experienceMode === 'organized' && remainingProducts.length >= 2;
    return { active, introItems, remainingItems, remainingProducts, categories };
  }, [listData, ui.locale]);

  const organizedSelectedItems = useMemo(() => {
    if (!organizedModel.active || !organizedCategory) return [] as PublicBestSellerProduct[];
    if (organizedCategory === 'all') return organizedModel.remainingItems;
    return organizedModel.remainingItems.filter((item) =>
      item.itemType !== 'video' && item.itemType !== 'benefits' && (item.autoCategoryKey || detectBestSellerCategoryKey(item)) === organizedCategory
    );
  }, [organizedModel, organizedCategory]);

  const renderStoreItem = (prod: PublicBestSellerProduct, idx: number) => {
    if (!listData) return null;
    const originalIndex = listData.products.findIndex((item) => item.id === prod.id);
    const safeIndex = originalIndex >= 0 ? originalIndex : idx;
    if (prod.itemType === 'benefits') return <BenefitsBlockItem key={prod.id} item={prod} ui={ui} />;
    if (prod.itemType === 'video') {
      const nextProduct = listData.products.slice(safeIndex + 1).find((item) => item.itemType === 'product' || !item.itemType);
      const isHeroVideo = safeIndex === 0;
      return (
        <VideoHighlightItem
          key={prod.id}
          item={prod}
          listId={listData.id}
          isHero={isHeroVideo}
          hasProductBelow={Boolean(nextProduct)}
          nextProductId={nextProduct?.id || null}
          timerContent={isHeroVideo ? listTimerElement : null}
          ui={ui}
        />
      );
    }
    const displayRank = listData.products.slice(0, safeIndex + 1).filter((item) => item.itemType === 'product' || !item.itemType).length;
    const firstProductIndex = listData.products.findIndex((item) => item.itemType === 'product' || !item.itemType);
    return (
      <ProductItem
        key={prod.id}
        product={prod}
        index={safeIndex}
        displayRank={displayRank}
        isFirst={safeIndex === firstProductIndex}
        ctaText={(listData.ctaText || '').trim() || ui.defaultCta}
        rankColor={listData.rankColor || '#FFFFFF'}
        sizeColor={listData.sizeColor || '#FFFFFF'}
        showRanking={listData.showRanking !== false}
        now={now}
        listId={listData.id}
        listTimerEnabled={listData.timerEnabled}
        listTimerLooping={listData.timerLooping}
        listTimerDurationMinutes={listData.timerDurationMinutes}
        listTimerEnd={listData.timerEnd}
        currencyCode={listData.currencyCode || 'BRL'}
        currencyLocale={listData.currencyLocale || 'pt-BR'}
        approximateConversion={Boolean(listData.approximateConversion)}
        approximateLabel={listData.approximateLabel || (listData.approximateConversion ? ui.approximateConversion : null)}
        ui={ui}
        showPrices={listData.showPrices !== false}
        showInstallments={listData.showInstallments !== false}
        showCta={listData.showCta !== false}
        showSoldQuantity={listData.showSoldQuantity !== false}
        showAvailableQuantity={listData.showAvailableQuantity !== false}
        showSizes={listData.showSizes !== false}
        showColors={listData.showColors !== false}
        showBadges={listData.showBadges !== false}
        showGift={listData.showGift !== false}
        showProductTimers={listData.showProductTimers !== false}
        buttonDestination={listData.buttonDestination || 'product'}
        onOpenForm={setLeadProduct}
      />
    );
  };

  return (
    <div
      id="mais-vendidos-page-container"
      lang={ui.locale}
      dir={ui.dir}
      className="min-h-screen w-full bg-black text-white selection:bg-neutral-800 selection:text-white flex flex-col items-center antialiased"
      style={{
        backgroundColor: '#000000',
        fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      {listData?.backgroundVideoUrl && (
        <div
          className="fixed z-0 overflow-hidden pointer-events-none bg-black"
          aria-hidden="true"
          style={{
            // Usa o maior viewport estável e uma pequena sobra vertical. No Safari/iPhone
            // isso evita a faixa preta enquanto a barra do navegador aparece/desaparece no scroll.
            top: '-3lvh',
            left: 0,
            width: '100vw',
            height: '106lvh',
            minHeight: '106vh',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            willChange: 'transform',
          }}
        >
          <video
            key={listData.backgroundVideoUrl}
            src={listData.backgroundVideoUrl}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: Math.min(0.9, Math.max(0, Number(listData.backgroundVideoOpacity ?? 0.22))),
              filter: `blur(${Math.min(30, Math.max(0, Number(listData.backgroundVideoBlur ?? 0)))}px)`,
              transform: Number(listData.backgroundVideoBlur ?? 0) > 0 ? 'scale(1.06)' : 'scale(1.015)',
              transformOrigin: 'center center',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
        </div>
      )}
      <main className="relative z-10 w-full max-w-[540px] px-4 sm:px-6 pt-6 pb-28 sm:py-10 flex flex-col items-center">
        {/* ========================================================================= */}
        {/* ESTADO 1: LOADING                                                         */}
        {/* ========================================================================= */}
        {loading && (
          <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-6 h-6 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
            <p className="text-xs text-neutral-400 tracking-widest uppercase font-light">
              {ui.loadingSelection}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 2: ERRO DE REDE                                                    */}
        {/* ========================================================================= */}
        {!loading && errorMessage && (
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center space-y-5 px-4">
            <p className="text-sm text-neutral-300 font-light tracking-wide max-w-xs">
              {errorMessage === 'load-error' ? ui.loadError : errorMessage}
            </p>
            <button
              type="button"
              onClick={() => fetchPublicList({ silent: false })}
              className="py-2.5 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-[4px] text-xs font-semibold tracking-wider uppercase border border-neutral-800 transition-colors cursor-pointer"
            >
              {ui.retry}
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
              {ui.bestSellers}
            </h1>
            <p className="text-xs text-neutral-300 font-light tracking-wide max-w-xs">
              {ui.selectionUnavailable}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 4: LISTA ATIVA COM PRODUTOS                                        */}
        {/* ========================================================================= */}
        {!loading && !errorMessage && listData && (
          <div className="w-full flex flex-col items-center">
            {/* Cabeçalho só existe quando há conteúdo configurado para ele.
                Título e subtítulo vazios não geram fallback nem espaço residual. */}
            {(Boolean(listData.showDate !== false && formattedDate) ||
              Boolean(listData.logoUrl) ||
              Boolean(listData.title?.trim()) ||
              Boolean(listData.subtitle?.trim()) ||
              Boolean(!firstItemIsHeroVideo && listTimerElement)) && (
              <header className="w-full text-center mb-6 sm:mb-8">
                {listData.showDate !== false && formattedDate && (
                  <p className="mb-3 text-[10px] sm:text-[11px] tracking-[0.18em] text-neutral-500 font-bold leading-none">
                    {formattedDate}
                  </p>
                )}

                {listData.logoUrl ? (
                  <div className="w-[calc(100%+2rem)] -mx-4 sm:w-[calc(100%+3rem)] sm:-mx-6 max-w-[100vw] flex justify-center items-center overflow-hidden">
                    <img
                      src={listData.logoUrl}
                      alt={listData.title?.trim() || 'Zhaya'}
                      className="w-full h-auto max-w-none object-contain block"
                    />
                  </div>
                ) : listData.title?.trim() ? (
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-white uppercase leading-tight">
                      {listData.title}
                    </h1>
                  </div>
                ) : null}

                {listData.subtitle?.trim() && (
                  <p className="mt-3 text-xs sm:text-sm text-neutral-400 font-normal tracking-wide max-w-sm mx-auto">
                    {listData.subtitle}
                  </p>
                )}

                {!firstItemIsHeroVideo && listTimerElement && (
                  <div className="mt-3">
                    {listTimerElement}
                  </div>
                )}
              </header>
            )}

            {listData.redirectMode && listData.redirectMessage?.trim() && (
              <section className="w-full max-w-xl mx-auto mb-8 sm:mb-10 text-center px-1">
                <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3">ZHAYA</span>
                <p className="text-sm sm:text-base text-neutral-200 font-normal leading-relaxed whitespace-pre-line">
                  {listData.redirectMessage}
                </p>
              </section>
            )}

            {/* Vitrine de Produtos */}
            {listData.products && listData.products.length > 0 ? (
              <div className="w-full flex flex-col space-y-4 sm:space-y-10">
                {(organizedModel.active ? organizedModel.introItems : listData.products).map((prod, idx) => renderStoreItem(prod, idx))}

                {organizedModel.active && (
                  <section
                    data-organized-selector
                    className="w-full max-w-[430px] mx-auto py-7 sm:py-9 px-4"
                    style={{ fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif' }}
                  >
                    <div className="text-center mb-5">
                      <h2 className="text-[22px] leading-[1.08] font-semibold tracking-[-0.02em] text-white">
                        {listData.organizedTitle || ui.organizedTitle}
                      </h2>
                      {(listData.organizedSubtitle || ui.organizedSubtitle)?.trim() && (
                        <p className="mt-2 text-[12px] leading-relaxed font-normal text-neutral-400">
                          {listData.organizedSubtitle || ui.organizedSubtitle}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setOrganizedCategory('all')}
                        className={`w-full min-h-[46px] rounded-[6px] px-4 py-2.5 inline-flex items-center justify-center text-center text-black transition-[transform,background-color,opacity] active:scale-[0.985] ${organizedCategory === 'all' ? 'bg-neutral-200' : 'bg-white hover:bg-neutral-100'}`}
                      >
                        <span className="text-[13px] leading-none font-semibold">{ui.organizedAll}</span>
                        <span className="ml-1.5 text-[11px] leading-none font-normal text-neutral-500">
                          {organizedModel.remainingProducts.length}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        {organizedModel.categories.map((category) => (
                          <button
                            key={category.key}
                            type="button"
                            onClick={() => setOrganizedCategory(category.key)}
                            className={`w-full min-h-[46px] rounded-[6px] px-2.5 py-2.5 inline-flex items-center justify-center text-center text-black transition-[transform,background-color,opacity] active:scale-[0.985] ${organizedCategory === category.key ? 'bg-neutral-200' : 'bg-white hover:bg-neutral-100'}`}
                          >
                            <span className="text-[12px] leading-none font-semibold truncate">{category.label}</span>
                            <span className="ml-1 text-[10px] leading-none font-normal text-neutral-500 shrink-0">
                              {category.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {organizedModel.active && organizedCategory && organizedSelectedItems.length > 0 && (
                  <div className="w-full flex flex-col space-y-4 sm:space-y-10">
                    {organizedSelectedItems.map((prod, idx) => renderStoreItem(prod, idx))}
                    <div className="w-full flex justify-center pt-3 px-4">
                      <button
                        type="button"
                        onClick={() => { setOrganizedCategory(null); document.querySelector('[data-organized-selector]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                        className="min-h-[42px] px-5 rounded-[6px] bg-white text-black inline-flex items-center justify-center text-center text-[12px] font-semibold hover:bg-neutral-100 active:scale-[0.985] transition-[transform,background-color] cursor-pointer"
                      >
                        {ui.organizedBack}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full py-12 text-center text-xs text-neutral-400 font-light">
                {ui.noProducts}
              </div>
            )}

            {listData.footerCtaEnabled && listData.footerCtaText?.trim() && listData.footerCtaUrl?.trim() && (
              <div className="w-full mt-10 sm:mt-14 flex justify-center">
                <a
                  href={listData.footerCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-sm min-h-12 px-6 py-3.5 rounded-[4px] bg-white text-black hover:bg-neutral-100 inline-flex items-center justify-center text-center text-[11px] sm:text-xs font-black uppercase tracking-[0.14em] transition-colors"
                >
                  {listData.footerCtaText}
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {listData && leadProduct && listData.buttonDestination === 'form' && (
          <InternationalLeadModal
            list={listData}
            product={leadProduct}
            ui={ui}
            onClose={() => setLeadProduct(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
