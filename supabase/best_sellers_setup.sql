-- ==============================================================================
-- ZHAYA MATCH - SETUP DE MAIS VENDIDOS DO DIA (100% COMPLETO E IDEMPOTENTE)
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase para habilitar o armazenamento
-- persistente das listas de Mais Vendidos e dos produtos cadastrados.
-- ==============================================================================

-- 1. Criação da tabela best_seller_lists
CREATE TABLE IF NOT EXISTS public.best_seller_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Mais Vendidos do Dia',
  slug TEXT,
  logo_url TEXT,
  subtitle TEXT,
  cta_text TEXT,
  show_date BOOLEAN NOT NULL DEFAULT true,
  show_ranking BOOLEAN NOT NULL DEFAULT true,
  rank_color TEXT NOT NULL DEFAULT '#FFFFFF',
  size_color TEXT NOT NULL DEFAULT '#FFFFFF',
  background_video_url TEXT,
  background_video_path TEXT,
  background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22 CHECK (background_video_opacity >= 0 AND background_video_opacity <= 0.9),
  background_video_blur NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (background_video_blur >= 0 AND background_video_blur <= 30),
  list_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT false,
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_end TIMESTAMPTZ,
  timer_looping BOOLEAN NOT NULL DEFAULT false,
  timer_duration_minutes INTEGER CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

-- 2. Criação da tabela best_seller_products
CREATE TABLE IF NOT EXISTS public.best_seller_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produto',
  image_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_url TEXT,
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  promotional_price NUMERIC(10, 2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  sold_quantity INTEGER CHECK (sold_quantity IS NULL OR sold_quantity >= 0),
  show_sold_quantity BOOLEAN NOT NULL DEFAULT true,
  available_quantity INTEGER CHECK (available_quantity IS NULL OR available_quantity >= 0),
  sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  out_of_stock_sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  colors TEXT[] NOT NULL DEFAULT '{}'::text[],
  installments_count INTEGER CHECK (installments_count IS NULL OR installments_count > 0),
  installment_value NUMERIC(10, 2) CHECK (installment_value IS NULL OR installment_value >= 0),
  badge_enabled BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_end TIMESTAMPTZ,
  timer_looping BOOLEAN NOT NULL DEFAULT false,
  timer_duration_minutes INTEGER CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)),
  timer_color TEXT NOT NULL DEFAULT '#FFFFFF',
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Garante colunas adicionais caso a tabela já tenha sido criada em versão prévia
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS show_date BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS show_ranking BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS rank_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS size_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_url TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_path TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_blur NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.best_seller_products ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS sold_quantity INTEGER;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS show_sold_quantity BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS available_quantity INTEGER;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS out_of_stock_sizes TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS colors TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS installments_count INTEGER;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS installment_value NUMERIC(10, 2);
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS badge_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS timer_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

-- 3.1 Constraints adicionais para instalações existentes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_installments_count_check') THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_installments_count_check
      CHECK (installments_count IS NULL OR installments_count > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_installment_value_check') THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_installment_value_check
      CHECK (installment_value IS NULL OR installment_value >= 0);
  END IF;
END $$;

-- 3.2 Timer opcional por produto
UPDATE public.best_seller_products
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_products_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_timer_duration_minutes_check
      CHECK (
        timer_duration_minutes IS NULL
        OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)
      );
  END IF;
END $$;

-- 3.3 Constraint do timer evergreen/looping para instalações existentes
UPDATE public.best_seller_lists
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_timer_duration_minutes_check
      CHECK (
        timer_duration_minutes IS NULL
        OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)
      );
  END IF;
END $$;

-- 3.3 Mídia mista e limpeza de uploads órfãos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_lists_background_video_opacity_check') THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_opacity_check
      CHECK (background_video_opacity >= 0 AND background_video_opacity <= 0.9);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_background_video_blur_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_blur_check
      CHECK (background_video_blur >= 0 AND background_video_blur <= 30);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.best_seller_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_cleanup
  ON public.best_seller_media_assets(media_type, last_used_at);


