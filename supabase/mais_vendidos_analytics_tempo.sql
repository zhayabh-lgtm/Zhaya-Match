-- =============================================================================
-- ZHAYA MATCH — ANALYTICS SIMPLES POR LISTA DE MAIS VENDIDOS
-- Idempotente: pode executar mais de uma vez.
-- Não armazena IP, latitude ou longitude. A localização salva é apenas
-- país/região/cidade aproximados informados pela infraestrutura da Vercel.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.best_seller_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.best_seller_products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_play', 'product_click')),
  visitor_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.best_seller_lists(id) ON DELETE CASCADE;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.best_seller_products(id) ON DELETE SET NULL;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.best_seller_analytics_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_created
  ON public.best_seller_analytics_events(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_event
  ON public.best_seller_analytics_events(list_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_product_event
  ON public.best_seller_analytics_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_visitor
  ON public.best_seller_analytics_events(list_id, visitor_id);

ALTER TABLE public.best_seller_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_analytics_events FROM anon, authenticated;
GRANT ALL ON public.best_seller_analytics_events TO service_role;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- VISITANTES ÚNICOS + TEMPO ENGAJADO + HORÁRIOS
-- Uma única linha por navegador/visitor_id em cada lista.
-- Recarregar a página NÃO cria outro visitante.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.best_seller_visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engaged_seconds INTEGER NOT NULL DEFAULT 0 CHECK (engaged_seconds >= 0),
  UNIQUE (list_id, visitor_id)
);

ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.best_seller_visitor_sessions
  ADD COLUMN IF NOT EXISTS engaged_seconds INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_unique
  ON public.best_seller_visitor_sessions(list_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_first_seen
  ON public.best_seller_visitor_sessions(list_id, first_seen_at);

ALTER TABLE public.best_seller_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_visitor_sessions FROM anon, authenticated;
GRANT ALL ON public.best_seller_visitor_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_best_seller_visitor_session(
  p_list_id UUID,
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
  INSERT INTO public.best_seller_visitor_sessions (
    list_id,
    visitor_id,
    device_type,
    country_code,
    region,
    city,
    referrer,
    first_seen_at,
    last_seen_at,
    engaged_seconds
  )
  VALUES (
    p_list_id,
    p_visitor_id,
    COALESCE(NULLIF(p_device_type, ''), 'unknown'),
    NULLIF(p_country_code, ''),
    NULLIF(p_region, ''),
    NULLIF(p_city, ''),
    NULLIF(p_referrer, ''),
    now(),
    now(),
    GREATEST(COALESCE(p_engaged_seconds_total, 0), 0)
  )
  ON CONFLICT (list_id, visitor_id)
  DO UPDATE SET
    last_seen_at = now(),
    engaged_seconds = GREATEST(
      public.best_seller_visitor_sessions.engaged_seconds,
      EXCLUDED.engaged_seconds
    ),
    device_type = CASE
      WHEN EXCLUDED.device_type <> 'unknown' THEN EXCLUDED.device_type
      ELSE public.best_seller_visitor_sessions.device_type
    END,
    country_code = COALESCE(public.best_seller_visitor_sessions.country_code, EXCLUDED.country_code),
    region = COALESCE(public.best_seller_visitor_sessions.region, EXCLUDED.region),
    city = COALESCE(public.best_seller_visitor_sessions.city, EXCLUDED.city),
    referrer = COALESCE(public.best_seller_visitor_sessions.referrer, EXCLUDED.referrer);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

-- Migra visualizações antigas para a tabela única sem duplicar visitantes.
INSERT INTO public.best_seller_visitor_sessions (
  list_id,
  visitor_id,
  device_type,
  country_code,
  region,
  city,
  referrer,
  first_seen_at,
  last_seen_at,
  engaged_seconds
)
SELECT
  list_id,
  visitor_id,
  COALESCE((array_agg(device_type ORDER BY created_at ASC))[1], 'unknown'),
  (array_agg(country_code ORDER BY created_at ASC))[1],
  (array_agg(region ORDER BY created_at ASC))[1],
  (array_agg(city ORDER BY created_at ASC))[1],
  (array_agg(referrer ORDER BY created_at ASC))[1],
  MIN(created_at),
  MAX(created_at),
  0
FROM public.best_seller_analytics_events
WHERE event_type = 'page_view'
  AND visitor_id IS NOT NULL
  AND btrim(visitor_id) <> ''
GROUP BY list_id, visitor_id
ON CONFLICT (list_id, visitor_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
