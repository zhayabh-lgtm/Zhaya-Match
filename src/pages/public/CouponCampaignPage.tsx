import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, ExternalLink, Gift, Loader2, LockKeyhole, RotateCcw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { PublicCouponCampaign } from '../../types/coupon';

const VISITOR_KEY = 'zhaya_coupon_visitor_v1';
const EVERGREEN_TIMER_PREFIX = 'zhaya_coupon_timer_v1';
const evergreenMemory = new Map<string, { expiresAt: number; durationMinutes: number }>();

function getVisitorId(): string {
  if (typeof window === 'undefined') return `server_${Math.random().toString(36).slice(2)}`;
  try {
    const current = window.localStorage.getItem(VISITOR_KEY);
    if (current && /^[A-Za-z0-9_-]{8,128}$/.test(current)) return current;
    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `cp_${crypto.randomUUID().replace(/-/g, '')}`
      : `cp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    window.localStorage.setItem(VISITOR_KEY, generated);
    return generated;
  } catch {
    return `cp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }
}

function isDesktopTrackingBlocked(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = String(navigator.userAgent || '').toLowerCase();
  const iPadDesktopUa = /macintosh/.test(ua) && Number(navigator.maxTouchPoints || 0) > 1;
  if (iPadDesktopUa || /ipad|tablet|kindle|silk|playbook/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return false;
  if (/iphone|ipod|android.*mobile|windows phone|mobile/.test(ua)) return false;
  return true;
}

function pluralUnit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatCountdownMs(targetMs: number | null | undefined): string {
  if (!targetMs || !Number.isFinite(targetMs)) return '0 segundos';
  const diff = Math.max(0, targetMs - Date.now());
  // ceil preserva o segundo atual e evita que 10s virem 9s imediatamente.
  const total = Math.max(0, Math.ceil(diff / 1000));

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  // A leitura muda conforme o tempo restante. Enquanto há horas, segundos não
  // poluem a mensagem; abaixo de 1 minuto, a contagem passa a ser em segundos.
  if (days > 0) {
    const dayText = pluralUnit(days, 'dia', 'dias');
    return hours > 0 ? `${dayText} e ${pluralUnit(hours, 'hora', 'horas')}` : dayText;
  }
  if (hours > 0) {
    const hourText = pluralUnit(hours, 'hora', 'horas');
    return minutes > 0 ? `${hourText} e ${pluralUnit(minutes, 'minuto', 'minutos')}` : hourText;
  }
  if (minutes > 0) return pluralUnit(minutes, 'minuto', 'minutos');
  return pluralUnit(seconds, 'segundo', 'segundos');
}

function getEvergreenTimerEndMs(campaignId: string, durationMinutes: number, nowMs: number): number {
  const safeDuration = Math.max(1, Math.min(10080, Math.round(durationMinutes)));
  const durationMs = safeDuration * 60_000;
  const key = `${EVERGREEN_TIMER_PREFIX}:${campaignId}`;
  const fallback = () => {
    const current = evergreenMemory.get(key);
    if (current && current.durationMinutes === safeDuration && current.expiresAt > nowMs) return current.expiresAt;
    const expiresAt = nowMs + durationMs;
    evergreenMemory.set(key, { expiresAt, durationMinutes: safeDuration });
    return expiresAt;
  };
  if (typeof window === 'undefined') return fallback();
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const expiresAt = Number(parsed?.expiresAt);
      const storedDuration = Number(parsed?.durationMinutes);
      if (Number.isFinite(expiresAt) && storedDuration === safeDuration && expiresAt > nowMs) return expiresAt;
    }
    const expiresAt = nowMs + durationMs;
    window.localStorage.setItem(key, JSON.stringify({ expiresAt, durationMinutes: safeDuration }));
    return expiresAt;
  } catch {
    return fallback();
  }
}