-- Slug público único para cada lista existente e futura
UPDATE public.best_seller_lists
SET slug = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower(COALESCE(title, 'lista')), '[^a-z0-9]+', '-', 'g')), ''),
  'lista'
) || '-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_lists_slug
  ON public.best_seller_lists(slug);

ALTER TABLE public.best_seller_lists
  ALTER COLUMN slug SET NOT NULL;

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_best_seller_lists_active ON public.best_seller_lists(active);
CREATE INDEX IF NOT EXISTS idx_best_seller_lists_date ON public.best_seller_lists(list_date DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_products_list_pos ON public.best_seller_products(list_id, position ASC);

-- 5. Habilitação de Segurança por Linha (RLS)
ALTER TABLE public.best_seller_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_seller_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_seller_media_assets ENABLE ROW LEVEL SECURITY;

-- 6. Permissões de isolamento estrito (Gerenciamento via Service Role do Backend)
REVOKE ALL ON public.best_seller_lists FROM anon, authenticated;
GRANT ALL ON public.best_seller_lists TO service_role;

REVOKE ALL ON public.best_seller_products FROM anon, authenticated;
GRANT ALL ON public.best_seller_products TO service_role;

REVOKE ALL ON public.best_seller_media_assets FROM anon, authenticated;
GRANT ALL ON public.best_seller_media_assets TO service_role;

-- 7. Função atômica para ativar uma lista desativando todas as outras
CREATE OR REPLACE FUNCTION public.set_active_best_seller_list(target_list_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Desativa todas as listas
  UPDATE public.best_seller_lists
  SET active = false
  WHERE active = true;

  -- Ativa a lista alvo
  UPDATE public.best_seller_lists
  SET active = true, updated_at = now()
  WHERE id = target_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.set_active_best_seller_list(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_best_seller_list(UUID) TO service_role;

-- 8. Função atômica para registrar cliques de produtos de forma segura
CREATE OR REPLACE FUNCTION public.increment_best_seller_product_clicks(product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_clicks INTEGER;
BEGIN
  UPDATE public.best_seller_products
  SET clicks = COALESCE(clicks, 0) + 1,
      updated_at = now()
  WHERE id = product_id
  RETURNING clicks INTO new_clicks;
  
  RETURN COALESCE(new_clicks, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_best_seller_product_clicks(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_best_seller_product_clicks(UUID) TO service_role;

-- 9. Configuração do Storage (imagens + vídeos, upload por URL assinada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zhaya-match-media',
  'zhaya-match-media',
  true,
  104857600, -- 100MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access zhaya-match-media'
  ) THEN
    CREATE POLICY "Public Access zhaya-match-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'zhaya-match-media');
  END IF;
END $$;

-- Mantém políticas existentes do bucket para não quebrar outros módulos que o reutilizam.

-- 10. Recarga do schema cache do PostgREST / Supabase API
NOTIFY pgrst, 'reload schema';


-- ===== BIBLIOTECA REUTILIZÁVEL DE MAIS VENDIDOS =====
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


-- =============================================================================
-- Analytics simples por lista
-- =============================================================================
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
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_created ON public.best_seller_analytics_events(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_event ON public.best_seller_analytics_events(list_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_product_event ON public.best_seller_analytics_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_visitor ON public.best_seller_analytics_events(list_id, visitor_id);
ALTER TABLE public.best_seller_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_analytics_events FROM anon, authenticated;
GRANT ALL ON public.best_seller_analytics_events TO service_role;
NOTIFY pgrst, 'reload schema';


-- ===== VITRINE PERSONALIZADA: PADRÕES, PRESENTES E COMPORTAMENTO =====
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
  ADD COLUMN IF NOT EXISTS gift_title TEXT;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS badge_use_list_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_mode TEXT NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS gift_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gift_image_path TEXT,
  ADD COLUMN IF NOT EXISTS gift_title TEXT;

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

NOTIFY pgrst, 'reload schema';
