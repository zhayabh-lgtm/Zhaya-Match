-- ZHAYA MATCH - CUPONS LIVE V2 - UPGRADE PARA QUEM JÁ EXECUTOU O V1
-- Pode executar mais de uma vez.

ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS timer_end_at TIMESTAMPTZ;
ALTER TABLE public.coupon_campaigns ADD COLUMN IF NOT EXISTS show_max_unlocks BOOLEAN NOT NULL DEFAULT false;

UPDATE public.coupon_campaigns
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_campaigns_timer_duration_minutes_check') THEN
    ALTER TABLE public.coupon_campaigns
      ADD CONSTRAINT coupon_campaigns_timer_duration_minutes_check
      CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080));
  END IF;
END $$;

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
ALTER TABLE public.coupon_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_visitor_sessions FROM anon, authenticated;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.coupon_visitor_sessions (
    campaign_id, visitor_id, device_type, country_code, region, city, referrer,
    first_seen_at, last_seen_at, engaged_seconds
  ) VALUES (
    p_campaign_id, p_visitor_id, COALESCE(NULLIF(p_device_type, ''), 'unknown'),
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

INSERT INTO public.coupon_visitor_sessions (
  campaign_id, visitor_id, device_type, country_code, region, city, referrer,
  first_seen_at, last_seen_at, engaged_seconds
)
SELECT
  campaign_id, visitor_id,
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
