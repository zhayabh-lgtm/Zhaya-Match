import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Repository } from '../../lib/repository';
import type { PublicLiveInvite } from '../../types/zhaya';

/**
 * Detects if the current device is an iOS/iPadOS device (iPhone, iPad, iPod)
 * which supports seamless 1-click native Calendar import via .ics on Safari.
 */
function isIosPlatform(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isIos = /iPhone|iPod|iPad/i.test(userAgent) && !(window as any).MSStream;
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
}

/**
 * Detects if the page is running inside an in-app browser (Instagram, Facebook, Threads, etc.)
 * In these environments, downloading .ics or handling custom schemes is blocked.
 * The standard Google Calendar Web URL over HTTPS provides 100% reliability.
 */
function isInstagramOrFacebookInApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Threads/i.test(ua);
}

/**
 * Formats a Date object to YYYYMMDDTHHMMSSZ for Google Calendar URL
 */
function formatGoogleCalendarDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  } catch {
    return '';
  }
}

/**
 * Builds Google Calendar web template URL with America/Sao_Paulo timezone
 */
function buildGoogleCalendarUrl(invite: PublicLiveInvite): string {
  const startClean = formatGoogleCalendarDate(invite.startsAt);
  const endClean = formatGoogleCalendarDate(invite.endsAt);
  const title = encodeURIComponent(invite.title);
  const details = encodeURIComponent(invite.description || 'Live Zhaya @shoes.zhaya');
  const location = encodeURIComponent(invite.platformUrl || 'Instagram @shoes.zhaya / Online');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startClean}/${endClean}&details=${details}&location=${location}&ctz=America/Sao_Paulo`;
}

/**
 * Returns date in YYYY-MM-DD format based on America/Sao_Paulo timezone
 */
function getSaoPauloDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Computes dynamic relative day tag: "HOJE", "AMANHÃ", "EM X DIAS", "AO VIVO AGORA"
 */
function getEventRelativeBadge(startsAtStr: string, endsAtStr: string, now: Date): string {
  try {
    const start = new Date(startsAtStr);
    const end = new Date(endsAtStr);

    if (now >= start && now < end) {
      return 'AO VIVO AGORA';
    }

    if (now >= end) {
      return 'LIVE ENCERRADA';
    }

    const todayStr = getSaoPauloDateString(now);
    const eventDayStr = getSaoPauloDateString(start);

    // Calculate calendar day difference in São Paulo timezone
    const todayMidnight = new Date(`${todayStr}T00:00:00-03:00`).getTime();
    const eventMidnight = new Date(`${eventDayStr}T00:00:00-03:00`).getTime();
    const diffDays = Math.round((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'HOJE';
    }
    if (diffDays === 1) {
      return 'AMANHÃ';
    }
    return `EM ${diffDays} DIAS`;
  } catch {
    return 'AO VIVO';
  }
}

/**
 * Computes real-time countdown timer string:
 * Before: "Começa em 04:32:18"
 * During: "Termina em 01:42:10"
 * After: "LIVE ENCERRADA"
 */
function getEventCountdown(startsAtStr: string, endsAtStr: string, now: Date): string {
  try {
    const start = new Date(startsAtStr);
    const end = new Date(endsAtStr);

    const nowMs = now.getTime();
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (nowMs < startMs) {
      const diffSec = Math.max(0, Math.floor((startMs - nowMs) / 1000));
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');

      if (days > 0) {
        return `Começa em ${days}d ${hh}:${mm}:${ss}`;
      }
      return `Começa em ${hh}:${mm}:${ss}`;
    }

    if (nowMs >= startMs && nowMs < endMs) {
      const diffSec = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');

      return `Termina em ${hh}:${mm}:${ss}`;
    }

    return 'LIVE ENCERRADA';
  } catch {
    return '';
  }
}

/**
 * Formats date and time nicely in Portuguese with America/Sao_Paulo timezone
 */
function formatLiveDateTime(startsAt: string, endsAt: string) {
  try {
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const rawWeekdayAndDate = dateFormatter.format(start);
    const dateFormatted = rawWeekdayAndDate.charAt(0).toUpperCase() + rawWeekdayAndDate.slice(1);

    const startTime = timeFormatter.format(start);
    const endTime = timeFormatter.format(end);

    return {
      dateFormatted,
      timeFormatted: `${startTime} às ${endTime}`,
    };
  } catch {
    return {
      dateFormatted: '',
      timeFormatted: '',
    };
  }
}

export const LiveInvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invite, setInvite] = useState<PublicLiveInvite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [buttonClicked, setButtonClicked] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());

  // 1. Real-time ticker: update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3. Fetch public invite data
  useEffect(() => {
    let isMounted = true;
    if (!slug) {
      setLoading(false);
      return;
    }

    Repository.getPublicLiveInvite(slug)
      .then((data) => {
        if (isMounted) {
          setInvite(data);
        }
      })
      .catch((err) => {
        console.error('[LiveInvitePage] Erro ao carregar convite:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const isIos = useMemo(() => isIosPlatform(), []);

  const isLiveNow = useMemo(() => {
    if (!invite?.startsAt || !invite?.endsAt) return false;
    const start = new Date(invite.startsAt).getTime();
    const end = new Date(invite.endsAt).getTime();
    const current = now.getTime();
    return current >= start && current < end;
  }, [invite, now]);

  const { dateFormatted, timeFormatted } = useMemo(() => {
    if (!invite?.startsAt || !invite?.endsAt) return { dateFormatted: '', timeFormatted: '' };
    return formatLiveDateTime(invite.startsAt, invite.endsAt);
  }, [invite]);

  const relativeBadge = useMemo(() => {
    if (!invite?.startsAt || !invite?.endsAt) return '';
    return getEventRelativeBadge(invite.startsAt, invite.endsAt, now);
  }, [invite, now]);

  const countdownText = useMemo(() => {
    if (!invite?.startsAt || !invite?.endsAt) return '';
    return getEventCountdown(invite.startsAt, invite.endsAt, now);
  }, [invite, now]);

  // 4. Action: Either Add to Calendar OR Go to Live Stream if LIVE NOW
  const handlePrimaryAction = () => {
    if (!invite || !slug) return;
    setButtonClicked(true);

    // 1. Registra o clique sem bloquear a navegação
    try {
      Repository.trackLiveInviteClick(slug);
    } catch {
      // Ignora erro de tracking para nunca bloquear o usuário
    }

    if (isLiveNow) {
      // Quando estiver ao vivo, leva diretamente para o link da live/plataforma (ex: Instagram @shoes.zhaya)
      const liveTargetUrl = invite.platformUrl || 'https://instagram.com/shoes.zhaya';
      window.location.assign(liveTargetUrl);
      return;
    }

    // Antes do evento: adiciona à agenda
    const gcalUrl = buildGoogleCalendarUrl(invite);
    const inAppBrowser = isInstagramOrFacebookInApp();

    if (inAppBrowser) {
      // REGRA PRINCIPAL: Dentro do Instagram ou Facebook (iOS ou Android),
      // navega diretamente no MESMO clique para o Google Calendar Web via HTTPS.
      // Nunca abre custom scheme ou .ics bloqueado no in-app browser.
      window.location.assign(gcalUrl);
      return;
    }

    if (isIos) {
      // Fora do Instagram (Safari no iPhone/iPad):
      // Tenta integração Apple Calendar nativa com Fallback Invisível
      let hasNavigatedAway = false;

      const handlePageExit = () => {
        hasNavigatedAway = true;
      };

      window.addEventListener('pagehide', handlePageExit, { once: true });
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          hasNavigatedAway = true;
        }
      }, { once: true });

      const icsUrl = `/api/public/live-ics?slug=${encodeURIComponent(slug)}`;
      window.location.assign(icsUrl);

      // Fallback invisível: se a página continuar ativa e visível após 1.2s, redireciona para Google Calendar Web
      setTimeout(() => {
        if (!hasNavigatedAway && document.visibilityState === 'visible') {
          window.location.assign(gcalUrl);
        }
      }, 1200);
    } else {
      // Android normal, Windows, macOS Desktop, Linux, Chromebook:
      // Redireciona diretamente para o Google Calendar Web com dados preenchidos
      window.location.assign(gcalUrl);
    }

    setTimeout(() => {
      setButtonClicked(false);
    }, 3000);
  };

  const platformTargetUrl = invite?.platformUrl || 'https://instagram.com/shoes.zhaya';

  return (
    <div
      id="live-invite-container"
      className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 select-none overflow-x-hidden"
      style={{
        fontFamily: 'var(--font-zhaya, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        backgroundColor: '#000000',
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="w-6 h-6 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
          </motion.div>
        ) : !invite || invite.status === 'not_found' ? (
          <motion.div
            key="not_found"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center px-4"
          >
            <p className="text-sm md:text-base text-neutral-400 font-light tracking-widest uppercase">
              Convite indisponível
            </p>
          </motion.div>
        ) : invite.status === 'ended' ? (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center px-4 space-y-4 max-w-sm"
          >
            <div className="inline-block px-3 py-1 bg-neutral-900 border border-neutral-800 rounded text-[11px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
              LIVE ENCERRADA
            </div>
            <h1 className="text-xl md:text-2xl font-light tracking-wide text-neutral-200">
              {invite.title}
            </h1>
            <p className="text-xs text-neutral-500 font-light tracking-wider">
              Esta live já foi encerrada. Fique atento às próximas novidades no Instagram @shoes.zhaya.
            </p>
            <div className="pt-2">
              <a
                href={platformTargetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-[8px] text-xs font-semibold tracking-wider uppercase border border-neutral-800 transition-colors"
              >
                Acessar @shoes.zhaya
              </a>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active_invite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md flex flex-col items-center text-center space-y-8 sm:space-y-10 px-4"
          >
            {/* Dynamic Status / Relative Day Header (HOJE, AMANHÃ, EM X DIAS, AO VIVO AGORA) */}
            <div className="space-y-4 w-full">
              {relativeBadge && (
                <div className="flex justify-center">
                  <span
                    id="live-relative-badge"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase transition-colors ${
                      relativeBadge === 'AO VIVO AGORA'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80 animate-pulse'
                        : 'bg-neutral-900/90 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {relativeBadge === 'AO VIVO AGORA' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                    )}
                    {relativeBadge}
                  </span>
                </div>
              )}

              {/* Live Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-white leading-tight">
                {invite.title}
              </h1>

              {/* Date & Time in Portuguese */}
              <div className="space-y-1 pt-1">
                <p className="text-sm sm:text-base text-neutral-300 font-light tracking-wide">
                  {dateFormatted}
                </p>
                <p className="text-xs sm:text-sm text-neutral-400 font-light tracking-widest uppercase">
                  {timeFormatted}
                </p>
              </div>
            </div>

            {/* Action Button & Subordinate Countdown Timer */}
            <div className="w-full flex flex-col items-center space-y-3 pt-2">
              <button
                id="btn-adicionar-agenda"
                type="button"
                onClick={handlePrimaryAction}
                disabled={buttonClicked}
                className={`w-full py-4 px-8 font-semibold text-xs sm:text-sm tracking-widest uppercase rounded-[8px] active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-80 ${
                  isLiveNow
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {buttonClicked
                  ? isLiveNow
                    ? 'Abrindo live...'
                    : 'Abrindo agenda...'
                  : isLiveNow
                  ? 'Assistir ao vivo agora'
                  : 'Adicionar à agenda'}
              </button>

              {/* Subordinate Real-time Countdown */}
              {countdownText && (
                <div
                  id="live-countdown-timer"
                  className="text-xs text-neutral-400 font-mono tracking-wider select-none pt-1"
                >
                  {countdownText}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