async function postCoupon(mode: string, body: any) {
  const response = await fetch(`/api/best-sellers?mode=coupon-${encodeURIComponent(mode)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(data?.message || data?.error || 'Não foi possível concluir a ação.');
    error.code = data?.error;
    error.data = data;
    throw error;
  }
  return data;
}

function CouponTimer({ label, targetMs, color }: { label: string; targetMs: number; color: string }) {
  const [value, setValue] = useState(() => formatCountdownMs(targetMs));
  useEffect(() => {
    setValue(formatCountdownMs(targetMs));
    const id = window.setInterval(() => setValue(formatCountdownMs(targetMs)), 250);
    return () => window.clearInterval(id);
  }, [targetMs]);
  return (
    <div className="text-center py-2" style={{ color }}>
      <div className="text-[10px] uppercase tracking-[0.30em] font-bold opacity-55 leading-none mb-1">{label}</div>
      <div className="text-[clamp(1.85rem,8.5vw,3.35rem)] leading-[0.98] font-black tracking-[-0.045em]">{value}</div>
    </div>
  );
}

export function CouponCampaignPage() {
  const { slug = '' } = useParams();
  const visitorId = useMemo(() => getVisitorId(), []);
  const desktopTrackingBlocked = useMemo(() => isDesktopTrackingBlocked(), []);
  const [campaign, setCampaign] = useState<PublicCouponCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [localUnlockAtMs, setLocalUnlockAtMs] = useState<number | null>(null);
  const [localCountdown, setLocalCountdown] = useState('');
  const [videoActive, setVideoActive] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStartedTracked, setVideoStartedTracked] = useState(false);
  const [unlockAttention, setUnlockAttention] = useState(false);
  const [finalCtaAttention, setFinalCtaAttention] = useState(false);
  const revealingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pageViewTrackedRef = useRef(false);
  const finalCtaRef = useRef<HTMLAnchorElement | null>(null);
  const attentionTimeoutsRef = useRef<number[]>([]);

  const track = useCallback((eventType: string, extra: Record<string, any> = {}) => {
    if (!campaign?.id || desktopTrackingBlocked) return;
    const payload = JSON.stringify({
      campaignId: campaign.id,
      visitorId,
      eventType,
      referrer: document.referrer || null,
      ...extra,
    });
    try {
      if (navigator.sendBeacon && (eventType === 'site_click' || eventType === 'copy')) {
        navigator.sendBeacon('/api/best-sellers?mode=coupon-event', new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch { /* fallback */ }
    fetch('/api/best-sellers?mode=coupon-event', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true,
    }).catch(() => undefined);
  }, [campaign?.id, desktopTrackingBlocked, visitorId]);

  const loadCampaign = useCallback(async (silent = false) => {
    if (!slug) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await fetch(`/api/best-sellers?mode=coupon-public&slug=${encodeURIComponent(slug)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.campaign) throw new Error(data?.error === 'NOT_FOUND' ? 'Campanha não encontrada.' : 'Não foi possível carregar esta campanha.');
      setCampaign(data.campaign);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar esta campanha.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCampaign(false);
    const refreshId = window.setInterval(() => loadCampaign(true), 15000);
    return () => window.clearInterval(refreshId);
  }, [loadCampaign]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    pageViewTrackedRef.current = false;
    setCouponCode(null);
    setCopied(false);
    setLocalUnlockAtMs(null);
    setVideoActive(false);
    setVideoProgress(0);
    setVideoStartedTracked(false);
    setUnlockAttention(false);
    setFinalCtaAttention(false);
    attentionTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    attentionTimeoutsRef.current = [];
    revealingRef.current = false;
  }, [slug]);

  useEffect(() => () => {
    attentionTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!campaign?.id || pageViewTrackedRef.current) return;
    pageViewTrackedRef.current = true;
    track('page_view');
    postCoupon('unlock-status', { campaignId: campaign.id, visitorId })
      .then((data) => { if (data?.unlocked && data?.couponCode) setCouponCode(String(data.couponCode)); })
      .catch(() => undefined);
  }, [campaign?.id, track, visitorId]);

  // Tempo realmente ativo, seguindo a mesma filosofia da Vitrine. Desktop nem envia.
  useEffect(() => {
    if (!campaign?.id || desktopTrackingBlocked || typeof document === 'undefined') return;
    const campaignId = campaign.id;
    let engagedSeconds = 0;
    let lastTick = Date.now();
    let lastActivity = Date.now();
    let lastSent = -1;
    const idleMs = 60_000;
    const touchActivity = () => { lastActivity = Date.now(); };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'scroll', 'keydown', 'mousemove'];
    events.forEach((name) => window.addEventListener(name, touchActivity, { passive: true }));

    const send = (beacon = false) => {
      const total = Math.max(0, Math.round(engagedSeconds));
      if (total === lastSent && !beacon) return;
      lastSent = total;
      const payload = JSON.stringify({ campaignId, visitorId, engagedSeconds: total, referrer: document.referrer || null });
      if (beacon && navigator.sendBeacon) {
        try {
          navigator.sendBeacon('/api/best-sellers?mode=coupon-engagement', new Blob([payload], { type: 'application/json' }));
          return;
        } catch { /* fallback */ }
      }
      fetch('/api/best-sellers?mode=coupon-engagement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true,
      }).catch(() => undefined);
    };

    const tick = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, Math.min(2, (now - lastTick) / 1000));
      lastTick = now;
      const videoPlaying = Boolean(videoRef.current && !videoRef.current.paused && !videoRef.current.ended);
      if (document.visibilityState === 'visible' && (videoPlaying || now - lastActivity < idleMs)) engagedSeconds += delta;
    }, 1000);
    const sync = window.setInterval(() => send(false), 15000);
    const pageHide = () => send(true);
    window.addEventListener('pagehide', pageHide);
    document.addEventListener('visibilitychange', pageHide);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(sync);
      events.forEach((name) => window.removeEventListener(name, touchActivity));
      window.removeEventListener('pagehide', pageHide);
      document.removeEventListener('visibilitychange', pageHide);
      send(true);
    };
  }, [campaign?.id, desktopTrackingBlocked, visitorId]);

  const reveal = useCallback(async (progress?: number) => {
    if (!campaign?.id || revealingRef.current || couponCode) return;
    revealingRef.current = true;
    setActionLoading(true);
    try {
      const data = await postCoupon('unlock-reveal', {
        campaignId: campaign.id,
        visitorId,
        videoProgress: progress ?? videoProgress,
      });
      if (data?.unlocked && data?.couponCode) {
        setCouponCode(String(data.couponCode));
        setLocalUnlockAtMs(null);
        setVideoActive(false);
        loadCampaign(true);
      }
    } catch (err: any) {
      if (err?.code === 'COUNTDOWN_NOT_FINISHED' && err?.data?.unlockAt) {
        const serverTarget = new Date(err.data.unlockAt).getTime();
        if (Number.isFinite(serverTarget)) setLocalUnlockAtMs(serverTarget);
      } else if (err?.code !== 'VIDEO_NOT_FINISHED') {
        setError('Não foi possível liberar o cupom agora. Tente novamente.');
      }
    } finally {
      setActionLoading(false);
      revealingRef.current = false;
    }
  }, [campaign?.id, couponCode, loadCampaign, videoProgress, visitorId]);

  useEffect(() => {
    if (!localUnlockAtMs || couponCode) return;
    const tick = () => {
      const left = localUnlockAtMs - Date.now();
      if (left <= 0) {
        reveal();
        return;
      }
      setLocalCountdown(String(Math.max(1, Math.ceil(left / 1000))));
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [localUnlockAtMs, couponCode, reveal]);

  const effectiveStatus: PublicCouponCampaign['status'] = useMemo(() => {
    if (!campaign?.active) return 'expired';
    if (campaign.scheduleEnabled && campaign.unlockStartsAt) {
      const start = new Date(campaign.unlockStartsAt).getTime();
      if (Number.isFinite(start) && start > nowMs) return 'scheduled';
    }
    if (campaign.unlockEndsAt) {
      const end = new Date(campaign.unlockEndsAt).getTime();
      if (Number.isFinite(end) && end <= nowMs) return 'expired';
    }
    if (campaign.status === 'depleted') return 'depleted';
    return 'available';
  }, [campaign, nowMs]);

  // Dois segundos depois de entrar, chama a atenção uma única vez para o CTA
  // primário. A animação é curta, suave e não entra em loop.
  useEffect(() => {
    if (!campaign?.id || couponCode || localUnlockAtMs || videoActive || effectiveStatus !== 'available') return;
    const startId = window.setTimeout(() => {
      setUnlockAttention(true);
      const stopId = window.setTimeout(() => setUnlockAttention(false), 760);
      attentionTimeoutsRef.current.push(stopId);
    }, 2000);
    attentionTimeoutsRef.current.push(startId);
    return () => window.clearTimeout(startId);
  }, [campaign?.id, couponCode, effectiveStatus, localUnlockAtMs, videoActive]);

  const handleUnlock = async () => {
    if (!campaign?.id || effectiveStatus !== 'available' || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const data = await postCoupon('unlock-start', { campaignId: campaign.id, visitorId });
      if (data?.unlocked && data?.couponCode) {
        setCouponCode(String(data.couponCode));
        loadCampaign(true);
        return;
      }
      if (data?.mode === 'countdown') {
        // Usa a duração devolvida pelo servidor para mostrar exatamente o número
        // configurado, sem perder 1 segundo por latência/floor do relógio.
        const delaySeconds = Math.max(1, Number(data.delaySeconds || campaign.unlockDelaySeconds || 1));
        const serverUnlockAt = new Date(data.unlockAt || '').getTime();
        const serverNow = new Date(data.serverNow || '').getTime();
        const remainingMs = Number.isFinite(serverUnlockAt) && Number.isFinite(serverNow)
          ? Math.max(1000, serverUnlockAt - serverNow)
          : delaySeconds * 1000;
        const target = Date.now() + remainingMs;
        setLocalUnlockAtMs(target);
        setLocalCountdown(String(Math.max(1, Math.ceil(remainingMs / 1000))));
        return;
      }
      if (data?.mode === 'video') {
        setVideoActive(true);
        window.setTimeout(() => videoRef.current?.play().catch(() => undefined), 50);
      }
    } catch (err: any) {
      setError(err?.code === 'CAMPAIGN_DEPLETED' ? 'Os cupons disponíveis desta campanha acabaram.' : 'Não foi possível iniciar o desbloqueio.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVideoTime = () => {
    const video = videoRef.current;
    if (!video || !campaign) return;
    if (!videoStartedTracked && video.currentTime > 0.15) {
      setVideoStartedTracked(true);
      track('video_started');
    }
    const duration = Number(video.duration || 0);
    if (!duration) return;
    const progress = Math.min(100, (video.currentTime / duration) * 100);
    setVideoProgress(progress);
    if (progress >= campaign.unlockVideoMinPercent && !couponCode && !revealingRef.current) {
      track('video_completed', { progress });
      reveal(progress);
    }
  };

  const copyCoupon = async () => {
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
    } catch {
      const area = document.createElement('textarea');
      area.value = couponCode;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    track('copy');
    // Depois de copiar, leva a pessoa direto para a ação final da campanha.
    // O pequeno atraso garante que o navegador conclua o feedback visual de
    // "copiado" antes de iniciar a navegação suave pela página.
    const scrollId = window.setTimeout(() => {
      if (finalCtaRef.current) {
        finalCtaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Dá tempo para o scroll suave praticamente terminar e então destaca o
        // próximo passo com uma única pulsada discreta.
        const pulseId = window.setTimeout(() => {
          setFinalCtaAttention(false);
          window.requestAnimationFrame(() => {
            setFinalCtaAttention(true);
            const stopId = window.setTimeout(() => setFinalCtaAttention(false), 720);
            attentionTimeoutsRef.current.push(stopId);
          });
        }, 520);
        attentionTimeoutsRef.current.push(pulseId);
        return;
      }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }, 120);
    attentionTimeoutsRef.current.push(scrollId);
    const copiedId = window.setTimeout(() => setCopied(false), 2200);
    attentionTimeoutsRef.current.push(copiedId);
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin opacity-70" /></div>;

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-sm"><Gift className="w-8 h-8 mx-auto mb-4 opacity-50" /><h1 className="text-xl font-bold">Campanha indisponível</h1><p className="text-sm opacity-60 mt-2">{error || 'Este cupom não está disponível.'}</p></div>
      </div>
    );
  }

  const timerTargetMs = (() => {
    if (!campaign.timerEnabled || effectiveStatus === 'depleted') return null;
    if (effectiveStatus === 'scheduled' && campaign.unlockStartsAt) {
      const target = new Date(campaign.unlockStartsAt).getTime();
      return Number.isFinite(target) ? target : null;
    }
    if (campaign.timerLooping && campaign.timerDurationMinutes && campaign.timerDurationMinutes > 0) {
      return getEvergreenTimerEndMs(campaign.id, campaign.timerDurationMinutes, nowMs);
    }
    const fixedTarget = campaign.timerEndAt || campaign.unlockEndsAt;
    if (!fixedTarget) return null;
    const target = new Date(fixedTarget).getTime();
    return Number.isFinite(target) ? target : null;
  })();
  const timerLabel = effectiveStatus === 'scheduled' ? 'Libera em' : campaign.timerLabel;
  const canUnlock = effectiveStatus === 'available';
  const statusMessage = effectiveStatus === 'scheduled'
    ? (campaign.waitingText || 'Este cupom ainda não foi liberado.')
    : effectiveStatus === 'expired'
      ? 'Esta campanha já terminou.'
      : effectiveStatus === 'depleted'
        ? 'Os cupons disponíveis desta campanha acabaram.'
        : null;

  const availabilityText = campaign.maxUnlocks !== null && campaign.maxUnlocks !== undefined && effectiveStatus === 'available'
    ? campaign.showRemaining && campaign.remainingUnlocks !== null && campaign.remainingUnlocks !== undefined
      ? campaign.showMaxUnlocks
        ? `${campaign.remainingUnlocks} ${campaign.remainingUnlocks === 1 ? 'cupom restante' : 'cupons restantes'} de ${campaign.maxUnlocks}`
        : `${campaign.remainingUnlocks} ${campaign.remainingUnlocks === 1 ? 'cupom restante' : 'cupons restantes'}`
      : campaign.showMaxUnlocks
        ? `Limite de ${campaign.maxUnlocks} cupons`
        : null
    : null;

  const hasEyebrow = Boolean(campaign.eyebrow?.trim());
  const hasTitle = Boolean(campaign.title?.trim());
  const hasSubtitle = Boolean(campaign.subtitle?.trim());
  const hasHeadlineContent = hasEyebrow || hasTitle || hasSubtitle;
  const hasVisibleTimer = Boolean(campaign.timerEnabled && timerTargetMs && effectiveStatus !== 'depleted' && effectiveStatus !== 'expired');
  // Quando o título é removido, os elementos abaixo realmente ocupam o espaço
  // liberado em vez de manter a mesma distância visual da composição completa.
  const timerSpacingClass = hasTitle
    ? 'mt-8 sm:mt-10'
    : hasHeadlineContent
      ? 'mt-2 sm:mt-3'
      : campaign.logoUrl ? 'mt-0' : 'mt-0';
  const couponSpacingClass = hasVisibleTimer
    ? hasTitle
      ? 'mt-8 sm:mt-10'
      : hasHeadlineContent
        ? 'mt-3 sm:mt-4'
        : 'mt-2 sm:mt-3'
    : hasTitle
      ? 'mt-8 sm:mt-10'
      : hasHeadlineContent
        ? 'mt-3 sm:mt-4'
        : campaign.logoUrl ? 'mt-1 sm:mt-2' : 'mt-0';

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ backgroundColor: campaign.backgroundColor, color: campaign.textColor, fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {campaign.backgroundVideoUrl ? (
          <video src={campaign.backgroundVideoUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover scale-[1.03]" style={{ filter: `blur(${campaign.backgroundBlur}px)` }} />
        ) : campaign.backgroundImageUrl ? (
          <img src={campaign.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.03]" style={{ filter: `blur(${campaign.backgroundBlur}px)` }} />
        ) : null}
        {(campaign.backgroundVideoUrl || campaign.backgroundImageUrl) && <div className="absolute inset-0" style={{ backgroundColor: campaign.backgroundColor, opacity: campaign.backgroundOverlay }} />}
      </div>

      <main className="relative z-10 min-h-screen w-full max-w-[560px] mx-auto px-5 sm:px-7 py-10 sm:py-14 flex flex-col justify-center">
        <section className="text-center">
          {campaign.logoUrl && <img src={campaign.logoUrl} alt="" className={`block relative left-1/2 -translate-x-1/2 w-[calc(100vw-24px)] sm:w-[min(92vw,760px)] max-w-[760px] h-auto max-h-[240px] object-contain ${hasTitle ? 'mb-8 sm:mb-10' : hasHeadlineContent ? 'mb-2 sm:mb-3' : 'mb-0'}`} decoding="async" />}
          {campaign.eyebrow && <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-bold mb-3" style={{ color: campaign.accentColor }}>{campaign.eyebrow}</div>}
          {campaign.title?.trim() && <h1 className="text-[clamp(1.65rem,7vw,2.45rem)] leading-[1.04] tracking-[-0.04em] font-black">{campaign.title}</h1>}
          {campaign.subtitle && <p className="text-[14px] sm:text-[16px] leading-relaxed mt-3 max-w-[470px] mx-auto" style={{ color: campaign.mutedTextColor }}>{campaign.subtitle}</p>}

          {hasVisibleTimer && timerTargetMs && (
            <div className={timerSpacingClass}><CouponTimer label={timerLabel} targetMs={timerTargetMs} color={campaign.timerColor || campaign.textColor} /></div>
          )}

          <div className={couponSpacingClass}>
            {statusMessage && !couponCode && <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-sm px-5 py-4 text-sm" style={{ color: campaign.mutedTextColor }}>{statusMessage}</div>}

            {!couponCode && canUnlock && !localUnlockAtMs && !videoActive && (
              <>
                {availabilityText && <div className="mb-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] opacity-65" style={{ color: campaign.accentColor }}>{availabilityText}</div>}
                <button type="button" onClick={handleUnlock} disabled={actionLoading} className={`w-full min-h-[62px] rounded-xl px-5 text-[15px] font-black uppercase tracking-[0.04em] flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-60 cursor-pointer ${unlockAttention ? 'zhaya-coupon-soft-nudge' : ''}`} style={{ backgroundColor: campaign.buttonBackgroundColor, color: campaign.buttonTextColor }}>
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LockKeyhole className="w-5 h-5" />}{campaign.unlockButtonText}
                </button>
              </>
            )}

            {!couponCode && localUnlockAtMs && (
              <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-sm px-5 py-6">
                <div className="text-[11px] uppercase tracking-[0.22em] font-bold opacity-55">Liberando seu cupom</div>
                <div className="text-5xl font-black tracking-[-0.04em] tabular-nums mt-2">{localCountdown}</div>
                {campaign.waitingText && <p className="text-sm mt-3" style={{ color: campaign.mutedTextColor }}>{campaign.waitingText}</p>}
              </div>
            )}

            {!couponCode && videoActive && campaign.unlockVideoUrl && (
              <div className="text-left rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm p-3 overflow-hidden">
                <video ref={videoRef} src={campaign.unlockVideoUrl} controls playsInline onTimeUpdate={handleVideoTime} className="w-full rounded-xl bg-black max-h-[62vh]" />
                <div className="px-2 pt-3 pb-1">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em]"><span>Assista para desbloquear</span><span>{Math.floor(videoProgress)}%</span></div>
                  <div className="h-1.5 rounded-full bg-white/15 mt-2 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${Math.min(100, videoProgress)}%`, backgroundColor: campaign.accentColor }} /></div>
                  <p className="text-[11px] mt-2" style={{ color: campaign.mutedTextColor }}>O cupom libera em {campaign.unlockVideoMinPercent}% do vídeo.</p>
                </div>
              </div>
            )}

            {couponCode && (
              <div className="animate-[fadeIn_.25s_ease-out]">
                {campaign.successTitle && <h2 className="text-xl font-black mb-2">{campaign.successTitle}</h2>}
                {campaign.successMessage && <p className="text-sm mb-5" style={{ color: campaign.mutedTextColor }}>{campaign.successMessage}</p>}
                <button type="button" onClick={copyCoupon} className="w-full rounded-2xl border border-dashed border-white/35 bg-black/25 backdrop-blur-sm px-5 py-6 cursor-pointer group">
                  <div className="text-[10px] uppercase tracking-[0.24em] font-bold opacity-55 mb-2">Seu cupom</div>
                  <div className="text-[clamp(2rem,10vw,3.6rem)] leading-none font-black tracking-[-0.045em] break-all" style={{ color: campaign.accentColor }}>{couponCode}</div>
                </button>
                <button type="button" onClick={copyCoupon} className="w-full min-h-[60px] rounded-xl mt-3 px-5 text-[15px] font-black uppercase tracking-[0.04em] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-transform" style={{ backgroundColor: campaign.buttonBackgroundColor, color: campaign.buttonTextColor }}>
                  {copied ? <Check className="w-5 h-5" /> : <Clipboard className="w-5 h-5" />}{copied ? campaign.copiedText : campaign.copyButtonText}
                </button>
              </div>
            )}

            {campaign.siteCtaEnabled && campaign.siteUrl && (couponCode || effectiveStatus !== 'available') && (
              <a ref={finalCtaRef} href={campaign.siteUrl} target="_blank" rel="noreferrer noopener" onClick={() => track('site_click')} className={`w-full min-h-[58px] rounded-xl border border-white/25 mt-3 px-5 text-[14px] font-bold flex items-center justify-center gap-2 no-underline transition-colors hover:bg-white/10 scroll-mt-6 ${finalCtaAttention ? 'zhaya-coupon-soft-pulse' : ''}`} style={{ color: campaign.textColor }}>
                {campaign.siteCtaText}<ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {error && campaign && <button type="button" onClick={() => setError(null)} className="mt-5 text-xs inline-flex items-center gap-1.5 opacity-70 hover:opacity-100 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> {error}</button>}
        </section>
      </main>
    </div>
  );
}
