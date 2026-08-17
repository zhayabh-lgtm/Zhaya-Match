-- ==============================================================================
-- MAIS VENDIDOS — BIBLIOTECA REUTILIZÁVEL + RETENÇÃO DE MÍDIA TEMPORÁRIA (7 DIAS)
-- Seguro/idempotente para instalações existentes.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.best_seller_product_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produto',
  image_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_url TEXT,
  original_price NUMERIC(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  promotional_price NUMERIC(10,2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  colors TEXT[] NOT NULL DEFAULT '{}'::text[],
  installments_count INTEGER CHECK (installments_count IS NULL OR installments_count > 0),
  installment_value NUMERIC(10,2) CHECK (installment_value IS NULL OR installment_value >= 0),
  badge_enabled BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Produto';
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS colors TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS installments_count INTEGER;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS installment_value NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS library_product_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_library_product_id_fkey'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_library_product_id_fkey
      FOREIGN KEY (library_product_id)
      REFERENCES public.best_seller_product_library(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_best_seller_products_library_product
  ON public.best_seller_products(library_product_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_library_updated
  ON public.best_seller_product_library(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_library_product_url
  ON public.best_seller_product_library(product_url);

ALTER TABLE public.best_seller_product_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_product_library FROM anon, authenticated;
GRANT ALL ON public.best_seller_product_library TO service_role;

-- Registry de mídia temporária. Imagens normais de produto não entram aqui e
-- permanecem disponíveis para reaproveitamento na biblioteca.
CREATE TABLE IF NOT EXISTS public.best_seller_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  purpose TEXT NOT NULL DEFAULT 'product_video',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.best_seller_media_assets ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'product_video';
CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_cleanup ON public.best_seller_media_assets(last_used_at);
CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_purpose_cleanup ON public.best_seller_media_assets(purpose, last_used_at);
ALTER TABLE public.best_seller_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_media_assets FROM anon, authenticated;
GRANT ALL ON public.best_seller_media_assets TO service_role;

-- A remoção física acontece no cron diário do projeto somente após ~7 dias sem
-- qualquer referência. Isso cobre product_video, background_video, logo e video_poster.
NOTIFY pgrst, 'reload schema';
