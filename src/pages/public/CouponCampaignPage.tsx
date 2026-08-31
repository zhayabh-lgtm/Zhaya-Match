import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clipboard, ExternalLink, Gift, Loader2, LockKeyhole, Play, RotateCcw } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { PublicCouponCampaign } from '../../types/coupon';

const VISITOR_KEY = 'zhaya_coupon_visitor_v1';

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

function formatCountdown(targetIso: string | null | undefined): string {
  if (!targetIso) return '00:00:00';
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const total = Math.floor(diff / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

function CouponTimer({ label, target, color }: { label: string; target: string; color: string }) {
  const [value, setValue] = useState(() => formatCountdown(target));
  useEffect(() => {
    setValue(formatCountdown(target));
    const id = window.setInterval(() => setValue(formatCountdown(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return (
    <div className="text-center py-3">
      <div className="text-[10px] uppercase tracking-[0.34em] font-bold opacity-55 mb-2">{label}</div>
      <div className="text-[clamp(2.2rem,11vw,4rem)] leading-none font-black tracking-[-0.055em] tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

export function CouponCampaignPage() {
  const { slug = '' } = useParams();
  const visitorId = useMemo(() => getVisitorId(), []);
  const [campaign, setCampaign] = useState<PublicCouponCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [localUnlockAt, setLocalUnlockAt] = useState<string | null>(null);
  const [localCountdown, setLocalCountdown] = useState('');
  const [videoActive, setVideoActive] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStartedTracked, setVideoStartedTracked] = useState(false);
  const revealingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pageViewTrackedRef = useRef(false);

  const track = useCallback((eventType: string, extra: Record<string, any> = {}) => {
    if (!campaign?.id) return;
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
    } catch { /* fallback below */ }
    fetch('/api/best-sellers?mode=coupon-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [campaign?.id, visitorId]);

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
    setLocalUnlockAt(null);
    setVideoActive(false);
    setVideoProgress(0);
    setVideoStartedTracked(false);
    revealingRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (!campaign?.id || pageViewTrackedRef.current) return;
    pageViewTrackedRef.current = true;
    track('page_view');
    postCoupon('unlock-status', { campaignId: campaign.id, visitorId })
      .then((data) => {
        if (data?.unlocked && data?.couponCode) setCouponCode(String(data.couponCode));
      })
      .catch(() => undefined);
  }, [campaign?.id, track, visitorId]);

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
        setLocalUnlockAt(null);
        setVideoActive(false);
      }
    } catch (err: any) {
      if (err?.code !== 'COUNTDOWN_NOT_FINISHED' && err?.code !== 'VIDEO_NOT_FINISHED') {
        setError('Não foi possível liberar o cupom agora. Tente novamente.');
      }
    } finally {
      setActionLoading(false);
      revealingRef.current = false;
    }
  }, [campaign?.id, couponCode, videoProgress, visitorId]);

  useEffect(() => {
    if (!localUnlockAt || couponCode) return;
    const tick = () => {
      const left = new Date(localUnlockAt).getTime() - Date.now();
      setLocalCountdown(formatCountdown(localUnlockAt));
      if (left <= 150) reveal();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [localUnlockAt, couponCode, reveal]);

  const handleUnlock = async () => {
    if (!campaign?.id || effectiveStatus !== 'available' || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const data = await postCoupon('unlock-start', { campaignId: campaign.id, visitorId });
      if (data?.unlocked && data?.couponCode) {
        setCouponCode(String(data.couponCode));
        return;
      }
      if (data?.mode === 'countdown' && data?.unlockAt) {
        setLocalUnlockAt(String(data.unlockAt));
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
    window.setTimeout(() => setCopied(false), 2200);
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin opacity-70" /></div>;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <Gift className="w-8 h-8 mx-auto mb-4 opacity-50" />
          <h1 className="text-xl font-bold">Campanha indisponível</h1>
          <p className="text-sm opacity-60 mt-2">{error || 'Este cupom não está disponível.'}</p>
        </div>
      </div>
    );
  }

  const effectiveStatus: PublicCouponCampaign['status'] = (() => {
    if (!campaign.active) return 'expired';
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
  })();

  const timerTarget = effectiveStatus === 'scheduled' ? campaign.unlockStartsAt : campaign.unlockEndsAt;
  const timerLabel = effectiveStatus === 'scheduled' ? 'Libera em' : campaign.timerLabel;
  const canUnlock = effectiveStatus === 'available';
  const statusMessage = effectiveStatus === 'scheduled'
    ? (campaign.waitingText || 'Este cupom ainda não foi liberado.')
    : effectiveStatus === 'expired'
      ? 'Esta campanha já terminou.'
      : effectiveStatus === 'depleted'
        ? 'Os cupons disponíveis desta campanha acabaram.'
        : null;

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        backgroundColor: campaign.backgroundColor,
        color: campaign.textColor,
        fontFamily: '"Neue Einstellung", "Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {campaign.backgroundVideoUrl ? (
          <video
            src={campaign.backgroundVideoUrl}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover scale-[1.03]"
            style={{ filter: `blur(${campaign.backgroundBlur}px)` }}
          />
        ) : campaign.backgroundImageUrl ? (
          <img
            src={campaign.backgroundImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-[1.03]"
            style={{ filter: `blur(${campaign.backgroundBlur}px)` }}
          />
        ) : null}
        {(campaign.backgroundVideoUrl || campaign.backgroundImageUrl) && (
          <div className="absolute inset-0" style={{ backgroundColor: campaign.backgroundColor, opacity: campaign.backgroundOverlay }} />
        )}
      </div>

      <main className="relative z-10 min-h-screen w-full max-w-[560px] mx-auto px-5 sm:px-7 py-10 sm:py-14 flex flex-col justify-center">
        <section className="text-center">
          {campaign.logoUrl && (
            <img
              src={campaign.logoUrl}
              alt=""
              className="block mx-auto max-w-[92%] max-h-[190px] object-contain mb-8 sm:mb-10"
              decoding="async"
            />
          )}

          {campaign.eyebrow && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-bold mb-3" style={{ color: campaign.accentColor }}>{campaign.eyebrow}</div>
          )}
          <h1 className="text-[clamp(1.65rem,7vw,2.45rem)] leading-[1.04] tracking-[-0.04em] font-black">{campaign.title}</h1>
          {campaign.subtitle && (
            <p className="text-[14px] sm:text-[16px] leading-relaxed mt-3 max-w-[470px] mx-auto" style={{ color: campaign.mutedTextColor }}>{campaign.subtitle}</p>
          )}

          {campaign.timerEnabled && timerTarget && effectiveStatus !== 'depleted' && (
            <div className="mt-8 sm:mt-10">
              <CouponTimer label={timerLabel} target={timerTarget} color={campaign.textColor} />
            </div>
          )}

          {campaign.showRemaining && campaign.remainingUnlocks !== null && campaign.remainingUnlocks !== undefined && effectiveStatus === 'available' && (
            <div className="mt-5 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: campaign.accentColor }}>
              {campaign.remainingUnlocks === 1 ? 'Resta 1 cupom' : `Restam ${campaign.remainingUnlocks} cupons`}
            </div>
          )}

          <div className="mt-8 sm:mt-10">
            {statusMessage && !couponCode && (
              <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-sm px-5 py-4 text-sm" style={{ color: campaign.mutedTextColor }}>
                {statusMessage}
              </div>
            )}

            {!couponCode && canUnlock && !localUnlockAt && !videoActive && (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={actionLoading}
                className="w-full min-h-[62px] rounded-xl px-5 text-[15px] font-black uppercase tracking-[0.04em] flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: campaign.buttonBackgroundColor, color: campaign.buttonTextColor }}
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LockKeyhole className="w-5 h-5" />}
                {campaign.unlockButtonText}
              </button>
            )}

            {!couponCode && localUnlockAt && (
              <div className="rounded-2xl border border-white/15 bg-black/20 backdrop-blur-sm px-5 py-6">
                <div className="text-[11px] uppercase tracking-[0.22em] font-bold opacity-55">Liberando seu cupom</div>
                <div className="text-4xl font-black tracking-[-0.04em] tabular-nums mt-2">{localCountdown}</div>
                {campaign.waitingText && <p className="text-sm mt-3" style={{ color: campaign.mutedTextColor }}>{campaign.waitingText}</p>}
              </div>
            )}

            {!couponCode && videoActive && campaign.unlockVideoUrl && (
              <div className="text-left rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm p-3 overflow-hidden">
                <video
                  ref={videoRef}
                  src={campaign.unlockVideoUrl}
                  controls
                  playsInline
                  onTimeUpdate={handleVideoTime}
                  className="w-full rounded-xl bg-black max-h-[62vh]"
                />
                <div className="px-2 pt-3 pb-1">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em]">
                    <span>Assista para desbloquear</span>
                    <span>{Math.floor(videoProgress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${Math.min(100, videoProgress)}%`, backgroundColor: campaign.accentColor }} />
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: campaign.mutedTextColor }}>O cupom libera em {campaign.unlockVideoMinPercent}% do vídeo.</p>
                </div>
              </div>
            )}

            {couponCode && (
              <div className="animate-[fadeIn_.25s_ease-out]">
                {campaign.successTitle && <h2 className="text-xl font-black mb-2">{campaign.successTitle}</h2>}
                {campaign.successMessage && <p className="text-sm mb-5" style={{ color: campaign.mutedTextColor }}>{campaign.successMessage}</p>}
                <button
                  type="button"
                  onClick={copyCoupon}
                  className="w-full rounded-2xl border border-dashed border-white/35 bg-black/25 backdrop-blur-sm px-5 py-6 cursor-pointer group"
                >
                  <div className="text-[10px] uppercase tracking-[0.24em] font-bold opacity-55 mb-2">Seu cupom</div>
                  <div className="text-[clamp(2rem,10vw,3.6rem)] leading-none font-black tracking-[-0.045em] break-all" style={{ color: campaign.accentColor }}>{couponCode}</div>
                </button>

                <button
                  type="button"
                  onClick={copyCoupon}
                  className="w-full min-h-[60px] rounded-xl mt-3 px-5 text-[15px] font-black uppercase tracking-[0.04em] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-transform"
                  style={{ backgroundColor: campaign.buttonBackgroundColor, color: campaign.buttonTextColor }}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Clipboard className="w-5 h-5" />}
                  {copied ? campaign.copiedText : campaign.copyButtonText}
                </button>
              </div>
            )}

            {campaign.siteCtaEnabled && campaign.siteUrl && (couponCode || effectiveStatus !== 'available') && (
              <a
                href={campaign.siteUrl}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track('site_click')}
                className="w-full min-h-[58px] rounded-xl border border-white/25 mt-3 px-5 text-[14px] font-bold flex items-center justify-center gap-2 no-underline transition-colors hover:bg-white/10"
                style={{ color: campaign.textColor }}
              >
                {campaign.siteCtaText}<ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {error && campaign && (
            <button type="button" onClick={() => setError(null)} className="mt-5 text-xs inline-flex items-center gap-1.5 opacity-70 hover:opacity-100 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> {error}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
