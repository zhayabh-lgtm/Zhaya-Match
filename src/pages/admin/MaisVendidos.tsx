import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Plus,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  Database,
  Pencil,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Tag,
  ShoppingBag,
  Package,
  Layers,
  ChevronLeft,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  MousePointerClick,
  Upload,
  Loader2,
  GripVertical,
  Video,
  ImagePlus,
  Link2,
  BarChart3,
  Users,
  Monitor,
  MapPin,
  Play,
  Gift,
  SlidersHorizontal,
} from 'lucide-react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { BestSellerList, BestSellerProduct, BestSellerMediaItem, BestSellerLibraryProduct, BestSellerAnalyticsSummary, BestSellerAnalyticsHourItem } from '../../types/zhaya';

const BEST_SELLERS_SQL = `-- ==============================================================================
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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_lists_background_video_blur_check') THEN
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


-- 12. Biblioteca reutilizável de produtos (vídeos não entram)
CREATE TABLE IF NOT EXISTS public.best_seller_product_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produto',
  image_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_url TEXT,
  original_price NUMERIC(10,2),
  promotional_price NUMERIC(10,2),
  sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  colors TEXT[] NOT NULL DEFAULT '{}'::text[],
  installments_count INTEGER,
  installment_value NUMERIC(10,2),
  badge_enabled BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS library_product_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_library_product_id_fkey') THEN
    ALTER TABLE public.best_seller_products ADD CONSTRAINT best_seller_products_library_product_id_fkey
      FOREIGN KEY (library_product_id) REFERENCES public.best_seller_product_library(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_best_seller_products_library_product ON public.best_seller_products(library_product_id);
ALTER TABLE public.best_seller_product_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_product_library FROM anon, authenticated;
GRANT ALL ON public.best_seller_product_library TO service_role;
ALTER TABLE public.best_seller_media_assets ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'product_video';

-- 12. Analytics simples por lista
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

-- 13. Visitantes únicos + tempo engajado + horários
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_unique ON public.best_seller_visitor_sessions(list_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_first_seen ON public.best_seller_visitor_sessions(list_id, first_seen_at);
ALTER TABLE public.best_seller_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_visitor_sessions FROM anon, authenticated;
GRANT ALL ON public.best_seller_visitor_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_best_seller_visitor_session(
  p_list_id UUID, p_visitor_id TEXT, p_engaged_seconds_total INTEGER DEFAULT 0,
  p_device_type TEXT DEFAULT 'unknown', p_country_code TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL, p_referrer TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.best_seller_visitor_sessions (
    list_id, visitor_id, device_type, country_code, region, city, referrer, first_seen_at, last_seen_at, engaged_seconds
  ) VALUES (
    p_list_id, p_visitor_id, COALESCE(NULLIF(p_device_type, ''), 'unknown'), NULLIF(p_country_code, ''),
    NULLIF(p_region, ''), NULLIF(p_city, ''), NULLIF(p_referrer, ''), now(), now(), GREATEST(COALESCE(p_engaged_seconds_total, 0), 0)
  )
  ON CONFLICT (list_id, visitor_id) DO UPDATE SET
    last_seen_at = now(),
    engaged_seconds = GREATEST(public.best_seller_visitor_sessions.engaged_seconds, EXCLUDED.engaged_seconds),
    device_type = CASE WHEN EXCLUDED.device_type <> 'unknown' THEN EXCLUDED.device_type ELSE public.best_seller_visitor_sessions.device_type END,
    country_code = COALESCE(public.best_seller_visitor_sessions.country_code, EXCLUDED.country_code),
    region = COALESCE(public.best_seller_visitor_sessions.region, EXCLUDED.region),
    city = COALESCE(public.best_seller_visitor_sessions.city, EXCLUDED.city),
    referrer = COALESCE(public.best_seller_visitor_sessions.referrer, EXCLUDED.referrer);
END; $$;
REVOKE ALL ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- VITRINE PERSONALIZADA — padrões, presentes e analytics comportamental
-- Idempotente: pode rodar mais de uma vez.


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

NOTIFY pgrst, 'reload schema';`;


function normalizeSizeValues(values: string[] | string): string[] {
  const source = Array.isArray(values) ? values : [values];
  const parsed = source
    .flatMap((value) => String(value || '').split(/[,;\n]+/g))
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(parsed));
}

const NUMERIC_SIZE_PRESET = Array.from({ length: 10 }, (_, index) => String(33 + index));
const LETTER_SIZE_PRESET = ['PP', 'P', 'M', 'G', 'GG'];

