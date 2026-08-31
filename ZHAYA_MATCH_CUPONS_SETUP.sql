-- =============================================================================
-- ZHAYA MATCH - CUPONS / CAMPANHAS DE LIVE
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.coupon_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Nova campanha',
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT false,

  eyebrow TEXT,
  title TEXT NOT NULL DEFAULT 'Cupom exclusivo',
  subtitle TEXT,
  logo_url TEXT,

  background_color TEXT NOT NULL DEFAULT '#000000',
  background_image_url TEXT,
  background_video_url TEXT,
  background_overlay NUMERIC(4,3) NOT NULL DEFAULT 0.34 CHECK (background_overlay >= 0 AND background_overlay <= 0.95),
  background_blur NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (background_blur >= 0 AND background_blur <= 40),
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  muted_text_color TEXT NOT NULL DEFAULT '#B7B7B7',
  accent_color TEXT NOT NULL DEFAULT '#FFFFFF',
  button_background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  button_text_color TEXT NOT NULL DEFAULT '#000000',

  coupon_code TEXT NOT NULL DEFAULT 'CUPOM',
  unlock_mode TEXT NOT NULL DEFAULT 'immediate' CHECK (unlock_mode IN ('immediate', 'countdown', 'video')),
  unlock_delay_seconds INTEGER NOT NULL DEFAULT 0 CHECK (unlock_delay_seconds >= 0 AND unlock_delay_seconds <= 3600),
  unlock_video_url TEXT,
  unlock_video_min_percent INTEGER NOT NULL DEFAULT 80 CHECK (unlock_video_min_percent >= 10 AND unlock_video_min_percent <= 100),
  unlock_button_text TEXT NOT NULL DEFAULT 'Desbloquear cupom',
  waiting_text TEXT,
  success_title TEXT,
  success_message TEXT,
  copy_button_text TEXT NOT NULL DEFAULT 'Copiar cupom',
  copied_text TEXT NOT NULL DEFAULT 'Cupom copiado',

  site_cta_enabled BOOLEAN NOT NULL DEFAULT true,
  site_cta_text TEXT NOT NULL DEFAULT 'Aproveitar oferta',
  site_url TEXT,

  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  unlock_starts_at TIMESTAMPTZ,
  unlock_ends_at TIMESTAMPTZ,
  timer_enabled BOOLEAN NOT NULL DEFAULT true,
  timer_label TEXT NOT NULL DEFAULT 'Termina em',

  max_unlocks INTEGER CHECK (max_unlocks IS NULL OR max_unlocks > 0),
  show_remaining BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS public.coupon_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',
    'unlock_click',
    'unlocked',
    'copy',
    'site_click',
    'video_started',
    'video_completed'
  )),
  visitor_id TEXT NOT NULL,
  device_type TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_campaigns_active_slug_idx
  ON public.coupon_campaigns (active, slug);

CREATE INDEX IF NOT EXISTS coupon_events_campaign_type_idx
  ON public.coupon_events (campaign_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS coupon_events_campaign_visitor_idx
  ON public.coupon_events (campaign_id, visitor_id, event_type);

-- Um mesmo dispositivo/visitante só consome um desbloqueio da quantidade limitada.
CREATE UNIQUE INDEX IF NOT EXISTS coupon_events_unique_unlock_per_visitor_idx
  ON public.coupon_events (campaign_id, visitor_id)
  WHERE event_type = 'unlocked';

CREATE OR REPLACE FUNCTION public.zhaya_coupon_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coupon_campaigns_updated_at ON public.coupon_campaigns;
CREATE TRIGGER trg_coupon_campaigns_updated_at
BEFORE UPDATE ON public.coupon_campaigns
FOR EACH ROW EXECUTE FUNCTION public.zhaya_coupon_set_updated_at();

ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_events ENABLE ROW LEVEL SECURITY;

-- O módulo lê e grava exclusivamente pelas APIs server-side com Service Role.
-- Por isso nenhuma policy pública é necessária aqui.

-- Desbloqueio atômico: evita estourar o limite de cupons quando muitas pessoas
-- tentam liberar ao mesmo tempo durante uma live.
CREATE OR REPLACE FUNCTION public.zhaya_coupon_claim(
  p_campaign_id UUID,
  p_visitor_id TEXT,
  p_device_type TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(claimed BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupon_campaigns%ROWTYPE;
  unlocked_count BIGINT;
BEGIN
  SELECT * INTO c
  FROM public.coupon_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.coupon_events
    WHERE campaign_id = p_campaign_id
      AND visitor_id = p_visitor_id
      AND event_type = 'unlocked'
  ) THEN
    RETURN QUERY SELECT true, 'already'::TEXT;
    RETURN;
  END IF;

  IF NOT c.active THEN
    RETURN QUERY SELECT false, 'inactive'::TEXT;
    RETURN;
  END IF;

  IF c.schedule_enabled AND c.unlock_starts_at IS NOT NULL AND c.unlock_starts_at > now() THEN
    RETURN QUERY SELECT false, 'scheduled'::TEXT;
    RETURN;
  END IF;

  IF c.unlock_ends_at IS NOT NULL AND c.unlock_ends_at <= now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT;
    RETURN;
  END IF;

  IF c.max_unlocks IS NOT NULL THEN
    SELECT count(*) INTO unlocked_count
    FROM public.coupon_events
    WHERE campaign_id = p_campaign_id
      AND event_type = 'unlocked';

    IF unlocked_count >= c.max_unlocks THEN
      RETURN QUERY SELECT false, 'depleted'::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.coupon_events (
    campaign_id,
    event_type,
    visitor_id,
    device_type,
    country_code,
    region,
    city,
    metadata
  ) VALUES (
    p_campaign_id,
    'unlocked',
    p_visitor_id,
    p_device_type,
    p_country_code,
    p_region,
    p_city,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'claimed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.zhaya_coupon_claim(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zhaya_coupon_claim(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
