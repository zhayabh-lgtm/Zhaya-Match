import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Repository } from '../../lib/repository';
import { VISITOR_LOCK_STORAGE_KEY } from '../../components/VisitorLockGuard';
import type { PublicLiveInvite } from '../../types/zhaya';

/**
 * Detects device/operating system for optimal 1-click calendar action.
 */
function detectDeviceEnvironment() {
  if (typeof window === 'undefined') return { isApple: false, isAndroid: false };
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isApple = /iPad|iPhone|iPod|Macintosh/i.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);
  return { isApple, isAndroid };
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
    // Capitalize first letter (e.g. "Quinta-feira, 14 de agosto")
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
  const { user, session } = useAuth();
  const [invite, setInvite] = useState<PublicLiveInvite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [buttonClicked, setButtonClicked] = useState<boolean>(false);

  // 1. Visitor Lockdown: Mark unauthenticated visitor session
  useEffect(() => {
    if (slug) {
      if (!user && !session) {
        try {
          sessionStorage.setItem(VISITOR_LOCK_STORAGE_KEY, slug);
        } catch {
          // Ignore sessionStorage errors
        }
      }
    }
  }, [slug, user, session]);

  // 2. Fetch public invite data
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

  const { isApple, isAndroid } = useMemo(() => detectDeviceEnvironment(), []);

  const { dateFormatted, timeFormatted } = useMemo(() => {
    if (!invite?.startsAt || !invite?.endsAt) return { dateFormatted: '', timeFormatted: '' };
    return formatLiveDateTime(invite.startsAt, invite.endsAt);
  }, [invite]);

  // 3. Calendar 1-Click Action
  const handleAddToCalendar = () => {
    if (!invite || !slug) return;
    setButtonClicked(true);

    // Registra o clique imediatamente antes do redirecionamento
    Repository.trackLiveInviteClick(slug);

    const icsUrl = `/api/public/live-ics?slug=${encodeURIComponent(slug)}`;

    if (isAndroid) {
      // Android: Google Calendar direct intent/render URL (opens native app or direct web template)
      const startClean = formatGoogleCalendarDate(invite.startsAt);
      const endClean = formatGoogleCalendarDate(invite.endsAt);
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        invite.title
      )}&dates=${startClean}/${endClean}&details=${encodeURIComponent(
        invite.description || 'Live Zhaya'
      )}&ctz=America/Sao_Paulo`;

      window.location.href = gcalUrl;
    } else {
      // Apple (iOS / macOS / Safari / Instagram WebView) & Desktop Universal Fallback
      window.location.href = icsUrl;
    }

    setTimeout(() => {
      setButtonClicked(false);
    }, 3000);
  };

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
            className="text-center px-4 space-y-3"
          >
            <h1 className="text-xl md:text-2xl font-light tracking-wide text-neutral-200">
              {invite.title}
            </h1>
            <p className="text-xs md:text-sm text-neutral-500 font-light tracking-widest uppercase">
              Esta live já encerrou.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="active_invite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center text-center space-y-10 px-4"
          >
            {/* Live Title */}
            <div className="space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-white leading-tight">
                {invite.title}
              </h1>

              {/* Date & Time */}
              <div className="space-y-1 pt-1">
                <p className="text-sm sm:text-base text-neutral-300 font-light tracking-wide">
                  {dateFormatted}
                </p>
                <p className="text-xs sm:text-sm text-neutral-400 font-light tracking-widest uppercase">
                  {timeFormatted}
                </p>
              </div>
            </div>

            {/* 1-Click Calendar Action Button */}
            <div className="w-full pt-4 flex flex-col items-center">
              <button
                id="btn-adicionar-agenda"
                type="button"
                onClick={handleAddToCalendar}
                disabled={buttonClicked}
                className="w-full py-4 px-8 bg-white text-black font-semibold text-xs sm:text-sm tracking-widest uppercase rounded-full hover:bg-neutral-200 active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-80"
              >
                {buttonClicked ? 'Abrindo agenda...' : 'Adicionar à agenda'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
