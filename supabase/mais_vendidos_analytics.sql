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
