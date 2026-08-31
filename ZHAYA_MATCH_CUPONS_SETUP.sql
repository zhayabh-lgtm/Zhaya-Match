-- =============================================================================
-- ZHAYA MATCH - CUPONS / CAMPANHAS DE LIVE (SETUP ATUAL)
-- Idempotente: pode executar novamente sem perder campanhas existentes.
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
  timer_color TEXT NOT NULL DEFAULT '#FFFFFF',
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
  timer_looping BOOLEAN NOT NULL DEFAULT false,
  timer_duration_minutes INTEGER CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)),
  timer_end_at TIMESTAMPTZ,
  max_unlocks INTEGER CHECK (max_unlocks IS NULL OR max_unlocks > 0),
  show_remaining BOOLEAN NOT NULL DEFAULT false,
  show_max_unlocks BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_end_at TIMESTAMPTZ;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS show_max_unlocks BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_color TEXT NOT NULL DEFAULT '#FFFFFF';

UPDATE public.coupon_campaigns
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupon_campaigns_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.coupon_campaigns
      ADD CONSTRAINT coupon_campaigns_timer_duration_minutes_check
      CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coupon_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view','unlock_click','unlocked','copy','site_click','video_started','video_completed')),
  visitor_id TEXT NOT NULL,
  device_type TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_campaigns_active_slug_idx ON public.coupon_campaigns (active, slug);
CREATE INDEX IF NOT EXISTS coupon_events_campaign_type_idx ON public.coupon_events (campaign_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS coupon_events_campaign_visitor_idx ON public.coupon_events (campaign_id, visitor_id, event_type);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_events_unique_unlock_per_visitor_idx
  ON public.coupon_events (campaign_id, visitor_id) WHERE event_type = 'unlocked';

-- Sessão única por navegador para visitantes, tempo ativo, horários e localização.
CREATE TABLE IF NOT EXISTS public.coupon_visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engaged_seconds INTEGER NOT NULL DEFAULT 0 CHECK (engaged_seconds >= 0),
  UNIQUE (campaign_id, visitor_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_visitor_sessions_unique_idx ON public.coupon_visitor_sessions(campaign_id, visitor_id);
CREATE INDEX IF NOT EXISTS coupon_visitor_sessions_first_seen_idx ON public.coupon_visitor_sessions(campaign_id, first_seen_at DESC);

CREATE OR REPLACE FUNCTION public.zhaya_coupon_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_coupon_campaigns_updated_at ON public.coupon_campaigns;
CREATE TRIGGER trg_coupon_campaigns_updated_at
BEFORE UPDATE ON public.coupon_campaigns
FOR EACH ROW EXECUTE FUNCTION public.zhaya_coupon_set_updated_at();

ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_campaigns FROM anon, authenticated;
REVOKE ALL ON public.coupon_events FROM anon, authenticated;
REVOKE ALL ON public.coupon_visitor_sessions FROM anon, authenticated;
GRANT ALL ON public.coupon_campaigns TO service_role;
GRANT ALL ON public.coupon_events TO service_role;
GRANT ALL ON public.coupon_visitor_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_coupon_visitor_session(
  p_campaign_id UUID,
  p_visitor_id TEXT,
  p_engaged_seconds_total INTEGER DEFAULT 0,
  p_device_type TEXT DEFAULT 'unknown',
  p_country_code TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coupon_visitor_sessions (
    campaign_id, visitor_id, device_type, country_code, region, city, referrer,
    first_seen_at, last_seen_at, engaged_seconds
  ) VALUES (
    p_campaign_id,
    p_visitor_id,
    COALESCE(NULLIF(p_device_type, ''), 'unknown'),
    NULLIF(p_country_code, ''), NULLIF(p_region, ''), NULLIF(p_city, ''), NULLIF(p_referrer, ''),
    now(), now(), GREATEST(COALESCE(p_engaged_seconds_total, 0), 0)
  )
  ON CONFLICT (campaign_id, visitor_id)
  DO UPDATE SET
    last_seen_at = now(),
    engaged_seconds = GREATEST(public.coupon_visitor_sessions.engaged_seconds, EXCLUDED.engaged_seconds),
    device_type = CASE WHEN EXCLUDED.device_type <> 'unknown' THEN EXCLUDED.device_type ELSE public.coupon_visitor_sessions.device_type END,
    country_code = COALESCE(public.coupon_visitor_sessions.country_code, EXCLUDED.country_code),
    region = COALESCE(public.coupon_visitor_sessions.region, EXCLUDED.region),
    city = COALESCE(public.coupon_visitor_sessions.city, EXCLUDED.city),
    referrer = COALESCE(public.coupon_visitor_sessions.referrer, EXCLUDED.referrer);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_coupon_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_coupon_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Desbloqueio atômico. Desktop pode usar e consumir limite normalmente; ele só é
-- excluído das métricas no servidor para não contaminar analytics internos.
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
  SELECT * INTO c FROM public.coupon_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'not_found'::TEXT; RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.coupon_events WHERE campaign_id = p_campaign_id AND visitor_id = p_visitor_id AND event_type = 'unlocked') THEN
    RETURN QUERY SELECT true, 'already'::TEXT; RETURN;
  END IF;

  IF NOT c.active THEN RETURN QUERY SELECT false, 'inactive'::TEXT; RETURN; END IF;
  IF c.schedule_enabled AND c.unlock_starts_at IS NOT NULL AND c.unlock_starts_at > now() THEN RETURN QUERY SELECT false, 'scheduled'::TEXT; RETURN; END IF;
  IF c.unlock_ends_at IS NOT NULL AND c.unlock_ends_at <= now() THEN RETURN QUERY SELECT false, 'expired'::TEXT; RETURN; END IF;

  IF c.max_unlocks IS NOT NULL THEN
    SELECT count(*) INTO unlocked_count FROM public.coupon_events WHERE campaign_id = p_campaign_id AND event_type = 'unlocked';
    IF unlocked_count >= c.max_unlocks THEN RETURN QUERY SELECT false, 'depleted'::TEXT; RETURN; END IF;
  END IF;

  INSERT INTO public.coupon_events (campaign_id,event_type,visitor_id,device_type,country_code,region,city,metadata)
  VALUES (p_campaign_id,'unlocked',p_visitor_id,p_device_type,p_country_code,p_region,p_city,COALESCE(p_metadata,'{}'::jsonb))
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true, 'claimed'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.zhaya_coupon_claim(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zhaya_coupon_claim(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Migra page_views mobile/tablet já existentes para a sessão única, sem duplicar.
INSERT INTO public.coupon_visitor_sessions (
  campaign_id, visitor_id, device_type, country_code, region, city, referrer,
  first_seen_at, last_seen_at, engaged_seconds
)
SELECT
  campaign_id,
  visitor_id,
  COALESCE((array_agg(device_type ORDER BY created_at ASC))[1], 'unknown'),
  (array_agg(country_code ORDER BY created_at ASC))[1],
  (array_agg(region ORDER BY created_at ASC))[1],
  (array_agg(city ORDER BY created_at ASC))[1],
  (array_agg(referrer ORDER BY created_at ASC))[1],
  MIN(created_at), MAX(created_at), 0
FROM public.coupon_events
WHERE event_type = 'page_view'
  AND COALESCE(device_type, 'unknown') <> 'desktop'
  AND visitor_id IS NOT NULL AND btrim(visitor_id) <> ''
GROUP BY campaign_id, visitor_id
ON CONFLICT (campaign_id, visitor_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
