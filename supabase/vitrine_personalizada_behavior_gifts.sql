-- VITRINE PERSONALIZADA — padrões, presentes e analytics comportamental
-- Idempotente: pode rodar mais de uma vez.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS default_badge_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_badge_text TEXT,
  ADD COLUMN IF NOT EXISTS default_badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS gift_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gift_image_path TEXT,
  ADD COLUMN IF NOT EXISTS gift_title TEXT,
  ADD COLUMN IF NOT EXISTS gift_label TEXT DEFAULT 'Você ganha',
  ADD COLUMN IF NOT EXISTS gift_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS gift_image_size INTEGER NOT NULL DEFAULT 48;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS badge_use_list_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_mode TEXT NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS gift_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gift_image_path TEXT,
  ADD COLUMN IF NOT EXISTS gift_title TEXT,
  ADD COLUMN IF NOT EXISTS gift_label TEXT DEFAULT 'Você ganha',
  ADD COLUMN IF NOT EXISTS gift_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS gift_image_size INTEGER NOT NULL DEFAULT 48;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_gift_mode_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_gift_mode_check
      CHECK (gift_mode IN ('inherit', 'off', 'custom'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.best_seller_product_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.best_seller_products(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  visible_seconds INTEGER NOT NULL DEFAULT 0 CHECK (visible_seconds >= 0),
  slides_seen INTEGER[] NOT NULL DEFAULT '{}'::integer[],
  slide_count INTEGER NOT NULL DEFAULT 0 CHECK (slide_count >= 0 AND slide_count <= 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, product_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_best_seller_product_behavior_list
  ON public.best_seller_product_behavior(list_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_behavior_product
  ON public.best_seller_product_behavior(product_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_behavior_visitor
  ON public.best_seller_product_behavior(list_id, visitor_id);

ALTER TABLE public.best_seller_product_behavior ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_product_behavior FROM anon, authenticated;
GRANT ALL ON public.best_seller_product_behavior TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_best_seller_product_behavior(
  p_list_id UUID,
  p_product_id UUID,
  p_visitor_id TEXT,
  p_visible_seconds_total INTEGER DEFAULT 0,
  p_seen BOOLEAN DEFAULT false,
  p_slides_seen INTEGER[] DEFAULT '{}'::integer[],
  p_slide_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.best_seller_product_behavior (
    list_id,
    product_id,
    visitor_id,
    seen,
    visible_seconds,
    slides_seen,
    slide_count,
    updated_at
  ) VALUES (
    p_list_id,
    p_product_id,
    p_visitor_id,
    COALESCE(p_seen, false),
    GREATEST(COALESCE(p_visible_seconds_total, 0), 0),
    COALESCE(p_slides_seen, '{}'::integer[]),
    GREATEST(COALESCE(p_slide_count, 0), 0),
    now()
  )
  ON CONFLICT (list_id, product_id, visitor_id)
  DO UPDATE SET
    seen = public.best_seller_product_behavior.seen OR EXCLUDED.seen,
    visible_seconds = GREATEST(
      public.best_seller_product_behavior.visible_seconds,
      EXCLUDED.visible_seconds
    ),
    slides_seen = ARRAY(
      SELECT DISTINCT value
      FROM unnest(
        COALESCE(public.best_seller_product_behavior.slides_seen, '{}'::integer[])
        || COALESCE(EXCLUDED.slides_seen, '{}'::integer[])
      ) AS value
      WHERE value >= 0 AND value < 64
      ORDER BY value
    ),
    slide_count = GREATEST(
      public.best_seller_product_behavior.slide_count,
      EXCLUDED.slide_count
    ),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_best_seller_product_behavior(UUID, UUID, TEXT, INTEGER, BOOLEAN, INTEGER[], INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_best_seller_product_behavior(UUID, UUID, TEXT, INTEGER, BOOLEAN, INTEGER[], INTEGER)
TO service_role;



UPDATE public.best_seller_lists
SET gift_image_size = 48
WHERE gift_image_size IS NULL OR gift_image_size < 36 OR gift_image_size > 80;

UPDATE public.best_seller_products
SET gift_image_size = 48
WHERE gift_image_size IS NULL OR gift_image_size < 36 OR gift_image_size > 80;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_gift_image_size_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_gift_image_size_check
      CHECK (gift_image_size BETWEEN 36 AND 80);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_products_gift_image_size_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_gift_image_size_check
      CHECK (gift_image_size BETWEEN 36 AND 80);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