function parseAdminPrice(value: string): number | null {
  const clean = String(value || '').trim();
  if (!clean) return null;
  const normalized = clean.includes(',') && clean.includes('.')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function formatEngagementDuration(totalSeconds: number | null | undefined): string {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

const BestSellerHourlyChart: React.FC<{ items: BestSellerAnalyticsHourItem[] }> = ({ items }) => {
  const normalized = Array.from({ length: 24 }, (_, hour) => items.find((item) => item.hour === hour) || { hour, visitors: 0 });
  const max = Math.max(1, ...normalized.map((item) => item.visitors));
  return (
    <div className="rounded-lg border border-neutral-200 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Entradas por horário</div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Cada visitante aparece somente uma vez, no horário da primeira entrada.</div>
        </div>
      </div>
      <div className="h-28 flex items-end gap-[3px] sm:gap-1">
        {normalized.map((item) => {
          const height = item.visitors > 0 ? Math.max(7, Math.round((item.visitors / max) * 82)) : 2;
          return (
            <div key={item.hour} className="group relative flex-1 h-full flex items-end">
              {item.visitors > 0 && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-bold text-neutral-700 leading-none"
                  style={{ bottom: `calc(${height}% + 3px)` }}
                >
                  {item.visitors}
                </span>
              )}
              <div
                className={`w-full rounded-t-[2px] transition-colors ${item.visitors > 0 ? 'bg-neutral-800 group-hover:bg-black' : 'bg-neutral-200'}`}
                style={{ height: `${height}%` }}
              />
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-20 rounded bg-neutral-900 px-1.5 py-1 text-[9px] text-white whitespace-nowrap">
                {String(item.hour).padStart(2, '0')}:00 · {item.visitors} {item.visitors === 1 ? 'visitante' : 'visitantes'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-7 text-[9px] text-neutral-400 font-medium">
        <span>00h</span><span className="text-center">04h</span><span className="text-center">08h</span><span className="text-center">12h</span><span className="text-center">16h</span><span className="text-center">20h</span><span className="text-right">23h</span>
      </div>
    </div>
  );
};

function formatDatePtBR(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export const MaisVendidos: React.FC = () => {
  // State: Lists & Supabase Status
  const [lists, setLists] = useState<BestSellerList[]>([]);
  const [tableConfigured, setTableConfigured] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  // State: Selected List for Product Management
  const [selectedList, setSelectedList] = useState<BestSellerList | null>(null);
  const [products, setProducts] = useState<BestSellerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [listAnalytics, setListAnalytics] = useState<BestSellerAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  // Biblioteca reutilizável: guarda dados e imagens, nunca vídeos.
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [libraryProducts, setLibraryProducts] = useState<BestSellerLibraryProduct[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [addingLibraryProductId, setAddingLibraryProductId] = useState<string | null>(null);

  // State: List Modal (Create / Edit)
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<BestSellerList | null>(null);
  const [listFormTitle, setListFormTitle] = useState('Mais Vendidos do Dia');
  const [listFormSlug, setListFormSlug] = useState('');
  const [listFormLogoUrl, setListFormLogoUrl] = useState('');
  const [listFormSubtitle, setListFormSubtitle] = useState('');
  const [listFormCtaText, setListFormCtaText] = useState('');
  const [listFormShowDate, setListFormShowDate] = useState<boolean>(true);
  const [listFormShowRanking, setListFormShowRanking] = useState<boolean>(true);
  const [listFormRankColor, setListFormRankColor] = useState('#FFFFFF');
  const [listFormSizeColor, setListFormSizeColor] = useState('#FFFFFF');
  const [listFormBackgroundVideoUrl, setListFormBackgroundVideoUrl] = useState('');
  const [listFormBackgroundVideoPath, setListFormBackgroundVideoPath] = useState('');
  const [listFormBackgroundVideoOpacity, setListFormBackgroundVideoOpacity] = useState('0.22');
  const [listFormBackgroundVideoBlur, setListFormBackgroundVideoBlur] = useState('0');
  const [listFormDefaultBadgeEnabled, setListFormDefaultBadgeEnabled] = useState<boolean>(false);
  const [listFormDefaultBadgeText, setListFormDefaultBadgeText] = useState('50% OFF');
  const [listFormDefaultBadgeColor, setListFormDefaultBadgeColor] = useState('#FFFFFF');
  const [listFormApplyBadgeToAll, setListFormApplyBadgeToAll] = useState<boolean>(false);
  const [listFormGiftEnabled, setListFormGiftEnabled] = useState<boolean>(false);
  const [listFormGiftImageUrl, setListFormGiftImageUrl] = useState('');
  const [listFormGiftImagePath, setListFormGiftImagePath] = useState('');
  const [listFormGiftTitle, setListFormGiftTitle] = useState('');
  const [listFormGiftLabel, setListFormGiftLabel] = useState('Você ganha');
  const [listFormGiftTextColor, setListFormGiftTextColor] = useState('#FFFFFF');
  const [listFormGiftImageSize, setListFormGiftImageSize] = useState('48');
  const [uploadingListGift, setUploadingListGift] = useState(false);
  const listGiftFileInputRef = useRef<HTMLInputElement>(null);
  const [backgroundVideoInputMode, setBackgroundVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadingBackgroundVideo, setUploadingBackgroundVideo] = useState(false);
  const backgroundVideoFileInputRef = useRef<HTMLInputElement>(null);
  const [listFormDate, setListFormDate] = useState('');
  const [listFormActive, setListFormActive] = useState<boolean>(false);
  const [listFormTimerEnabled, setListFormTimerEnabled] = useState<boolean>(false);
  const [listFormTimerLooping, setListFormTimerLooping] = useState<boolean>(false);
  const [listFormTimerDurationHours, setListFormTimerDurationHours] = useState('2');
  const [listFormTimerDurationMinutes, setListFormTimerDurationMinutes] = useState('0');
  const [listFormTimerDate, setListFormTimerDate] = useState('');
  const [listFormTimerTime, setListFormTimerTime] = useState('23:59');
  const [listFormApplyTimerToAll, setListFormApplyTimerToAll] = useState<boolean>(false);
  const [savingList, setSavingList] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // Logo Upload State
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url' | 'library'>('upload');
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number>(0);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState<boolean>(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // State: Product Modal (Create / Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<BestSellerProduct | null>(null);
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormImageUrl, setProdFormImageUrl] = useState('');
  const [prodFormImageUrls, setProdFormImageUrls] = useState<string[]>([]);
  const [prodFormImageUrlInput, setProdFormImageUrlInput] = useState('');
  const [prodFormMediaItems, setProdFormMediaItems] = useState<BestSellerMediaItem[]>([]);
  const [prodFormMediaUrlInput, setProdFormMediaUrlInput] = useState('');
  const [prodFormMediaUrlType, setProdFormMediaUrlType] = useState<'image' | 'video'>('image');
  const [uploadingProductMedia, setUploadingProductMedia] = useState(false);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(null);
  const [prodFormProductUrl, setProdFormProductUrl] = useState('');
  const [prodFormOriginalPrice, setProdFormOriginalPrice] = useState('');
  const [prodFormPromotionalPrice, setProdFormPromotionalPrice] = useState('');
  const [prodFormInstallmentsCount, setProdFormInstallmentsCount] = useState('');
  const [prodFormInstallmentValue, setProdFormInstallmentValue] = useState('');
  const [prodFormSoldQty, setProdFormSoldQty] = useState('');
  const [prodFormShowSoldQty, setProdFormShowSoldQty] = useState<boolean>(true);
  const [prodFormAvailableQty, setProdFormAvailableQty] = useState('');
  const [prodFormSizes, setProdFormSizes] = useState<string[]>([]);
  const [prodFormOutOfStockSizes, setProdFormOutOfStockSizes] = useState<string[]>([]);
  const [prodFormSizeInput, setProdFormSizeInput] = useState('');
  const [prodFormColors, setProdFormColors] = useState<string[]>([]);
  const [prodFormColorInput, setProdFormColorInput] = useState('');
  const [prodFormBadgeEnabled, setProdFormBadgeEnabled] = useState<boolean>(false);
  const [prodFormBadgeText, setProdFormBadgeText] = useState('50% OFF');
  const [prodFormBadgeColor, setProdFormBadgeColor] = useState('#FFFFFF');
  const [prodFormBadgeUseListDefault, setProdFormBadgeUseListDefault] = useState<boolean>(false);
  const [prodFormGiftMode, setProdFormGiftMode] = useState<'inherit' | 'off' | 'custom'>('inherit');
  const [prodFormGiftImageUrl, setProdFormGiftImageUrl] = useState('');
  const [prodFormGiftImagePath, setProdFormGiftImagePath] = useState('');
  const [prodFormGiftTitle, setProdFormGiftTitle] = useState('');
  const [prodFormGiftLabel, setProdFormGiftLabel] = useState('Você ganha');
  const [prodFormGiftTextColor, setProdFormGiftTextColor] = useState('#FFFFFF');
  const [prodFormGiftImageSize, setProdFormGiftImageSize] = useState('48');
  const [uploadingProdGift, setUploadingProdGift] = useState(false);
  const prodGiftFileInputRef = useRef<HTMLInputElement>(null);
  const [prodFormTimerEnabled, setProdFormTimerEnabled] = useState<boolean>(false);
  const [prodFormTimerLooping, setProdFormTimerLooping] = useState<boolean>(false);
  const [prodFormTimerDurationHours, setProdFormTimerDurationHours] = useState('2');
  const [prodFormTimerDurationMinutes, setProdFormTimerDurationMinutes] = useState('0');
  const [prodFormTimerDate, setProdFormTimerDate] = useState('');
  const [prodFormTimerTime, setProdFormTimerTime] = useState('23:59');
  const [prodFormTimerColor, setProdFormTimerColor] = useState('#FFFFFF');
  const [draggedSizeIndex, setDraggedSizeIndex] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [uploadingProdImage, setUploadingProdImage] = useState<boolean>(false);
  const prodFileInputRef = useRef<HTMLInputElement>(null);
  const prodMediaFileInputRef = useRef<HTMLInputElement>(null);

  // State: Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'list' | 'product';
    id: string;
    name: string;
  } | null>(null);

  // State: Duplicate List Status
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Load Lists
  const loadLists = async (keepSelectedId?: string) => {
    try {
      setLoading(true);
      const info = await Repository.getBestSellerListsInfo();
      setLists(info.lists);
      setTableConfigured(info.tableConfigured);

      if (keepSelectedId) {
        const found = info.lists.find((l) => l.id === keepSelectedId);
        if (found) {
          setSelectedList(found);
          await loadProducts(found.id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar listas de mais vendidos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Products for a specific list
  const loadProducts = async (listId: string) => {
    try {
      setLoadingProducts(true);
      const prods = await Repository.getBestSellerProducts(listId);
      setProducts(prods);
    } catch (err: any) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  // Atualiza contagem de produtos/cliques da visão geral sem precisar recarregar o admin.
  useEffect(() => {
    let cancelled = false;
    const refreshOverviewMetrics = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const info = await Repository.getBestSellerListsInfo();
      if (cancelled) return;
      if (info.tableConfigured !== false) {
        setLists(info.lists);
        setTableConfigured(true);
      }
    };
    const interval = window.setInterval(refreshOverviewMetrics, 3000);
    const handleFocus = () => { void refreshOverviewMetrics(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Enquanto uma lista estiver aberta, atualiza produtos, cliques e analytics silenciosamente.
  useEffect(() => {
    const listId = selectedList?.id;
    if (!listId) {
      setListAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    let cancelled = false;
    let firstRun = true;
    const refreshSelectedMetrics = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (firstRun) setAnalyticsLoading(true);
      const [listResult, latestProducts, analytics] = await Promise.all([
        Repository.getBestSellerList(listId),
        Repository.getBestSellerProducts(listId),
        Repository.getBestSellerAnalytics(listId),
      ]);
      if (cancelled) return;
      if (listResult?.list) {
        setSelectedList(listResult.list);
        setLists((current) => current.map((item) => item.id === listId ? { ...item, ...listResult.list } : item));
      }
      setProducts(latestProducts);
      if (analytics) setListAnalytics(analytics);
      if (firstRun) {
        firstRun = false;
        setAnalyticsLoading(false);
      }
    };

    void refreshSelectedMetrics();
    const interval = window.setInterval(refreshSelectedMetrics, 3000);
    const handleFocus = () => { void refreshSelectedMetrics(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedList?.id]);

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(BEST_SELLERS_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Open Create List Modal
  const handleOpenCreateList = () => {
    setEditingList(null);
    setListFormTitle('Mais Vendidos do Dia');
    setListFormSlug('');
    setListFormLogoUrl('');
    setListFormSubtitle('');
    setListFormCtaText('');
    setListFormShowDate(true);
    setListFormShowRanking(true);
    setListFormRankColor('#FFFFFF');
    setListFormSizeColor('#FFFFFF');
    setListFormBackgroundVideoUrl('');
    setListFormBackgroundVideoPath('');
    setListFormBackgroundVideoOpacity('0.22');
    setListFormBackgroundVideoBlur('0');
    setListFormDefaultBadgeEnabled(false);
    setListFormDefaultBadgeText('50% OFF');
    setListFormDefaultBadgeColor('#FFFFFF');
    setListFormApplyBadgeToAll(false);
    setListFormGiftEnabled(false);
    setListFormGiftImageUrl('');
    setListFormGiftImagePath('');
    setListFormGiftTitle('');
    setListFormGiftLabel('Você ganha');
    setListFormGiftTextColor('#FFFFFF');
    setListFormGiftImageSize('48');
    setBackgroundVideoInputMode('upload');
    const today = new Date().toISOString().slice(0, 10);
    setListFormDate(today);
    setListFormActive(lists.length === 0); // Ativa por padrão se for a primeira
    setListFormTimerEnabled(false);
    setListFormTimerLooping(false);
    setListFormTimerDurationHours('2');
    setListFormTimerDurationMinutes('0');
    setListFormTimerDate(today);
    setListFormTimerTime('23:59');
    setListFormApplyTimerToAll(false);
    setListError(null);
    setLogoUploadError(null);
    setLogoInputMode('upload');
    setIsListModalOpen(true);
  };

  // Open Edit List Modal
  const handleOpenEditList = (list: BestSellerList, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingList(list);
    setListFormTitle(list.title);
    setListFormSlug(list.slug || '');
    setListFormLogoUrl(list.logoUrl || '');
    setListFormSubtitle(list.subtitle || '');
    setListFormCtaText(list.ctaText || '');
    setListFormShowDate(list.showDate !== false);
    setListFormShowRanking(list.showRanking !== false);
    setListFormRankColor(list.rankColor || '#FFFFFF');
    setListFormSizeColor(list.sizeColor || '#FFFFFF');
    setListFormBackgroundVideoUrl(list.backgroundVideoUrl || '');
    setListFormBackgroundVideoPath(list.backgroundVideoPath || '');
    setListFormBackgroundVideoOpacity(String(list.backgroundVideoOpacity ?? 0.22));
    setListFormBackgroundVideoBlur(String(list.backgroundVideoBlur ?? 0));
    setListFormDefaultBadgeEnabled(Boolean(list.defaultBadgeEnabled));
    setListFormDefaultBadgeText(list.defaultBadgeText || '50% OFF');
    setListFormDefaultBadgeColor(list.defaultBadgeColor || '#FFFFFF');
    setListFormApplyBadgeToAll(false);
    setListFormGiftEnabled(Boolean(list.giftEnabled));
    setListFormGiftImageUrl(list.giftImageUrl || '');
    setListFormGiftImagePath(list.giftImagePath || '');
    setListFormGiftTitle(list.giftTitle || '');
    setListFormGiftLabel(list.giftLabel ?? '');
    setListFormGiftTextColor(list.giftTextColor || '#FFFFFF');
    setListFormGiftImageSize(String(list.giftImageSize || 48));
    setBackgroundVideoInputMode(list.backgroundVideoPath ? 'upload' : (list.backgroundVideoUrl ? 'url' : 'upload'));
    setListFormDate(list.listDate);
    setListFormActive(list.active);
    setListFormTimerEnabled(list.timerEnabled);
    setListFormTimerLooping(Boolean(list.timerLooping));
    const storedDuration = Number(list.timerDurationMinutes || 120);
    setListFormTimerDurationHours(String(Math.floor(storedDuration / 60)));
    setListFormTimerDurationMinutes(String(storedDuration % 60));
    setListFormApplyTimerToAll(false);
    setLogoUploadError(null);
    setLogoInputMode(list.logoUrl ? 'url' : 'upload');
    if (list.timerEnd) {
      try {
        const d = new Date(list.timerEnd);
        const dateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(d);
        const timeStr = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
        setListFormTimerDate(dateStr);
        setListFormTimerTime(timeStr);
      } catch {
        setListFormTimerDate(list.listDate);
        setListFormTimerTime('23:59');
      }
    } else {
      setListFormTimerDate(list.listDate);
      setListFormTimerTime('23:59');
    }
    setListError(null);
    setIsListModalOpen(true);
  };

  const uploadBestSellerFile = async (
    file: File,
    mediaType: 'image' | 'video',
    purpose: 'product' | 'background' | 'logo' | 'poster' | 'gift',
  ): Promise<{ url: string; storagePath: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não está configurado para upload persistente.');
    }

    const prepared = await Repository.prepareBestSellerMediaUpload({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      mediaType,
      purpose,
    });

    if (!prepared.success || !prepared.path || !prepared.token || !prepared.publicUrl) {
      throw new Error(prepared.error || 'Não foi possível preparar o upload.');
    }

    const { error } = await supabase.storage
      .from('zhaya-match-media')
      .uploadToSignedUrl(prepared.path, prepared.token, file, {
        cacheControl: '3600',
        contentType: file.type,
      });

    if (error) throw new Error(`Falha no upload: ${error.message}`);
    return { url: prepared.publicUrl, storagePath: prepared.path };
  };

  // Uploads usam URL assinada: o arquivo vai direto ao Supabase Storage sem passar pelo corpo da Function.
  const handleLogoFileUpload = async (file: File) => {
    if (!file) return;
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(svg|png|jpe?g|webp)$/i)) {
      setLogoUploadError('Formato inválido. Selecione SVG, PNG, JPG ou WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('O logotipo excede o limite máximo de 5MB.');
      return;
    }
    try {
      setUploadingLogo(true);
      setLogoUploadProgress(25);
      setLogoUploadError(null);
      const uploaded = await uploadBestSellerFile(file, 'image', 'logo');
      setLogoUploadProgress(90);
      setListFormLogoUrl(uploaded.url);
      setLogoUploadProgress(100);
    } catch (err: any) {
      console.error('Erro no upload do logotipo:', err);
      setLogoUploadError(err?.message || 'Erro ao carregar arquivo de logotipo.');
    } finally {
      setUploadingLogo(false);
      setTimeout(() => setLogoUploadProgress(0), 400);
    }
  };

  const makeMediaId = () => `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Gera uma capa JPEG real a partir de um frame do vídeo antes do upload.
  // Isso evita o quadro preto em Safari/iPhone, onde preload/seek nem sempre
  // produz um frame visual confiável antes de o usuário tocar em play.
  const generateVideoPosterFile = async (file: File): Promise<File | null> => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return null;

    const objectUrl = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo excedido ao preparar a capa.')), 12000);
        const cleanup = () => window.clearTimeout(timeout);
        video.onloadedmetadata = () => { cleanup(); resolve(); };
        video.onerror = () => { cleanup(); reject(new Error('Não foi possível decodificar o vídeo para gerar a capa.')); };
        video.load();
      });

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = duration > 0.25
        ? Math.min(Math.max(duration * 0.08, 0.12), Math.min(1.25, duration - 0.05))
        : Math.max(0, duration * 0.5);

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo excedido ao capturar a capa.')), 12000);
        const cleanup = () => window.clearTimeout(timeout);
        video.onseeked = () => { cleanup(); resolve(); };
        video.onerror = () => { cleanup(); reject(new Error('Falha ao acessar um frame do vídeo.')); };
        try {
          video.currentTime = targetTime;
        } catch (error) {
          cleanup(); reject(error);
        }
      });

      if (!video.videoWidth || !video.videoHeight) return null;
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
      if (!blob) return null;
      const stem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70) || 'video';
      return new File([blob], `${stem}-poster.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (error) {
      console.warn('Não foi possível gerar capa automática do vídeo:', error);
      return null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const generateVideoPosterFromRemoteUrl = async (url: string, fileName = 'video'): Promise<File | null> => {
    if (typeof document === 'undefined') return null;
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo excedido ao carregar o vídeo existente.')), 15000);
        const cleanup = () => window.clearTimeout(timeout);
        video.onloadedmetadata = () => { cleanup(); resolve(); };
        video.onerror = () => { cleanup(); reject(new Error('Não foi possível abrir o vídeo existente para gerar a capa.')); };
        video.load();
      });

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = duration > 0.25
        ? Math.min(Math.max(duration * 0.08, 0.12), Math.min(1.25, duration - 0.05))
        : Math.max(0, duration * 0.5);

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Tempo excedido ao capturar a capa existente.')), 15000);
        const cleanup = () => window.clearTimeout(timeout);
        video.onseeked = () => { cleanup(); resolve(); };
        video.onerror = () => { cleanup(); reject(new Error('Falha ao acessar o frame do vídeo existente.')); };
        try {
          video.currentTime = targetTime;
        } catch (error) {
          cleanup(); reject(error);
        }
      });

      if (!video.videoWidth || !video.videoHeight) return null;
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
      if (!blob) return null;
      const stem = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70) || 'video';
      return new File([blob], `${stem}-poster.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (error) {
      console.warn('Não foi possível gerar capa para vídeo já cadastrado:', error);
      return null;
    }
  };

  const backfillExistingVideoPosters = async (productId: string, items: BestSellerMediaItem[]) => {
    const missing = items.filter((item) => item.type === 'video' && !item.posterUrl && Boolean(item.storagePath));
    if (missing.length === 0 || !isSupabaseConfigured || !supabase) return;

    let next = [...items];
    let changed = false;
    for (const item of missing) {
      try {
        const posterFile = await generateVideoPosterFromRemoteUrl(item.url, item.id || 'video');
        if (!posterFile) continue;
        const uploaded = await uploadBestSellerFile(posterFile, 'image', 'poster');
        next = next.map((entry) => entry.id === item.id ? {
          ...entry,
          posterUrl: uploaded.url,
          posterStoragePath: uploaded.storagePath,
        } : entry);
        changed = true;
      } catch (error) {
        console.warn('Falha ao completar capa automática de vídeo antigo:', error);
      }
    }

    if (!changed) return;
    setProdFormMediaItems(next);
    const saved = await Repository.updateBestSellerProduct(productId, { mediaItems: next });
    if (!saved.success) {
      console.warn('A capa foi gerada, mas não foi possível persistir no produto:', saved.error);
    }
  };

  const handleProductMediaFileUpload = async (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      setProductError('Selecione uma imagem ou vídeo compatível.');
      return;
    }
    if (isImage && file.size > 10 * 1024 * 1024) {
      setProductError('A imagem deve ter no máximo 10MB.');
      return;
    }
    if (isVideo && file.size > 100 * 1024 * 1024) {
      setProductError('O vídeo deve ter no máximo 100MB.');
      return;
    }
    try {
      setUploadingProductMedia(true);
      setUploadingProdImage(isImage);
      setProductError(null);
      const type: 'image' | 'video' = isVideo ? 'video' : 'image';
      const posterFile = isVideo ? await generateVideoPosterFile(file) : null;
      const uploaded = await uploadBestSellerFile(file, type, 'product');
      let posterUpload: { url: string; storagePath: string } | null = null;
      if (posterFile) {
        try {
          posterUpload = await uploadBestSellerFile(posterFile, 'image', 'poster');
        } catch (posterError) {
          console.warn('Vídeo enviado, mas a capa automática não pôde ser salva:', posterError);
        }
      }
      setProdFormMediaItems((prev) => [
        ...prev,
        {
          id: makeMediaId(),
          type,
          url: uploaded.url,
          storagePath: uploaded.storagePath,
          posterUrl: posterUpload?.url || null,
          posterStoragePath: posterUpload?.storagePath || null,
          source: 'upload',
        },
      ]);
      if (isVideo && !posterUpload) {
        setProductError('Vídeo enviado. A capa automática não pôde ser gerada neste navegador/formato. O vídeo continuará sem capa até que um frame próprio possa ser capturado.');
      }
    } catch (err: any) {
      console.error('Erro no upload de mídia do produto:', err);
      setProductError(err?.message || 'Erro ao enviar mídia para o Supabase Storage.');
    } finally {
      setUploadingProductMedia(false);
      setUploadingProdImage(false);
    }
  };

  // Mantém compatibilidade com o botão antigo de imagem, mas adiciona na galeria unificada.
  const handleProdImageFileUpload = async (file: File, _isMain: boolean = false) => {
    await handleProductMediaFileUpload(file);
  };

  const handleBackgroundVideoUpload = async (file: File) => {
    if (!file) return;
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      setListError('Vídeo de fundo inválido. Use MP4, WebM, MOV ou OGV.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setListError('O vídeo de fundo deve ter no máximo 100MB.');
      return;
    }
    try {
      setUploadingBackgroundVideo(true);
      setListError(null);
      const uploaded = await uploadBestSellerFile(file, 'video', 'background');
      setListFormBackgroundVideoUrl(uploaded.url);
      setListFormBackgroundVideoPath(uploaded.storagePath);
      setBackgroundVideoInputMode('upload');
    } catch (err: any) {
      setListError(err?.message || 'Erro ao enviar vídeo de fundo.');
    } finally {
      setUploadingBackgroundVideo(false);
    }
  };


  const validateGiftFile = (file: File): string | null => {
    const valid = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type) || /\.(png|jpe?g)$/i.test(file.name);
    if (!valid) return 'Use apenas PNG ou JPEG para a imagem do presente.';
    if (file.size > 5 * 1024 * 1024) return 'A imagem do presente deve ter no máximo 5MB.';
    return null;
  };

  const handleListGiftUpload = async (file: File) => {
    const invalid = validateGiftFile(file);
    if (invalid) { setListError(invalid); return; }
    try {
      setUploadingListGift(true);
      setListError(null);
      const uploaded = await uploadBestSellerFile(file, 'image', 'gift');
      setListFormGiftImageUrl(uploaded.url);
      setListFormGiftImagePath(uploaded.storagePath);
      setListFormGiftEnabled(true);
    } catch (err: any) {
      setListError(err?.message || 'Erro ao enviar imagem do presente.');
    } finally {
      setUploadingListGift(false);
    }
  };

  const handleProductGiftUpload = async (file: File) => {
    const invalid = validateGiftFile(file);
    if (invalid) { setProductError(invalid); return; }
    try {
      setUploadingProdGift(true);
      setProductError(null);
      const uploaded = await uploadBestSellerFile(file, 'image', 'gift');
      setProdFormGiftImageUrl(uploaded.url);
      setProdFormGiftImagePath(uploaded.storagePath);
      setProdFormGiftMode('custom');
    } catch (err: any) {
      setProductError(err?.message || 'Erro ao enviar imagem do presente.');
    } finally {
      setUploadingProdGift(false);
    }
  };

  // Save List (Create or Update)
  const handleSaveList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listFormTitle.trim()) {
      setListError('O título da lista é obrigatório.');
      return;
    }
    if (!listFormDate) {
      setListError('A data da lista é obrigatória.');
      return;
    }

    let timerEndIso: string | null = null;
    let timerDurationMinutesValue: number | null = null;

    if (listFormTimerEnabled) {
      if (listFormTimerLooping) {
        const hours = Number(listFormTimerDurationHours || 0);
        const minutes = Number(listFormTimerDurationMinutes || 0);
        const totalMinutes = Math.round(hours * 60 + minutes);

        if (!Number.isFinite(totalMinutes) || totalMinutes < 1 || totalMinutes > 10080) {
          setListError('Informe uma duração válida entre 1 minuto e 7 dias para o timer em looping.');
          return;
        }

        timerDurationMinutesValue = totalMinutes;
      } else {
        if (!listFormTimerDate) {
          setListError('Informe a data de encerramento do timer.');
          return;
        }
        try {
          const [yyyy, mm, dd] = listFormTimerDate.split('-').map((s) => s.padStart(2, '0'));
          const [hh, min] = (listFormTimerTime || '23:59').split(':').map((s) => s.padStart(2, '0'));
          // Converte com offset estrito de Brasília (America/Sao_Paulo UTC-3)
          const isoWithOffset = `${yyyy}-${mm}-${dd}T${hh}:${min}:00-03:00`;
          const timerDateObj = new Date(isoWithOffset);
          if (isNaN(timerDateObj.getTime())) {
            throw new Error('Invalid Date');
          }
          timerEndIso = timerDateObj.toISOString();
        } catch {
          setListError('Data/hora do timer inválida.');
          return;
        }
      }
    }

    try {
      setSavingList(true);
      setListError(null);

      if (editingList) {
        // Update
        const res = await Repository.updateBestSellerList(editingList.id, {
          title: listFormTitle.trim(),
          slug: listFormSlug.trim() || undefined,
          logoUrl: listFormLogoUrl.trim() || null,
          subtitle: listFormSubtitle.trim() || null,
          ctaText: listFormCtaText.trim() || null,
          showDate: listFormShowDate,
          showRanking: listFormShowRanking,
          rankColor: listFormRankColor || '#FFFFFF',
          sizeColor: listFormSizeColor || '#FFFFFF',
          backgroundVideoUrl: listFormBackgroundVideoUrl.trim() || null,
          backgroundVideoPath: listFormBackgroundVideoPath.trim() || null,
          backgroundVideoOpacity: Math.min(0.9, Math.max(0, Number(listFormBackgroundVideoOpacity || 0.22))),
          backgroundVideoBlur: Math.min(30, Math.max(0, Number(listFormBackgroundVideoBlur || 0))),
          defaultBadgeEnabled: listFormDefaultBadgeEnabled,
          defaultBadgeText: listFormDefaultBadgeEnabled ? listFormDefaultBadgeText.trim() || null : null,
          defaultBadgeColor: listFormDefaultBadgeColor || '#FFFFFF',
          applyDefaultBadgeToAll: listFormDefaultBadgeEnabled && listFormApplyBadgeToAll,
          giftEnabled: listFormGiftEnabled && Boolean(listFormGiftImageUrl),
          giftImageUrl: listFormGiftImageUrl.trim() || null,
          giftImagePath: listFormGiftImagePath.trim() || null,
          giftTitle: listFormGiftEnabled ? listFormGiftTitle.trim() || null : null,
          giftLabel: listFormGiftLabel.trim() || null,
          giftTextColor: listFormGiftTextColor || '#FFFFFF',
          giftImageSize: Math.max(36, Math.min(80, Number(listFormGiftImageSize) || 48)),
          listDate: listFormDate,
          active: listFormActive,
          timerEnabled: listFormTimerEnabled,
          timerEnd: timerEndIso,
          timerLooping: listFormTimerEnabled && listFormTimerLooping,
          timerDurationMinutes: listFormTimerEnabled && listFormTimerLooping ? timerDurationMinutesValue : null,
          applyTimerToAll: editingList ? listFormApplyTimerToAll : false,
        });

        if (!res.success) {
          setListError(res.error || 'Erro ao atualizar lista.');
          return;
        }

        setIsListModalOpen(false);
        await loadLists(selectedList?.id === editingList.id ? editingList.id : undefined);
      } else {
        // Create
        const res = await Repository.createBestSellerList({
          title: listFormTitle.trim(),
          slug: listFormSlug.trim() || undefined,
          logoUrl: listFormLogoUrl.trim() || null,
          subtitle: listFormSubtitle.trim() || null,
          ctaText: listFormCtaText.trim() || null,
          showDate: listFormShowDate,
          showRanking: listFormShowRanking,
          rankColor: listFormRankColor || '#FFFFFF',
          sizeColor: listFormSizeColor || '#FFFFFF',
          backgroundVideoUrl: listFormBackgroundVideoUrl.trim() || null,
          backgroundVideoPath: listFormBackgroundVideoPath.trim() || null,
          backgroundVideoOpacity: Math.min(0.9, Math.max(0, Number(listFormBackgroundVideoOpacity || 0.22))),
          backgroundVideoBlur: Math.min(30, Math.max(0, Number(listFormBackgroundVideoBlur || 0))),
          defaultBadgeEnabled: listFormDefaultBadgeEnabled,
          defaultBadgeText: listFormDefaultBadgeEnabled ? listFormDefaultBadgeText.trim() || null : null,
          defaultBadgeColor: listFormDefaultBadgeColor || '#FFFFFF',
          giftEnabled: listFormGiftEnabled && Boolean(listFormGiftImageUrl),
          giftImageUrl: listFormGiftImageUrl.trim() || null,
          giftImagePath: listFormGiftImagePath.trim() || null,
          giftTitle: listFormGiftEnabled ? listFormGiftTitle.trim() || null : null,
          giftLabel: listFormGiftLabel.trim() || null,
          giftTextColor: listFormGiftTextColor || '#FFFFFF',
          giftImageSize: Math.max(36, Math.min(80, Number(listFormGiftImageSize) || 48)),
          listDate: listFormDate,
          active: listFormActive,
          timerEnabled: listFormTimerEnabled,
          timerEnd: timerEndIso,
          timerLooping: listFormTimerEnabled && listFormTimerLooping,
          timerDurationMinutes: listFormTimerEnabled && listFormTimerLooping ? timerDurationMinutesValue : null,
          timezone: 'America/Sao_Paulo',
        });

        if (!res.success) {
          setListError(res.error || 'Erro ao criar lista.');
          if (res.tableConfigured === false) {
            setTableConfigured(false);
          }
          return;
        }

        setIsListModalOpen(false);
        await loadLists(res.list?.id);
      }
    } catch (err: any) {
      setListError(err?.message || 'Erro inesperado ao salvar lista.');
    } finally {
      setSavingList(false);
    }
  };

  // Toggle List Active Status directly
  const handleToggleListActive = async (list: BestSellerList, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newActive = !list.active;
      const res = await Repository.updateBestSellerList(list.id, { active: newActive });
      if (res.success) {
        await loadLists(selectedList?.id);
      }
    } catch (err) {
      console.error('Erro ao alternar status da lista:', err);
    }
  };

  // Duplicate List with products (Item 30)
  const handleDuplicateList = async (list: BestSellerList, e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicatingId) return;

    try {
      setDuplicatingId(list.id);
      const today = new Date().toISOString().slice(0, 10);
      const res = await Repository.duplicateBestSellerList(list.id, today, `${list.title} (Cópia)`);
      if (res.success && res.list) {
        await loadLists();
      } else {
        alert(res.error || 'Erro ao duplicar lista.');
      }
    } catch (err: any) {
      console.error('Erro ao duplicar lista:', err);
    } finally {
      setDuplicatingId(null);
    }
  };

  // Open List to manage products
  const handleSelectList = async (list: BestSellerList) => {
    setSelectedList(list);
    await loadProducts(list.id);
  };

  const handleOpenProductLibrary = async () => {
    if (!selectedList) return;
    setIsLibraryModalOpen(true);
    setLibrarySearch('');
    setLibraryError(null);
    setLoadingLibrary(true);
    try {
      // Importa automaticamente produtos antigos que ainda não estavam ligados à biblioteca.
      await Repository.syncBestSellerProductLibrary();
      const result = await Repository.getBestSellerProductLibrary();
      if (!result.configured) {
        setLibraryError(result.error || 'Execute o SQL da Biblioteca de Produtos no Supabase.');
        setLibraryProducts([]);
      } else {
        setLibraryProducts(result.products);
      }
    } catch (error: any) {
      setLibraryError(error?.message || 'Não foi possível carregar a biblioteca.');
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleAddLibraryProduct = async (libraryProduct: BestSellerLibraryProduct) => {
    if (!selectedList || addingLibraryProductId) return;
    setAddingLibraryProductId(libraryProduct.id);
    setLibraryError(null);
    try {
      const result = await Repository.addBestSellerProductFromLibrary(selectedList.id, libraryProduct.id);
      if (!result.success) {
        setLibraryError(result.error || 'Não foi possível adicionar o produto salvo.');
        return;
      }
      await loadProducts(selectedList.id);
    } finally {
      setAddingLibraryProductId(null);
    }
  };

  // Open Product Modal (Create)
  const handleOpenCreateProduct = () => {
    if (!selectedList) return;
    setEditingProduct(null);
    setProdFormName('');
    setProdFormImageUrl('');
    setProdFormImageUrls([]);
    setProdFormImageUrlInput('');
    setProdFormMediaItems([]);
    setProdFormMediaUrlInput('');
    setProdFormMediaUrlType('image');
    setProdFormProductUrl('');
    setProdFormOriginalPrice('');
    setProdFormPromotionalPrice('');
    setProdFormInstallmentsCount('');
    setProdFormInstallmentValue('');
    setProdFormSoldQty('');
    setProdFormShowSoldQty(true);
    setProdFormAvailableQty('');
    setProdFormSizes([]);
    setProdFormOutOfStockSizes([]);
    setProdFormSizeInput('');
    setProdFormColors([]);
    setProdFormColorInput('');
    setProdFormBadgeEnabled(false);
    setProdFormBadgeText('50% OFF');
    setProdFormBadgeColor('#FFFFFF');
    setProdFormBadgeUseListDefault(Boolean(selectedList.defaultBadgeEnabled));
    setProdFormGiftMode(selectedList.giftEnabled ? 'inherit' : 'off');
    setProdFormGiftImageUrl('');
    setProdFormGiftImagePath('');
    setProdFormGiftTitle('');
    setProdFormGiftLabel('Você ganha');
    setProdFormGiftTextColor('#FFFFFF');
    setProdFormGiftImageSize('48');
    setProdFormTimerEnabled(false);
    setProdFormTimerLooping(false);
    setProdFormTimerDurationHours('2');
    setProdFormTimerDurationMinutes('0');
    setProdFormTimerDate(selectedList.listDate || new Date().toISOString().slice(0, 10));
    setProdFormTimerTime('23:59');
    setProdFormTimerColor('#FFFFFF');
    setProductError(null);
    setIsProductModalOpen(true);
  };

  // Open Product Modal (Edit)
  const handleOpenEditProduct = (prod: BestSellerProduct) => {
    setEditingProduct(prod);
    setProdFormName(prod.name);
    setProdFormImageUrl(prod.imageUrl || '');
    const existingImgs = Array.isArray(prod.imageUrls) && prod.imageUrls.length > 0 ? prod.imageUrls : (prod.imageUrl ? [prod.imageUrl] : []);
    setProdFormImageUrls(existingImgs);
    setProdFormImageUrlInput('');
    const existingMedia = Array.isArray(prod.mediaItems) && prod.mediaItems.length > 0
      ? prod.mediaItems
      : existingImgs.map((url, index) => ({ id: `legacy-image-${index + 1}`, type: 'image' as const, url, source: 'url' as const }));
    setProdFormMediaItems(existingMedia);
    void backfillExistingVideoPosters(prod.id, existingMedia);
    setProdFormMediaUrlInput('');
    setProdFormMediaUrlType('image');
    setProdFormProductUrl(prod.productUrl || '');
    setProdFormOriginalPrice(prod.originalPrice !== null && prod.originalPrice !== undefined ? String(prod.originalPrice) : '');
    setProdFormPromotionalPrice(prod.promotionalPrice !== null && prod.promotionalPrice !== undefined ? String(prod.promotionalPrice) : '');
    setProdFormInstallmentsCount(prod.installmentsCount !== null && prod.installmentsCount !== undefined ? String(prod.installmentsCount) : '');
    setProdFormInstallmentValue(prod.installmentValue !== null && prod.installmentValue !== undefined ? String(prod.installmentValue) : '');
    setProdFormSoldQty(prod.soldQuantity !== null && prod.soldQuantity !== undefined ? String(prod.soldQuantity) : '');
    setProdFormShowSoldQty(prod.showSoldQuantity);
    setProdFormAvailableQty(prod.availableQuantity !== null && prod.availableQuantity !== undefined ? String(prod.availableQuantity) : '');
    setProdFormSizes(normalizeSizeValues(prod.sizes || []));
    setProdFormOutOfStockSizes(normalizeSizeValues(prod.outOfStockSizes || []));
    setProdFormSizeInput('');
    setProdFormColors([...(prod.colors || [])]);
    setProdFormColorInput('');
    setProdFormBadgeEnabled(prod.badgeEnabled);
    setProdFormBadgeText(prod.badgeText || '50% OFF');
    setProdFormBadgeColor(prod.badgeColor || '#FFFFFF');
    setProdFormBadgeUseListDefault(Boolean(prod.badgeUseListDefault));
    setProdFormGiftMode(prod.giftMode || 'inherit');
    setProdFormGiftImageUrl(prod.giftImageUrl || '');
    setProdFormGiftImagePath(prod.giftImagePath || '');
    setProdFormGiftTitle(prod.giftTitle || '');
    setProdFormGiftLabel(prod.giftLabel ?? '');
    setProdFormGiftTextColor(prod.giftTextColor || '#FFFFFF');
    setProdFormGiftImageSize(String(prod.giftImageSize || 48));
    setProdFormTimerEnabled(Boolean(prod.timerEnabled));
    setProdFormTimerLooping(Boolean(prod.timerLooping));
    const productTimerDuration = Number(prod.timerDurationMinutes || 120);
    setProdFormTimerDurationHours(String(Math.floor(productTimerDuration / 60)));
    setProdFormTimerDurationMinutes(String(productTimerDuration % 60));
    setProdFormTimerColor(prod.timerColor || '#FFFFFF');
    if (prod.timerEnd) {
      try {
        const d = new Date(prod.timerEnd);
        const datePart = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
        const timePart = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(d);
        setProdFormTimerDate(datePart);
        setProdFormTimerTime(timePart);
      } catch {
        setProdFormTimerDate(selectedList?.listDate || new Date().toISOString().slice(0, 10));
        setProdFormTimerTime('23:59');
      }
    } else {
      setProdFormTimerDate(selectedList?.listDate || new Date().toISOString().slice(0, 10));
      setProdFormTimerTime('23:59');
    }
    setProductError(null);
    setIsProductModalOpen(true);
  };

  const handleAddMediaUrl = async () => {
    const trimmed = prodFormMediaUrlInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
    } catch {
      setProductError('Informe uma URL válida iniciando com http:// ou https://.');
      return;
    }
    if (prodFormMediaItems.some((item) => item.url === trimmed && item.type === prodFormMediaUrlType)) {
      setProdFormMediaUrlInput('');
      return;
    }

    const mediaId = makeMediaId();
    let posterUrl: string | null = null;
    let posterStoragePath: string | null = null;
    if (prodFormMediaUrlType === 'video' && isSupabaseConfigured && supabase) {
      try {
        setUploadingProductMedia(true);
        const posterFile = await generateVideoPosterFromRemoteUrl(trimmed, mediaId);
        if (posterFile) {
          const uploadedPoster = await uploadBestSellerFile(posterFile, 'image', 'poster');
          posterUrl = uploadedPoster.url;
          posterStoragePath = uploadedPoster.storagePath;
        }
      } catch (error) {
        console.warn('URL do vídeo adicionada sem capa automática:', error);
      } finally {
        setUploadingProductMedia(false);
      }
    }

    setProdFormMediaItems((prev) => [
      ...prev,
      { id: mediaId, type: prodFormMediaUrlType, url: trimmed, storagePath: null, posterUrl, posterStoragePath, source: 'url' },
    ]);
    setProdFormMediaUrlInput('');
    setProductError(null);
  };

  const handleRemoveMediaItem = (id: string) => {
    setProdFormMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDropMedia = (targetIndex: number) => {
    if (draggedMediaIndex === null || draggedMediaIndex === targetIndex) {
      setDraggedMediaIndex(null);
      return;
    }
    setProdFormMediaItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedMediaIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedMediaIndex(null);
  };

  const handleMoveMedia = (index: number, direction: -1 | 1) => {
    setProdFormMediaItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Compatibilidade com handlers antigos enquanto o formulário usa a galeria unificada.
  const handleAddImageUrl = () => {
    const trimmed = prodFormImageUrlInput.trim();
    if (!trimmed) return;
    setProdFormMediaUrlType('image');
    if (!prodFormMediaItems.some((item) => item.url === trimmed && item.type === 'image')) {
      setProdFormMediaItems((prev) => [...prev, { id: makeMediaId(), type: 'image', url: trimmed, storagePath: null, source: 'url' }]);
    }
    setProdFormImageUrlInput('');
  };

  const handleRemoveImageUrl = (urlToRemove: string) => {
    setProdFormMediaItems((prev) => prev.filter((item) => item.url !== urlToRemove));
    setProdFormImageUrls((prev) => prev.filter((url) => url !== urlToRemove));
    if (prodFormImageUrl === urlToRemove) setProdFormImageUrl('');
  };

  // Adiciona um tamanho por vez. Presets são usados para grupos prontos.
  const handleAddSize = () => {
    const size = prodFormSizeInput.trim();
    if (!size) return;
    setProdFormSizes((prev) => (prev.includes(size) ? prev : [...prev, size]));
    setProdFormSizeInput('');
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    setProdFormSizes((prev) => prev.filter((s) => s !== sizeToRemove));
    setProdFormOutOfStockSizes((prev) => prev.filter((s) => s !== sizeToRemove));
  };

  const handleToggleSizeStock = (size: string) => {
    setProdFormOutOfStockSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleApplySizePreset = (preset: string[]) => {
    setProdFormSizes((prev) => normalizeSizeValues([...prev, ...preset]));
  };

  const handleDropSize = (targetIndex: number) => {
    if (draggedSizeIndex === null || draggedSizeIndex === targetIndex) {
      setDraggedSizeIndex(null);
      return;
    }
    setProdFormSizes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedSizeIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedSizeIndex(null);
  };

  // Add Color chip
  const handleAddColor = () => {
    const trimmed = prodFormColorInput.trim();
    if (trimmed && !prodFormColors.includes(trimmed)) {
      setProdFormColors([...prodFormColors, trimmed]);
      setProdFormColorInput('');
    }
  };

  // Remove Color chip
  const handleRemoveColor = (colorToRemove: string) => {
    setProdFormColors(prodFormColors.filter((c) => c !== colorToRemove));
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList) return;

    if (!prodFormName.trim()) {
      setProductError('Nome do produto é obrigatório.');
      return;
    }

    const finalMediaItems = prodFormMediaItems
      .map((item) => ({ ...item, url: (item.url || '').trim() }))
      .filter((item) => item.url && (item.type === 'image' || item.type === 'video'));
    if (finalMediaItems.length === 0) {
      setProductError('Adicione pelo menos uma imagem ou vídeo ao produto.');
      return;
    }
    const finalImageUrls = finalMediaItems.filter((item) => item.type === 'image').map((item) => item.url);
    const finalMainImage = finalImageUrls[0] || null;

    let soldQtyParsed: number | null = null;
    if (prodFormSoldQty !== '') {
      soldQtyParsed = Number(prodFormSoldQty);
      if (isNaN(soldQtyParsed) || soldQtyParsed < 0) {
        setProductError('Quantidade vendida deve ser zero ou maior.');
        return;
      }
    }

    let availQtyParsed: number | null = null;
    if (prodFormAvailableQty !== '') {
      availQtyParsed = Number(prodFormAvailableQty);
      if (isNaN(availQtyParsed) || availQtyParsed < 0) {
        setProductError('Quantidade disponível deve ser zero ou maior.');
        return;
      }
    }

    let origPriceParsed: number | null = null;
    if (prodFormOriginalPrice !== '') {
      const clean = prodFormOriginalPrice.replace('R$', '').trim().replace(',', '.');
      origPriceParsed = Number(clean);
      if (isNaN(origPriceParsed) || origPriceParsed < 0) {
        setProductError('Valor original deve ser um número maior ou igual a zero.');
        return;
      }
    }

    let promoPriceParsed: number | null = null;
    if (prodFormPromotionalPrice !== '') {
      const clean = prodFormPromotionalPrice.replace('R$', '').trim().replace(',', '.');
      promoPriceParsed = Number(clean);
      if (isNaN(promoPriceParsed) || promoPriceParsed < 0) {
        setProductError('Valor promocional deve ser um número maior ou igual a zero.');
        return;
      }
    }

    if ((prodFormInstallmentsCount && !prodFormInstallmentValue) || (!prodFormInstallmentsCount && prodFormInstallmentValue)) {
      setProductError('Para exibir parcelamento, informe a quantidade de parcelas e o valor de cada parcela.');
      return;
    }
    if (prodFormInstallmentsCount) {
      const count = Number(prodFormInstallmentsCount);
      if (!Number.isInteger(count) || count < 1 || count > 36) {
        setProductError('Quantidade de parcelas deve ser um número inteiro entre 1 e 36.');
        return;
      }
    }
    if (prodFormInstallmentValue && parseAdminPrice(prodFormInstallmentValue) === null) {
      setProductError('Valor da parcela deve ser um número maior ou igual a zero.');
      return;
    }

    if (prodFormGiftMode === 'custom' && !prodFormGiftImageUrl.trim()) {
      setProductError('Envie uma imagem PNG/JPEG para o presente próprio ou escolha “Padrão da Vitrine” / “Sem presente”.');
      return;
    }

    let productTimerEndIso: string | null = null;
    let productTimerDurationValue: number | null = null;
    if (prodFormTimerEnabled) {
      if (prodFormTimerLooping) {
        const hours = Number(prodFormTimerDurationHours || 0);
        const minutes = Number(prodFormTimerDurationMinutes || 0);
        const totalMinutes = Math.round(hours * 60 + minutes);
        if (!Number.isFinite(totalMinutes) || totalMinutes < 1 || totalMinutes > 10080) {
          setProductError('Informe uma duração entre 1 minuto e 7 dias para o timer do produto.');
          return;
        }
        productTimerDurationValue = totalMinutes;
      } else {
        if (!prodFormTimerDate) {
          setProductError('Informe a data final do timer do produto.');
          return;
        }
        try {
          const [yyyy, mm, dd] = prodFormTimerDate.split('-').map((part) => part.padStart(2, '0'));
          const [hh, min] = (prodFormTimerTime || '23:59').split(':').map((part) => part.padStart(2, '0'));
          const parsed = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00-03:00`);
          if (Number.isNaN(parsed.getTime())) throw new Error('Invalid Date');
          productTimerEndIso = parsed.toISOString();
        } catch {
          setProductError('Data/hora do timer do produto inválida.');
          return;
        }
      }
    }

    try {
      setSavingProduct(true);
      setProductError(null);

      const payload = {
        listId: selectedList.id,
        name: prodFormName.trim(),
        imageUrl: finalMainImage,
        imageUrls: finalImageUrls,
        mediaItems: finalMediaItems,
        productUrl: prodFormProductUrl.trim() || null,
        originalPrice: origPriceParsed,
        promotionalPrice: promoPriceParsed,
        installmentsCount: prodFormInstallmentsCount ? Number(prodFormInstallmentsCount) : null,
        installmentValue: parseAdminPrice(prodFormInstallmentValue),
        soldQuantity: soldQtyParsed,
        showSoldQuantity: prodFormShowSoldQty,
        availableQuantity: availQtyParsed,
        sizes: normalizeSizeValues(prodFormSizes),
        outOfStockSizes: normalizeSizeValues(prodFormOutOfStockSizes).filter((size) => normalizeSizeValues(prodFormSizes).includes(size)),
        colors: prodFormColors,
        badgeEnabled: prodFormBadgeEnabled,
        badgeText: prodFormBadgeEnabled ? prodFormBadgeText.trim() : null,
        badgeColor: prodFormBadgeColor || '#FFFFFF',
        badgeUseListDefault: prodFormBadgeUseListDefault,
        giftMode: prodFormGiftMode,
        giftImageUrl: prodFormGiftMode === 'custom' ? (prodFormGiftImageUrl.trim() || null) : null,
        giftImagePath: prodFormGiftMode === 'custom' ? (prodFormGiftImagePath.trim() || null) : null,
        giftTitle: prodFormGiftMode === 'custom' ? (prodFormGiftTitle.trim() || null) : null,
        giftLabel: prodFormGiftMode === 'custom' ? (prodFormGiftLabel.trim() || null) : null,
        giftTextColor: prodFormGiftMode === 'custom' ? (prodFormGiftTextColor || '#FFFFFF') : '#FFFFFF',
        giftImageSize: prodFormGiftMode === 'custom' ? Math.max(36, Math.min(80, Number(prodFormGiftImageSize) || 48)) : 48,
        timerEnabled: prodFormTimerEnabled,
        timerEnd: prodFormTimerEnabled && !prodFormTimerLooping ? productTimerEndIso : null,
        timerLooping: prodFormTimerEnabled && prodFormTimerLooping,
        timerDurationMinutes: prodFormTimerEnabled && prodFormTimerLooping ? productTimerDurationValue : null,
        timerColor: prodFormTimerColor || '#FFFFFF',
      };

      if (editingProduct) {
        const res = await Repository.updateBestSellerProduct(editingProduct.id, payload);
        if (!res.success) {
          setProductError(res.error || 'Erro ao atualizar produto.');
          return;
        }
      } else {
        const res = await Repository.createBestSellerProduct(payload);
        if (!res.success) {
          setProductError(res.error || 'Erro ao adicionar produto.');
          return;
        }
      }

      setIsProductModalOpen(false);
      await loadProducts(selectedList.id);
      await loadLists(selectedList.id);
    } catch (err: any) {
      setProductError(err?.message || 'Erro inesperado ao salvar produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  // Reorder product position (Move Up / Move Down)
  const handleMoveProduct = async (index: number, direction: 'up' | 'down') => {
    if (!selectedList) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const newProducts = [...products];
    const [moved] = newProducts.splice(index, 1);
    newProducts.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setProducts(newProducts);

    const orderedIds = newProducts.map((p) => p.id);
    const success = await Repository.reorderBestSellerProducts(selectedList.id, orderedIds);
    if (!success) {
      // Revert if failed
      await loadProducts(selectedList.id);
    }
  };

  // Delete Action Execution
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'list') {
      const success = await Repository.deleteBestSellerList(deleteConfirm.id);
      if (success) {
        if (selectedList?.id === deleteConfirm.id) {
          setSelectedList(null);
          setProducts([]);
        }
        await loadLists();
      }
    } else if (deleteConfirm.type === 'product' && selectedList) {
      const success = await Repository.deleteBestSellerProduct(deleteConfirm.id);
      if (success) {
        await loadProducts(selectedList.id);
        await loadLists(selectedList.id);
      }
    }

    setDeleteConfirm(null);
  };


  const reusableLogoUrls = Array.from(new Set(
    lists.map((list) => (list.logoUrl || '').trim()).filter(Boolean),
  ));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neutral-900" />
              Vitrine Personalizada
            </h1>
            {tableConfigured ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Supabase Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                Configuração Pendente
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Crie vitrines por campanha, live, seleção ou lançamento e acompanhe o comportamento do público.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={selectedList?.slug ? `/mais-vendidos/${selectedList.slug}` : "/mais-vendidos"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
            title={selectedList?.slug ? `Abrir /mais-vendidos/${selectedList.slug}` : "Abrir página pública padrão /mais-vendidos"}
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            <span>{selectedList?.slug ? "Abrir Link da Vitrine" : "Ver Vitrine Padrão"}</span>
          </a>

          {selectedList ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedList(null)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Ver todas as vitrines
              </button>
              <button
                type="button"
                onClick={handleOpenCreateProduct}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Produto
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateList}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Vitrine
            </button>
          )}
        </div>
      </div>

      {/* Supabase Missing Tables Warning Card */}
      {!tableConfigured && (
        <div className="bg-amber-50/80 border border-amber-300/80 rounded-lg p-5 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3.5">
            <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900">Configuração necessária no Supabase</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                As tabelas <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-mono">best_seller_lists</code> e{' '}
                <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-mono">best_seller_products</code> ainda não foram criadas no seu banco Supabase.
                Execute o script SQL abaixo no <strong>SQL Editor</strong> do Supabase para habilitar o salvamento persistente.
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900 text-white rounded text-xs font-semibold hover:bg-amber-950 transition-colors shadow-sm cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copiado com Sucesso!' : 'Copiar Script SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlGuide(!showSqlGuide)}
                  className="px-2.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-medium hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  {showSqlGuide ? 'Ocultar código' : 'Ver código SQL'}
                </button>
                <button
                  type="button"
                  onClick={() => loadLists(selectedList?.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-neutral-700 border border-neutral-300 rounded text-xs font-medium hover:bg-neutral-50 transition-colors cursor-pointer ml-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  Verificar novamente
                </button>
              </div>

              {showSqlGuide && (
                <div className="mt-3.5 bg-neutral-900 text-neutral-200 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-64 border border-neutral-800">
                  <pre>{BEST_SELLERS_SQL}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: History of Lists (When no list is open) */}
      {!selectedList ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
              Histórico de Listas ({lists.length})
            </h2>
            <span className="text-[11px] text-neutral-400">
              Cada lista tem link próprio; a ativa também responde em /mais-vendidos
            </span>
          </div>

          {loading ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-xs text-neutral-500 animate-pulse">
              Carregando listas...
            </div>
          ) : lists.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-800">Nenhuma lista cadastrada</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Crie a primeira Vitrine Personalizada para reunir produtos, campanhas e seleções em um único link.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateList}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                Criar primeira lista
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => {
                return (
                  <div
                    key={list.id}
                    onClick={() => handleSelectList(list)}
                    className={`bg-white border rounded-lg p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-neutral-400 hover:shadow-sm ${
                      list.active
                        ? 'border-emerald-300 ring-1 ring-emerald-200/60 bg-emerald-50/10'
                        : 'border-neutral-200'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {formatDatePtBR(list.listDate)}
                        </span>

                        {list.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Link padrão
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-700">
                            Link próprio
                          </span>
                        )}

                        <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-neutral-400" />
                          {list.productsCount ?? 0} {list.productsCount === 1 ? 'produto' : 'produtos'}
                        </span>

                        <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5 text-neutral-400" />
                          {list.totalClicks ?? 0} {(list.totalClicks ?? 0) === 1 ? 'clique' : 'cliques'}
                        </span>

                        {list.timerEnabled && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            {list.timerLooping && list.timerDurationMinutes
                              ? `Looping ${Math.floor(list.timerDurationMinutes / 60)}h${list.timerDurationMinutes % 60 ? ` ${list.timerDurationMinutes % 60}m` : ''}`
                              : 'Timer fixo'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900">{list.title}</h3>
                        {list.subtitle && (
                          <span className="text-xs text-neutral-500 italic">
                            — {list.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleListActive(list, e)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                          list.active
                            ? 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {list.active ? 'Remover do padrão' : 'Usar como padrão'}
                      </button>

                      {list.slug && (
                        <a
                          href={`/mais-vendidos/${list.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir link público desta lista"
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded border border-neutral-200 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectList(list)}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Gerenciar Produtos
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditList(list, e)}
                        title="Editar Informações da Lista"
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={duplicatingId === list.id}
                        onClick={(e) => handleDuplicateList(list, e)}
                        title="Duplicar esta Lista com todos os Produtos"
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-40 rounded border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({
                            type: 'list',
                            id: list.id,
                            name: `Lista de ${formatDatePtBR(list.listDate)} (${list.title})`,
                          });
                        }}
                        title="Excluir Lista"
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Selected List & Products Management */
        <div className="space-y-6">
          {/* Selected List Summary Card */}
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {formatDatePtBR(selectedList.listDate)}
                  </span>
                  {selectedList.active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Link padrão
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-700">
                      Link próprio
                    </span>
                  )}
                  {selectedList.timerEnabled && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      {selectedList.timerLooping && selectedList.timerDurationMinutes
                        ? `Looping ${Math.floor(selectedList.timerDurationMinutes / 60)}h${selectedList.timerDurationMinutes % 60 ? ` ${selectedList.timerDurationMinutes % 60}m` : ''}`
                        : 'Timer fixo'}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                    <Package className="w-3 h-3 text-neutral-400" />
                    {products.length} {products.length === 1 ? 'produto' : 'produtos'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                    <MousePointerClick className="w-3 h-3 text-neutral-400" />
                    {selectedList.totalClicks ?? products.reduce((sum, item) => sum + (item.clicks || 0), 0)} cliques
                  </span>
                </div>
                <h2 className="text-base font-bold text-neutral-900">{selectedList.title}</h2>
                {selectedList.subtitle && (
                  <p className="text-xs text-neutral-500 italic">{selectedList.subtitle}</p>
                )}
                {selectedList.slug && (
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Link2 className="w-3 h-3 text-neutral-400" />
                    <code className="font-mono">/mais-vendidos/{selectedList.slug}</code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/mais-vendidos/${selectedList.slug}`)}
                      className="p-1 text-neutral-400 hover:text-neutral-800 cursor-pointer"
                      title="Copiar link público"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleToggleListActive(selectedList, e)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                    selectedList.active
                      ? 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {selectedList.active ? 'Remover do link padrão' : 'Usar em /mais-vendidos'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditList(selectedList)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Dados da Vitrine
                </button>
              </div>
            </div>

            {/* Analytics simples da lista */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-neutral-400" />
                    Analytics da Vitrine
                  </h3>
                  <p className="text-[10px] text-neutral-400">Atualiza automaticamente enquanto esta tela estiver aberta.</p>
                </div>
                {analyticsLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><Users className="w-3.5 h-3.5" /> Visitantes únicos</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{listAnalytics?.uniqueVisitors ?? 0}</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><Clock className="w-3.5 h-3.5" /> Tempo médio ativo</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{formatEngagementDuration(listAnalytics?.averageEngagementSeconds ?? 0)}</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><Clock className="w-3.5 h-3.5" /> Mediana ativa</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{formatEngagementDuration(listAnalytics?.medianEngagementSeconds ?? 0)}</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><MousePointerClick className="w-3.5 h-3.5" /> Cliques mobile</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{listAnalytics?.totalClicks ?? selectedList.totalClicks ?? 0}</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><Play className="w-3.5 h-3.5" /> Pessoas que deram play</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{listAnalytics?.totalPlays ?? 0}</div>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold"><ShoppingBag className="w-3.5 h-3.5" /> Chegaram ao fim</div>
                  <div className="mt-1 text-xl font-bold text-neutral-900">{listAnalytics?.reachedLastProductRate ?? 0}%</div>
                </div>
              </div>

              {listAnalytics && (
                <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[10px] text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong className="text-neutral-700">Tempo ativo total:</strong> {formatEngagementDuration(listAnalytics.totalEngagementSeconds || 0)} <span className="text-neutral-400">(soma dos visitantes)</span></span>
                  <span><strong className="text-neutral-700">Viram todos os produtos:</strong> {listAnalytics.viewedAllProductsRate ?? 0}%</span>
                  <span><strong className="text-neutral-700">Exploraram galerias:</strong> {listAnalytics.galleryExplorersRate ?? 0}%</span>
                  <span><strong className="text-neutral-700">Play → clique:</strong> {listAnalytics.videoToClickRate ?? 0}%</span>
                  <span className="text-neutral-400">Desktop é ignorado em todas as métricas.</span>
                </div>
              )}

              {listAnalytics?.configured === false ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  O analytics ainda não está configurado no Supabase. Os cliques continuam funcionando; execute o SQL de analytics desta versão para liberar visitantes únicos, tempo de permanência, horários, plays, dispositivos e localização.
                </div>
              ) : listAnalytics ? (
                <>
                  {listAnalytics.engagementConfigured === false && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      Tempo de permanência e gráfico por horário ainda precisam do SQL novo de visitantes únicos. Os dados antigos continuam disponíveis.
                    </div>
                  )}

                  <BestSellerHourlyChart items={listAnalytics.hourlyVisitors || []} />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2"><Monitor className="w-3.5 h-3.5" /> Dispositivos</div>
                    <div className="space-y-1.5">
                      {listAnalytics.devices.length > 0 ? listAnalytics.devices.slice(0, 4).map((item) => (
                        <div key={item.deviceType} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-600">{item.deviceType === 'mobile' ? 'Mobile' : item.deviceType === 'desktop' ? 'Computador' : item.deviceType === 'tablet' ? 'Tablet' : 'Outro'}</span>
                          <strong className="text-neutral-900">{item.count}</strong>
                        </div>
                      )) : <span className="text-[11px] text-neutral-400">Sem dados ainda.</span>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2"><MapPin className="w-3.5 h-3.5" /> Localização</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {listAnalytics.locations.length > 0 ? listAnalytics.locations.map((item, idx) => {
                        const label = [item.city, item.region, item.countryCode].filter(Boolean).join(', ') || 'Não identificada';
                        return (
                          <div key={`${label}-${idx}`} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-neutral-600 truncate" title={label}>{label}</span>
                            <strong className="text-neutral-900 shrink-0">{item.count}</strong>
                          </div>
                        );
                      }) : <span className="text-[11px] text-neutral-400">Sem dados ainda.</span>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2"><ShoppingBag className="w-3.5 h-3.5" /> Por produto</div>
                    <div className="space-y-2">
                      {listAnalytics.products.length > 0 ? listAnalytics.products.map((item) => (
                        <div key={item.productId} className="text-[11px]">
                          <div className="font-semibold text-neutral-700 truncate" title={item.name}>{item.name}</div>
                          <div className="text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span>{item.viewers ?? 0} viram</span><span>·</span><span>{item.clicks} cliques</span><span>·</span><span>{item.plays} plays</span>
                            <span>·</span><span>{formatEngagementDuration(item.averageAttentionSeconds ?? 0)} média olhando</span>
                            {(item.galleryCompletedVisitors ?? 0) > 0 && <><span>·</span><span>{item.galleryCompletedRate ?? 0}% viram todos os slides</span></>}
                            {(item.dropOffs ?? 0) > 0 && <><span>·</span><span>{item.dropOffs} pararam aqui</span></>}
                          </div>
                        </div>
                      )) : <span className="text-[11px] text-neutral-400">Sem produtos.</span>}
                    </div>
                  </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Products Sub-section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-neutral-400" />
                    Produtos da Vitrine ({products.length})
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    A posição (#1, #2, #3...) é controlada manualmente através das setas de ordenação.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenProductLibrary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Produtos salvos
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateProduct}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Produto
                  </button>
                </div>
              </div>

              {loadingProducts ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded p-8 text-center text-xs text-neutral-500 animate-pulse">
                  Carregando produtos...
                </div>
              ) : products.length === 0 ? (
                <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-lg p-10 text-center space-y-2">
                  <Package className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700">Nenhum produto cadastrado nesta lista</p>
                  <p className="text-[11px] text-neutral-500">
                    Adicione os produtos para montar o ranking desta lista.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateProduct}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Produto #1
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenProductLibrary}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer mt-2"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Reaproveitar salvo
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {products.map((prod, idx) => {
                    const posNumber = idx + 1;
                    return (
                      <div
                        key={prod.id}
                        className="bg-white border border-neutral-200 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-neutral-300 transition-colors"
                      >
                        {/* Position & Image Thumbnail & Main Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Reorder Buttons & Position */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveProduct(idx, 'up')}
                                title="Mover para cima no ranking"
                                className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 disabled:hover:text-neutral-400 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === products.length - 1}
                                onClick={() => handleMoveProduct(idx, 'down')}
                                title="Mover para baixo no ranking"
                                className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 disabled:hover:text-neutral-400 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="w-8 h-8 rounded bg-neutral-900 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                              #{posNumber}
                            </div>
                          </div>

                          {/* Image Thumbnail */}
                          <div className="relative w-12 h-12 rounded bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                            {prod.mediaItems?.[0]?.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-white">
                                <Video className="w-5 h-5" />
                              </div>
                            ) : prod.imageUrl || prod.mediaItems?.[0]?.url ? (
                              <img
                                src={prod.imageUrl || prod.mediaItems?.[0]?.url || ''}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}

                            {prod.badgeEnabled && prod.badgeText && (
                              <div
                                className="absolute top-0 right-0 text-[8px] font-bold px-1 rounded-bl leading-tight shadow-xs"
                                style={{
                                  backgroundColor: prod.badgeColor || '#DC2626',
                                  color: getReadableTextColor(prod.badgeColor || '#DC2626'),
                                }}
                              >
                                {prod.badgeText}
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {prod.name}
                              </span>
                              {prod.badgeEnabled && prod.badgeText && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-neutral-200"
                                  style={{
                                    backgroundColor: prod.badgeColor || '#DC2626',
                                    color: getReadableTextColor(prod.badgeColor || '#DC2626'),
                                  }}
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  {prod.badgeText}
                                </span>
                              )}

                              {prod.libraryProductId && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100" title="Dados e imagens deste produto estão disponíveis para reaproveitamento">
                                  <Database className="w-2.5 h-2.5" />
                                  Salvo
                                </span>
                              )}

                              {/* Clicks metric */}
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                                title="Total de cliques registrados no link da loja"
                              >
                                <MousePointerClick className="w-2.5 h-2.5 text-neutral-500" />
                                <strong>{prod.clicks || 0}</strong> cliques
                              </span>

                              {/* Preços */}
                              {((prod.promotionalPrice !== null && prod.promotionalPrice !== undefined) ||
                                (prod.originalPrice !== null && prod.originalPrice !== undefined)) && (
                                <span className="inline-flex items-center gap-1 text-[11px]">
                                  {prod.promotionalPrice !== null && prod.promotionalPrice !== undefined ? (
                                    <>
                                      <strong className="text-emerald-700 font-bold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.promotionalPrice)}
                                      </strong>
                                      {prod.originalPrice !== null && prod.originalPrice !== undefined && prod.originalPrice > prod.promotionalPrice && (
                                        <span className="text-neutral-400 line-through text-[10px]">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice)}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <strong className="text-neutral-900 font-semibold">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.originalPrice!)}
                                    </strong>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                              {prod.soldQuantity !== null && prod.soldQuantity !== undefined ? (
                                <span className="inline-flex items-center gap-1">
                                  <strong>{prod.soldQuantity}</strong> vendidos
                                  {prod.showSoldQuantity ? (
                                    <span title="Visível publicamente">
                                      <Eye className="w-3 h-3 text-emerald-600" />
                                    </span>
                                  ) : (
                                    <span title="Oculto publicamente">
                                      <EyeOff className="w-3 h-3 text-neutral-400" />
                                    </span>
                                  )}
                                </span>
                              ) : null}

                              {prod.availableQuantity !== null && prod.availableQuantity !== undefined ? (
                                <span>
                                  Disponível: <strong>{prod.availableQuantity}</strong> un.
                                </span>
                              ) : null}

                              {prod.sizes && prod.sizes.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  Tam:{' '}
                                  <span className="font-mono text-neutral-700">
                                    {prod.sizes.join(', ')}
                                  </span>
                                </span>
                              )}

                              {prod.colors && prod.colors.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  Cores:{' '}
                                  <span className="text-neutral-700">
                                    {prod.colors.join(', ')}
                                  </span>
                                </span>
                              )}

                              {prod.productUrl && (
                                <a
                                  href={prod.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-neutral-400 hover:text-neutral-700 inline-flex items-center gap-0.5"
                                  title="Ver na loja"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 rounded border border-neutral-200 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'product',
                                id: prod.id,
                                name: `Produto #${posNumber} - ${prod.name}`,
                              })
                            }
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded border border-neutral-200 transition-colors cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Nova Vitrine / Editar Lista                                        */}
      {/* ========================================================================= */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingList ? 'Editar Vitrine Personalizada' : 'Criar Nova Vitrine Personalizada'}
              </h3>
              <button
                type="button"
                onClick={() => setIsListModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveList} className="p-5 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1 min-h-0">
              {listError && (
                <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-xs">
                  {listError}
                </div>
              )}

              <div className="pt-1 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><Layers className="w-3.5 h-3.5" /> 1. Identidade e link</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Nome, endereço público e identidade visual da vitrine.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Título da Vitrine *</label>
                <input
                  type="text"
                  value={listFormTitle}
                  onChange={(e) => setListFormTitle(e.target.value)}
                  placeholder="Ex: Best Sellers da Semana"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Slug / link personalizado (Opcional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 shrink-0">/mais-vendidos/</span>
                  <input
                    type="text"
                    value={listFormSlug}
                    onChange={(e) => setListFormSlug(e.target.value)}
                    placeholder="ex: live-agosto"
                    maxLength={64}
                    className="min-w-0 flex-1 px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs font-mono"
                  />
                </div>
                <p className="text-[10px] text-neutral-500">Se deixar vazio ao criar, o sistema gera um slug único automaticamente. Letras maiúsculas, espaços e acentos serão normalizados.</p>
              </div>

              {/* Logotipo da Marca com Suporte a Upload para Supabase Storage */}
              <div className="space-y-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-800 flex items-center gap-1.5">
                    <span>Logotipo da Marca (Opcional)</span>
                  </label>
                  <div className="flex items-center bg-neutral-200/80 p-0.5 rounded text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('upload')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        logoInputMode === 'upload'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Fazer Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('url')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        logoInputMode === 'url'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Digitar URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode('library')}
                      className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                        logoInputMode === 'library'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Já enviadas
                    </button>
                  </div>
                </div>

                {logoUploadError && (
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{logoUploadError}</span>
                  </div>
                )}

                {logoInputMode === 'upload' ? (
                  <div>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/svg+xml,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoFileUpload(file);
                        e.target.value = '';
                      }}
                    />

                    {listFormLogoUrl ? (
                      <div className="space-y-2">
                        {/* Prévia do Logo em Fundo Escuro */}
                        <div className="relative flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                          <div className="flex items-center gap-3">
                            <img
                              src={listFormLogoUrl}
                              alt="Logo Zhaya"
                              className="h-7 max-w-[140px] object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="text-[10px] text-neutral-400">
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Logo pronto para a vitrine
                              </span>
                              <p className="truncate max-w-[200px] text-neutral-500 font-mono mt-0.5">{listFormLogoUrl}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => logoFileInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] rounded cursor-pointer transition-colors"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setListFormLogoUrl('');
                                setLogoUploadError(null);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-400 cursor-pointer"
                              title="Remover logotipo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingLogo(true);
                        }}
                        onDragLeave={() => setIsDraggingLogo(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingLogo(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleLogoFileUpload(file);
                        }}
                        onClick={() => logoFileInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                          isDraggingLogo
                            ? 'border-neutral-900 bg-neutral-100'
                            : 'border-neutral-300 hover:border-neutral-400 bg-white'
                        }`}
                      >
                        {uploadingLogo ? (
                          <div className="flex flex-col items-center gap-2 py-2">
                            <Loader2 className="w-5 h-5 text-neutral-900 animate-spin" />
                            <span className="text-xs font-medium text-neutral-700">Enviando para o Supabase Storage...</span>
                            <div className="w-36 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-neutral-900 transition-all duration-300"
                                style={{ width: `${logoUploadProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-center">
                            <div className="p-2 bg-neutral-100 rounded-full text-neutral-700">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-neutral-800">
                                Clique para selecionar ou arraste o logotipo aqui
                              </p>
                              <p className="text-[10px] text-neutral-500 mt-0.5">
                                Suporta SVG transparente, PNG, JPG ou WebP (máx. 5MB)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : logoInputMode === 'library' ? (
                  <div className="space-y-2">
                    {reusableLogoUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {reusableLogoUrls.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setListFormLogoUrl(url)}
                            className={`h-20 rounded border p-2 bg-neutral-950 flex items-center justify-center cursor-pointer transition-colors ${listFormLogoUrl === url ? 'border-emerald-500' : 'border-neutral-800 hover:border-neutral-600'}`}
                            title="Usar esta logo"
                          >
                            <img src={url} alt="Logo já enviada" className="max-h-12 max-w-full object-contain" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-neutral-300 bg-white p-3 text-center text-[10px] text-neutral-500">Nenhuma logo usada em outra vitrine ainda.</div>
                    )}
                    <p className="text-[10px] text-neutral-500">Reaproveita uma logo já usada por outra Vitrine Personalizada sem novo upload.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={listFormLogoUrl}
                      onChange={(e) => setListFormLogoUrl(e.target.value)}
                      placeholder="https://exemplo.com/logo-zhaya.svg"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs bg-white"
                    />
                    {listFormLogoUrl && (
                      <div className="flex items-center gap-3 p-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                        <img
                          src={listFormLogoUrl}
                          alt="Logo Preview"
                          className="h-6 max-w-[120px] object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[10px] text-neutral-400">Prévia no cabeçalho escuro</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Subtítulo (Opcional)</label>
                <input
                  type="text"
                  value={listFormSubtitle}
                  onChange={(e) => setListFormSubtitle(e.target.value)}
                  placeholder="Ex: As peças mais desejadas de hoje"
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><SlidersHorizontal className="w-3.5 h-3.5" /> 2. Conversão e padrões</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Defina padrões gerais. Cada produto ainda pode ter configuração própria.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Texto do botão dos produtos (Opcional)</label>
                <input
                  type="text"
                  value={listFormCtaText}
                  onChange={(e) => setListFormCtaText(e.target.value)}
                  placeholder="VER PRODUTO"
                  maxLength={40}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
                <p className="text-[10px] text-neutral-500">Se ficar vazio, todos os produtos usam “VER PRODUTO”.</p>
              </div>

              <div className="space-y-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={listFormDefaultBadgeEnabled} onChange={(e) => setListFormDefaultBadgeEnabled(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                  <div>
                    <span className="font-semibold text-neutral-800">Padrão de badge para a vitrine</span>
                    <p className="text-[10px] text-neutral-500">Produtos marcados como “usar padrão” herdam este texto e esta cor.</p>
                  </div>
                </label>
                {listFormDefaultBadgeEnabled && (
                  <>
                  <div className="pl-6 grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-600">Texto padrão</label>
                      <input type="text" maxLength={40} value={listFormDefaultBadgeText} onChange={(e) => setListFormDefaultBadgeText(e.target.value)} placeholder="Ex: ÚLTIMOS PARES" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-600">Cor</label>
                      <input type="color" value={listFormDefaultBadgeColor} onChange={(e) => setListFormDefaultBadgeColor(e.target.value.toUpperCase())} className="h-9 w-11 p-1 border border-neutral-300 rounded bg-white cursor-pointer" />
                    </div>
                  </div>
                  {editingList && (
                    <label className="ml-6 flex items-start gap-2 cursor-pointer rounded border border-neutral-200 bg-white px-2.5 py-2">
                      <input type="checkbox" checked={listFormApplyBadgeToAll} onChange={(e) => setListFormApplyBadgeToAll(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                      <span>
                        <span className="text-[10px] font-semibold text-neutral-700">Aplicar este padrão a todos os produtos ao salvar</span>
                        <span className="block text-[9px] text-neutral-500 mt-0.5">Depois você ainda pode abrir um produto e desmarcar “usar padrão” para criar uma exceção.</span>
                      </span>
                    </label>
                  )}
                  </>
                )}
              </div>

              <div className="space-y-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={listFormGiftEnabled} onChange={(e) => setListFormGiftEnabled(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                    <div>
                      <span className="font-semibold text-neutral-800 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Presente padrão da vitrine</span>
                      <p className="text-[10px] text-neutral-500">Pode ser herdado por todos os produtos ou substituído individualmente.</p>
                    </div>
                  </label>
                </div>
                {listFormGiftEnabled && (
                  <div className="pl-6 space-y-2">
                    <input ref={listGiftFileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleListGiftUpload(file); e.target.value = ''; }} />
                    {listFormGiftImageUrl ? (
                      <div className="flex items-center gap-3 rounded border border-neutral-200 bg-white p-2.5">
                        <img src={listFormGiftImageUrl} alt="Presente" className="w-14 h-14 object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold text-neutral-700">Imagem 1:1 do presente</div>
                          <div className="flex gap-1.5 mt-1.5">
                            <button type="button" onClick={() => listGiftFileInputRef.current?.click()} className="px-2 py-1 text-[10px] rounded border border-neutral-300 bg-white cursor-pointer">Trocar</button>
                            <button type="button" onClick={() => { setListFormGiftImageUrl(''); setListFormGiftImagePath(''); }} className="px-2 py-1 text-[10px] rounded border border-neutral-300 bg-white text-red-600 cursor-pointer">Remover</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => listGiftFileInputRef.current?.click()} disabled={uploadingListGift} className="w-full py-2.5 border border-dashed border-neutral-300 rounded bg-white text-[11px] font-semibold text-neutral-700 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                        {uploadingListGift ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        {uploadingListGift ? 'Enviando...' : 'Enviar PNG ou JPEG'}
                      </button>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-600">Título acima da imagem (Opcional)</label>
                      <input type="text" maxLength={40} value={listFormGiftLabel} onChange={(e) => setListFormGiftLabel(e.target.value)} placeholder="Você ganha" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white" />
                      <p className="text-[9px] text-neutral-500">Já vem como “Você ganha”. Apague se não quiser mostrar.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-600">Título pequeno abaixo da imagem (Opcional)</label>
                      <input type="text" maxLength={50} value={listFormGiftTitle} onChange={(e) => setListFormGiftTitle(e.target.value)} placeholder="Ex: Presente exclusivo" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-neutral-600">Cor dos textos do presente</p>
                        <p className="text-[9px] text-neutral-500">Aplica no título acima e no título abaixo. Sem sombra.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={listFormGiftTextColor} onChange={(e) => setListFormGiftTextColor(e.target.value.toUpperCase())} className="h-8 w-10 p-1 border border-neutral-300 rounded bg-white cursor-pointer" />
                        <input type="text" value={listFormGiftTextColor} onChange={(e) => setListFormGiftTextColor(e.target.value)} className="w-24 px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded bg-white" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-600">Tamanho da foto do presente</p>
                          <p className="text-[9px] text-neutral-500">Opcional. 48px é o tamanho padrão atual.</p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600">{Math.max(36, Math.min(80, Number(listFormGiftImageSize) || 48))}px</span>
                      </div>
                      <input
                        type="range"
                        min="36"
                        max="80"
                        step="2"
                        value={Math.max(36, Math.min(80, Number(listFormGiftImageSize) || 48))}
                        onChange={(e) => setListFormGiftImageSize(e.target.value)}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><Eye className="w-3.5 h-3.5" /> 3. Exibição</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">O que aparece na composição pública da vitrine.</p>
              </div>

              <div className="space-y-2 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <div>
                  <p className="font-semibold text-neutral-800">Exibição na página</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Desative quando quiser usar a lista com uma composição diferente.</p>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listFormShowDate}
                    onChange={(e) => setListFormShowDate(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="font-semibold text-neutral-700">Mostrar data no topo</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listFormShowRanking}
                    onChange={(e) => setListFormShowRanking(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="font-semibold text-neutral-700">Mostrar #01, #02, #03...</span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700">Cor dos números do ranking</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={listFormRankColor}
                    onChange={(e) => setListFormRankColor(e.target.value.toUpperCase())}
                    className="h-9 w-11 p-1 border border-neutral-300 rounded bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    value={listFormRankColor}
                    onChange={(e) => setListFormRankColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    className="w-24 px-2.5 py-2 border border-neutral-300 rounded text-xs font-mono uppercase"
                  />
                  <span className="text-[10px] text-neutral-500">A mesma cor será usada em #01, #02, #03 e todos os produtos desta lista.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700">Cor dos tamanhos na vitrine</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={listFormSizeColor}
                    onChange={(e) => setListFormSizeColor(e.target.value.toUpperCase())}
                    className="h-9 w-11 p-1 border border-neutral-300 rounded bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    value={listFormSizeColor}
                    onChange={(e) => setListFormSizeColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    className="w-24 px-2.5 py-2 border border-neutral-300 rounded text-xs font-mono uppercase"
                  />
                  <span className="text-[10px] text-neutral-500">Define a cor dos números de tamanho exibidos sobre as fotos nesta lista.</span>
                </div>
              </div>

              <div className="pt-2 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><Video className="w-3.5 h-3.5" /> 4. Fundo da vitrine</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Configurações do vídeo decorativo fixo ao fundo.</p>
              </div>

              <div className="space-y-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="font-semibold text-neutral-800">Vídeo de fundo (Opcional)</label>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Fica fixo atrás da vitrine, sempre sem som, automático e em looping.</p>
                  </div>
                  <div className="flex items-center bg-neutral-200 p-0.5 rounded text-[10px]">
                    <button type="button" onClick={() => setBackgroundVideoInputMode('upload')} className={`px-2 py-1 rounded ${backgroundVideoInputMode === 'upload' ? 'bg-white font-bold' : 'text-neutral-600'}`}>Upload</button>
                    <button type="button" onClick={() => setBackgroundVideoInputMode('url')} className={`px-2 py-1 rounded ${backgroundVideoInputMode === 'url' ? 'bg-white font-bold' : 'text-neutral-600'}`}>URL</button>
                  </div>
                </div>

                <input
                  ref={backgroundVideoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/ogg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBackgroundVideoUpload(file);
                    e.target.value = '';
                  }}
                />

                {backgroundVideoInputMode === 'upload' ? (
                  <button
                    type="button"
                    onClick={() => backgroundVideoFileInputRef.current?.click()}
                    disabled={uploadingBackgroundVideo}
                    className="w-full py-2.5 border border-dashed border-neutral-300 rounded bg-white text-[11px] font-semibold text-neutral-700 hover:border-neutral-500 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {uploadingBackgroundVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    {uploadingBackgroundVideo ? 'Enviando vídeo...' : (listFormBackgroundVideoUrl ? 'Trocar vídeo de fundo' : 'Enviar vídeo de fundo')}
                  </button>
                ) : (
                  <input
                    type="url"
                    value={listFormBackgroundVideoUrl}
                    onChange={(e) => {
                      setListFormBackgroundVideoUrl(e.target.value);
                      setListFormBackgroundVideoPath('');
                    }}
                    placeholder="https://.../video.mp4"
                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                )}

                {listFormBackgroundVideoUrl && (
                  <div className="space-y-2">
                    <div className="relative aspect-video overflow-hidden rounded bg-black">
                      <video src={listFormBackgroundVideoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" style={{ opacity: Number(listFormBackgroundVideoOpacity || 0.22), filter: `blur(${Number(listFormBackgroundVideoBlur || 0)}px)`, transform: Number(listFormBackgroundVideoBlur || 0) > 0 ? 'scale(1.05)' : 'scale(1.01)' }} />
                      <button
                        type="button"
                        onClick={() => { setListFormBackgroundVideoUrl(''); setListFormBackgroundVideoPath(''); }}
                        className="absolute top-2 right-2 p-1.5 rounded bg-black/70 text-white cursor-pointer"
                        aria-label="Remover vídeo de fundo"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-neutral-600 shrink-0">Opacidade {Math.round(Number(listFormBackgroundVideoOpacity || 0.22) * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="0.9"
                        step="0.01"
                        value={listFormBackgroundVideoOpacity}
                        onChange={(e) => setListFormBackgroundVideoOpacity(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-semibold text-neutral-600 shrink-0">Desfoque {Math.round(Number(listFormBackgroundVideoBlur || 0))}px</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={listFormBackgroundVideoBlur}
                        onChange={(e) => setListFormBackgroundVideoBlur(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><Calendar className="w-3.5 h-3.5" /> 5. Publicação</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Data de referência e definição do link padrão.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Data da Vitrine *</label>
                <input
                  type="date"
                  value={listFormDate}
                  onChange={(e) => setListFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
              </div>

              {/* Status Ativa */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listFormActive}
                    onChange={(e) => setListFormActive(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="font-semibold text-neutral-900">Usar também como link padrão /mais-vendidos</span>
                    <p className="text-[11px] text-neutral-500">
                      Cada lista já possui seu próprio slug público. Esta opção apenas define qual delas também abre em /mais-vendidos.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2 pb-1 border-b border-neutral-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><Clock className="w-3.5 h-3.5" /> 6. Timer</div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Urgência geral da vitrine, quando a campanha precisar.</p>
              </div>

              {/* Timer */}
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listFormTimerEnabled}
                    onChange={(e) => setListFormTimerEnabled(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="font-semibold text-neutral-900">Ativar timer</span>
                    <p className="text-[11px] text-neutral-500">
                      Use um encerramento fixo ou um contador em looping por visitante.
                    </p>
                  </div>
                </label>

                {listFormTimerEnabled && (
                  <div className="pl-6 space-y-3">
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-neutral-100">
                      <button
                        type="button"
                        onClick={() => setListFormTimerLooping(false)}
                        className={`px-3 py-2 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                          !listFormTimerLooping ? 'bg-white text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        Data fixa
                      </button>
                      <button
                        type="button"
                        onClick={() => setListFormTimerLooping(true)}
                        className={`px-3 py-2 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                          listFormTimerLooping ? 'bg-white text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        Looping por visitante
                      </button>
                    </div>

                    {listFormTimerLooping ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-neutral-600">Horas</label>
                            <input
                              type="number"
                              min="0"
                              max="168"
                              value={listFormTimerDurationHours}
                              onChange={(e) => setListFormTimerDurationHours(e.target.value)}
                              className="w-full px-2.5 py-2 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-neutral-600">Minutos</label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={listFormTimerDurationMinutes}
                              onChange={(e) => setListFormTimerDurationMinutes(e.target.value)}
                              className="w-full px-2.5 py-2 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none mt-0.5"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[60, 120, 180, 360].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setListFormTimerDurationHours(String(Math.floor(preset / 60)));
                                setListFormTimerDurationMinutes(String(preset % 60));
                              }}
                              className="px-2.5 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] font-bold text-neutral-700 cursor-pointer"
                            >
                              {preset / 60}h
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] leading-relaxed text-neutral-500">
                          Exemplo: com 2h, o mesmo navegador continua vendo o tempo restante ao voltar. O contador só inicia um novo ciclo depois de zerar. Limpar os dados do navegador ou usar outro dispositivo inicia um ciclo próprio.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-600">Data de término</label>
                          <input
                            type="date"
                            value={listFormTimerDate}
                            onChange={(e) => setListFormTimerDate(e.target.value)}
                            className="w-full px-2.5 py-2 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-600">Horário</label>
                          <input
                            type="time"
                            value={listFormTimerTime}
                            onChange={(e) => setListFormTimerTime(e.target.value)}
                            className="w-full px-2.5 py-2 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none mt-0.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingList && (
                  <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={listFormApplyTimerToAll}
                      onChange={(e) => setListFormApplyTimerToAll(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>
                      <span className="text-[11px] font-bold text-neutral-800">Atualizar todos</span>
                      <span className="block text-[9px] text-neutral-500 mt-0.5">Ao salvar, aplica este timer geral em todos os produtos da Vitrine. Se o timer geral estiver desligado, desativa os timers dos produtos. A cor individual de cada timer é preservada.</span>
                    </span>
                  </label>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  className="px-3.5 py-2 rounded text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingList}
                  className="px-4 py-2 rounded text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  {savingList ? 'Salvando...' : editingList ? 'Salvar Alterações' : 'Criar Vitrine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Adicionar / Editar Produto                                       */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingProduct ? 'Editar Produto do Ranking' : 'Adicionar Produto ao Ranking'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {productError && (
                <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-xs">
                  {productError}
                </div>
              )}

              {/* SEÇÃO 1: PRODUTO */}
              <div className="space-y-3">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-100 pb-1">
                  1. Informações do Produto
                </h4>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Nome do Produto *</label>
                  <input
                    type="text"
                    value={prodFormName}
                    onChange={(e) => setProdFormName(e.target.value)}
                    placeholder="Ex: Scarpin Couro Preto Salto Fino"
                    required
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                  />
                </div>

                <div className="space-y-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="font-semibold text-neutral-800">Mídia do produto *</label>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Imagens e vídeos aparecem exatamente nesta ordem na vitrine.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => prodMediaFileInputRef.current?.click()}
                      disabled={uploadingProductMedia}
                      className="px-3 py-2 bg-neutral-900 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-black disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingProductMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadingProductMedia ? 'Enviando...' : 'Upload imagem/vídeo'}
                    </button>
                    <input
                      ref={prodMediaFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProductMediaFileUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-[92px_1fr_auto] gap-2 items-center">
                    <select
                      value={prodFormMediaUrlType}
                      onChange={(e) => setProdFormMediaUrlType(e.target.value === 'video' ? 'video' : 'image')}
                      className="px-2 py-2 border border-neutral-300 rounded bg-white text-[11px]"
                    >
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                    <input
                      type="url"
                      value={prodFormMediaUrlInput}
                      onChange={(e) => setProdFormMediaUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMediaUrl();
                        }
                      }}
                      placeholder="https://..."
                      className="min-w-0 px-3 py-2 border border-neutral-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3 py-2 border border-neutral-300 bg-white text-neutral-900 rounded text-[11px] font-semibold hover:bg-neutral-100 cursor-pointer"
                    >
                      Adicionar link
                    </button>
                  </div>

                  {prodFormMediaItems.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {prodFormMediaItems.map((item, index) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDraggedMediaIndex(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDropMedia(index)}
                          onDragEnd={() => setDraggedMediaIndex(null)}
                          className={`flex items-center gap-3 p-2 rounded border bg-white ${draggedMediaIndex === index ? 'opacity-50 border-neutral-500' : 'border-neutral-200'}`}
                        >
                          <div className="w-12 h-14 rounded overflow-hidden bg-neutral-950 shrink-0 flex items-center justify-center">
                            {item.type === 'video' ? (
                              <video src={item.url} poster={item.posterUrl || undefined} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                            ) : (
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <span className="text-neutral-400 cursor-grab active:cursor-grabbing" title="Arraste para mudar a ordem">
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-800">
                              {item.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                              <span>{item.type === 'video' ? 'Vídeo' : 'Imagem'} {index + 1}</span>
                              {index === 0 && <span className="text-[9px] text-neutral-500 font-medium">• primeira mídia</span>}
                            </div>
                            <p className="mt-0.5 text-[9px] text-neutral-400 truncate">{item.url}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveMedia(index, -1)}
                              disabled={index === 0}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Mover mídia para cima"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMedia(index, 1)}
                              disabled={index === prodFormMediaItems.length - 1}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                              aria-label="Mover mídia para baixo"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMediaItem(item.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                              aria-label="Remover mídia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <p className="text-[10px] text-neutral-500">Arraste qualquer item para definir a ordem de imagens e vídeos na vitrine.</p>
                    </div>
                  ) : (
                    <div className="py-5 text-center text-[11px] text-neutral-400 border border-dashed border-neutral-300 rounded">
                      Nenhuma mídia adicionada.
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Link do Produto na Loja (Opcional)</label>
                  <input
                    type="url"
                    value={prodFormProductUrl}
                    onChange={(e) => setProdFormProductUrl(e.target.value)}
                    placeholder="https://zhaya.com.br/produtos/..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* SEÇÃO 2: PREÇOS */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-100 pb-1">
                  2. Preços (Opcional)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Valor Original (De: R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodFormOriginalPrice}
                      onChange={(e) => setProdFormOriginalPrice(e.target.value)}
                      placeholder="Ex: 299.90"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                    <span className="text-[10px] text-neutral-400">Preço original antes do desconto</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Valor Promocional (Por: R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodFormPromotionalPrice}
                      onChange={(e) => setProdFormPromotionalPrice(e.target.value)}
                      placeholder="Ex: 199.90"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                    <span className="text-[10px] text-neutral-400">Preço promocional atual em destaque</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Até quantas parcelas sem juros</label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      step="1"
                      value={prodFormInstallmentsCount}
                      onChange={(e) => setProdFormInstallmentsCount(e.target.value)}
                      placeholder="Ex: 6"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Valor de cada parcela sem juros (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prodFormInstallmentValue}
                      onChange={(e) => setProdFormInstallmentValue(e.target.value)}
                      placeholder="Ex: 299.98"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">Exibido como “Até 6x de R$ 299,98 sem juros”. Preencha os dois campos para mostrar.</p>
              </div>

              {/* SEÇÃO 3: VENDAS E ESTOQUE */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-100 pb-1">
                  3. Vendas e Estoque
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Quantidade Vendida</label>
                    <input
                      type="number"
                      min="0"
                      value={prodFormSoldQty}
                      onChange={(e) => setProdFormSoldQty(e.target.value)}
                      placeholder="Ex: 27"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Quantidade Disponível / Estoque</label>
                    <input
                      type="number"
                      min="0"
                      value={prodFormAvailableQty}
                      onChange={(e) => setProdFormAvailableQty(e.target.value)}
                      placeholder="Ex: 3"
                      className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={prodFormShowSoldQty}
                      onChange={(e) => setProdFormShowSoldQty(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="text-neutral-700">
                      Mostrar quantidade vendida publicamente (ex: &quot;27 vendidos hoje&quot;)
                    </span>
                  </label>
                </div>
              </div>

              {/* SEÇÃO 4: VARIAÇÕES (TAMANHOS E CORES) */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-100 pb-1">
                  4. Variações (Tamanhos e Cores)
                </h4>
                {/* Tamanhos */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-semibold text-neutral-700">Tamanhos</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplySizePreset(NUMERIC_SIZE_PRESET)}
                        className="px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-[10px] font-semibold text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 cursor-pointer"
                      >
                        Preset 33–42
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySizePreset(LETTER_SIZE_PRESET)}
                        className="px-2.5 py-1.5 rounded border border-neutral-300 bg-white text-[10px] font-semibold text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 cursor-pointer"
                      >
                        Preset PP–GG
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={prodFormSizeInput}
                      onChange={(e) => setProdFormSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSize();
                        }
                      }}
                      placeholder="Outro tamanho"
                      className="w-32 px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="px-3 py-2 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-black cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>

                  {prodFormSizes.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {prodFormSizes.map((size, index) => {
                          const unavailable = prodFormOutOfStockSizes.includes(size);
                          return (
                            <div
                              key={size}
                              draggable
                              onDragStart={() => setDraggedSizeIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDropSize(index)}
                              onDragEnd={() => setDraggedSizeIndex(null)}
                              className={`inline-flex items-center rounded border bg-white overflow-hidden transition-opacity ${
                                draggedSizeIndex === index ? 'opacity-45 border-neutral-400' : 'border-neutral-300'
                              }`}
                            >
                              <span
                                className="h-9 w-7 inline-flex items-center justify-center text-neutral-400 cursor-grab active:cursor-grabbing border-r border-neutral-200"
                                title="Arraste para mudar a ordem"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleSizeStock(size)}
                                title={unavailable ? 'Esgotado — clique para marcar disponível' : 'Disponível — clique para marcar esgotado'}
                                className={`group relative h-9 min-w-10 px-2 inline-flex items-center justify-center text-xs font-semibold cursor-pointer ${
                                  unavailable ? 'text-neutral-400 bg-neutral-50' : 'text-neutral-900 hover:bg-neutral-50'
                                }`}
                              >
                                {size}
                                <span
                                  className={`absolute -top-0.5 right-0.5 text-[14px] leading-none font-black text-red-500 transition-opacity ${
                                    unavailable ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'
                                  }`}
                                  aria-hidden="true"
                                >
                                  ×
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSize(size)}
                                className="h-9 w-7 inline-flex items-center justify-center text-neutral-300 hover:text-red-600 border-l border-neutral-200 cursor-pointer"
                                aria-label={`Remover tamanho ${size}`}
                                title="Remover tamanho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-neutral-500">Arraste pelo ícone para mudar a ordem. Clique no tamanho para marcar ou retirar o X de esgotado.</p>
                    </>
                  )}
                </div>

                {/* Cores */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700">Cores Disponíveis</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={prodFormColorInput}
                      onChange={(e) => setProdFormColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                      placeholder="Digite e pressione Enter (ex: Preto, Off White)"
                      className="flex-1 px-3 py-1.5 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-800 border border-neutral-300 rounded text-xs font-semibold hover:bg-neutral-200 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>

                  {prodFormColors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {prodFormColors.map((color) => (
                        <span
                          key={color}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-300 text-[11px]"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(color)}
                            className="text-neutral-400 hover:text-red-600 ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SEÇÃO 5: DESTAQUE / BADGE */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-100 pb-1">
                  5. Destaque visual
                </h4>

                <label className="flex items-start gap-2 cursor-pointer text-xs rounded bg-neutral-50 border border-neutral-200 p-2.5">
                  <input
                    type="checkbox"
                    checked={prodFormBadgeUseListDefault}
                    onChange={(e) => setProdFormBadgeUseListDefault(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>
                    <span className="font-semibold text-neutral-800">Usar padrão de badge da Vitrine</span>
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      {selectedList?.defaultBadgeEnabled ? `Padrão atual: ${selectedList.defaultBadgeText || 'badge ativo'}` : 'A Vitrine não tem um badge padrão ativo.'}
                    </span>
                  </span>
                </label>

                {!prodFormBadgeUseListDefault && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={prodFormBadgeEnabled}
                      onChange={(e) => setProdFormBadgeEnabled(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="font-semibold text-neutral-800">
                      Ativar badge próprio neste produto
                    </span>
                  </label>
                )}

                {!prodFormBadgeUseListDefault && prodFormBadgeEnabled && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-1">
                      <label className="font-semibold text-neutral-700">Texto do Badge</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={prodFormBadgeText}
                        onChange={(e) => setProdFormBadgeText(e.target.value)}
                        placeholder="Ex: 50% OFF, NOVO, ÚLTIMOS PARES"
                        className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-neutral-500">Sugestões:</span>
                        {['50% OFF', '30% OFF', 'NOVO', 'ÚLTIMOS PARES', 'EXCLUSIVO'].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setProdFormBadgeText(sug)}
                            className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded text-[10px] text-neutral-700 cursor-pointer border border-neutral-200"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-neutral-700">Cor de Fundo do Badge</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={prodFormBadgeColor}
                          onChange={(e) => setProdFormBadgeColor(e.target.value)}
                          className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={prodFormBadgeColor}
                          onChange={(e) => setProdFormBadgeColor(e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-24 px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                        />
                        <div className="flex items-center gap-1">
                          {[
                            { name: 'Branco', hex: '#FFFFFF' },
                            { name: 'Vermelho', hex: '#DC2626' },
                            { name: 'Dourado', hex: '#D97706' },
                            { name: 'Preto', hex: '#171717' },
                            { name: 'Verde', hex: '#059669' },
                          ].map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setProdFormBadgeColor(c.hex)}
                              className="w-6 h-6 rounded-full border border-neutral-300 shrink-0 cursor-pointer shadow-xs"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        O texto se ajusta dinamicamente entre branco ou preto conforme contraste WCAG.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 6: PRESENTE */}
              <div className="space-y-3 pt-3 border-t border-neutral-100">
                <div>
                  <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> 6. Presente</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Aparece pequeno abaixo da badge. Sem fundo e sem contorno.</p>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-neutral-100">
                  <button type="button" onClick={() => setProdFormGiftMode('inherit')} className={`px-2 py-2 rounded text-[10px] font-bold cursor-pointer ${prodFormGiftMode === 'inherit' ? 'bg-white text-neutral-950' : 'text-neutral-500'}`}>Padrão da Vitrine</button>
                  <button type="button" onClick={() => setProdFormGiftMode('off')} className={`px-2 py-2 rounded text-[10px] font-bold cursor-pointer ${prodFormGiftMode === 'off' ? 'bg-white text-neutral-950' : 'text-neutral-500'}`}>Sem presente</button>
                  <button type="button" onClick={() => setProdFormGiftMode('custom')} className={`px-2 py-2 rounded text-[10px] font-bold cursor-pointer ${prodFormGiftMode === 'custom' ? 'bg-white text-neutral-950' : 'text-neutral-500'}`}>Próprio</button>
                </div>

                {prodFormGiftMode === 'inherit' && (
                  <div className="rounded border border-neutral-200 bg-neutral-50 p-2.5 text-[10px] text-neutral-600">
                    {selectedList?.giftEnabled && selectedList.giftImageUrl ? 'Este produto vai usar o presente padrão configurado nos dados da Vitrine.' : 'A Vitrine ainda não possui presente padrão; por enquanto nada será exibido.'}
                  </div>
                )}

                {prodFormGiftMode === 'custom' && (
                  <div className="space-y-2">
                    <input ref={prodGiftFileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleProductGiftUpload(file); e.target.value = ''; }} />
                    {prodFormGiftImageUrl ? (
                      <div className="flex items-center gap-3 rounded border border-neutral-200 bg-neutral-50 p-2.5">
                        <img src={prodFormGiftImageUrl} alt="Presente do produto" className="w-14 h-14 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-neutral-600">Imagem 1:1 · PNG/JPEG</div>
                          <div className="flex gap-1.5 mt-1.5">
                            <button type="button" onClick={() => prodGiftFileInputRef.current?.click()} className="px-2 py-1 text-[10px] rounded border border-neutral-300 bg-white cursor-pointer">Trocar</button>
                            <button type="button" onClick={() => { setProdFormGiftImageUrl(''); setProdFormGiftImagePath(''); }} className="px-2 py-1 text-[10px] rounded border border-neutral-300 bg-white text-red-600 cursor-pointer">Remover</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => prodGiftFileInputRef.current?.click()} disabled={uploadingProdGift} className="w-full py-2.5 border border-dashed border-neutral-300 rounded bg-neutral-50 text-[11px] font-semibold text-neutral-700 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                        {uploadingProdGift ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                        {uploadingProdGift ? 'Enviando...' : 'Enviar imagem do presente'}
                      </button>
                    )}
                    <div className="space-y-1">
                      <label className="font-semibold text-neutral-700">Título acima da imagem (Opcional)</label>
                      <input type="text" maxLength={40} value={prodFormGiftLabel} onChange={(e) => setProdFormGiftLabel(e.target.value)} placeholder="Você ganha" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                      <p className="text-[9px] text-neutral-500">Pré-configurado como “Você ganha”. Pode deixar vazio.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-neutral-700">Título pequeno abaixo (Opcional)</label>
                      <input type="text" maxLength={50} value={prodFormGiftTitle} onChange={(e) => setProdFormGiftTitle(e.target.value)} placeholder="Ex: Presente exclusivo" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-neutral-700">Cor dos textos</p>
                        <p className="text-[9px] text-neutral-500">Mesma cor acima e abaixo; sem sombra.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={prodFormGiftTextColor} onChange={(e) => setProdFormGiftTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <input type="text" value={prodFormGiftTextColor} onChange={(e) => setProdFormGiftTextColor(e.target.value)} className="w-24 px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-700">Tamanho da foto</p>
                          <p className="text-[9px] text-neutral-500">Só altera este presente próprio.</p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600">{Math.max(36, Math.min(80, Number(prodFormGiftImageSize) || 48))}px</span>
                      </div>
                      <input
                        type="range"
                        min="36"
                        max="80"
                        step="2"
                        value={Math.max(36, Math.min(80, Number(prodFormGiftImageSize) || 48))}
                        onChange={(e) => setProdFormGiftImageSize(e.target.value)}
                        className="w-full accent-neutral-900 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 7: TIMER DO PRODUTO */}
              <div className="space-y-3 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono">7. Timer do produto</h4>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Opcional. Aparece pequeno no canto inferior direito da mídia.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs shrink-0">
                    <input
                      type="checkbox"
                      checked={prodFormTimerEnabled}
                      onChange={(e) => setProdFormTimerEnabled(e.target.checked)}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="font-semibold text-neutral-800">Ativar</span>
                  </label>
                </div>

                {prodFormTimerEnabled && (
                  <div className="space-y-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="inline-flex bg-neutral-200/70 p-0.5 rounded">
                      <button
                        type="button"
                        onClick={() => setProdFormTimerLooping(false)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${!prodFormTimerLooping ? 'bg-white text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'}`}
                      >
                        Data fixa
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdFormTimerLooping(true)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${prodFormTimerLooping ? 'bg-white text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'}`}
                      >
                        Looping por visitante
                      </button>
                    </div>

                    {prodFormTimerLooping ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-neutral-600">Horas</span>
                            <input type="number" min="0" max="168" value={prodFormTimerDurationHours} onChange={(e) => setProdFormTimerDurationHours(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-neutral-600">Minutos</span>
                            <input type="number" min="0" max="59" value={prodFormTimerDurationMinutes} onChange={(e) => setProdFormTimerDurationMinutes(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[30, 60, 120, 180, 360].map((preset) => (
                            <button key={preset} type="button" onClick={() => { setProdFormTimerDurationHours(String(Math.floor(preset / 60))); setProdFormTimerDurationMinutes(String(preset % 60)); }} className="px-2 py-1 rounded bg-white text-neutral-700 text-[10px] font-semibold hover:bg-neutral-100">
                              {preset < 60 ? `${preset} min` : `${preset / 60}h`}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-neutral-500">O mesmo navegador mantém o mesmo ciclo; ele só reinicia depois que zerar.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold text-neutral-600">Data final</span>
                          <input type="date" value={prodFormTimerDate} onChange={(e) => setProdFormTimerDate(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold text-neutral-600">Horário</span>
                          <input type="time" value={prodFormTimerTime} onChange={(e) => setProdFormTimerTime(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded text-xs" />
                        </label>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-neutral-700">Cor do timer</p>
                        <p className="text-[9px] text-neutral-500">O texto ajusta o contraste automaticamente.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={prodFormTimerColor} onChange={(e) => setProdFormTimerColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <input type="text" value={prodFormTimerColor} onChange={(e) => setProdFormTimerColor(e.target.value)} className="w-24 px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 7: PRÉVIA AO VIVO DA VITRINE (DARK) */}
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-neutral-500" />
                  5. Prévia na Vitrine Pública (/mais-vendidos)
                </h4>
                <div className="bg-black text-white p-4 rounded-lg border border-neutral-800 max-w-xs mx-auto space-y-3 shadow-inner">
                  {/* Image container */}
                  <div className="relative w-full aspect-[4/5] bg-neutral-950 rounded-[4px] overflow-hidden border border-neutral-900 flex items-center justify-center">
                    {prodFormMediaItems[0] ? (
                      prodFormMediaItems[0].type === 'video' ? (
                        <video
                          src={prodFormMediaItems[0].url}
                          poster={prodFormMediaItems[0].posterUrl || undefined}
                          muted
                          playsInline
                          controls
                          preload="metadata"
                          className="w-full h-full object-cover bg-black"
                        />
                      ) : (
                        <img
                          src={prodFormMediaItems[0].url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )
                    ) : (
                      <span className="text-[10px] text-neutral-600 uppercase tracking-widest">
                        Sem mídia
                      </span>
                    )}

                    {prodFormBadgeEnabled && prodFormBadgeText.trim() && (
                      <div
                        className="absolute top-2.5 right-2.5 z-10 text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-[2px] shadow-sm"
                        style={{
                          backgroundColor: prodFormBadgeColor || '#FFFFFF',
                          color: getReadableTextColor(prodFormBadgeColor || '#FFFFFF'),
                        }}
                      >
                        {prodFormBadgeText}
                      </div>
                    )}

                    <div
                      className="absolute left-2.5 top-2.5 z-10 text-[18px] font-semibold tracking-[-0.04em] leading-none"
                      style={{
                        color: selectedList?.rankColor || '#FFFFFF',
                        textShadow: 'none',
                        WebkitTextStroke: '0px transparent',
                        filter: 'none',
                      }}
                    >
                      #{String(editingProduct ? editingProduct.position : products.length + 1).padStart(2, '0')}
                    </div>

                    {prodFormSizes.length > 0 && (
                      <div className="absolute left-2.5 bottom-3 z-10">
                        <div className="flex flex-col items-start gap-y-1.5">
                          {prodFormSizes.map((size) => {
                            const unavailable = prodFormOutOfStockSizes.includes(size);
                            return (
                              <span
                                key={size}
                                className={`relative inline-flex items-center text-[9px] leading-none font-medium ${unavailable ? 'text-white/35' : 'text-white'}`}
                                style={{ textShadow: 'none', filter: 'none' }}
                              >
                                {size}
                                {unavailable && (
                                  <span
                                    className="absolute left-full ml-1 -top-1 text-red-500 text-[9px] font-semibold leading-none"
                                    style={{ textShadow: 'none', filter: 'none' }}
                                  >
                                    ×
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {prodFormTimerEnabled && (
                      <div
                        className="absolute right-2.5 bottom-3 z-20 px-2 py-1 rounded-[3px] text-[9px] font-black tabular-nums tracking-[0.04em]"
                        style={{
                          backgroundColor: prodFormTimerColor || '#FFFFFF',
                          color: getReadableTextColor(prodFormTimerColor || '#FFFFFF'),
                          boxShadow: 'none',
                          textShadow: 'none',
                        }}
                      >
                        12:29:00
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 text-center flex flex-col items-center">
                    <h5 className="text-sm font-semibold text-white tracking-tight line-clamp-2">
                      {prodFormName.trim() || 'Nome do produto aparecerá aqui'}
                    </h5>

                    {(prodFormPromotionalPrice || prodFormOriginalPrice) && (
                      <div className="flex flex-col items-center">
                        {prodFormPromotionalPrice && prodFormOriginalPrice && Number(prodFormOriginalPrice) > Number(prodFormPromotionalPrice) && (
                          <span className="text-[9px] text-neutral-500 line-through">R$ {prodFormOriginalPrice}</span>
                        )}
                        <span className="text-base font-bold text-white">R$ {prodFormPromotionalPrice || prodFormOriginalPrice}</span>
                      </div>
                    )}

                    {prodFormInstallmentsCount && prodFormInstallmentValue && (
                      <p className="text-[9px] text-neutral-400">Até {prodFormInstallmentsCount}x de R$ {prodFormInstallmentValue} sem juros</p>
                    )}

                    {/* Vendas */}
                    {prodFormShowSoldQty && prodFormSoldQty && Number(prodFormSoldQty) > 0 && (
                      <p className="text-[10px] text-neutral-300 font-light">
                        {Number(prodFormSoldQty) === 1 ? '1 vendido hoje' : `${prodFormSoldQty} vendidos hoje`}
                      </p>
                    )}

                    {/* Cores */}
                    {prodFormColors.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {prodFormColors.map((c, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-[2px] bg-neutral-900 text-neutral-300 border border-neutral-800 text-[9px]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}


                    {/* Botão Ver Produto */}
                    {prodFormProductUrl && (
                      <div className="pt-2">
                        <div className="w-full py-2 px-3 rounded-[3px] bg-white text-black font-semibold text-[10px] tracking-wider uppercase text-center">
                          {(selectedList?.ctaText || '').trim() || 'VER PRODUTO'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3.5 py-2 rounded text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-4 py-2 rounded text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  {savingProduct ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Biblioteca de Produtos                                             */}
      {/* ========================================================================= */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Database className="w-4 h-4" /> Biblioteca de Produtos</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Dados e imagens ficam salvos. Vídeos ficam somente nas listas e nunca entram aqui.</p>
              </div>
              <button type="button" onClick={() => setIsLibraryModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 border-b border-neutral-100 shrink-0">
              <input type="search" value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Buscar produto salvo..." className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900" />
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {libraryError && <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">{libraryError}</div>}
              {loadingLibrary ? (
                <div className="py-12 text-center text-xs text-neutral-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Carregando produtos salvos...</div>
              ) : (() => {
                const query = librarySearch.trim().toLowerCase();
                const visible = libraryProducts.filter((item) => !query || item.name.toLowerCase().includes(query) || (item.productUrl || '').toLowerCase().includes(query));
                if (visible.length === 0) return <div className="py-12 text-center text-xs text-neutral-500"><Package className="w-8 h-8 text-neutral-300 mx-auto mb-2" />Nenhum produto salvo encontrado.</div>;
                return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{visible.map((item) => {
                  const cover = item.mediaItems?.[0]?.url || item.imageUrl || item.imageUrls?.[0] || '';
                  const alreadyInList = products.some((product) => product.libraryProductId === item.id);
                  const shownPrice = item.promotionalPrice ?? item.originalPrice;
                  return (
                    <div key={item.id} className="border border-neutral-200 rounded-lg p-3 flex gap-3 bg-white">
                      <div className="w-16 h-20 rounded bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center">{cover ? <img src={cover} alt={item.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-neutral-300" />}</div>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <p className="text-xs font-bold text-neutral-900 line-clamp-2">{item.name}</p>
                        {shownPrice !== null && shownPrice !== undefined && <p className="text-[11px] font-semibold text-neutral-700 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shownPrice)}</p>}
                        {item.sizes.length > 0 && <p className="text-[10px] text-neutral-500 mt-1 truncate">{item.sizes.join(' · ')}</p>}
                        <div className="mt-auto pt-2"><button type="button" disabled={addingLibraryProductId === item.id || alreadyInList} onClick={() => handleAddLibraryProduct(item)} className="w-full px-2.5 py-1.5 rounded bg-neutral-900 text-white text-[10px] font-semibold disabled:bg-neutral-200 disabled:text-neutral-500 cursor-pointer disabled:cursor-default">{alreadyInList ? 'Já está nesta lista' : addingLibraryProductId === item.id ? 'Adicionando...' : 'Usar nesta lista'}</button></div>
                      </div>
                    </div>
                  );
                })}</div>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Confirmação de Exclusão (Sem window.alert)                      */}
      {/* ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-neutral-900">Confirmar Exclusão</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Tem certeza que deseja excluir <strong>{deleteConfirm.name}</strong>?
                {deleteConfirm.type === 'list' && ' Todos os produtos associados serão excluídos junto.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-2 rounded text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
