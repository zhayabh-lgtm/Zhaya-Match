import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronDown,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  MousePointerClick,
  Upload,
  Download,
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
  Save,
  Globe2,
  MessageCircle,
  Pause,
  Square,
  FileDown,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { uploadFileToCloudinary } from '../../lib/cloudinaryMedia';
import { getBestSellerUiText } from '../../lib/bestSellerI18n';
import { BEST_SELLER_CATEGORY_KEYS, detectBestSellerCategoryKey, getBestSellerCategoryBaseLabel, getBestSellerCategoryLabel } from '../../lib/bestSellerCategories';
import { CloudinaryMediaPicker } from '../../components/admin/CloudinaryMediaPicker';
import type { BestSellerList, BestSellerProduct, BestSellerMediaItem, BestSellerLibraryProduct, BestSellerGiftPreset, BestSellerAnalyticsSummary, BestSellerAnalyticsHourItem, BestSellerOverallHoursSummary, BestSellerLiveSession, BestSellerInternationalConfig, BestSellerInternationalCountryRule, BestSellerInternationalProductTranslation, BestSellerInternationalAdditionalCountry } from '../../types/zhaya';

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
  footer_cta_enabled BOOLEAN NOT NULL DEFAULT false,
  footer_cta_text TEXT,
  footer_cta_url TEXT,
  experience_mode TEXT NOT NULL DEFAULT 'traditional',
  organized_intro_count INTEGER NOT NULL DEFAULT 3,
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
  item_type TEXT NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'video')),
  video_autoplay BOOLEAN NOT NULL DEFAULT false,
  video_loop BOOLEAN NOT NULL DEFAULT true,
  video_controls BOOLEAN NOT NULL DEFAULT true,
  video_title TEXT,
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
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS footer_cta_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS footer_cta_text TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS footer_cta_url TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS experience_mode TEXT NOT NULL DEFAULT 'traditional';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS organized_intro_count INTEGER NOT NULL DEFAULT 3;
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

ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product';
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS video_autoplay BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS video_loop BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS video_controls BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS video_title TEXT;
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


-- 12. Biblioteca reutilizável de produtos (imagens e vídeos)
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

-- 12.1 Biblioteca reutilizável de presentes
CREATE TABLE IF NOT EXISTS public.best_seller_gift_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  image_path TEXT,
  title TEXT,
  label TEXT,
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  image_size INTEGER NOT NULL DEFAULT 48 CHECK (image_size >= 36 AND image_size <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_best_seller_gift_library_updated ON public.best_seller_gift_library(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_gift_library_image ON public.best_seller_gift_library(image_url);
ALTER TABLE public.best_seller_gift_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_gift_library FROM anon, authenticated;
GRANT ALL ON public.best_seller_gift_library TO service_role;

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


const BestSellerOverallHoursCard: React.FC<{ summary: BestSellerOverallHoursSummary | null; loading: boolean }> = ({ summary, loading }) => {
  const hours = summary?.hourlyVisitors || Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0, averageVisitors: 0 }));
  const maxAverage = Math.max(1, ...hours.map((item) => Number(item.averageVisitors || 0)));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm relative">
      {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400 absolute top-3 right-3" />}
      <div className="h-24 flex items-end gap-[3px] sm:gap-1">
        {hours.map((item) => {
          const avg = Number(item.averageVisitors || 0);
          const height = avg > 0 ? Math.max(7, Math.round((avg / maxAverage) * 78)) : 2;
          return (
            <div key={item.hour} className="group relative flex-1 h-full flex items-end">
              <div
                className={`w-full rounded-t-[2px] ${avg > 0 ? 'bg-neutral-800 group-hover:bg-black' : 'bg-neutral-200'}`}
                style={{ height: `${height}%` }}
              />
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-20 rounded bg-neutral-900 px-1.5 py-1 text-[9px] text-white whitespace-nowrap">
                {String(item.hour).padStart(2, '0')}:00 · média {avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} · total {item.visitors}
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

function formatLiveDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':');
}

function getLiveElapsedSeconds(session: BestSellerLiveSession | null, nowMs = Date.now()): number {
  if (!session) return 0;
  let total = Math.max(0, Number(session.accumulatedSeconds || 0));
  if (session.status === 'running' && session.lastResumedAt) {
    const resumedAt = new Date(session.lastResumedAt).getTime();
    if (Number.isFinite(resumedAt)) total += Math.max(0, Math.floor((nowMs - resumedAt) / 1000));
  }
  return total;
}

function formatDateTimePtBR(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

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

type InternationalCountryPreset = {
  code: string;
  name: string;
  locale: string;
  localeLabel: string;
  currency: string;
  approximateLabel: string;
  ctaText: string;
};

// Mercados internacionais pré-configurados para a Zhaya.
// País e idioma são conceitos separados: vários países podem usar o mesmo idioma,
// evitando opções repetidas como "Inglês (EUA)", "Inglês (Canadá)" etc.
// A ordem abaixo é alfabética pelo nome exibido no painel.
const INTERNATIONAL_COUNTRY_PRESETS: InternationalCountryPreset[] = [
  { code: 'ZA', name: 'África do Sul', locale: 'en', localeLabel: 'Inglês', currency: 'ZAR', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'DE', name: 'Alemanha', locale: 'de', localeLabel: 'Alemão', currency: 'EUR', approximateLabel: 'Ungefähre Umrechnung', ctaText: 'JETZT KAUFEN' },
  { code: 'SA', name: 'Arábia Saudita', locale: 'ar', localeLabel: 'Árabe', currency: 'SAR', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'DZ', name: 'Argélia', locale: 'ar', localeLabel: 'Árabe', currency: 'DZD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'AR', name: 'Argentina', locale: 'es', localeLabel: 'Espanhol', currency: 'ARS', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'AU', name: 'Austrália', locale: 'en', localeLabel: 'Inglês', currency: 'AUD', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'AT', name: 'Áustria', locale: 'de', localeLabel: 'Alemão', currency: 'EUR', approximateLabel: 'Ungefähre Umrechnung', ctaText: 'JETZT KAUFEN' },
  { code: 'BH', name: 'Bahrein', locale: 'ar', localeLabel: 'Árabe', currency: 'BHD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'BE', name: 'Bélgica', locale: 'fr', localeLabel: 'Francês', currency: 'EUR', approximateLabel: 'Conversion approximative', ctaText: 'ACHETER' },
  { code: 'BR', name: 'Brasil', locale: 'pt', localeLabel: 'Português', currency: 'BRL', approximateLabel: 'Conversão aproximada', ctaText: 'COMPRAR' },
  { code: 'CA', name: 'Canadá', locale: 'en', localeLabel: 'Inglês', currency: 'CAD', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'CL', name: 'Chile', locale: 'es', localeLabel: 'Espanhol', currency: 'CLP', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'CN', name: 'China', locale: 'zh-Hans', localeLabel: 'Chinês Simplificado', currency: 'CNY', approximateLabel: '近似换算', ctaText: '立即购买' },
  { code: 'CO', name: 'Colômbia', locale: 'es', localeLabel: 'Espanhol', currency: 'COP', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'KR', name: 'Coreia do Sul', locale: 'ko', localeLabel: 'Coreano', currency: 'KRW', approximateLabel: '대략적인 환산', ctaText: '구매하기' },
  { code: 'DK', name: 'Dinamarca', locale: 'da', localeLabel: 'Dinamarquês', currency: 'DKK', approximateLabel: 'Omtrentlig omregning', ctaText: 'KØB NU' },
  { code: 'EG', name: 'Egito', locale: 'ar', localeLabel: 'Árabe', currency: 'EGP', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'AE', name: 'Emirados Árabes Unidos', locale: 'ar', localeLabel: 'Árabe', currency: 'AED', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'ES', name: 'Espanha', locale: 'es', localeLabel: 'Espanhol', currency: 'EUR', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'US', name: 'Estados Unidos', locale: 'en', localeLabel: 'Inglês', currency: 'USD', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'FI', name: 'Finlândia', locale: 'fi', localeLabel: 'Finlandês', currency: 'EUR', approximateLabel: 'Arvioitu muunnos', ctaText: 'OSTA NYT' },
  { code: 'FR', name: 'França', locale: 'fr', localeLabel: 'Francês', currency: 'EUR', approximateLabel: 'Conversion approximative', ctaText: 'ACHETER' },
  { code: 'HK', name: 'Hong Kong', locale: 'zh-Hant', localeLabel: 'Chinês Tradicional', currency: 'HKD', approximateLabel: '約略換算', ctaText: '立即購買' },
  { code: 'IN', name: 'Índia', locale: 'hi', localeLabel: 'Hindi', currency: 'INR', approximateLabel: 'अनुमानित रूपांतरण', ctaText: 'अभी खरीदें' },
  { code: 'ID', name: 'Indonésia', locale: 'id', localeLabel: 'Indonésio', currency: 'IDR', approximateLabel: 'Konversi perkiraan', ctaText: 'BELI SEKARANG' },
  { code: 'IQ', name: 'Iraque', locale: 'ar', localeLabel: 'Árabe', currency: 'IQD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'IE', name: 'Irlanda', locale: 'en', localeLabel: 'Inglês', currency: 'EUR', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'IT', name: 'Itália', locale: 'it', localeLabel: 'Italiano', currency: 'EUR', approximateLabel: 'Conversione approssimativa', ctaText: 'ACQUISTA' },
  { code: 'JP', name: 'Japão', locale: 'ja', localeLabel: 'Japonês', currency: 'JPY', approximateLabel: '概算換算', ctaText: '購入する' },
  { code: 'JO', name: 'Jordânia', locale: 'ar', localeLabel: 'Árabe', currency: 'JOD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'KW', name: 'Kuwait', locale: 'ar', localeLabel: 'Árabe', currency: 'KWD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'LB', name: 'Líbano', locale: 'ar', localeLabel: 'Árabe', currency: 'LBP', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'LU', name: 'Luxemburgo', locale: 'fr', localeLabel: 'Francês', currency: 'EUR', approximateLabel: 'Conversion approximative', ctaText: 'ACHETER' },
  { code: 'MY', name: 'Malásia', locale: 'ms', localeLabel: 'Malaio', currency: 'MYR', approximateLabel: 'Penukaran anggaran', ctaText: 'BELI SEKARANG' },
  { code: 'MA', name: 'Marrocos', locale: 'ar', localeLabel: 'Árabe', currency: 'MAD', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'MX', name: 'México', locale: 'es', localeLabel: 'Espanhol', currency: 'MXN', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'NO', name: 'Noruega', locale: 'no', localeLabel: 'Norueguês', currency: 'NOK', approximateLabel: 'Omtrentlig konvertering', ctaText: 'KJØP NÅ' },
  { code: 'NZ', name: 'Nova Zelândia', locale: 'en', localeLabel: 'Inglês', currency: 'NZD', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'OM', name: 'Omã', locale: 'ar', localeLabel: 'Árabe', currency: 'OMR', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'NL', name: 'Países Baixos', locale: 'nl', localeLabel: 'Holandês', currency: 'EUR', approximateLabel: 'Geschatte conversie', ctaText: 'KOPEN' },
  { code: 'PH', name: 'Filipinas', locale: 'en', localeLabel: 'Inglês', currency: 'PHP', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'PE', name: 'Peru', locale: 'es', localeLabel: 'Espanhol', currency: 'PEN', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'PL', name: 'Polônia', locale: 'pl', localeLabel: 'Polonês', currency: 'PLN', approximateLabel: 'Przybliżone przeliczenie', ctaText: 'KUP TERAZ' },
  { code: 'PT', name: 'Portugal', locale: 'pt', localeLabel: 'Português', currency: 'EUR', approximateLabel: 'Conversão aproximada', ctaText: 'COMPRAR' },
  { code: 'QA', name: 'Qatar', locale: 'ar', localeLabel: 'Árabe', currency: 'QAR', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'GB', name: 'Reino Unido', locale: 'en', localeLabel: 'Inglês', currency: 'GBP', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'SG', name: 'Singapura', locale: 'en', localeLabel: 'Inglês', currency: 'SGD', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'SE', name: 'Suécia', locale: 'sv', localeLabel: 'Sueco', currency: 'SEK', approximateLabel: 'Ungefärlig omräkning', ctaText: 'KÖP NU' },
  { code: 'CH', name: 'Suíça', locale: 'de', localeLabel: 'Alemão', currency: 'CHF', approximateLabel: 'Ungefähre Umrechnung', ctaText: 'JETZT KAUFEN' },
  { code: 'TH', name: 'Tailândia', locale: 'th', localeLabel: 'Tailandês', currency: 'THB', approximateLabel: 'การแปลงโดยประมาณ', ctaText: 'ซื้อเลย' },
  { code: 'TN', name: 'Tunísia', locale: 'ar', localeLabel: 'Árabe', currency: 'TND', approximateLabel: 'تحويل تقريبي', ctaText: 'اشترِ الآن' },
  { code: 'TW', name: 'Taiwan', locale: 'zh-Hant', localeLabel: 'Chinês Tradicional', currency: 'TWD', approximateLabel: '約略換算', ctaText: '立即購買' },
  { code: 'TR', name: 'Turquia', locale: 'tr', localeLabel: 'Turco', currency: 'TRY', approximateLabel: 'Yaklaşık dönüşüm', ctaText: 'ŞİMDİ SATIN AL' },
  { code: 'UY', name: 'Uruguai', locale: 'es', localeLabel: 'Espanhol', currency: 'UYU', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'VN', name: 'Vietnã', locale: 'vi', localeLabel: 'Vietnamita', currency: 'VND', approximateLabel: 'Quy đổi ước tính', ctaText: 'MUA NGAY' },

  // Mercados adicionais que podem reutilizar uma tradução/regra principal.
  { code: 'AO', name: 'Angola', locale: 'pt', localeLabel: 'Português', currency: 'AOA', approximateLabel: 'Conversão aproximada', ctaText: 'COMPRAR' },
  { code: 'BO', name: 'Bolívia', locale: 'es', localeLabel: 'Espanhol', currency: 'BOB', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'BN', name: 'Brunei', locale: 'ms', localeLabel: 'Malaio', currency: 'BND', approximateLabel: 'Penukaran anggaran', ctaText: 'BELI SEKARANG' },
  { code: 'CV', name: 'Cabo Verde', locale: 'pt', localeLabel: 'Português', currency: 'CVE', approximateLabel: 'Conversão aproximada', ctaText: 'COMPRAR' },
  { code: 'CR', name: 'Costa Rica', locale: 'es', localeLabel: 'Espanhol', currency: 'CRC', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'EC', name: 'Equador', locale: 'es', localeLabel: 'Espanhol', currency: 'USD', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'GH', name: 'Gana', locale: 'en', localeLabel: 'Inglês', currency: 'GHS', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'GT', name: 'Guatemala', locale: 'es', localeLabel: 'Espanhol', currency: 'GTQ', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'KE', name: 'Quênia', locale: 'en', localeLabel: 'Inglês', currency: 'KES', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'LI', name: 'Liechtenstein', locale: 'de', localeLabel: 'Alemão', currency: 'CHF', approximateLabel: 'Ungefähre Umrechnung', ctaText: 'JETZT KAUFEN' },
  { code: 'MC', name: 'Mônaco', locale: 'fr', localeLabel: 'Francês', currency: 'EUR', approximateLabel: 'Conversion approximative', ctaText: 'ACHETER' },
  { code: 'MZ', name: 'Moçambique', locale: 'pt', localeLabel: 'Português', currency: 'MZN', approximateLabel: 'Conversão aproximada', ctaText: 'COMPRAR' },
  { code: 'NG', name: 'Nigéria', locale: 'en', localeLabel: 'Inglês', currency: 'NGN', approximateLabel: 'Approximate conversion', ctaText: 'BUY NOW' },
  { code: 'PA', name: 'Panamá', locale: 'es', localeLabel: 'Espanhol', currency: 'PAB', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'PY', name: 'Paraguai', locale: 'es', localeLabel: 'Espanhol', currency: 'PYG', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'DO', name: 'República Dominicana', locale: 'es', localeLabel: 'Espanhol', currency: 'DOP', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
  { code: 'VE', name: 'Venezuela', locale: 'es', localeLabel: 'Espanhol', currency: 'VES', approximateLabel: 'Conversión aproximada', ctaText: 'COMPRAR' },
];

const INTERNATIONAL_CURRENCY_OPTIONS = [
  'AED', 'ARS', 'AUD', 'BHD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'DKK', 'DZD', 'EGP', 'EUR', 'GBP', 'HKD',
  'AOA', 'BND', 'BOB', 'CRC', 'CVE', 'DOP', 'GHS', 'GTQ', 'IDR', 'INR', 'IQD', 'JOD', 'JPY', 'KES', 'KRW', 'KWD',
  'LBP', 'MAD', 'MXN', 'MYR', 'MZN', 'NGN', 'NOK', 'NZD', 'OMR', 'PAB', 'PEN', 'PHP', 'PLN', 'PYG',
  'QAR', 'SAR', 'SEK', 'SGD', 'THB', 'TND', 'TRY', 'TWD', 'USD', 'UYU', 'VES', 'VND', 'ZAR',
];

const INTERNATIONAL_LOCALE_OPTIONS = [
  { value: 'de', label: 'Alemão' },
  { value: 'ar', label: 'Árabe' },
  { value: 'zh-Hans', label: 'Chinês Simplificado' },
  { value: 'zh-Hant', label: 'Chinês Tradicional' },
  { value: 'ko', label: 'Coreano' },
  { value: 'da', label: 'Dinamarquês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fi', label: 'Finlandês' },
  { value: 'fr', label: 'Francês' },
  { value: 'hi', label: 'Hindi' },
  { value: 'nl', label: 'Holandês' },
  { value: 'id', label: 'Indonésio' },
  { value: 'en', label: 'Inglês' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: 'Japonês' },
  { value: 'ms', label: 'Malaio' },
  { value: 'no', label: 'Norueguês' },
  { value: 'pl', label: 'Polonês' },
  { value: 'pt', label: 'Português' },
  { value: 'sv', label: 'Sueco' },
  { value: 'th', label: 'Tailandês' },
  { value: 'tr', label: 'Turco' },
  { value: 'vi', label: 'Vietnamita' },
];

function normalizeInternationalLocale(locale?: string | null): string {
  const raw = String(locale || '').trim();
  if (!raw) return 'en';
  const normalized = raw.replace('_', '-');
  const lower = normalized.toLowerCase();
  if (lower.startsWith('zh')) {
    return /hant|tw|hk|mo/.test(lower) ? 'zh-Hant' : 'zh-Hans';
  }
  const base = lower.split('-')[0];
  const supported = new Set(INTERNATIONAL_LOCALE_OPTIONS.map((item) => item.value.toLowerCase()));
  return supported.has(base) ? INTERNATIONAL_LOCALE_OPTIONS.find((item) => item.value.toLowerCase() === base)!.value : normalized;
}

function getInternationalCountryPreset(code?: string | null) {
  return INTERNATIONAL_COUNTRY_PRESETS.find((item) => item.code === String(code || '').toUpperCase());
}

function getInternationalVisibilityDefaults(countryCode?: string | null) {
  const isBrazil = String(countryCode || '').toUpperCase() === 'BR';
  return {
    showPrices: true,
    showInstallments: isBrazil,
    showCta: true,
    showFooterCta: true,
    showBenefits: isBrazil,
    showSoldQuantity: true,
    showAvailableQuantity: true,
    showSizes: true,
    showColors: true,
    showBadges: true,
    showGift: true,
    showProductTimers: true,
  };
}

function parseInternationalListInput(value: string): string[] {
  return String(value || '')
    .split(/[,;\n]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_BENEFITS = [
  '7% OFF extra no Pix',
  'Frete grátis para todo o Brasil',
  'Presente exclusivo nas compras acima de R$599',
  'Até 6x sem juros',
  '2% de cashback',
];

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
  const [analyticsProductsExpanded, setAnalyticsProductsExpanded] = useState<boolean>(false);
  const [overallHours, setOverallHours] = useState<BestSellerOverallHoursSummary | null>(null);
  const [overallHoursLoading, setOverallHoursLoading] = useState<boolean>(false);
  const [liveSession, setLiveSession] = useState<BestSellerLiveSession | null>(null);
  const [liveConfigured, setLiveConfigured] = useState<boolean>(true);
  const [liveActionLoading, setLiveActionLoading] = useState<boolean>(false);
  const [liveClock, setLiveClock] = useState<number>(Date.now());
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportIncludeHours, setReportIncludeHours] = useState<boolean>(true);
  const [reportIncludeLocations, setReportIncludeLocations] = useState<boolean>(true);
  const [reportIncludeProducts, setReportIncludeProducts] = useState<boolean>(true);
  const [reportCopied, setReportCopied] = useState<boolean>(false);
  const [internationalModalOpen, setInternationalModalOpen] = useState<boolean>(false);
  const [internationalEnabled, setInternationalEnabled] = useState<boolean>(false);
  const [internationalRules, setInternationalRules] = useState<BestSellerInternationalCountryRule[]>([]);
  const [internationalSaving, setInternationalSaving] = useState<boolean>(false);
  const [internationalError, setInternationalError] = useState<string | null>(null);
  const [internationalCountryToAdd, setInternationalCountryToAdd] = useState<string>('US');
  const [internationalAdditionalCountryDrafts, setInternationalAdditionalCountryDrafts] = useState<Record<number, string>>({});
  const [internationalJsonMessage, setInternationalJsonMessage] = useState<string | null>(null);
  const [internationalJsonRuleIndex, setInternationalJsonRuleIndex] = useState<number | null>(null);
  const internationalJsonFileInputRef = useRef<HTMLInputElement>(null);

  // Biblioteca reutilizável: guarda dados, imagens e vídeos para novas vitrines.
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [libraryProducts, setLibraryProducts] = useState<BestSellerLibraryProduct[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [addingLibraryProductId, setAddingLibraryProductId] = useState<string | null>(null);
  const [giftPresets, setGiftPresets] = useState<BestSellerGiftPreset[]>([]);
  const [giftLibraryConfigured, setGiftLibraryConfigured] = useState<boolean>(true);
  const [savingGiftPreset, setSavingGiftPreset] = useState<boolean>(false);
  const [giftPresetMessage, setGiftPresetMessage] = useState<string | null>(null);
  const [downloadingExtension, setDownloadingExtension] = useState<boolean>(false);
  const [lastAppliedBadge, setLastAppliedBadge] = useState<{ text: string; color: string } | null>(null);

  // State: List Modal (Create / Edit)
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<BestSellerList | null>(null);
  const [listFormTitle, setListFormTitle] = useState('');
  const [listFormSlug, setListFormSlug] = useState('');
  const [listFormLogoUrl, setListFormLogoUrl] = useState('');
  const [listFormSubtitle, setListFormSubtitle] = useState('');
  const [listFormCtaText, setListFormCtaText] = useState('');
  const [listFormFooterCtaEnabled, setListFormFooterCtaEnabled] = useState<boolean>(false);
  const [listFormFooterCtaText, setListFormFooterCtaText] = useState('');
  const [listFormFooterCtaUrl, setListFormFooterCtaUrl] = useState('');
  const [listFormExperienceMode, setListFormExperienceMode] = useState<'traditional' | 'organized'>('traditional');
  const [listFormOrganizedIntroCount, setListFormOrganizedIntroCount] = useState('3');
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
  const [listFormApplyBadgeColorToConfigured, setListFormApplyBadgeColorToConfigured] = useState<boolean>(false);
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
  const [listFormTimerColorForAll, setListFormTimerColorForAll] = useState('#FFFFFF');
  const [listFormApplyTimerColorToAll, setListFormApplyTimerColorToAll] = useState<boolean>(false);
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
  const [prodFormDescription, setProdFormDescription] = useState('');
  const [prodFormDisplayGroup, setProdFormDisplayGroup] = useState<'main' | 'redirect'>('main');
  const [prodFormImageUrl, setProdFormImageUrl] = useState('');
  const [prodFormImageUrls, setProdFormImageUrls] = useState<string[]>([]);
  const [prodFormImageUrlInput, setProdFormImageUrlInput] = useState('');
  const [prodFormMediaItems, setProdFormMediaItems] = useState<BestSellerMediaItem[]>([]);
  const [prodFormVideoAutoplay, setProdFormVideoAutoplay] = useState<boolean>(false);
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
  const [prodFormTimerSeparate, setProdFormTimerSeparate] = useState<boolean>(false);
  const [draggedSizeIndex, setDraggedSizeIndex] = useState<number | null>(null);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [showJsonImporter, setShowJsonImporter] = useState(false);
  const [productJsonInput, setProductJsonInput] = useState('');
  const [productJsonMessage, setProductJsonMessage] = useState<string | null>(null);

  // Importação em massa do JSON gerado pela captura de categoria da extensão.
  const [isBulkJsonModalOpen, setIsBulkJsonModalOpen] = useState(false);
  const [bulkJsonInput, setBulkJsonInput] = useState('');
  const [bulkJsonFileName, setBulkJsonFileName] = useState('');
  const [bulkJsonDisplayGroup, setBulkJsonDisplayGroup] = useState<'main' | 'redirect'>('main');
  const [bulkJsonError, setBulkJsonError] = useState<string | null>(null);
  const [bulkJsonImporting, setBulkJsonImporting] = useState(false);
  const [bulkJsonProgress, setBulkJsonProgress] = useState({ done: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
  const bulkJsonFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingProdImage, setUploadingProdImage] = useState<boolean>(false);
  const prodFileInputRef = useRef<HTMLInputElement>(null);
  const prodMediaFileInputRef = useRef<HTMLInputElement>(null);

  // State: Vídeo destaque 9:16 (entra na mesma ordem dos produtos)
  const [isVideoBlockModalOpen, setIsVideoBlockModalOpen] = useState<boolean>(false);
  const [editingVideoBlock, setEditingVideoBlock] = useState<BestSellerProduct | null>(null);
  const [videoBlockTitle, setVideoBlockTitle] = useState('');
  const [videoBlockDescription, setVideoBlockDescription] = useState('');
  const [videoBlockMedia, setVideoBlockMedia] = useState<BestSellerMediaItem | null>(null);
  const [videoBlockUrlInput, setVideoBlockUrlInput] = useState('');
  const [videoBlockAutoplay, setVideoBlockAutoplay] = useState<boolean>(true);
  const [videoBlockLoop, setVideoBlockLoop] = useState<boolean>(true);
  const [videoBlockControls, setVideoBlockControls] = useState<boolean>(true);
  const [uploadingVideoBlock, setUploadingVideoBlock] = useState<boolean>(false);
  const [savingVideoBlock, setSavingVideoBlock] = useState<boolean>(false);
  const [videoBlockError, setVideoBlockError] = useState<string | null>(null);
  const videoBlockFileInputRef = useRef<HTMLInputElement>(null);

  // State: Bloco opcional de benefícios (entra na mesma ordem de produtos/vídeos)
  const [isBenefitsBlockModalOpen, setIsBenefitsBlockModalOpen] = useState<boolean>(false);
  const [editingBenefitsBlock, setEditingBenefitsBlock] = useState<BestSellerProduct | null>(null);
  const [benefitsBlockTitle, setBenefitsBlockTitle] = useState('Vantagens Zhaya');
  const [benefitsBlockItems, setBenefitsBlockItems] = useState<string[]>([...DEFAULT_BENEFITS]);
  const [savingBenefitsBlock, setSavingBenefitsBlock] = useState<boolean>(false);
  const [benefitsBlockError, setBenefitsBlockError] = useState<string | null>(null);

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

  const loadGiftPresets = async () => {
    const result = await Repository.getBestSellerGiftPresets();
    setGiftLibraryConfigured(result.configured !== false);
    if (result.configured !== false) setGiftPresets(result.gifts);
  };

  const applyGiftPresetToList = (gift: BestSellerGiftPreset) => {
    setListFormGiftEnabled(true);
    setListFormGiftImageUrl(gift.imageUrl || '');
    setListFormGiftImagePath(gift.imagePath || '');
    setListFormGiftTitle(gift.title || '');
    setListFormGiftLabel(gift.label ?? 'Você ganha');
    setListFormGiftTextColor(gift.textColor || '#FFFFFF');
    setListFormGiftImageSize(String(gift.imageSize || 48));
  };

  const applyGiftPresetToProduct = (gift: BestSellerGiftPreset) => {
    setProdFormGiftMode('custom');
    setProdFormGiftImageUrl(gift.imageUrl || '');
    setProdFormGiftImagePath(gift.imagePath || '');
    setProdFormGiftTitle(gift.title || '');
    setProdFormGiftLabel(gift.label ?? 'Você ganha');
    setProdFormGiftTextColor(gift.textColor || '#FFFFFF');
    setProdFormGiftImageSize(String(gift.imageSize || 48));
  };

  const persistGiftPreset = async (gift: Omit<BestSellerGiftPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!gift.imageUrl) return false;
    const result = await Repository.saveBestSellerGiftPreset(gift);
    if (result.configured === false) {
      setGiftLibraryConfigured(false);
      return false;
    }
    if (result.gift) {
      setGiftPresets((current) => [result.gift!, ...current.filter((item) => item.id !== result.gift!.id && item.imageUrl !== result.gift!.imageUrl)]);
      return true;
    }
    return false;
  };

  const saveCurrentListGiftPreset = async () => {
    setGiftPresetMessage(null);
    if (!listFormGiftImageUrl.trim()) {
      setListError('Adicione a imagem do presente antes de salvá-lo.');
      return;
    }
    setSavingGiftPreset(true);
    try {
      const ok = await persistGiftPreset({
        imageUrl: listFormGiftImageUrl.trim(),
        imagePath: listFormGiftImagePath.trim() || null,
        title: listFormGiftTitle.trim() || null,
        label: listFormGiftLabel.trim() || null,
        textColor: listFormGiftTextColor || '#FFFFFF',
        imageSize: Math.max(36, Math.min(80, Number(listFormGiftImageSize) || 48)),
      });
      if (ok) setGiftPresetMessage('Presente salvo com imagem e textos.');
      else setListError('Não foi possível salvar o presente. Confira se o SQL da biblioteca foi executado.');
    } finally {
      setSavingGiftPreset(false);
    }
  };

  const saveCurrentProductGiftPreset = async () => {
    setGiftPresetMessage(null);
    if (!prodFormGiftImageUrl.trim()) {
      setProductError('Adicione a imagem do presente antes de salvá-lo.');
      return;
    }
    setSavingGiftPreset(true);
    try {
      const ok = await persistGiftPreset({
        imageUrl: prodFormGiftImageUrl.trim(),
        imagePath: prodFormGiftImagePath.trim() || null,
        title: prodFormGiftTitle.trim() || null,
        label: prodFormGiftLabel.trim() || null,
        textColor: prodFormGiftTextColor || '#FFFFFF',
        imageSize: Math.max(36, Math.min(80, Number(prodFormGiftImageSize) || 48)),
      });
      if (ok) setGiftPresetMessage('Presente salvo com imagem e textos.');
      else setProductError('Não foi possível salvar o presente. Confira se o SQL da biblioteca foi executado.');
    } finally {
      setSavingGiftPreset(false);
    }
  };

  const handleDownloadExtension = async () => {
    setDownloadingExtension(true);
    setProductError(null);
    try {
      const result = await Repository.getZhayaExtensionInfo();
      if (!result.success || !result.available || !result.downloadUrl) {
        setProductError(result.error || 'Nenhuma extensão foi publicada em Configurações ainda.');
        return;
      }
      window.location.assign(result.downloadUrl);
    } finally {
      setDownloadingExtension(false);
    }
  };

  useEffect(() => {
    loadLists();
    void loadGiftPresets();
    try {
      const raw = window.localStorage.getItem('zhaya_match_last_badge_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.text && parsed?.color) setLastAppliedBadge({ text: String(parsed.text), color: String(parsed.color) });
      }
    } catch {
      // localStorage pode estar indisponível no modo privado.
    }
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

  // Visão geral: consolida somente os horários de todas as vitrines cadastradas.
  useEffect(() => {
    if (selectedList || lists.length === 0) {
      if (lists.length === 0) setOverallHours(null);
      return;
    }
    let cancelled = false;
    const refreshOverallHours = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      setOverallHoursLoading((current) => current || !overallHours);
      const summary = await Repository.getBestSellerOverallHours();
      if (cancelled) return;
      if (summary) setOverallHours(summary);
      setOverallHoursLoading(false);
    };
    void refreshOverallHours();
    const interval = window.setInterval(refreshOverallHours, 30000);
    const handleFocus = () => { void refreshOverallHours(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedList?.id, lists.length]);

  // Enquanto uma lista estiver aberta, atualiza produtos, cliques e analytics silenciosamente.
  useEffect(() => {
    const listId = selectedList?.id;
    if (!listId) {
      setListAnalytics(null);
      setLiveSession(null);
      setLiveConfigured(true);
      setAnalyticsLoading(false);
      return;
    }

    let cancelled = false;
    let firstRun = true;
    const refreshSelectedMetrics = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (firstRun) setAnalyticsLoading(true);
      const [listResult, latestProducts, analytics, liveInfo] = await Promise.all([
        Repository.getBestSellerList(listId),
        Repository.getBestSellerProducts(listId),
        Repository.getBestSellerAnalytics(listId),
        Repository.getBestSellerLiveSession(listId),
      ]);
      if (cancelled) return;
      if (listResult?.list) {
        setSelectedList(listResult.list);
        setLists((current) => current.map((item) => item.id === listId ? { ...item, ...listResult.list } : item));
      }
      setProducts(latestProducts);
      if (analytics) setListAnalytics(analytics);
      setLiveConfigured(liveInfo.configured !== false);
      setLiveSession(liveInfo.session || null);
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

  useEffect(() => {
    const interval = window.setInterval(() => setLiveClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(BEST_SELLERS_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Open Create List Modal
  const handleOpenCreateList = () => {
    setEditingList(null);
    setListFormTitle('');
    setListFormSlug('');
    setListFormLogoUrl('');
    setListFormSubtitle('');
    setListFormCtaText('');
    setListFormFooterCtaEnabled(false);
    setListFormFooterCtaText('');
    setListFormFooterCtaUrl('');
    setListFormExperienceMode('traditional');
    setListFormOrganizedIntroCount('3');
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
    setListFormApplyBadgeColorToConfigured(false);
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
    setListFormTimerColorForAll('#FFFFFF');
    setListFormApplyTimerColorToAll(false);
    setListError(null);
    setGiftPresetMessage(null);
    setLogoUploadError(null);
    setLogoInputMode('upload');
    setIsListModalOpen(true);
  };

  // Open Edit List Modal
  const handleOpenEditList = (list: BestSellerList, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingList(list);
    setListFormTitle(list.title || '');
    setListFormSlug(list.slug || '');
    setListFormLogoUrl(list.logoUrl || '');
    setListFormSubtitle(list.subtitle || '');
    setListFormCtaText(list.ctaText || '');
    setListFormFooterCtaEnabled(Boolean(list.footerCtaEnabled));
    setListFormFooterCtaText(list.footerCtaText || '');
    setListFormFooterCtaUrl(list.footerCtaUrl || '');
    setListFormExperienceMode(list.experienceMode === 'organized' ? 'organized' : 'traditional');
    setListFormOrganizedIntroCount(String(list.organizedIntroCount || 3));
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
    setListFormApplyBadgeColorToConfigured(false);
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
    const timerColorSource = (list.products?.length ? list.products : (selectedList?.id === list.id ? selectedList.products : [])) || [];
    const timerColors = Array.from(new Set(timerColorSource.map((product) => (product.timerColor || '#FFFFFF').toUpperCase())));
    setListFormTimerColorForAll(timerColors.length === 1 ? timerColors[0] : '#FFFFFF');
    setListFormApplyTimerColorToAll(false);
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
    setGiftPresetMessage(null);
    setIsListModalOpen(true);
  };

  const uploadBestSellerFile = async (
    file: File,
    mediaType: 'image' | 'video',
    purpose: 'product' | 'background' | 'logo' | 'poster' | 'gift',
  ): Promise<{ url: string; storagePath: string; posterUrl?: string | null }> => {
    // O arquivo vai direto do navegador ao Cloudinary. A Function só gera a assinatura,
    // então vídeos grandes não passam pelo body/limite da Vercel.
    const uploaded = await uploadFileToCloudinary(file, mediaType, `bestsellers/${purpose}`);
    return {
      url: uploaded.url,
      storagePath: `cloudinary:${uploaded.resourceType}:${uploaded.publicId}`,
      posterUrl: mediaType === 'video' ? (uploaded.thumbnailUrl || null) : null,
    };
  };

  // Upload assinado direto para o Cloudinary; o segredo permanece somente no servidor.
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
      const uploaded = await uploadBestSellerFile(file, type, 'product');
      setProdFormMediaItems((prev) => [
        ...prev,
        {
          id: makeMediaId(),
          type,
          url: uploaded.url,
          storagePath: uploaded.storagePath,
          // Cloudinary entrega um frame real do próprio vídeo. Assim mantemos a capa
          // estática no iPhone sem precisar enviar uma segunda imagem manualmente.
          posterUrl: isVideo ? (uploaded.posterUrl || null) : null,
          posterStoragePath: null,
          source: 'upload',
        },
      ]);
    } catch (err: any) {
      console.error('Erro no upload de mídia do produto:', err);
      setProductError(err?.message || 'Erro ao enviar mídia para o Cloudinary.');
    } finally {
      setUploadingProductMedia(false);
      setUploadingProdImage(false);
    }
  };

  // Mantém compatibilidade com o botão antigo de imagem, mas adiciona na galeria unificada.
  const handleProdImageFileUpload = async (file: File, _isMain: boolean = false) => {
    await handleProductMediaFileUpload(file);
  };

  // ---------------------------------------------------------------------------
  // Vídeo destaque 9:16: é um item editorial independente, mas usa a mesma
  // tabela/ordem dos produtos para poder ser arrastado entre eles.
  // ---------------------------------------------------------------------------
  const handleOpenCreateVideoBlock = () => {
    if (!selectedList) return;
    setEditingVideoBlock(null);
    setVideoBlockTitle('');
    setVideoBlockDescription('');
    setVideoBlockMedia(null);
    setVideoBlockUrlInput('');
    setVideoBlockAutoplay(true);
    setVideoBlockLoop(true);
    setVideoBlockControls(true);
    setVideoBlockError(null);
    setIsVideoBlockModalOpen(true);
  };

  const handleOpenEditVideoBlock = (item: BestSellerProduct) => {
    setEditingVideoBlock(item);
    setVideoBlockTitle(item.videoTitle || '');
    setVideoBlockDescription(item.category && item.category.toLowerCase() !== 'vídeo' ? item.category : '');
    setVideoBlockMedia((item.mediaItems || []).find((media) => media.type === 'video') || null);
    setVideoBlockUrlInput('');
    setVideoBlockAutoplay(Boolean(item.videoAutoplay));
    setVideoBlockLoop(item.videoLoop !== false);
    setVideoBlockControls(item.videoControls !== false);
    setVideoBlockError(null);
    setIsVideoBlockModalOpen(true);
  };

  const handleVideoBlockFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setVideoBlockError('Selecione um arquivo de vídeo.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideoBlockError('O vídeo deve ter no máximo 100MB.');
      return;
    }
    try {
      setUploadingVideoBlock(true);
      setVideoBlockError(null);
      const uploaded = await uploadBestSellerFile(file, 'video', 'product');
      setVideoBlockMedia({
        id: makeMediaId(),
        type: 'video',
        url: uploaded.url,
        storagePath: uploaded.storagePath,
        posterUrl: uploaded.posterUrl || null,
        posterStoragePath: null,
        source: 'upload',
      });
    } catch (err: any) {
      setVideoBlockError(err?.message || 'Erro ao enviar o vídeo destaque.');
    } finally {
      setUploadingVideoBlock(false);
    }
  };

  const handleAddVideoBlockUrl = () => {
    const url = videoBlockUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      setVideoBlockError('Informe uma URL http/https válida para o vídeo.');
      return;
    }
    setVideoBlockMedia({ id: makeMediaId(), type: 'video', url, storagePath: null, posterUrl: null, source: 'url' });
    setVideoBlockUrlInput('');
    setVideoBlockError(null);
  };

  const handleSaveVideoBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedList) return;
    if (!videoBlockMedia?.url || videoBlockMedia.type !== 'video') {
      setVideoBlockError('Adicione um vídeo para criar o bloco destaque.');
      return;
    }
    try {
      setSavingVideoBlock(true);
      setVideoBlockError(null);
      const payload = {
        listId: selectedList.id,
        itemType: 'video' as const,
        name: videoBlockTitle.trim() || 'Vídeo destaque',
        category: videoBlockDescription.trim() || 'Vídeo',
        mediaItems: [videoBlockMedia],
        imageUrl: null,
        imageUrls: [],
        videoAutoplay: videoBlockAutoplay,
        videoLoop: videoBlockLoop,
        videoControls: videoBlockControls,
        videoTitle: videoBlockTitle.trim() || null,
        productUrl: null,
        originalPrice: null,
        promotionalPrice: null,
        soldQuantity: null,
        showSoldQuantity: false,
        availableQuantity: null,
        sizes: [],
        outOfStockSizes: [],
        colors: [],
        installmentsCount: null,
        installmentValue: null,
        badgeEnabled: false,
        badgeText: null,
        badgeUseListDefault: false,
        giftMode: 'off' as const,
        timerEnabled: false,
      };
      const result = editingVideoBlock
        ? await Repository.updateBestSellerProduct(editingVideoBlock.id, payload)
        : await Repository.createBestSellerProduct(payload);
      if (!result.success) {
        setVideoBlockError(result.error || 'Não foi possível salvar o vídeo destaque.');
        return;
      }
      setIsVideoBlockModalOpen(false);
      await loadProducts(selectedList.id);
      await loadLists(selectedList.id);
    } catch (err: any) {
      setVideoBlockError(err?.message || 'Erro inesperado ao salvar o vídeo destaque.');
    } finally {
      setSavingVideoBlock(false);
    }
  };


  // ---------------------------------------------------------------------------
  // Bloco de benefícios: opcional, pré-preenchido e totalmente editável.
  // É salvo na mesma lista ordenável sem exigir coluna SQL adicional.
  // ---------------------------------------------------------------------------
  const handleOpenCreateBenefitsBlock = () => {
    if (!selectedList) return;
    const existing = products.find((item) => item.itemType === 'benefits');
    if (existing) {
      handleOpenEditBenefitsBlock(existing);
      return;
    }
    setEditingBenefitsBlock(null);
    setBenefitsBlockTitle('Vantagens Zhaya');
    setBenefitsBlockItems([...DEFAULT_BENEFITS]);
    setBenefitsBlockError(null);
    setIsBenefitsBlockModalOpen(true);
  };

  const handleOpenEditBenefitsBlock = (item: BestSellerProduct) => {
    setEditingBenefitsBlock(item);
    setBenefitsBlockTitle(item.name || 'Vantagens Zhaya');
    setBenefitsBlockItems(item.benefits?.length ? [...item.benefits] : [...DEFAULT_BENEFITS]);
    setBenefitsBlockError(null);
    setIsBenefitsBlockModalOpen(true);
  };

  const handleSaveBenefitsBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedList) return;
    const cleanTitle = benefitsBlockTitle.trim();
    const cleanBenefits = benefitsBlockItems.map((item) => item.trim()).filter(Boolean).slice(0, 10);
    if (!cleanTitle) {
      setBenefitsBlockError('Preencha o título do bloco.');
      return;
    }
    if (cleanBenefits.length === 0) {
      setBenefitsBlockError('Preencha pelo menos um benefício.');
      return;
    }

    try {
      setSavingBenefitsBlock(true);
      setBenefitsBlockError(null);
      const payload = {
        listId: selectedList.id,
        itemType: 'benefits' as const,
        name: cleanTitle,
        category: 'Benefícios',
        benefits: cleanBenefits,
        mediaItems: [],
        imageUrl: null,
        imageUrls: [],
        productUrl: null,
        originalPrice: null,
        promotionalPrice: null,
        soldQuantity: null,
        showSoldQuantity: false,
        availableQuantity: null,
        sizes: [],
        outOfStockSizes: [],
        colors: [],
        installmentsCount: null,
        installmentValue: null,
        badgeEnabled: false,
        badgeText: null,
        badgeUseListDefault: false,
        giftMode: 'off' as const,
        timerEnabled: false,
      };
      const result = editingBenefitsBlock
        ? await Repository.updateBestSellerProduct(editingBenefitsBlock.id, payload)
        : await Repository.createBestSellerProduct(payload);
      if (!result.success || !result.product) {
        setBenefitsBlockError(result.error || 'Não foi possível salvar o bloco de benefícios.');
        return;
      }

      // Ao criar, posiciona automaticamente logo depois do primeiro produto real.
      // Depois disso o usuário continua livre para mover o bloco na lista.
      if (!editingBenefitsBlock) {
        const existingIds = products.map((item) => item.id);
        const firstProductIndex = products.findIndex((item) => item.itemType === 'product' || !item.itemType);
        const insertAt = firstProductIndex >= 0 ? firstProductIndex + 1 : existingIds.length;
        const orderedIds = [...existingIds];
        orderedIds.splice(insertAt, 0, result.product.id);
        await Repository.reorderBestSellerProducts(selectedList.id, orderedIds);
      }

      setIsBenefitsBlockModalOpen(false);
      await loadProducts(selectedList.id);
      await loadLists(selectedList.id);
    } catch (err: any) {
      setBenefitsBlockError(err?.message || 'Erro inesperado ao salvar os benefícios.');
    } finally {
      setSavingBenefitsBlock(false);
    }
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
    if (listFormFooterCtaEnabled) {
      if (!listFormFooterCtaText.trim()) {
        setListError('Informe o texto do botão final da página.');
        return;
      }
      const footerUrl = listFormFooterCtaUrl.trim();
      if (!/^https?:\/\//i.test(footerUrl)) {
        setListError('Informe um link válido para o botão final, começando com http:// ou https://.');
        return;
      }
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
          footerCtaEnabled: listFormFooterCtaEnabled,
          footerCtaText: listFormFooterCtaEnabled ? listFormFooterCtaText.trim() || null : null,
          footerCtaUrl: listFormFooterCtaEnabled ? listFormFooterCtaUrl.trim() || null : null,
          experienceMode: listFormExperienceMode,
          organizedIntroCount: Math.min(12, Math.max(1, Math.round(Number(listFormOrganizedIntroCount) || 3))),
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
          applyDefaultBadgeColorToConfigured: listFormApplyBadgeColorToConfigured,
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
          applyTimerColorToAll: editingList ? listFormApplyTimerColorToAll : false,
          timerColorForAll: listFormTimerColorForAll || '#FFFFFF',
          liveEnabled: true,
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
          footerCtaEnabled: listFormFooterCtaEnabled,
          footerCtaText: listFormFooterCtaEnabled ? listFormFooterCtaText.trim() || null : null,
          footerCtaUrl: listFormFooterCtaEnabled ? listFormFooterCtaUrl.trim() || null : null,
          experienceMode: listFormExperienceMode,
          organizedIntroCount: Math.min(12, Math.max(1, Math.round(Number(listFormOrganizedIntroCount) || 3))),
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
          liveEnabled: true,
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

  // Duplicate List with products (Item 30)
  const handleDuplicateList = async (list: BestSellerList, e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicatingId) return;

    try {
      setDuplicatingId(list.id);
      const today = new Date().toISOString().slice(0, 10);
      const res = await Repository.duplicateBestSellerList(list.id, today, list.title?.trim() ? `${list.title} (Cópia)` : '');
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
    setAnalyticsProductsExpanded(false);
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
    setProdFormDescription('');
    setProdFormDisplayGroup('main');
    setProdFormImageUrl('');
    setProdFormImageUrls([]);
    setProdFormImageUrlInput('');
    setProdFormMediaItems([]);
    setProdFormVideoAutoplay(false);
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
    setProdFormBadgeColor(selectedList.defaultBadgeColor || '#FFFFFF');
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
    setProdFormTimerSeparate(false);
    setShowJsonImporter(false);
    setProductJsonInput('');
    setProductJsonMessage(null);
    setGiftPresetMessage(null);
    setProductError(null);
    void loadGiftPresets();
    setIsProductModalOpen(true);
  };

  // Open Product Modal (Edit)
  const handleOpenEditProduct = (prod: BestSellerProduct) => {
    setEditingProduct(prod);
    setProdFormName(prod.name);
    setProdFormDisplayGroup(prod.displayGroup === 'redirect' ? 'redirect' : 'main');
    setProdFormDescription(
      String(
        prod.description ??
        (prod.category && prod.category.trim().toLowerCase() !== 'produto' ? prod.category : '')
      ).trim()
    );
    setProdFormImageUrl(prod.imageUrl || '');
    const existingImgs = Array.isArray(prod.imageUrls) && prod.imageUrls.length > 0 ? prod.imageUrls : (prod.imageUrl ? [prod.imageUrl] : []);
    setProdFormImageUrls(existingImgs);
    setProdFormImageUrlInput('');
    const existingMedia = Array.isArray(prod.mediaItems) && prod.mediaItems.length > 0
      ? prod.mediaItems
      : existingImgs.map((url, index) => ({ id: `legacy-image-${index + 1}`, type: 'image' as const, url, source: 'url' as const }));
    setProdFormMediaItems(existingMedia);
    setProdFormVideoAutoplay(Boolean(prod.videoAutoplay));
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
    setProdFormTimerSeparate(Boolean(prod.timerSeparate));
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
    setShowJsonImporter(false);
    setProductJsonInput('');
    setProductJsonMessage(null);
    setGiftPresetMessage(null);
    setProductError(null);
    void loadGiftPresets();
    setIsProductModalOpen(true);
  };

  const normalizeBulkProductUrl = (value: any) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.origin);
      url.hash = '';
      url.search = '';
      return `${url.origin}${url.pathname.replace(/\/+$/, '')}`.toLowerCase();
    } catch {
      return raw.replace(/\/+$/, '').toLowerCase();
    }
  };

  const parseBulkJson = (raw: string) => {
    if (!raw.trim()) return { schemaVersion: '', entries: [] as any[], invalid: 0, error: null as string | null };
    try {
      const parsed = JSON.parse(raw);
      const products = Array.isArray(parsed?.products) ? parsed.products : null;
      if (!products) {
        return { schemaVersion: String(parsed?.schemaVersion || ''), entries: [] as any[], invalid: 0, error: 'Este JSON não contém products[]. Use o JSON COMPLETO gerado pela captura de categoria da extensão.' };
      }
      const validEntries: any[] = [];
      let invalid = 0;
      for (const entry of products) {
        const data = entry?.data || entry;
        if (!data?.product || typeof data.product !== 'object') {
          invalid += 1;
          continue;
        }
        const media = Array.isArray(data.product.mediaItems) ? data.product.mediaItems : [];
        const hasMedia = media.some((item: any) => String(item?.url || '').trim());
        if (!String(data.product.name || '').trim() || !hasMedia) {
          invalid += 1;
          continue;
        }
        validEntries.push(data);
      }
      return {
        schemaVersion: String(parsed?.schemaVersion || ''),
        entries: validEntries,
        invalid,
        error: null as string | null,
      };
    } catch {
      return { schemaVersion: '', entries: [] as any[], invalid: 0, error: 'JSON inválido. Cole o conteúdo completo ou selecione o arquivo .json gerado pela extensão.' };
    }
  };

  const bulkJsonAnalysis = useMemo(() => {
    const parsed = parseBulkJson(bulkJsonInput);
    const existingUrls = new Set(
      products
        .filter((item) => (item.itemType || 'product') === 'product')
        .map((item) => normalizeBulkProductUrl(item.productUrl))
        .filter(Boolean),
    );
    const seenJsonUrls = new Set<string>();
    const importable: any[] = [];
    let duplicates = 0;
    let repeatedInsideJson = 0;

    for (const data of parsed.entries) {
      const url = normalizeBulkProductUrl(data?.product?.productUrl || data?.source?.pageUrl);
      if (url && existingUrls.has(url)) {
        duplicates += 1;
        continue;
      }
      if (url && seenJsonUrls.has(url)) {
        repeatedInsideJson += 1;
        continue;
      }
      if (url) seenJsonUrls.add(url);
      importable.push(data);
    }

    return { ...parsed, importable, duplicates, repeatedInsideJson };
  }, [bulkJsonInput, products]);

  const handleOpenBulkJson = (displayGroup: 'main' | 'redirect' = 'main') => {
    setBulkJsonInput('');
    setBulkJsonFileName('');
    setBulkJsonDisplayGroup(displayGroup);
    setBulkJsonError(null);
    setBulkJsonProgress({ done: 0, total: 0, imported: 0, skipped: 0, failed: 0 });
    setIsBulkJsonModalOpen(true);
  };

  const handleBulkJsonFile = async (file?: File | null) => {
    if (!file) return;
    setBulkJsonError(null);
    try {
      const text = await file.text();
      setBulkJsonInput(text);
      setBulkJsonFileName(file.name);
    } catch {
      setBulkJsonError('Não foi possível ler este arquivo JSON.');
    }
  };

  const buildBulkProductPayload = (data: any, position: number) => {
    if (!selectedList) throw new Error('Nenhuma vitrine selecionada.');
    const product = data?.product || {};
    const source = data?.source || {};
    const media: BestSellerMediaItem[] = (Array.isArray(product.mediaItems) ? product.mediaItems : [])
      .map((item: any, index: number) => {
        const type: 'image' | 'video' = item?.type === 'video' ? 'video' : 'image';
        const url = String(item?.url || '').trim();
        if (!url) return null;
        return {
          id: `bulk-json-${type}-${Date.now()}-${position}-${index}`,
          type,
          url,
          posterUrl: type === 'video' ? (String(item?.poster || item?.posterUrl || '').trim() || null) : null,
          source: 'url' as const,
        };
      })
      .filter(Boolean) as BestSellerMediaItem[];

    if (!media.length) throw new Error(`“${String(product.name || 'Produto')}” não possui mídia válida.`);
    const images = media.filter((item) => item.type === 'image').map((item) => item.url);
    const sizesRaw = Array.isArray(product.sizes) ? product.sizes : [];
    const sizes = sizesRaw
      .map((item: any) => typeof item === 'string' ? item : item?.label)
      .filter(Boolean)
      .map(String);
    const outOfStock = Array.isArray(product.outOfStockSizes)
      ? product.outOfStockSizes.map(String)
      : sizesRaw.filter((item: any) => typeof item === 'object' && item?.available === false).map((item: any) => String(item.label));
    const stock = Number(product.stockQuantity);
    const sold = Number(product.soldQuantity);
    const discount = Number(product.discountPercent || 0);

    return {
      listId: selectedList.id,
      position,
      itemType: 'product' as const,
      displayGroup: bulkJsonDisplayGroup,
      name: String(product.name || '').trim(),
      description: String(product.description || product.shortDescription || '').trim().slice(0, 220) || null,
      imageUrl: images[0] || null,
      imageUrls: images,
      mediaItems: media,
      videoAutoplay: false,
      videoLoop: false,
      videoControls: true,
      videoTitle: null,
      productUrl: String(product.productUrl || source.pageUrl || '').trim() || null,
      originalPrice: Number.isFinite(Number(product.originalPrice)) ? Number(product.originalPrice) : null,
      promotionalPrice: Number.isFinite(Number(product.promotionalPrice)) ? Number(product.promotionalPrice) : null,
      installmentsCount: Number(product.installmentsCount) > 0 ? Math.round(Number(product.installmentsCount)) : null,
      installmentValue: Number.isFinite(Number(product.installmentValue)) ? Number(product.installmentValue) : null,
      soldQuantity: Number.isFinite(sold) ? Math.max(1, Math.min(10, Math.round(sold))) : Math.floor(Math.random() * 10) + 1,
      showSoldQuantity: true,
      availableQuantity: Number.isFinite(stock) && stock >= 0 ? (stock > 0 ? Math.max(1, Math.min(2, Math.round(stock))) : 0) : 1,
      sizes: normalizeSizeValues(sizes),
      outOfStockSizes: normalizeSizeValues(outOfStock).filter((size) => normalizeSizeValues(sizes).includes(size)),
      // Mantém a mesma regra do importador individual: cor editorial continua manual.
      colors: [],
      badgeEnabled: discount > 0,
      badgeText: discount > 0 ? `-${Math.round(discount)}%OFF` : null,
      badgeColor: selectedList.defaultBadgeColor || '#FFFFFF',
      badgeUseListDefault: false,
      giftMode: selectedList.giftEnabled ? 'inherit' as const : 'off' as const,
      giftImageUrl: null,
      giftImagePath: null,
      giftTitle: null,
      giftLabel: null,
      giftTextColor: '#FFFFFF',
      giftImageSize: 48,
      timerEnabled: false,
      timerEnd: null,
      timerLooping: false,
      timerDurationMinutes: null,
      timerColor: '#FFFFFF',
      timerSeparate: false,
    };
  };

  const handleImportBulkJson = async () => {
    if (!selectedList || bulkJsonImporting) return;
    setBulkJsonError(null);
    if (bulkJsonAnalysis.error) {
      setBulkJsonError(bulkJsonAnalysis.error);
      return;
    }
    if (!bulkJsonAnalysis.importable.length) {
      setBulkJsonError(bulkJsonAnalysis.duplicates > 0
        ? 'Todos os produtos deste JSON já estão cadastrados nesta vitrine.'
        : 'Nenhum produto válido foi encontrado para importar.');
      return;
    }

    const total = bulkJsonAnalysis.importable.length;
    const basePosition = products.reduce((max, item) => Math.max(max, Number(item.position) || 0), 0);
    let imported = 0;
    let failed = 0;
    const failures: string[] = [];
    setBulkJsonImporting(true);
    setBulkJsonProgress({
      done: 0,
      total,
      imported: 0,
      skipped: bulkJsonAnalysis.duplicates + bulkJsonAnalysis.repeatedInsideJson + bulkJsonAnalysis.invalid,
      failed: 0,
    });

    // Quatro requisições por vez deixam lotes grandes rápidos, mas cada item recebe
    // uma posição explícita para preservar exatamente a ordem capturada na categoria.
    const queue = bulkJsonAnalysis.importable.map((data, index) => ({ data, index }));
    const worker = async () => {
      while (queue.length) {
        const current = queue.shift();
        if (!current) break;
        try {
          const payload = buildBulkProductPayload(current.data, basePosition + current.index + 1);
          const result = await Repository.createBestSellerProduct(payload);
          if (!result.success) throw new Error(result.error || 'Falha ao criar produto.');
          imported += 1;
        } catch (error: any) {
          failed += 1;
          failures.push(`${String(current.data?.product?.name || `Produto ${current.index + 1}`)}: ${error?.message || 'erro desconhecido'}`);
        } finally {
          const done = imported + failed;
          setBulkJsonProgress((prev) => ({ ...prev, done, imported, failed }));
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(4, total) }, () => worker()));
      await loadProducts(selectedList.id);
      await loadLists(selectedList.id);
      if (failed === 0) {
        setBulkJsonProgress((prev) => ({ ...prev, done: total, imported, failed: 0 }));
      } else {
        setBulkJsonError(`${failed} produto(s) não foram importados. ${failures.slice(0, 3).join(' | ')}${failures.length > 3 ? ' | …' : ''}`);
      }
    } finally {
      setBulkJsonImporting(false);
    }
  };

  const handleImportProductJson = () => {
    setProductJsonMessage(null);
    setGiftPresetMessage(null);
    setProductError(null);
    try {
      const parsed = JSON.parse(productJsonInput.trim());
      const data = parsed?.data || parsed;
      const product = data?.product || parsed?.product;
      const source = data?.source || parsed?.source || {};
      if (!product || typeof product !== 'object') throw new Error('O JSON não contém um produto válido.');

      const media = Array.isArray(product.mediaItems) ? product.mediaItems : [];
      const mediaItems: BestSellerMediaItem[] = media
        .map((item: any, index: number) => {
          const type = item?.type === 'video' ? 'video' : 'image';
          const url = String(item?.url || '').trim();
          if (!url) return null;
          return {
            id: `json-${type}-${Date.now()}-${index}`,
            type,
            url,
            posterUrl: type === 'video' ? (String(item?.poster || item?.posterUrl || '').trim() || null) : null,
            source: 'url' as const,
          };
        })
        .filter(Boolean) as BestSellerMediaItem[];
      if (!mediaItems.length) throw new Error('O JSON não trouxe imagens ou vídeos do produto.');

      const sizeObjects = Array.isArray(product.sizes) ? product.sizes : [];
      const sizes = sizeObjects.map((item: any) => typeof item === 'string' ? item : item?.label).filter(Boolean).map(String);
      const outOfStock = Array.isArray(product.outOfStockSizes)
        ? product.outOfStockSizes.map(String)
        : sizeObjects.filter((item: any) => typeof item === 'object' && item?.available === false).map((item: any) => String(item.label));
      // Cor do produto é propositalmente ignorada no JSON. Ela continua sendo configurada manualmente quando necessário.
      const firstImage = mediaItems.find((item) => item.type === 'image')?.url || '';
      const stock = Number(product.stockQuantity);
      const sold = Number(product.soldQuantity);
      const discount = Number(product.discountPercent || 0);

      setProdFormName(String(product.name || '').trim());
      setProdFormDescription(String(product.description || product.shortDescription || '').trim().slice(0, 220));
      setProdFormProductUrl(String(product.productUrl || source.pageUrl || '').trim());
      setProdFormMediaItems(mediaItems);
      setProdFormImageUrls(mediaItems.filter((item) => item.type === 'image').map((item) => item.url));
      setProdFormImageUrl(firstImage);
      setProdFormOriginalPrice(Number.isFinite(Number(product.originalPrice)) ? String(Number(product.originalPrice)) : '');
      setProdFormPromotionalPrice(Number.isFinite(Number(product.promotionalPrice)) ? String(Number(product.promotionalPrice)) : '');
      setProdFormInstallmentsCount(Number(product.installmentsCount) > 0 ? String(Math.round(Number(product.installmentsCount))) : '');
      setProdFormInstallmentValue(Number.isFinite(Number(product.installmentValue)) ? String(Number(product.installmentValue)) : '');
      setProdFormSoldQty(Number.isFinite(sold) ? String(Math.max(1, Math.min(10, Math.round(sold)))) : String(Math.floor(Math.random() * 10) + 1));
      setProdFormShowSoldQty(true);
      setProdFormAvailableQty(Number.isFinite(stock) && stock >= 0 ? String(stock > 0 ? Math.max(1, Math.min(2, Math.round(stock))) : 0) : '1');
      setProdFormSizes(normalizeSizeValues(sizes));
      setProdFormOutOfStockSizes(normalizeSizeValues(outOfStock));
      setProdFormColors([]);
      if (discount > 0) {
        setProdFormBadgeUseListDefault(false);
        setProdFormBadgeEnabled(true);
        setProdFormBadgeText(`-${Math.round(discount)}%OFF`);
        setProdFormBadgeColor(selectedList?.defaultBadgeColor || '#FFFFFF');
      }
      setProductJsonMessage(`Produto importado: ${mediaItems.filter((item) => item.type === 'image').length} foto(s), ${mediaItems.filter((item) => item.type === 'video').length} vídeo(s) e ${sizes.length} tamanho(s). Confira e salve.`);
      setShowJsonImporter(false);
    } catch (error: any) {
      setProductError(error?.message || 'JSON inválido. Copie novamente pela extensão Zhaya Match.');
    }
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
    const productTimerUsesList = Boolean(prodFormTimerEnabled && selectedList.timerEnabled && !prodFormTimerSeparate);
    const effectiveProductTimerSeparate = Boolean(prodFormTimerEnabled && (!selectedList.timerEnabled || prodFormTimerSeparate));
    let effectiveProductTimerLooping = prodFormTimerLooping;

    if (productTimerUsesList) {
      effectiveProductTimerLooping = Boolean(selectedList.timerLooping);
      productTimerEndIso = selectedList.timerLooping ? null : (selectedList.timerEnd || null);
      productTimerDurationValue = selectedList.timerLooping ? (selectedList.timerDurationMinutes || null) : null;
    } else if (prodFormTimerEnabled) {
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
        description: prodFormDescription.trim() || null,
        imageUrl: finalMainImage,
        imageUrls: finalImageUrls,
        itemType: 'product' as const,
        displayGroup: prodFormDisplayGroup,
        mediaItems: finalMediaItems,
        videoAutoplay: prodFormVideoAutoplay,
        videoLoop: false,
        videoControls: true,
        videoTitle: null,
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
        timerEnd: prodFormTimerEnabled && !effectiveProductTimerLooping ? productTimerEndIso : null,
        timerLooping: prodFormTimerEnabled && effectiveProductTimerLooping,
        timerDurationMinutes: prodFormTimerEnabled && effectiveProductTimerLooping ? productTimerDurationValue : null,
        timerColor: prodFormTimerColor || '#FFFFFF',
        timerSeparate: effectiveProductTimerSeparate,
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

      const appliedBadge = prodFormBadgeUseListDefault && selectedList.defaultBadgeEnabled && selectedList.defaultBadgeText
        ? { text: selectedList.defaultBadgeText, color: selectedList.defaultBadgeColor || '#FFFFFF' }
        : (!prodFormBadgeUseListDefault && prodFormBadgeEnabled && prodFormBadgeText.trim()
          ? { text: prodFormBadgeText.trim(), color: prodFormBadgeColor || '#FFFFFF' }
          : null);
      if (appliedBadge) {
        setLastAppliedBadge(appliedBadge);
        try { window.localStorage.setItem('zhaya_match_last_badge_v1', JSON.stringify(appliedBadge)); } catch { /* noop */ }
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
  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    if (!selectedList) return;
    const current = products.find((item) => item.id === productId);
    if (!current) return;
    const group: 'main' | 'redirect' = current.displayGroup === 'redirect' ? 'redirect' : 'main';
    const mainItems = products.filter((item) => item.displayGroup !== 'redirect');
    const redirectItems = products.filter((item) => item.displayGroup === 'redirect');
    const groupItems = group === 'redirect' ? [...redirectItems] : [...mainItems];
    const index = groupItems.findIndex((item) => item.id === productId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= groupItems.length) return;

    const [moved] = groupItems.splice(index, 1);
    groupItems.splice(targetIndex, 0, moved);
    const newProducts = group === 'redirect'
      ? [...mainItems, ...groupItems]
      : [...groupItems, ...redirectItems];

    // O banco continua com uma ordem global, mas cada seção é reordenada sem
    // permitir que uma seta atravesse Principal ↔ Redirecionar.
    setProducts(newProducts);
    const success = await Repository.reorderBestSellerProducts(selectedList.id, newProducts.map((p) => p.id));
    if (!success) await loadProducts(selectedList.id);
  };

  const handleChangeProductDisplayGroup = async (prod: BestSellerProduct, group: 'main' | 'redirect') => {
    if (!selectedList || prod.itemType === 'video' || prod.itemType === 'benefits') return;
    if ((prod.displayGroup === 'redirect' ? 'redirect' : 'main') === group) return;
    const snapshot = products;
    setProducts((current) => current.map((item) => item.id === prod.id ? { ...item, displayGroup: group } : item));
    const result = await Repository.updateBestSellerProduct(prod.id, { displayGroup: group });
    if (!result.success) {
      setProducts(snapshot);
      alert(result.error || 'Não foi possível mover o produto.');
      return;
    }
    await loadProducts(selectedList.id);
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

  const liveElapsedSeconds = getLiveElapsedSeconds(liveSession, liveClock);
  const productItemsForMetrics = products.filter((item) => item.itemType !== 'video');
  const mainDisplayProducts = products.filter((item) => item.displayGroup !== 'redirect');
  const redirectDisplayProducts = products.filter((item) => item.displayGroup === 'redirect');
  const productsForAdminDisplay = [...mainDisplayProducts, ...redirectDisplayProducts];

  const handleLiveAction = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    if (!selectedList || liveActionLoading) return;
    setLiveActionLoading(true);
    try {
      const result = await Repository.controlBestSellerLive(selectedList.id, action);
      if (!result.success) {
        window.alert(result.error || 'Não foi possível atualizar a live.');
        return;
      }
      setLiveConfigured(result.configured !== false);
      setLiveSession(result.session || null);
    } finally {
      setLiveActionLoading(false);
    }
  };

  const buildWhatsAppReport = (): string => {
    if (!selectedList) return '';
    const analytics = listAnalytics;
    const visitors = analytics?.uniqueVisitors || 0;
    const clicks = analytics?.totalClicks ?? selectedList.totalClicks ?? 0;
    const conversion = visitors > 0 ? Math.round((clicks / visitors) * 1000) / 10 : 0;
    const lines: string[] = [
      `Relatório - ${formatDatePtBR(selectedList.listDate)} - ${selectedList.title || 'Vitrine sem título'}`,
      '',
      `Visitantes: ${visitors}`,
      `Cliques: ${clicks} · Conversão: ${String(conversion).replace('.', ',')}%`,
    ];

    if (analytics && (analytics.averageEngagementSeconds > 0 || analytics.medianEngagementSeconds)) {
      lines.push(`Tempo: ${formatEngagementDuration(analytics.averageEngagementSeconds || 0)} média · ${formatEngagementDuration(analytics.medianEngagementSeconds || 0)} mediana`);
    }

    if (liveSession) {
      const endLabel = liveSession.endedAt ? formatDateTimePtBR(liveSession.endedAt) : (liveSession.status === 'paused' ? 'Pausada' : 'Em andamento');
      lines.push('');
      lines.push(`Live: ${formatDateTimePtBR(liveSession.startedAt)} → ${endLabel}`);
      lines.push(`Duração: ${formatLiveDuration(liveElapsedSeconds)}`);
    }

    // Rolagem até o fim / todos os produtos só é informativa quando há mais de um produto.
    if (analytics && productItemsForMetrics.length > 1) {
      lines.push('');
      lines.push(`Chegaram ao último produto: ${analytics.reachedLastProductRate ?? 0}%`);
      lines.push(`Viram todos os produtos: ${analytics.viewedAllProductsRate ?? 0}%`);
    }

    if (reportIncludeLocations && analytics?.locations?.length) {
      const usefulLocations = analytics.locations
        .filter((item) => item.city || item.region || item.countryCode)
        .slice(0, 12);
      if (usefulLocations.length) {
        lines.push('');
        lines.push('Cidades:');
        lines.push(usefulLocations.map((item) => {
          const label = [item.city, item.region, item.countryCode].filter(Boolean).join(', ');
          const clickLabel = (item.clicks || 0) > 0 ? `/${item.clicks} cliques` : '';
          return `${label} ${item.count}${clickLabel}`;
        }).join(' | '));
      }
    }

    if (reportIncludeHours && analytics?.hourlyVisitors?.length) {
      const hours = analytics.hourlyVisitors.filter((item) => item.visitors > 0);
      if (hours.length) {
        lines.push('');
        lines.push('Horários:');
        lines.push(hours.map((item) => `${String(item.hour).padStart(2, '0')}:00 ${item.visitors}`).join(' | '));
      }
    }

    if (reportIncludeProducts && analytics?.products?.length) {
      const meaningfulProducts = analytics.products.filter((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product?.itemType !== 'video' && (
          productItemsForMetrics.length > 1 ||
          item.clicks > 0 ||
          item.plays > 0 ||
          ((product?.mediaItems?.length || product?.imageUrls?.length || 0) > 1 && (item.galleryCompletedVisitors || 0) > 0)
        );
      });
      if (meaningfulProducts.length) {
        lines.push('');
        lines.push('Produtos:');
        meaningfulProducts.slice(0, 8).forEach((item) => {
          const product = products.find((p) => p.id === item.productId);
          const parts = [`${item.clicks} cliques`];
          if (item.plays > 0) parts.push(`${item.plays} plays`);
          const mediaCount = product?.mediaItems?.length || product?.imageUrls?.length || 0;
          if (mediaCount > 1 && (item.galleryCompletedVisitors || 0) > 0) {
            parts.push(`${item.galleryCompletedRate ?? 0}% viram todos os slides`);
          }
          lines.push(`${item.name}: ${parts.join(' · ')}`);
        });
      }
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const handleCopyReport = async () => {
    const report = buildWhatsAppReport();
    if (!report) return;
    await navigator.clipboard?.writeText(report);
    setReportCopied(true);
    window.setTimeout(() => setReportCopied(false), 1800);
  };

  const handleOpenWhatsAppReport = () => {
    const report = buildWhatsAppReport();
    if (!report) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenInternational = () => {
    if (!selectedList) return;
    const config = selectedList.internationalConfig;
    const rules = Array.isArray(config?.rules) ? config!.rules : [];
    const normalizedRules = rules.map((rule) => {
      const preset = getInternationalCountryPreset(rule.countryCode);
      const visibilityDefaults = getInternationalVisibilityDefaults(rule.countryCode);
      return {
        ...visibilityDefaults,
        ...rule,
        locale: normalizeInternationalLocale(rule.locale || preset?.locale),
        additionalCountries: Array.isArray(rule.additionalCountries)
          ? rule.additionalCountries.map((item) => ({
              countryCode: String(item?.countryCode || '').trim().toUpperCase().slice(0, 2),
              currencyCode: String(item?.currencyCode || getInternationalCountryPreset(item?.countryCode)?.currency || 'USD').trim().toUpperCase(),
              currencyRate: Number.isFinite(Number(item?.currencyRate)) ? Number(item?.currencyRate) : 0,
              approximateConversion: item?.approximateConversion !== false,
              approximateLabel: item?.approximateLabel || getInternationalCountryPreset(item?.countryCode)?.approximateLabel || '',
            })).filter((item) => /^[A-Z]{2}$/.test(item.countryCode))
          : [],
      };
    });
    setInternationalEnabled(Boolean(config?.enabled));
    setInternationalRules(normalizedRules);
    setInternationalAdditionalCountryDrafts({});
    const used = new Set(normalizedRules.flatMap((rule) => [
      String(rule.countryCode || '').toUpperCase(),
      ...(rule.additionalCountries || []).map((item) => String(item.countryCode || '').toUpperCase()),
    ]));
    setInternationalCountryToAdd(INTERNATIONAL_COUNTRY_PRESETS.find((country) => !used.has(country.code))?.code || 'US');
    setInternationalError(null);
    setInternationalJsonMessage(null);
    setInternationalModalOpen(true);
  };

  const buildInternationalRuleFromPreset = (countryCode: string): BestSellerInternationalCountryRule => {
    const preset = getInternationalCountryPreset(countryCode) || getInternationalCountryPreset('US') || INTERNATIONAL_COUNTRY_PRESETS[0];
    return {
      countryCode: preset.code,
      enabled: true,
      locale: preset.locale,
      currencyCode: preset.currency,
      currencyRate: 1,
      additionalCountries: [],
      approximateConversion: preset.currency !== 'BRL',
      approximateLabel: preset.approximateLabel,
      title: '',
      subtitle: '',
      ctaText: preset.ctaText,
      buttonDestination: 'product',
      whatsappNumber: '',
      whatsappMessage: '',
      customUrl: '',
      formTitle: '',
      formMessage: '',
      redirectProducts: false,
      redirectMessage: '',
      organizedTitle: '',
      organizedSubtitle: '',
      categoryTranslations: {},
      footerCtaText: '',
      footerCtaUrl: '',
      ...getInternationalVisibilityDefaults(preset.code),
      productTranslations: {},
    };
  };

  const addInternationalRule = () => {
    const code = String(internationalCountryToAdd || '').toUpperCase();
    const preset = getInternationalCountryPreset(code);
    if (!preset) {
      setInternationalError('Escolha um país da lista.');
      return;
    }
    if (internationalRules.some((rule) =>
      String(rule.countryCode || '').toUpperCase() === code ||
      (rule.additionalCountries || []).some((item) => String(item.countryCode || '').toUpperCase() === code)
    )) {
      setInternationalError(`${preset.name} já está vinculado a uma configuração internacional desta Vitrine.`);
      return;
    }
    setInternationalRules((current) => [...current, buildInternationalRuleFromPreset(code)]);
    setInternationalError(null);
  };

  const updateInternationalRule = (index: number, patch: Partial<BestSellerInternationalCountryRule>) => {
    setInternationalRules((current) => current.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
  };

  const addInternationalAdditionalCountry = (ruleIndex: number, countryCode: string) => {
    const code = String(countryCode || '').trim().toUpperCase();
    const preset = getInternationalCountryPreset(code);
    if (!preset) {
      setInternationalError('Escolha um país adicional da lista.');
      return;
    }
    const alreadyUsed = internationalRules.some((rule, index) =>
      String(rule.countryCode || '').toUpperCase() === code ||
      (rule.additionalCountries || []).some((item) => String(item.countryCode || '').toUpperCase() === code)
    );
    if (alreadyUsed) {
      setInternationalError(`${preset.name} já está vinculado a outra configuração internacional.`);
      return;
    }
    setInternationalRules((current) => current.map((rule, index) => {
      if (index !== ruleIndex) return rule;
      const next: BestSellerInternationalAdditionalCountry = {
        countryCode: preset.code,
        currencyCode: preset.currency,
        currencyRate: preset.currency === rule.currencyCode ? Number(rule.currencyRate) || 0 : 0,
        approximateConversion: preset.currency !== 'BRL',
        approximateLabel: preset.approximateLabel,
      };
      return { ...rule, additionalCountries: [...(rule.additionalCountries || []), next] };
    }));
    setInternationalAdditionalCountryDrafts((current) => ({ ...current, [ruleIndex]: '' }));
    setInternationalError(null);
  };

  const updateInternationalAdditionalCountry = (
    ruleIndex: number,
    additionalIndex: number,
    patch: Partial<BestSellerInternationalAdditionalCountry>,
  ) => {
    setInternationalRules((current) => current.map((rule, index) => {
      if (index !== ruleIndex) return rule;
      const next = [...(rule.additionalCountries || [])];
      if (!next[additionalIndex]) return rule;
      next[additionalIndex] = { ...next[additionalIndex], ...patch };
      return { ...rule, additionalCountries: next };
    }));
  };

  const removeInternationalAdditionalCountry = (ruleIndex: number, additionalIndex: number) => {
    setInternationalRules((current) => current.map((rule, index) => {
      if (index !== ruleIndex) return rule;
      return {
        ...rule,
        additionalCountries: (rule.additionalCountries || []).filter((_, itemIndex) => itemIndex !== additionalIndex),
      };
    }));
  };

  const updateInternationalProductTranslation = (
    ruleIndex: number,
    productId: string,
    patch: Partial<BestSellerInternationalProductTranslation>,
  ) => {
    setInternationalRules((current) => current.map((rule, index) => {
      if (index !== ruleIndex) return rule;
      const existing: BestSellerInternationalProductTranslation = { ...(rule.productTranslations?.[productId] || {}) };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined) delete (existing as Record<string, unknown>)[key];
        else (existing as Record<string, unknown>)[key] = value;
      });
      const nextTranslations: Record<string, BestSellerInternationalProductTranslation> = { ...(rule.productTranslations || {}) };
      if (Object.keys(existing).length > 0) nextTranslations[productId] = existing;
      else delete nextTranslations[productId];
      return { ...rule, productTranslations: nextTranslations };
    }));
  };

  const getAutomaticCategoryEntries = (locale = 'pt-BR') => {
    const counts = new Map<string, number>();
    products
      .filter((product) => product.itemType !== 'video' && product.itemType !== 'benefits')
      .forEach((product) => {
        const key = detectBestSellerCategoryKey(product);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    return BEST_SELLER_CATEGORY_KEYS
      .filter((key) => (counts.get(key) || 0) > 0)
      .map((key) => ({
        key,
        count: counts.get(key) || 0,
        sourceLabel: getBestSellerCategoryBaseLabel(key),
        automaticLabel: getBestSellerCategoryLabel(locale, key),
      }));
  };

  const downloadJsonFile = (filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportInternationalTranslations = (ruleIndex: number) => {
    if (!selectedList) return;
    const rule = internationalRules[ruleIndex];
    if (!rule) return;
    const locale = normalizeInternationalLocale(rule.locale || 'en');
    const sourceUi = getBestSellerUiText('pt-BR');
    const targetUi = getBestSellerUiText(locale);
    const preset = getInternationalCountryPreset(rule.countryCode);
    const categories = getAutomaticCategoryEntries(locale);
    const translations = rule.productTranslations || {};

    const payload = {
      schemaVersion: 'zhaya-match-translations@1',
      instructions: 'Traduza apenas os campos dentro de translation. Não altere schemaVersion, country, product.id, product.type, product.displayGroup nem os campos source.',
      listId: selectedList.id,
      country: {
        code: String(rule.countryCode || '').toUpperCase(),
        name: preset?.name || rule.countryCode,
        locale,
      },
      list: {
        source: {
          title: selectedList.title || '',
          subtitle: selectedList.subtitle || '',
          ctaText: selectedList.ctaText || sourceUi.defaultCta,
          footerCtaText: selectedList.footerCtaText || '',
          formTitle: sourceUi.formDefaultTitle,
          formMessage: sourceUi.formDefaultMessage,
          redirectMessage: rule.redirectProducts ? 'Infelizmente os produtos acima não possuem envio internacional. Explore abaixo os produtos disponíveis para o seu país.' : '',
          organizedTitle: sourceUi.organizedTitle,
          organizedSubtitle: sourceUi.organizedSubtitle,
          approximateLabel: 'Conversão aproximada',
          whatsappMessage: '',
        },
        translation: {
          title: rule.title || '',
          subtitle: rule.subtitle || '',
          ctaText: rule.ctaText || '',
          footerCtaText: rule.footerCtaText || '',
          formTitle: rule.formTitle || targetUi.formDefaultTitle,
          formMessage: rule.formMessage || targetUi.formDefaultMessage,
          redirectMessage: rule.redirectMessage || '',
          organizedTitle: rule.organizedTitle || targetUi.organizedTitle,
          organizedSubtitle: rule.organizedSubtitle || targetUi.organizedSubtitle,
          approximateLabel: rule.approximateLabel || targetUi.approximateConversion,
          whatsappMessage: rule.whatsappMessage || '',
        },
      },
      categories: categories.map((category) => ({
        key: category.key,
        count: category.count,
        source: category.sourceLabel,
        translation: rule.categoryTranslations?.[category.key] || category.automaticLabel,
      })),
      products: products.map((product) => {
        const translated = translations[product.id] || {};
        const sourceDescription = product.itemType === 'video'
          ? (product.category && product.category.toLowerCase() !== 'vídeo' ? product.category : '')
          : (product.description || product.category || '');
        const effectiveBadgeText = product.badgeUseListDefault ? (selectedList.defaultBadgeText || '') : (product.badgeText || '');
        const effectiveGiftLabel = product.giftMode === 'inherit' ? (selectedList.giftLabel || '') : (product.giftLabel || '');
        const effectiveGiftTitle = product.giftMode === 'inherit' ? (selectedList.giftTitle || '') : (product.giftTitle || '');
        return {
          id: product.id,
          type: product.itemType || 'product',
          displayGroup: product.displayGroup === 'redirect' ? 'redirect' : 'main',
          source: {
            name: product.name || '',
            description: sourceDescription,
            videoTitle: product.videoTitle || '',
            benefits: product.benefits || [],
            badgeText: effectiveBadgeText,
            giftLabel: effectiveGiftLabel,
            giftTitle: effectiveGiftTitle,
            colors: product.colors || [],
            sizes: product.sizes || [],
            outOfStockSizes: product.outOfStockSizes || [],
          },
          translation: {
            name: translated.name || '',
            description: translated.description || '',
            videoTitle: translated.videoTitle || '',
            benefits: translated.benefits || [],
            badgeText: translated.badgeText || '',
            giftLabel: translated.giftLabel || '',
            giftTitle: translated.giftTitle || '',
            colors: translated.colors || [],
            sizes: translated.sizes || [],
            outOfStockSizes: translated.outOfStockSizes || [],
          },
        };
      }),
    };

    const safeCountry = String(rule.countryCode || 'INT').toUpperCase();
    const safeSlug = String(selectedList.slug || selectedList.title || 'vitrine').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'vitrine';
    downloadJsonFile(`zhaya-match-traducoes-${safeSlug}-${safeCountry}.json`, payload);
    setInternationalJsonMessage(`JSON de ${safeCountry} exportado com ${products.length} item(ns) e ${categories.length} categoria(s).`);
    setInternationalError(null);
  };

  const applyInternationalTranslationJson = (raw: string, ruleIndex: number) => {
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 'zhaya-match-translations@1') throw new Error('Formato inválido. Use um JSON de traduções exportado pelo Zhaya Match.');
    const targetRule = internationalRules[ruleIndex];
    if (!targetRule) throw new Error('País de destino não encontrado.');
    const fileCountry = String(parsed?.country?.code || '').toUpperCase();
    const targetCountry = String(targetRule.countryCode || '').toUpperCase();
    if (fileCountry && fileCountry !== targetCountry) {
      throw new Error(`Este arquivo foi exportado para ${fileCountry}, mas você está importando em ${targetCountry}.`);
    }

    const textOrNull = (value: unknown): string | null => {
      const text = String(value ?? '').trim();
      return text || null;
    };
    const listOfText = (value: unknown): string[] => Array.isArray(value)
      ? value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 40)
      : [];
    const listTranslation = parsed?.list?.translation && typeof parsed.list.translation === 'object' ? parsed.list.translation : {};
    const categories = Array.isArray(parsed?.categories) ? parsed.categories : [];
    const productRows = Array.isArray(parsed?.products) ? parsed.products : [];
    const validProductIds = new Set(products.map((product) => product.id));

    setInternationalRules((current) => current.map((rule, index) => {
      if (index !== ruleIndex) return rule;
      const nextRule: BestSellerInternationalCountryRule = { ...rule };
      const listFields: Array<keyof BestSellerInternationalCountryRule> = [
        'title', 'subtitle', 'ctaText', 'footerCtaText', 'formTitle', 'formMessage', 'redirectMessage',
        'organizedTitle', 'organizedSubtitle', 'approximateLabel', 'whatsappMessage',
      ];
      listFields.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(listTranslation, key)) {
          (nextRule as any)[key] = textOrNull(listTranslation[key]);
        }
      });

      const nextCategories: Record<string, string> = { ...(rule.categoryTranslations || {}) };
      categories.forEach((category: any) => {
        const key = String(category?.key || '').trim();
        if (!key) return;
        const value = String(category?.translation ?? '').trim();
        if (value) nextCategories[key] = value;
        else delete nextCategories[key];
      });
      nextRule.categoryTranslations = nextCategories;

      const nextProductTranslations: Record<string, BestSellerInternationalProductTranslation> = { ...(rule.productTranslations || {}) };
      const allowedTextFields = ['name', 'description', 'videoTitle', 'badgeText', 'giftLabel', 'giftTitle'] as const;
      const allowedListFields = ['benefits', 'colors', 'sizes', 'outOfStockSizes'] as const;
      productRows.forEach((row: any) => {
        const productId = String(row?.id || '');
        if (!productId || !validProductIds.has(productId) || !row?.translation || typeof row.translation !== 'object') return;
        const existing: BestSellerInternationalProductTranslation = { ...(nextProductTranslations[productId] || {}) };
        allowedTextFields.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(row.translation, key)) {
            const value = textOrNull(row.translation[key]);
            if (value === null) delete (existing as any)[key];
            else (existing as any)[key] = value;
          }
        });
        allowedListFields.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(row.translation, key)) {
            const value = listOfText(row.translation[key]);
            if (value.length === 0) delete (existing as any)[key];
            else (existing as any)[key] = value;
          }
        });
        if (Object.keys(existing).length > 0) nextProductTranslations[productId] = existing;
        else delete nextProductTranslations[productId];
      });
      nextRule.productTranslations = nextProductTranslations;
      return nextRule;
    }));

    setInternationalJsonMessage(`Traduções importadas para ${targetCountry}: ${productRows.length} item(ns) processado(s). Revise e clique em “Salvar internacional”.`);
    setInternationalError(null);
  };

  const handleInternationalTranslationFile = async (file: File | undefined) => {
    if (!file || internationalJsonRuleIndex === null) return;
    try {
      const raw = await file.text();
      applyInternationalTranslationJson(raw, internationalJsonRuleIndex);
    } catch (error: any) {
      setInternationalError(error?.message || 'Não foi possível importar o JSON de traduções.');
    } finally {
      setInternationalJsonRuleIndex(null);
      if (internationalJsonFileInputRef.current) internationalJsonFileInputRef.current.value = '';
    }
  };

  const changeInternationalRuleCountry = (index: number, countryCode: string) => {
    const code = String(countryCode || '').toUpperCase();
    const preset = getInternationalCountryPreset(code);
    if (!preset) return;
    if (internationalRules.some((rule, i) =>
      (i !== index && String(rule.countryCode || '').toUpperCase() === code) ||
      (rule.additionalCountries || []).some((item) => String(item.countryCode || '').toUpperCase() === code)
    )) {
      setInternationalError(`${preset.name} já está vinculado a outra configuração internacional.`);
      return;
    }
    setInternationalRules((current) => current.map((rule, i) => {
      if (i !== index) return rule;
      const previousPreset = getInternationalCountryPreset(rule.countryCode);
      const shouldReplaceCta = !rule.ctaText || rule.ctaText === previousPreset?.ctaText || rule.ctaText === selectedList?.ctaText;
      const previousVisibility = getInternationalVisibilityDefaults(rule.countryCode);
      const nextVisibility = getInternationalVisibilityDefaults(preset.code);
      const preserveOrReplace = (key: keyof ReturnType<typeof getInternationalVisibilityDefaults>) =>
        rule[key] === undefined || rule[key] === previousVisibility[key] ? nextVisibility[key] : rule[key];
      return {
        ...rule,
        countryCode: preset.code,
        locale: preset.locale,
        currencyCode: preset.currency,
        approximateConversion: preset.currency !== 'BRL',
        approximateLabel: preset.approximateLabel,
        ctaText: shouldReplaceCta ? preset.ctaText : rule.ctaText,
        showPrices: preserveOrReplace('showPrices'),
        showInstallments: preserveOrReplace('showInstallments'),
        showCta: preserveOrReplace('showCta'),
        showFooterCta: preserveOrReplace('showFooterCta'),
        showBenefits: preserveOrReplace('showBenefits'),
        showSoldQuantity: preserveOrReplace('showSoldQuantity'),
        showAvailableQuantity: preserveOrReplace('showAvailableQuantity'),
        showSizes: preserveOrReplace('showSizes'),
        showColors: preserveOrReplace('showColors'),
        showBadges: preserveOrReplace('showBadges'),
        showGift: preserveOrReplace('showGift'),
        showProductTimers: preserveOrReplace('showProductTimers'),
      };
    }));
    setInternationalError(null);
  };

  const saveInternationalConfig = async () => {
    if (!selectedList) return;
    const normalizedRules = internationalRules.map((rule) => ({
      ...rule,
      countryCode: String(rule.countryCode || '').trim().toUpperCase().slice(0, 2),
      locale: normalizeInternationalLocale(rule.locale || 'en'),
      currencyCode: String(rule.currencyCode || 'USD').trim().toUpperCase(),
      currencyRate: Number(rule.currencyRate),
      additionalCountries: (rule.additionalCountries || []).map((item) => ({
        ...item,
        countryCode: String(item.countryCode || '').trim().toUpperCase().slice(0, 2),
        currencyCode: String(item.currencyCode || getInternationalCountryPreset(item.countryCode)?.currency || 'USD').trim().toUpperCase(),
        currencyRate: Number(item.currencyRate),
        approximateConversion: item.approximateConversion !== false,
        approximateLabel: String(item.approximateLabel || '').trim() || getInternationalCountryPreset(item.countryCode)?.approximateLabel || '',
      })),
    }));
    const invalid = normalizedRules.find((rule) =>
      !/^[A-Z]{2}$/.test(rule.countryCode) ||
      !Number.isFinite(rule.currencyRate) ||
      rule.currencyRate <= 0 ||
      (rule.additionalCountries || []).some((item) =>
        !/^[A-Z]{2}$/.test(item.countryCode) ||
        !Number.isFinite(item.currencyRate) ||
        item.currencyRate <= 0
      )
    );
    if (invalid) {
      setInternationalError('Cada país principal ou adicional precisa de um código válido e uma taxa maior que zero.');
      return;
    }

    const allCountryCodes = normalizedRules.flatMap((rule) => [
      rule.countryCode,
      ...(rule.additionalCountries || []).map((item) => item.countryCode),
    ]);
    if (new Set(allCountryCodes).size !== allCountryCodes.length) {
      setInternationalError('Um mesmo país não pode estar em duas configurações internacionais ao mesmo tempo.');
      return;
    }
    const invalidFooterUrl = normalizedRules.find((rule) => {
      const value = String(rule.footerCtaUrl || '').trim();
      return value && !/^https?:\/\//i.test(value);
    });
    if (invalidFooterUrl) {
      setInternationalError('O link internacional do CTA final deve começar com http:// ou https://.');
      return;
    }
    const redirectWithoutMessage = normalizedRules.find((rule) => rule.redirectProducts && !String(rule.redirectMessage || '').trim());
    if (redirectWithoutMessage) {
      const countryName = getInternationalCountryPreset(redirectWithoutMessage.countryCode)?.name || redirectWithoutMessage.countryCode;
      setInternationalError(`Escreva a mensagem de redirecionamento para ${countryName}.`);
      return;
    }
    setInternationalSaving(true);
    setInternationalError(null);
    try {
      const config: BestSellerInternationalConfig = { enabled: internationalEnabled, rules: normalizedRules };
      const result = await Repository.updateBestSellerList(selectedList.id, { internationalConfig: config });
      if (!result.success) {
        setInternationalError(result.error || 'Não foi possível salvar a configuração internacional.');
        return;
      }
      const nextList = result.list || { ...selectedList, internationalConfig: config };
      setSelectedList(nextList);
      setLists((current) => current.map((item) => item.id === selectedList.id ? { ...item, ...nextList } : item));
      setInternationalModalOpen(false);
    } finally {
      setInternationalSaving(false);
    }
  };

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

        <div className="flex flex-wrap items-center justify-end gap-2">
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
                onClick={handleOpenCreateBenefitsBlock}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Benefícios
              </button>
              <button
                type="button"
                onClick={handleOpenCreateVideoBlock}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Vídeo 9:16
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

          {lists.length > 0 && (
            <BestSellerOverallHoursCard summary={overallHours} loading={overallHoursLoading} />
          )}

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
                        <h3 className="text-sm font-semibold text-neutral-900">{list.title || 'Vitrine sem título'}</h3>
                        {list.subtitle && (
                          <span className="text-xs text-neutral-500 italic">
                            — {list.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100" onClick={(e) => e.stopPropagation()}>
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
                        Gerenciar Itens
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
                            name: `Lista de ${formatDatePtBR(list.listDate)} (${list.title || 'Vitrine sem título'})`,
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
                <h2 className="text-base font-bold text-neutral-900">{selectedList.title || 'Vitrine sem título'}</h2>
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

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleOpenInternational}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  title="Tradução, moeda e destino dos botões por país"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  Internacional
                </button>
                <a
                  href={`/admin/formularios?listId=${encodeURIComponent(selectedList.id)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  title="Ver pessoas interessadas nesta vitrine"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Formulários
                </a>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Relatório WhatsApp
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

            {
              <div className={`rounded-xl border p-4 ${
                liveSession?.status === 'running'
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : liveSession?.status === 'paused'
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-neutral-200 bg-neutral-50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        liveSession?.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                        liveSession?.status === 'paused' ? 'bg-amber-500' : 'bg-neutral-400'
                      }`} />
                      <span className="text-xs font-bold text-neutral-900">
                        TIMER DE LIVE
                      </span>
                      {liveSession?.startedAt && (
                        <span className="text-[10px] text-neutral-500">
                          Início: {formatDateTimePtBR(liveSession.startedAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold text-neutral-500">{liveSession?.status === 'running' ? 'Ao vivo' : liveSession?.status === 'paused' ? 'Pausado' : 'Pronto'}</div>
                    <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
                      {formatLiveDuration(liveElapsedSeconds)}
                    </div>
                    {liveConfigured === false && (
                      <p className="text-[10px] text-amber-700 mt-1">
                        Execute o SQL das melhorias de hoje para habilitar as sessões de live no Supabase.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(!liveSession || liveSession.status === 'stopped') && (
                      <button
                        type="button"
                        onClick={() => handleLiveAction('start')}
                        disabled={liveActionLoading || liveConfigured === false}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                      >
                        {liveActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Play
                      </button>
                    )}
                    {liveSession?.status === 'running' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLiveAction('pause')}
                          disabled={liveActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-200 disabled:opacity-50 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Pausar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLiveAction('stop')}
                          disabled={liveActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Parar
                        </button>
                      </>
                    )}
                    {liveSession?.status === 'paused' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLiveAction('resume')}
                          disabled={liveActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLiveAction('stop')}
                          disabled={liveActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Parar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            }

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
                <div className="flex items-center gap-2">
                  {analyticsLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
                </div>
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
                  {productItemsForMetrics.length > 1 && <span><strong className="text-neutral-700">Viram todos os produtos:</strong> {listAnalytics.viewedAllProductsRate ?? 0}%</span>}
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
                            <div className="flex items-center gap-1.5 shrink-0">
                              {(item.clicks || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 text-white px-2 py-0.5 text-[9px] font-bold">
                                  <MousePointerClick className="w-2.5 h-2.5" />
                                  {item.clicks}
                                </span>
                              )}
                              <strong className="text-neutral-900" title="Visitantes">{item.count}</strong>
                            </div>
                          </div>
                        );
                      }) : <span className="text-[11px] text-neutral-400">Sem dados ainda.</span>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2"><ShoppingBag className="w-3.5 h-3.5" /> Por produto</div>
                    <div className={`space-y-2 ${analyticsProductsExpanded ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}>
                      {listAnalytics.products.length > 0 ? listAnalytics.products.slice(0, analyticsProductsExpanded ? undefined : 8).map((item) => (
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
                      {listAnalytics.products.length > 8 && (
                        <button type="button" onClick={() => setAnalyticsProductsExpanded((value) => !value)} className="w-full mt-2 py-1.5 rounded border border-neutral-200 bg-neutral-50 text-[9px] font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer">
                          {analyticsProductsExpanded ? 'Mostrar menos' : `Ver todos os ${listAnalytics.products.length} produtos`}
                        </button>
                      )}
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
                    Itens da Vitrine ({products.length})
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    A posição (#1, #2, #3...) é controlada manualmente através das setas de ordenação.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenBulkJson()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Adicionar JSON em Massa
                  </button>
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
                    onClick={handleOpenCreateBenefitsBlock}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Benefícios
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateVideoBlock}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Vídeo 9:16
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
                  Carregando itens...
                </div>
              ) : products.length === 0 ? (
                <div className="bg-neutral-50 border border-dashed border-neutral-300 rounded-lg p-10 text-center space-y-2">
                  <Package className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700">Nenhum item cadastrado nesta lista</p>
                  <p className="text-[11px] text-neutral-500">
                    Adicione produtos, vídeos e benefícios e organize a vitrine na ordem que quiser.
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
                    onClick={handleOpenCreateBenefitsBlock}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer mt-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Adicionar benefícios
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateVideoBlock}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer mt-2"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Adicionar vídeo 9:16
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenProductLibrary}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer mt-2"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Reaproveitar salvo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBulkJson()}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer mt-2"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Adicionar JSON em Massa
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mainDisplayProducts.length === 0 && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-600">Principal</div>
                          <p className="text-[10px] text-neutral-500 mt-0.5">Conteúdo normal da vitrine. Nenhum item nesta área.</p>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500">0 item(ns)</span>
                      </div>
                    </div>
                  )}
                  {productsForAdminDisplay.map((prod, idx) => {
                    const group: 'main' | 'redirect' = prod.displayGroup === 'redirect' ? 'redirect' : 'main';
                    const groupItems = group === 'redirect' ? redirectDisplayProducts : mainDisplayProducts;
                    const groupIndex = groupItems.findIndex((item) => item.id === prod.id);
                    const posNumber = groupIndex + 1;
                    const showGroupHeader = groupIndex === 0;
                    return (
                      <React.Fragment key={prod.id}>
                        {showGroupHeader && (
                          <div className={`rounded-lg border px-3.5 py-3 ${group === 'redirect' ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-neutral-50'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${group === 'redirect' ? 'text-amber-800' : 'text-neutral-600'}`}>
                                  {group === 'redirect' ? 'Redirecionar' : 'Principal'}
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                  {group === 'redirect'
                                    ? 'Não aparece para brasileiros. Só entra em países com “Redirecionar produtos esgotados” ativado.'
                                    : 'Conteúdo normal da vitrine.'}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-neutral-500">{groupItems.length} item(ns)</span>
                            </div>
                          </div>
                        )}
                      <div
                        className={`bg-white border rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${group === 'redirect' ? 'border-amber-200 hover:border-amber-300' : 'border-neutral-200 hover:border-neutral-300'}`}
                      >
                        {/* Position & Image Thumbnail & Main Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Reorder Buttons & Position */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={groupIndex === 0}
                                onClick={() => handleMoveProduct(prod.id, 'up')}
                                title="Mover para cima no ranking"
                                className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-20 disabled:hover:text-neutral-400 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={groupIndex === groupItems.length - 1}
                                onClick={() => handleMoveProduct(prod.id, 'down')}
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
                            {prod.itemType === 'benefits' ? (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-700">
                                <Sparkles className="w-5 h-5" />
                              </div>
                            ) : prod.mediaItems?.[0]?.type === 'video' ? (
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
                                {prod.itemType === 'video' ? (prod.videoTitle || 'Vídeo destaque') : prod.name}
                              </span>
                              {prod.displayGroup === 'redirect' && prod.itemType !== 'video' && prod.itemType !== 'benefits' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <Globe2 className="w-2.5 h-2.5" /> Redirecionar
                                </span>
                              )}
                              {prod.itemType === 'video' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white">
                                  <Video className="w-2.5 h-2.5" /> 9:16
                                </span>
                              )}
                              {prod.itemType === 'benefits' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100">
                                  <Sparkles className="w-2.5 h-2.5" /> Benefícios
                                </span>
                              )}
                              {prod.itemType === 'video' && prod.videoAutoplay && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  <Play className="w-2.5 h-2.5" /> Auto-play
                                </span>
                              )}
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
                              {prod.itemType !== 'video' && prod.itemType !== 'benefits' && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                                  title="Total de cliques registrados no link da loja"
                                >
                                  <MousePointerClick className="w-2.5 h-2.5 text-neutral-500" />
                                  <strong>{prod.clicks || 0}</strong> cliques
                                </span>
                              )}

                              {prod.itemType === 'benefits' && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                                  {prod.benefits?.length || 0} vantagens configuradas
                                </span>
                              )}

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
                          {prod.itemType !== 'video' && prod.itemType !== 'benefits' && (
                            <button
                              type="button"
                              onClick={() => void handleChangeProductDisplayGroup(prod, prod.displayGroup === 'redirect' ? 'main' : 'redirect')}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${prod.displayGroup === 'redirect' ? 'text-neutral-700 bg-white border-neutral-200 hover:bg-neutral-50' : 'text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
                              title={prod.displayGroup === 'redirect' ? 'Voltar para a vitrine principal' : 'Mover para a seleção alternativa internacional'}
                            >
                              <Globe2 className="w-3.5 h-3.5" />
                              {prod.displayGroup === 'redirect' ? 'Para Principal' : 'Para Redirecionar'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => prod.itemType === 'video' ? handleOpenEditVideoBlock(prod) : prod.itemType === 'benefits' ? handleOpenEditBenefitsBlock(prod) : handleOpenEditProduct(prod)}
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
                                name: prod.itemType === 'video' ? `Vídeo 9:16 #${posNumber}` : prod.itemType === 'benefits' ? `Bloco de benefícios #${posNumber}` : `Produto #${posNumber} - ${prod.name}`,
                              })
                            }
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded border border-neutral-200 transition-colors cursor-pointer"
                            title={prod.itemType === 'video' ? 'Excluir vídeo destaque' : prod.itemType === 'benefits' ? 'Excluir bloco de benefícios' : 'Excluir produto'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      </React.Fragment>
                    );
                  })}
                  {redirectDisplayProducts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">Redirecionar</div>
                          <p className="text-[10px] text-neutral-500 mt-0.5 max-w-xl">Produtos desta área nunca aparecem para brasileiros. Eles são usados apenas nos países em que “Redirecionar produtos esgotados” estiver ativado.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenBulkJson('redirect')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-900 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Adicionar JSON em Massa
                        </button>
                      </div>
                    </div>
                  )}
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
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3 shrink-0 min-w-0">
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

            <form onSubmit={handleSaveList} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto overscroll-contain flex-1 min-h-0">
              {listError && (
                <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-xs">
                  {listError}
                </div>
              )}

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden" open>
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><Layers className="w-4 h-4" /><span>Identidade e link</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">Nome, endereço público e identidade visual da vitrine.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Título da Vitrine (Opcional)</label>
                <input
                  type="text"
                  value={listFormTitle}
                  onChange={(e) => setListFormTitle(e.target.value)}
                  placeholder="Ex: Best Sellers da Semana"
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
                <p className="text-[10px] text-neutral-500">Se ficar vazio, nenhum título será exibido na página.</p>
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
                            <span className="text-xs font-medium text-neutral-700">Enviando para o Cloudinary...</span>
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
                    <div className="mt-2 flex justify-end">
                      <CloudinaryMediaPicker
                        allowedTypes={['image']}
                        label="Selecionar já enviado"
                        title="Logos e imagens já enviadas"
                        onSelect={(asset) => {
                          setListFormLogoUrl(asset.url);
                          setLogoUploadError(null);
                        }}
                      />
                    </div>
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
                <p className="text-[10px] text-neutral-500">Se ficar vazio, o subtítulo não ocupa espaço na vitrine.</p>
              </div>

              <div className="space-y-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <div>
                  <div className="font-semibold text-neutral-800">Experiência dos produtos</div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">O modo tradicional continua exatamente como já funciona. O organizado é opcional para vitrines grandes.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => setListFormExperienceMode('traditional')} className={`rounded border px-3 py-2.5 text-left cursor-pointer ${listFormExperienceMode === 'traditional' ? 'border-neutral-900 bg-white text-neutral-950' : 'border-neutral-200 bg-white text-neutral-600'}`}>
                    <span className="block text-[10px] font-bold">Imersiva tradicional</span>
                    <span className="block text-[9px] text-neutral-500 mt-0.5">Todos os itens seguem em sequência.</span>
                  </button>
                  <button type="button" onClick={() => setListFormExperienceMode('organized')} className={`rounded border px-3 py-2.5 text-left cursor-pointer ${listFormExperienceMode === 'organized' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>
                    <span className="block text-[10px] font-bold">Imersiva organizada</span>
                    <span className={`block text-[9px] mt-0.5 ${listFormExperienceMode === 'organized' ? 'text-neutral-300' : 'text-neutral-500'}`}>Mostra alguns destaques e depois categorias automáticas.</span>
                  </button>
                </div>
                {listFormExperienceMode === 'organized' && (
                  <div className="flex items-center justify-between gap-3 rounded border border-neutral-200 bg-white px-3 py-2.5">
                    <div>
                      <div className="text-[10px] font-semibold text-neutral-700">Produtos antes das categorias</div>
                      <div className="text-[9px] text-neutral-500">Recomendado: 3, baseado no ponto em que a rolagem começa a cansar.</div>
                    </div>
                    <select value={listFormOrganizedIntroCount} onChange={(e) => setListFormOrganizedIntroCount(e.target.value)} className="w-20 px-2 py-2 border border-neutral-300 rounded bg-white text-xs font-bold">
                      {[1,2,3,4,5,6,8,10,12].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listFormFooterCtaEnabled}
                    onChange={(e) => setListFormFooterCtaEnabled(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>
                    <span className="font-semibold text-neutral-800">Botão no final da página</span>
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      Exibe um CTA depois do último produto para levar a pessoa a uma coleção, categoria ou outro site.
                    </span>
                  </span>
                </label>

                {listFormFooterCtaEnabled && (
                  <div className="grid grid-cols-1 gap-2 pl-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-700">Texto do botão</label>
                      <input
                        type="text"
                        value={listFormFooterCtaText}
                        onChange={(e) => setListFormFooterCtaText(e.target.value)}
                        placeholder="VER TODOS OS PRODUTOS"
                        maxLength={80}
                        className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-neutral-700">Link</label>
                      <input
                        type="url"
                        value={listFormFooterCtaUrl}
                        onChange={(e) => setListFormFooterCtaUrl(e.target.value)}
                        placeholder="https://www.zhaya.com.br/..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>


                </div>
              </details>

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><SlidersHorizontal className="w-4 h-4" /><span>Conversão e padrões</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">CTA, badges e presente padrão.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Texto do botão dos produtos (Opcional)</label>
                <input
                  type="text"
                  value={listFormCtaText}
                  onChange={(e) => setListFormCtaText(e.target.value)}
                  placeholder="GARANTIR MEU PAR"
                  maxLength={40}
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
                <p className="text-[10px] text-neutral-500">Se ficar vazio, todos os produtos usam “GARANTIR MEU PAR”.</p>
              </div>

              <div className="space-y-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <span className="font-semibold text-neutral-800">Cor padrão das badges</span>
                    <p className="text-[10px] text-neutral-500 mt-0.5">É a cor inicial ao configurar badges e também pode ser aplicada às badges já configuradas sem trocar os textos.</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="color" value={listFormDefaultBadgeColor} onChange={(e) => setListFormDefaultBadgeColor(e.target.value.toUpperCase())} className="h-9 w-11 p-1 border border-neutral-300 rounded bg-white cursor-pointer" />
                    <input type="text" value={listFormDefaultBadgeColor} onChange={(e) => setListFormDefaultBadgeColor(e.target.value.toUpperCase())} maxLength={7} className="w-24 px-2.5 py-2 border border-neutral-300 rounded text-xs font-mono uppercase bg-white" />
                  </div>
                </div>

                {editingList && (
                  <label className="flex items-start gap-2 cursor-pointer rounded border border-neutral-200 bg-white px-2.5 py-2">
                    <input type="checkbox" checked={listFormApplyBadgeColorToConfigured} onChange={(e) => setListFormApplyBadgeColorToConfigured(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                    <span>
                      <span className="text-[10px] font-semibold text-neutral-700">Aplicar esta cor às badges já configuradas ao salvar</span>
                      <span className="block text-[9px] text-neutral-500 mt-0.5">Mantém o texto de cada badge e altera apenas a cor.</span>
                    </span>
                  </label>
                )}

                <div className="border-t border-neutral-200 pt-3 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={listFormDefaultBadgeEnabled} onChange={(e) => setListFormDefaultBadgeEnabled(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                    <div>
                      <span className="font-semibold text-neutral-800">Usar também uma badge padrão da Vitrine</span>
                      <p className="text-[10px] text-neutral-500">Produtos marcados como “usar padrão” herdam este texto e a cor definida acima.</p>
                    </div>
                  </label>
                  {listFormDefaultBadgeEnabled && (
                    <>
                      <div className="pl-6 space-y-1">
                        <label className="text-[10px] font-semibold text-neutral-600">Texto padrão</label>
                        <input type="text" maxLength={40} value={listFormDefaultBadgeText} onChange={(e) => setListFormDefaultBadgeText(e.target.value)} placeholder="Ex: ÚLTIMOS PARES" className="w-full px-3 py-2 border border-neutral-300 rounded text-xs bg-white" />
                      </div>
                      {editingList && (
                        <label className="ml-6 flex items-start gap-2 cursor-pointer rounded border border-neutral-200 bg-white px-2.5 py-2">
                          <input type="checkbox" checked={listFormApplyBadgeToAll} onChange={(e) => setListFormApplyBadgeToAll(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                          <span>
                            <span className="text-[10px] font-semibold text-neutral-700">Aplicar esta badge padrão a todos os produtos ao salvar</span>
                            <span className="block text-[9px] text-neutral-500 mt-0.5">Aqui troca texto e cor porque os produtos passam a usar o padrão da Vitrine.</span>
                          </span>
                        </label>
                      )}
                    </>
                  )}
                </div>
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
                    {giftPresets.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const gift = giftPresets.find((item) => item.id === e.target.value);
                          if (gift) applyGiftPresetToList(gift);
                          e.currentTarget.value = '';
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 rounded bg-white text-[10px] font-semibold text-neutral-700"
                      >
                        <option value="">Usar presente salvo...</option>
                        {giftPresets.map((gift) => <option key={gift.id} value={gift.id}>{gift.title || gift.label || gift.imageUrl.split('/').pop() || 'Presente salvo'}</option>)}
                      </select>
                    )}
                    {!giftLibraryConfigured && <p className="text-[9px] text-amber-700">Biblioteca de presentes: execute o SQL desta versão para salvar e reutilizar configurações completas.</p>}
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
                    <div className="flex justify-end">
                      <CloudinaryMediaPicker
                        allowedTypes={['image']}
                        label="Selecionar já enviado"
                        title="Imagens já enviadas"
                        onSelect={(asset) => {
                          setListFormGiftImageUrl(asset.url);
                          setListFormGiftImagePath(`cloudinary:${asset.resourceType}:${asset.publicId}`);
                          setListFormGiftEnabled(true);
                        }}
                      />
                    </div>
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
                    <div className="pt-1 flex items-center justify-between gap-3">
                      <p className="text-[9px] text-neutral-500">Salvar guarda a imagem e todos os textos para reutilizar depois.</p>
                      <button
                        type="button"
                        onClick={saveCurrentListGiftPreset}
                        disabled={savingGiftPreset || !listFormGiftImageUrl.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-neutral-900 text-white text-[10px] font-bold disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        {savingGiftPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Salvar presente
                      </button>
                    </div>
                    {giftPresetMessage && <p className="text-[9px] text-emerald-700">{giftPresetMessage}</p>}
                  </div>
                )}
              </div>


                </div>
              </details>

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><Eye className="w-4 h-4" /><span>Exibição</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">Escolha o que aparece na composição pública.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

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


                </div>
              </details>

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><Video className="w-4 h-4" /><span>Fundo da vitrine</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">Vídeo decorativo, opacidade e desfoque.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

              <div className="space-y-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
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
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => backgroundVideoFileInputRef.current?.click()}
                      disabled={uploadingBackgroundVideo}
                      className="w-full py-2.5 border border-dashed border-neutral-300 rounded bg-white text-[11px] font-semibold text-neutral-700 hover:border-neutral-500 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {uploadingBackgroundVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      {uploadingBackgroundVideo ? 'Enviando vídeo...' : (listFormBackgroundVideoUrl ? 'Trocar vídeo de fundo' : 'Enviar vídeo de fundo')}
                    </button>
                    <CloudinaryMediaPicker
                      allowedTypes={['video']}
                      label="Selecionar já enviado"
                      title="Vídeos já enviados"
                      onSelect={(asset) => {
                        setListFormBackgroundVideoUrl(asset.url);
                        setListFormBackgroundVideoPath(`cloudinary:${asset.resourceType}:${asset.publicId}`);
                      }}
                    />
                  </div>
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


                </div>
              </details>

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><Calendar className="w-4 h-4" /><span>Publicação</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">Data de referência e link padrão.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

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


                </div>
              </details>

              <details className="group rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="list-none cursor-pointer select-none px-3.5 py-3 flex items-center justify-between gap-3 bg-neutral-50 hover:bg-neutral-100 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-800"><Clock className="w-4 h-4" /><span>Timer</span></div>
                    <p className="text-[9px] text-neutral-500 mt-0.5 pl-6">Urgência geral e looping por visitante.</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3.5 sm:p-4 space-y-4">

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
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2.5">
                    <div>
                      <p className="text-[11px] font-black text-neutral-800 tracking-wide">COR DE TODOS OS PRODUTOS</p>
                      <p className="text-[9px] text-neutral-500 mt-0.5">Define de uma vez a cor dos timers individuais de todos os produtos desta vitrine.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9A-F]{6}$/i.test(listFormTimerColorForAll) ? listFormTimerColorForAll : '#FFFFFF'}
                        onChange={(e) => setListFormTimerColorForAll(e.target.value.toUpperCase())}
                        className="h-9 w-11 p-1 border border-neutral-300 rounded bg-white cursor-pointer"
                      />
                      <input
                        type="text"
                        value={listFormTimerColorForAll}
                        onChange={(e) => setListFormTimerColorForAll(e.target.value.toUpperCase())}
                        maxLength={7}
                        className="w-24 px-2.5 py-2 border border-neutral-300 rounded text-xs font-mono uppercase bg-white"
                      />
                      <label className="flex items-center gap-2 cursor-pointer ml-0 sm:ml-1">
                        <input
                          type="checkbox"
                          checked={listFormApplyTimerColorToAll}
                          onChange={(e) => setListFormApplyTimerColorToAll(e.target.checked)}
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span className="text-[10px] font-bold text-neutral-700">Aplicar a todos ao salvar</span>
                      </label>
                    </div>
                    <p className="text-[9px] text-neutral-500">A cor individual atual será substituída em todos os itens. Isso não liga nem desliga timers e não altera duração ou horário.</p>
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


                </div>
              </details>

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
      {/* MODAL: Adicionar JSON em Massa (captura de categoria da extensão)          */}
      {/* ========================================================================= */}
      {isBulkJsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Layers className="w-4 h-4" /> Adicionar JSON em Massa</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Importa de uma vez os produtos capturados em uma categoria pela extensão Zhaya Match.</p>
              </div>
              <button
                type="button"
                disabled={bulkJsonImporting}
                onClick={() => setIsBulkJsonModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-neutral-600 leading-relaxed">
                Use o <strong>JSON COMPLETO</strong> gerado pelo modo “Capturar categoria” da extensão. A ordem de <code className="font-mono text-[10px]">products[]</code> será mantida na vitrine. Produtos já cadastrados pela mesma URL são ignorados automaticamente.
              </div>

              {bulkJsonError && (
                <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-[11px]">{bulkJsonError}</div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Adicionar produtos em</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={bulkJsonImporting}
                    onClick={() => setBulkJsonDisplayGroup('main')}
                    className={`rounded border px-3 py-2.5 text-left cursor-pointer disabled:opacity-50 ${bulkJsonDisplayGroup === 'main' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}
                  >
                    <span className="block text-[10px] font-bold">PRINCIPAL</span>
                    <span className={`block text-[9px] mt-0.5 ${bulkJsonDisplayGroup === 'main' ? 'text-neutral-300' : 'text-neutral-400'}`}>Vitrine normal, inclusive Brasil.</span>
                  </button>
                  <button
                    type="button"
                    disabled={bulkJsonImporting}
                    onClick={() => setBulkJsonDisplayGroup('redirect')}
                    className={`rounded border px-3 py-2.5 text-left cursor-pointer disabled:opacity-50 ${bulkJsonDisplayGroup === 'redirect' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-neutral-200 bg-white text-neutral-700'}`}
                  >
                    <span className="block text-[10px] font-bold">REDIRECIONAR</span>
                    <span className="block text-[9px] mt-0.5 text-neutral-500">Seleção alternativa para países configurados.</span>
                  </button>
                </div>
              </div>

              <input
                ref={bulkJsonFileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => { void handleBulkJsonFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkJsonImporting}
                  onClick={() => bulkJsonFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-neutral-900 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> SELECIONAR ARQUIVO JSON
                </button>
                {bulkJsonFileName && <span className="text-[10px] text-neutral-500 truncate max-w-[360px]" title={bulkJsonFileName}>{bulkJsonFileName}</span>}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-semibold text-neutral-700">Ou cole o JSON completo</label>
                  {bulkJsonInput && <span className="text-[9px] text-neutral-400">{Math.round(bulkJsonInput.length / 1024)} KB</span>}
                </div>
                <textarea
                  value={bulkJsonInput}
                  onChange={(e) => { setBulkJsonInput(e.target.value); setBulkJsonFileName(''); setBulkJsonError(null); }}
                  rows={10}
                  spellCheck={false}
                  disabled={bulkJsonImporting}
                  placeholder={'{\n  "schemaVersion": "zhaya-match-category@1",\n  "products": [...]\n}'}
                  className="w-full rounded border border-neutral-300 bg-white px-3 py-2 font-mono text-[10px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-100"
                />
              </div>

              {bulkJsonInput.trim() && !bulkJsonAnalysis.error && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="rounded border border-neutral-200 p-2 bg-white"><div className="text-[9px] uppercase text-neutral-400 font-bold">Encontrados</div><div className="text-lg font-bold text-neutral-900">{bulkJsonAnalysis.entries.length}</div></div>
                  <div className="rounded border border-emerald-200 p-2 bg-emerald-50"><div className="text-[9px] uppercase text-emerald-600 font-bold">Novos</div><div className="text-lg font-bold text-emerald-800">{bulkJsonAnalysis.importable.length}</div></div>
                  <div className="rounded border border-amber-200 p-2 bg-amber-50"><div className="text-[9px] uppercase text-amber-600 font-bold">Já na vitrine</div><div className="text-lg font-bold text-amber-800">{bulkJsonAnalysis.duplicates}</div></div>
                  <div className="rounded border border-neutral-200 p-2 bg-neutral-50"><div className="text-[9px] uppercase text-neutral-500 font-bold">Repetidos</div><div className="text-lg font-bold text-neutral-700">{bulkJsonAnalysis.repeatedInsideJson}</div></div>
                  <div className="rounded border border-red-200 p-2 bg-red-50"><div className="text-[9px] uppercase text-red-500 font-bold">Inválidos</div><div className="text-lg font-bold text-red-700">{bulkJsonAnalysis.invalid}</div></div>
                </div>
              )}

              {bulkJsonImporting || bulkJsonProgress.done > 0 ? (
                <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-600">
                    <span>{bulkJsonImporting ? 'Importando produtos…' : 'Importação concluída'}</span>
                    <span>{bulkJsonProgress.done}/{bulkJsonProgress.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full bg-neutral-900 transition-all" style={{ width: `${bulkJsonProgress.total ? Math.round((bulkJsonProgress.done / bulkJsonProgress.total) * 100) : 0}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-neutral-500">
                    <span><strong className="text-emerald-700">{bulkJsonProgress.imported}</strong> importados</span>
                    <span><strong className="text-amber-700">{bulkJsonProgress.skipped}</strong> ignorados</span>
                    <span><strong className="text-red-700">{bulkJsonProgress.failed}</strong> falhas</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0 bg-neutral-50">
              <span className="text-[9px] text-neutral-400">
                {bulkJsonAnalysis.schemaVersion ? `Formato: ${bulkJsonAnalysis.schemaVersion}` : 'Formato esperado: zhaya-match-category@1'}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={bulkJsonImporting} onClick={() => setIsBulkJsonModalOpen(false)} className="px-3 py-2 rounded border border-neutral-300 bg-white text-[10px] font-semibold text-neutral-600 cursor-pointer disabled:opacity-50">Fechar</button>
                <button
                  type="button"
                  onClick={() => void handleImportBulkJson()}
                  disabled={bulkJsonImporting || Boolean(bulkJsonAnalysis.error) || bulkJsonAnalysis.importable.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-neutral-900 text-white text-[10px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  {bulkJsonImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  {bulkJsonImporting ? 'IMPORTANDO…' : `IMPORTAR ${bulkJsonAnalysis.importable.length || ''} PRODUTO${bulkJsonAnalysis.importable.length === 1 ? '' : 'S'}`}
                </button>
              </div>
            </div>
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

              {productJsonMessage && (
                <div className="p-3 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                  {productJsonMessage}
                </div>
              )}

              {!editingProduct && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-neutral-800">Importar da extensão Zhaya</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Cole o JSON copiado na página do produto para preencher tudo de uma vez.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadExtension}
                        disabled={downloadingExtension}
                        className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white text-neutral-700 text-[10px] font-bold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {downloadingExtension ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        BAIXAR EXTENSÃO
                      </button>
                      <button type="button" onClick={() => setShowJsonImporter((value) => !value)} className="px-3 py-1.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap">
                        {'{ }'} COLAR JSON
                      </button>
                    </div>
                  </div>
                  {showJsonImporter && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={productJsonInput}
                        onChange={(e) => setProductJsonInput(e.target.value)}
                        rows={7}
                        spellCheck={false}
                        autoFocus
                        placeholder="Cole aqui o JSON gerado pela extensão..."
                        className="w-full rounded border border-neutral-300 bg-white px-3 py-2 font-mono text-[10px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setShowJsonImporter(false); setProductJsonInput(''); }} className="px-3 py-1.5 rounded border border-neutral-300 bg-white text-[10px] font-semibold text-neutral-600 cursor-pointer">Cancelar</button>
                        <button type="button" onClick={handleImportProductJson} disabled={!productJsonInput.trim()} className="px-3 py-1.5 rounded bg-neutral-900 text-white text-[10px] font-bold disabled:opacity-40 cursor-pointer">IMPORTAR E PREENCHER</button>
                      </div>
                    </div>
                  )}
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

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Área do produto</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProdFormDisplayGroup('main')}
                      className={`rounded border px-3 py-2 text-left transition-colors cursor-pointer ${prodFormDisplayGroup === 'main' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider">Principal</span>
                      <span className={`block text-[9px] mt-0.5 ${prodFormDisplayGroup === 'main' ? 'text-neutral-300' : 'text-neutral-400'}`}>Aparece normalmente na vitrine.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdFormDisplayGroup('redirect')}
                      className={`rounded border px-3 py-2 text-left transition-colors cursor-pointer ${prodFormDisplayGroup === 'redirect' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wider">Redirecionar</span>
                      <span className="block text-[9px] mt-0.5 text-neutral-500">Oculto no Brasil; usado como seleção alternativa internacional.</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <label className="font-semibold text-neutral-700">Descrição breve (Opcional)</label>
                    <span className="text-[9px] text-neutral-400">{prodFormDescription.length}/220</span>
                  </div>
                  <textarea
                    value={prodFormDescription}
                    onChange={(e) => setProdFormDescription(e.target.value.slice(0, 220))}
                    maxLength={220}
                    rows={2}
                    placeholder="Ex: Couro macio, shape elegante e acabamento premium."
                    className="w-full resize-none px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs leading-relaxed"
                  />
                  <span className="text-[10px] text-neutral-400">Aparece discretamente abaixo do nome do produto.</span>
                </div>

                <div className="space-y-3 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="font-semibold text-neutral-800">Mídia do produto *</label>
                      <p className="text-[10px] text-neutral-500 mt-0.5">Imagens e vídeos aparecem exatamente nesta ordem na vitrine.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => prodMediaFileInputRef.current?.click()}
                        disabled={uploadingProductMedia}
                        className="px-3 py-2 bg-neutral-900 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-black disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingProductMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploadingProductMedia ? 'Enviando...' : 'Upload imagem/vídeo'}
                      </button>
                      <CloudinaryMediaPicker
                        allowedTypes={['image', 'video']}
                        label="Selecionar já enviado"
                        title="Mídias de produto já enviadas"
                        onSelect={(asset) => {
                          setProdFormMediaItems((prev) => [...prev, {
                            id: makeMediaId(),
                            type: asset.resourceType === 'video' ? 'video' : 'image',
                            url: asset.url,
                            storagePath: `cloudinary:${asset.resourceType}:${asset.publicId}`,
                            posterUrl: asset.resourceType === 'video' ? (asset.thumbnailUrl || null) : null,
                            posterStoragePath: null,
                            source: 'upload',
                          }]);
                          setProductError(null);
                        }}
                      />
                    </div>
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

                  <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodFormVideoAutoplay}
                      onChange={(e) => setProdFormVideoAutoplay(e.target.checked)}
                      className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>
                      <span className="text-[11px] font-bold text-neutral-800">Auto-play dos vídeos</span>
                      <span className="block mt-0.5 text-[9px] leading-relaxed text-neutral-500">Quando este produto entrar na tela, a galeria abre o primeiro vídeo e reproduz automaticamente sem som. Ao sair da tela, ele pausa.</span>
                    </span>
                  </label>

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
                        {lastAppliedBadge && (
                          <button
                            type="button"
                            onClick={() => { setProdFormBadgeText(lastAppliedBadge.text); setProdFormBadgeColor(lastAppliedBadge.color); }}
                            className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer border border-neutral-300 font-semibold"
                            style={{ backgroundColor: lastAppliedBadge.color, color: getReadableTextColor(lastAppliedBadge.color) }}
                            title={`Última aplicada: ${lastAppliedBadge.text}`}
                          >
                            ↻ {lastAppliedBadge.text}
                          </button>
                        )}
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
                    {giftPresets.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const gift = giftPresets.find((item) => item.id === e.target.value);
                          if (gift) applyGiftPresetToProduct(gift);
                          e.currentTarget.value = '';
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 rounded bg-white text-[10px] font-semibold text-neutral-700"
                      >
                        <option value="">Usar presente salvo...</option>
                        {giftPresets.map((gift) => <option key={gift.id} value={gift.id}>{gift.title || gift.label || gift.imageUrl.split('/').pop() || 'Presente salvo'}</option>)}
                      </select>
                    )}
                    {!giftLibraryConfigured && <p className="text-[9px] text-amber-700">Biblioteca de presentes indisponível até executar o SQL desta versão.</p>}
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
                    <div className="flex justify-end">
                      <CloudinaryMediaPicker
                        allowedTypes={['image']}
                        label="Selecionar já enviado"
                        title="Imagens já enviadas"
                        onSelect={(asset) => {
                          setProdFormGiftImageUrl(asset.url);
                          setProdFormGiftImagePath(`cloudinary:${asset.resourceType}:${asset.publicId}`);
                          setProdFormGiftMode('custom');
                        }}
                      />
                    </div>
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
                    <div className="pt-1 flex items-center justify-between gap-3">
                      <p className="text-[9px] text-neutral-500">Salvar guarda esta imagem e estes textos para usar em outros produtos.</p>
                      <button
                        type="button"
                        onClick={saveCurrentProductGiftPreset}
                        disabled={savingGiftPreset || !prodFormGiftImageUrl.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-neutral-900 text-white text-[10px] font-bold disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        {savingGiftPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Salvar presente
                      </button>
                    </div>
                    {giftPresetMessage && <p className="text-[9px] text-emerald-700">{giftPresetMessage}</p>}
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
                    {selectedList?.timerEnabled && (
                      <label className="flex items-start gap-2.5 rounded-md border border-neutral-200 bg-white px-3 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prodFormTimerSeparate}
                          onChange={(e) => setProdFormTimerSeparate(e.target.checked)}
                          className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span>
                          <span className="block text-[11px] font-bold text-neutral-800">Separar timer</span>
                          <span className="block text-[9px] leading-relaxed text-neutral-500 mt-0.5">
                            Desligado: este timer usa exatamente o mesmo ciclo do timer geral deste visitante. Ligue apenas se este produto precisar de outro tempo.
                          </span>
                        </span>
                      </label>
                    )}

                    {selectedList?.timerEnabled && !prodFormTimerSeparate ? (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                          <Clock className="w-3.5 h-3.5" />
                          Sincronizado com o timer da Vitrine
                        </div>
                        <p className="mt-1 text-[9px] leading-relaxed text-emerald-700">
                          O topo e este produto mostram o mesmo tempo para a mesma pessoa, inclusive no modo looping.
                        </p>
                      </div>
                    ) : (
                    <>
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

                    </>
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

                    {prodFormDescription.trim() && (
                      <p className="max-w-[280px] text-[9px] leading-relaxed text-neutral-500 line-clamp-3">
                        {prodFormDescription.trim()}
                      </p>
                    )}

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
                          {(selectedList?.ctaText || '').trim() || 'GARANTIR MEU PAR'}
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
      {/* MODAL: Bloco de benefícios                                                 */}
      {/* ========================================================================= */}
      {isBenefitsBlockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-x-hidden">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-[calc(100vw-1rem)] sm:w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {editingBenefitsBlock ? 'Editar benefícios' : 'Adicionar benefícios'}</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Opcional. Entra na mesma ordem da vitrine e pode ser movido como os outros itens.</p>
              </div>
              <button type="button" onClick={() => setIsBenefitsBlockModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveBenefitsBlock} className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-4">
              {benefitsBlockError && <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-xs">{benefitsBlockError}</div>}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Título</label>
                <input
                  type="text"
                  value={benefitsBlockTitle}
                  onChange={(e) => setBenefitsBlockTitle(e.target.value.slice(0, 80))}
                  maxLength={80}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Benefícios</label>
                    <p className="text-[9px] text-neutral-500 mt-0.5">Já deixamos os dados atuais preenchidos. Edite ou remova o que não quiser mostrar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBenefitsBlockItems((prev) => prev.length >= 10 ? prev : [...prev, ''])}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold border border-neutral-300 rounded hover:bg-neutral-50 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>

                <div className="space-y-2">
                  {benefitsBlockItems.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => setBenefitsBlockItems((prev) => prev.map((item, i) => i === index ? e.target.value.slice(0, 120) : item))}
                        maxLength={120}
                        placeholder={`Benefício ${index + 1}`}
                        className="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={() => setBenefitsBlockItems((prev) => prev.filter((_, i) => i !== index))}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded border border-neutral-200 cursor-pointer"
                        title="Remover benefício"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-800">
                Se o modo Internacional estiver ativo, este bloco é exibido somente para visitantes identificados no Brasil. Visitantes de outros países não verão benefícios de Pix, frete Brasil ou cashback.
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-neutral-100">
                <button type="button" onClick={() => setIsBenefitsBlockModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingBenefitsBlock} className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer">
                  {savingBenefitsBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingBenefitsBlock ? 'Salvando...' : editingBenefitsBlock ? 'Salvar alterações' : 'Adicionar à vitrine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Vídeo destaque 9:16                                                */}
      {/* ========================================================================= */}
      {isVideoBlockModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-x-hidden">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-[calc(100vw-1rem)] sm:w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3 shrink-0 min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Video className="w-4 h-4" /> {editingVideoBlock ? 'Editar vídeo destaque' : 'Adicionar vídeo destaque'}</h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">Bloco editorial 9:16 que entra na mesma ordem dos produtos e pode ser movido para qualquer posição.</p>
              </div>
              <button type="button" onClick={() => setIsVideoBlockModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveVideoBlock} className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 min-w-0">
              <div className="block min-w-0">
                <div className="space-y-4">
                  {videoBlockError && <div className="p-3 rounded bg-red-50 text-red-800 border border-red-200 text-xs">{videoBlockError}</div>}

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Título opcional</label>
                    <input
                      type="text"
                      value={videoBlockTitle}
                      onChange={(e) => setVideoBlockTitle(e.target.value)}
                      maxLength={80}
                      placeholder="Ex: Tênis Sport Glow em movimento"
                      className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                    <p className="text-[9px] text-neutral-500">Quando preenchido, aparece em texto normal abaixo do vídeo.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700">Descrição opcional</label>
                    <textarea
                      value={videoBlockDescription}
                      onChange={(e) => setVideoBlockDescription(e.target.value.slice(0, 260))}
                      maxLength={260}
                      rows={3}
                      placeholder="Ex: Confira"
                      className="w-full min-w-0 resize-none px-3 py-2 border border-neutral-300 rounded text-xs leading-relaxed whitespace-pre-wrap break-words focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                    <p className="text-[9px] text-neutral-500">Aparece abaixo do título. Se houver um produto depois deste vídeo, a seta para baixo é adicionada automaticamente.</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                      <div>
                        <p className="text-[11px] font-bold text-neutral-800">Vídeo 9:16</p>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Use vídeo vertical. Ele será exibido grande, centralizado e sem caixa de produto.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 min-w-0 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => videoBlockFileInputRef.current?.click()}
                          disabled={uploadingVideoBlock}
                          className="flex-1 sm:flex-none justify-center px-3 py-2 bg-neutral-900 text-white rounded text-[10px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-w-0"
                        >
                          {uploadingVideoBlock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {uploadingVideoBlock ? 'Enviando...' : 'Upload'}
                        </button>
                        <CloudinaryMediaPicker
                          allowedTypes={['video']}
                          className="flex-1 sm:flex-none justify-center px-3 py-2 border border-neutral-300 bg-white rounded text-[10px] font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer min-w-0"
                          label="Selecionar já enviado"
                          title="Vídeos já enviados"
                          onSelect={(asset) => {
                            setVideoBlockMedia({
                              id: makeMediaId(),
                              type: 'video',
                              url: asset.url,
                              storagePath: `cloudinary:${asset.resourceType}:${asset.publicId}`,
                              posterUrl: asset.thumbnailUrl || null,
                              posterStoragePath: null,
                              source: 'upload',
                            });
                            setVideoBlockError(null);
                          }}
                        />
                        <input
                          ref={videoBlockFileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/ogg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoBlockFileUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 min-w-0">
                      <input
                        type="url"
                        value={videoBlockUrlInput}
                        onChange={(e) => setVideoBlockUrlInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideoBlockUrl(); } }}
                        placeholder="https://... vídeo"
                        className="min-w-0 px-3 py-2 border border-neutral-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                      <button type="button" onClick={handleAddVideoBlockUrl} className="px-3 py-2 border border-neutral-300 bg-white rounded text-[10px] font-semibold cursor-pointer">Usar link</button>
                    </div>

                    {videoBlockMedia && (
                      <div className="flex items-center gap-2 rounded border border-neutral-200 bg-white p-2.5 min-w-0">
                        <Video className="w-4 h-4 text-neutral-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-neutral-800">Vídeo selecionado</p>
                          <p className="text-[9px] text-neutral-400 truncate mt-0.5">{videoBlockMedia.url}</p>
                        </div>
                        <button type="button" onClick={() => setVideoBlockMedia(null)} className="p-2 text-neutral-400 hover:text-red-600 cursor-pointer shrink-0" aria-label="Remover vídeo"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={videoBlockAutoplay} onChange={(e) => setVideoBlockAutoplay(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                      <span><span className="block text-[11px] font-bold text-neutral-800">Auto-play</span><span className="block text-[9px] text-neutral-500 mt-0.5">Começa sem som quando o vídeo entra na área visível. Só um auto-play toca por vez.</span></span>
                    </label>
                    <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={videoBlockLoop} onChange={(e) => setVideoBlockLoop(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                      <span><span className="block text-[11px] font-bold text-neutral-800">Repetir vídeo</span><span className="block text-[9px] text-neutral-500 mt-0.5">Ao terminar, volta automaticamente para o início.</span></span>
                    </label>
                    <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" checked={videoBlockControls} onChange={(e) => setVideoBlockControls(e.target.checked)} className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                      <span><span className="block text-[11px] font-bold text-neutral-800">Mostrar controles</span><span className="block text-[9px] text-neutral-500 mt-0.5">Exibe play, progresso e volume depois que o vídeo começa.</span></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button type="button" onClick={() => setIsVideoBlockModalOpen(false)} className="w-full sm:w-auto px-3.5 py-2 rounded text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={savingVideoBlock || !videoBlockMedia} className="w-full sm:w-auto px-4 py-2 rounded text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">{savingVideoBlock ? 'Salvando...' : editingVideoBlock ? 'Salvar vídeo' : 'Adicionar à vitrine'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL: Relatório resumido para WhatsApp                                   */}
      {/* ========================================================================= */}
      {reportModalOpen && selectedList && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-x-hidden">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl w-[calc(100vw-1rem)] sm:w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Relatório para WhatsApp
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Resumo enxuto. Métricas sem relevância para esta vitrine são omitidas automaticamente.
                </p>
              </div>
              <button type="button" onClick={() => setReportModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Informações opcionais
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={reportIncludeLocations} onChange={(e) => setReportIncludeLocations(e.target.checked)} />
                    <span className="text-[11px] font-semibold text-neutral-700">Cidades e cliques</span>
                  </label>
                  <label className="flex items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={reportIncludeHours} onChange={(e) => setReportIncludeHours(e.target.checked)} />
                    <span className="text-[11px] font-semibold text-neutral-700">Horários</span>
                  </label>
                  <label className="flex items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={reportIncludeProducts} onChange={(e) => setReportIncludeProducts(e.target.checked)} />
                    <span className="text-[11px] font-semibold text-neutral-700">Produtos</span>
                  </label>
                </div>
                {productItemsForMetrics.length <= 1 && (
                  <p className="mt-2 text-[10px] text-neutral-500">
                    Esta vitrine tem apenas um produto: “último produto” e “todos os produtos” não entram no relatório.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Prévia</label>
                <textarea
                  readOnly
                  value={buildWhatsAppReport()}
                  rows={14}
                  className="w-full min-w-0 resize-y rounded-lg border border-neutral-200 bg-neutral-950 text-neutral-100 px-3 py-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-words focus:outline-none"
                />
              </div>
            </div>

            <div className="px-4 sm:px-5 py-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setReportModalOpen(false)} className="w-full sm:w-auto px-3.5 py-2 rounded text-xs font-semibold border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer">
                Fechar
              </button>
              <button type="button" onClick={handleCopyReport} className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-3.5 py-2 rounded text-xs font-semibold border border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-50 cursor-pointer">
                {reportCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {reportCopied ? 'Copiado' : 'Copiar'}
              </button>
              <button type="button" onClick={handleOpenWhatsAppReport} className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">
                <MessageCircle className="w-3.5 h-3.5" />
                Abrir no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Internacional — idioma, moeda e destino por país                   */}
      {/* ========================================================================= */}
      {internationalModalOpen && selectedList && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-x-hidden">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl w-[calc(100vw-1rem)] sm:w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Internacional
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Configure por país sem digitar códigos: idioma, moeda, textos e destino dos botões já partem de presets seguros.
                </p>
              </div>
              <button type="button" onClick={() => setInternationalModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden flex-1 min-h-0 space-y-4">
              {internationalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{internationalError}</div>
              )}
              <input
                ref={internationalJsonFileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void handleInternationalTranslationFile(e.target.files?.[0])}
              />
              {internationalJsonMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">{internationalJsonMessage}</div>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 cursor-pointer">
                <input type="checkbox" checked={internationalEnabled} onChange={(e) => setInternationalEnabled(e.target.checked)} className="mt-0.5" />
                <span>
                  <span className="block text-xs font-bold text-neutral-900">Ativar experiência internacional</span>
                  <span className="block text-[10px] text-neutral-500 mt-0.5">
                    O país é detectado automaticamente. Quando não houver configuração exata, o sistema tenta uma regra compatível por idioma/região e, por último, uma configuração em inglês.
                  </span>
                </span>
              </label>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[10px] text-blue-800">
                O país é detectado automaticamente pelo acesso. Uma configuração pode atender vários países da mesma região/idioma. Use <strong>+ País/moeda</strong> quando quiser que um país adicional herde exatamente as mesmas traduções e comportamento, mas tenha moeda e taxa próprias. Sem vínculo explícito, o fallback regional reaproveita a tradução disponível e usa a moeda da regra encontrada.
              </div>

              <div className="space-y-3">
                {internationalRules.map((rule, ruleIndex) => (
                  <div key={`${rule.countryCode || 'new'}-${ruleIndex}`} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {(rule.countryCode || '??').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900">{getInternationalCountryPreset(rule.countryCode)?.name || 'País configurado'}</p>
                          <p className="text-[9px] text-neutral-500">{getInternationalCountryPreset(rule.countryCode)?.localeLabel || rule.locale} · {rule.currencyCode}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleExportInternationalTranslations(ruleIndex)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-neutral-200 bg-white text-[9px] font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer" title="Extrair todos os textos desta vitrine para tradução em massa">
                          <FileDown className="w-3 h-3" /> Exportar traduções
                        </button>
                        <button type="button" onClick={() => { setInternationalJsonRuleIndex(ruleIndex); setInternationalJsonMessage(null); setInternationalError(null); setTimeout(() => internationalJsonFileInputRef.current?.click(), 0); }} className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-neutral-200 bg-white text-[9px] font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer" title="Aplicar um JSON já traduzido neste país">
                          <Upload className="w-3 h-3" /> Importar traduções
                        </button>
                        <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-neutral-600">
                          <input type="checkbox" checked={rule.enabled !== false} onChange={(e) => updateInternationalRule(ruleIndex, { enabled: e.target.checked })} />
                          Ativa
                        </label>
                        <button type="button" onClick={() => setInternationalRules((current) => current.filter((_, i) => i !== ruleIndex))} className="p-1.5 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Remover país">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">País</label>
                          <select value={rule.countryCode} onChange={(e) => changeInternationalRuleCountry(ruleIndex, e.target.value)} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs">
                            {!getInternationalCountryPreset(rule.countryCode) && rule.countryCode && <option value={rule.countryCode}>{rule.countryCode} · configuração anterior</option>}
                            {INTERNATIONAL_COUNTRY_PRESETS.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">Idioma</label>
                          <select value={rule.locale} onChange={(e) => updateInternationalRule(ruleIndex, { locale: e.target.value })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs">
                            {!INTERNATIONAL_LOCALE_OPTIONS.some((locale) => locale.value === rule.locale) && rule.locale && <option value={rule.locale}>{rule.locale}</option>}
                            {INTERNATIONAL_LOCALE_OPTIONS.map((locale) => <option key={locale.value} value={locale.value}>{locale.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">Moeda</label>
                          <select value={rule.currencyCode} onChange={(e) => updateInternationalRule(ruleIndex, { currencyCode: e.target.value })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs">
                            {!INTERNATIONAL_CURRENCY_OPTIONS.includes(rule.currencyCode) && rule.currencyCode && <option value={rule.currencyCode}>{rule.currencyCode}</option>}
                            {INTERNATIONAL_CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">Taxa manual · R$ 1 =</label>
                          <input type="number" min="0.000001" step="0.000001" value={rule.currencyRate} onChange={(e) => updateInternationalRule(ruleIndex, { currencyRate: Number(e.target.value) })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 rounded border border-neutral-200 px-3 py-2 cursor-pointer">
                          <input type="checkbox" checked={Boolean(rule.approximateConversion)} onChange={(e) => updateInternationalRule(ruleIndex, { approximateConversion: e.target.checked })} />
                          <span className="text-[10px] font-semibold text-neutral-700">Informar que a conversão é aproximada</span>
                        </label>
                        <input
                          value={rule.approximateLabel || ''}
                          onChange={(e) => updateInternationalRule(ruleIndex, { approximateLabel: e.target.value })}
                          disabled={!rule.approximateConversion}
                          placeholder="Approximate conversion"
                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs disabled:bg-neutral-100 disabled:text-neutral-400"
                        />
                      </div>

                      <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold text-sky-900">Países adicionais · mesma tradução</p>
                            <p className="text-[9px] text-sky-700 mt-0.5 leading-relaxed">
                              Estes países herdam idioma, textos, CTA, formulário e redirecionamento de {getInternationalCountryPreset(rule.countryCode)?.name || rule.countryCode}, mas usam moeda e taxa próprias. Ao adicionar uma moeda diferente, preencha a taxa antes de salvar.
                            </p>
                          </div>
                        </div>

                        {(rule.additionalCountries || []).map((item, additionalIndex) => {
                          const preset = getInternationalCountryPreset(item.countryCode);
                          return (
                            <div key={`${item.countryCode}-${additionalIndex}`} className="rounded border border-sky-100 bg-white p-2.5 grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr_1fr_auto] gap-2 items-end">
                              <div className="min-w-0">
                                <span className="block text-[9px] font-bold text-neutral-500 mb-1">País</span>
                                <div className="min-h-[34px] px-2.5 rounded border border-neutral-200 bg-neutral-50 flex items-center text-[10px] font-semibold text-neutral-800">
                                  {preset?.name || item.countryCode}
                                </div>
                              </div>
                              <label className="min-w-0">
                                <span className="block text-[9px] font-bold text-neutral-500 mb-1">Moeda</span>
                                <select
                                  value={item.currencyCode}
                                  onChange={(e) => updateInternationalAdditionalCountry(ruleIndex, additionalIndex, { currencyCode: e.target.value })}
                                  className="w-full min-w-0 px-2.5 py-2 rounded border border-neutral-200 bg-white text-[10px]"
                                >
                                  {!INTERNATIONAL_CURRENCY_OPTIONS.includes(item.currencyCode) && item.currencyCode && <option value={item.currencyCode}>{item.currencyCode}</option>}
                                  {INTERNATIONAL_CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                                </select>
                              </label>
                              <label className="min-w-0">
                                <span className="block text-[9px] font-bold text-neutral-500 mb-1">R$ 1 =</span>
                                <input
                                  type="number"
                                  min="0.000001"
                                  step="0.000001"
                                  value={item.currencyRate}
                                  onChange={(e) => updateInternationalAdditionalCountry(ruleIndex, additionalIndex, { currencyRate: Number(e.target.value) })}
                                  className="w-full min-w-0 px-2.5 py-2 rounded border border-neutral-200 text-[10px]"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeInternationalAdditionalCountry(ruleIndex, additionalIndex)}
                                className="h-[34px] w-[34px] rounded border border-neutral-200 bg-white text-neutral-400 hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center cursor-pointer"
                                title="Remover país adicional"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={internationalAdditionalCountryDrafts[ruleIndex] || ''}
                            onChange={(e) => setInternationalAdditionalCountryDrafts((current) => ({ ...current, [ruleIndex]: e.target.value }))}
                            className="flex-1 min-w-0 px-3 py-2 rounded border border-sky-200 bg-white text-[10px]"
                          >
                            <option value="">Escolher país adicional...</option>
                            {INTERNATIONAL_COUNTRY_PRESETS
                              .filter((country) =>
                                country.code !== String(rule.countryCode || '').toUpperCase() &&
                                !internationalRules.some((configuredRule) =>
                                  String(configuredRule.countryCode || '').toUpperCase() === country.code ||
                                  (configuredRule.additionalCountries || []).some((entry) => String(entry.countryCode || '').toUpperCase() === country.code)
                                )
                              )
                              .map((country) => (
                                <option key={country.code} value={country.code}>{country.name} · {country.currency}</option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={!internationalAdditionalCountryDrafts[ruleIndex]}
                            onClick={() => addInternationalAdditionalCountry(ruleIndex, internationalAdditionalCountryDrafts[ruleIndex] || '')}
                            className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-sky-900 text-white text-[10px] font-bold hover:bg-sky-800 disabled:opacity-40 cursor-pointer disabled:cursor-default"
                          >
                            <Plus className="w-3 h-3" /> País/moeda
                          </button>
                        </div>
                      </div>

                      {selectedList.experienceMode === 'organized' && (() => {
                        const categoryEntries = getAutomaticCategoryEntries(rule.locale);
                        const automaticUi = getBestSellerUiText(rule.locale);
                        return (
                          <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3">
                            <div>
                              <p className="text-[10px] font-bold text-violet-900">Imersiva organizada · tradução</p>
                              <p className="text-[9px] text-violet-700 mt-0.5">Os textos e nomes das categorias já têm tradução automática. Preencha apenas se quiser substituir a versão deste país.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input value={rule.organizedTitle || ''} onChange={(e) => updateInternationalRule(ruleIndex, { organizedTitle: e.target.value })} placeholder={automaticUi.organizedTitle} className="w-full min-w-0 px-3 py-2 rounded border border-violet-200 bg-white text-xs" />
                              <input value={rule.organizedSubtitle || ''} onChange={(e) => updateInternationalRule(ruleIndex, { organizedSubtitle: e.target.value })} placeholder={automaticUi.organizedSubtitle} className="w-full min-w-0 px-3 py-2 rounded border border-violet-200 bg-white text-xs" />
                            </div>
                            {categoryEntries.length > 0 && (
                              <details className="group rounded border border-violet-100 bg-white overflow-hidden">
                                <summary className="list-none cursor-pointer px-3 py-2 flex items-center justify-between text-[10px] font-semibold text-violet-900 [&::-webkit-details-marker]:hidden">
                                  <span>Categorias automáticas ({categoryEntries.length})</span><ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="border-t border-violet-100 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {categoryEntries.map((category) => (
                                    <label key={category.key} className="block rounded border border-neutral-200 p-2">
                                      <span className="flex items-center justify-between gap-2 text-[9px] text-neutral-500 mb-1"><span>{category.sourceLabel}</span><span>{category.count}</span></span>
                                      <input
                                        value={rule.categoryTranslations?.[category.key] || ''}
                                        onChange={(e) => updateInternationalRule(ruleIndex, { categoryTranslations: { ...(rule.categoryTranslations || {}), [category.key]: e.target.value } })}
                                        placeholder={category.automaticLabel}
                                        className="w-full min-w-0 px-2.5 py-1.5 rounded border border-neutral-200 text-[10px]"
                                      />
                                    </label>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })()}

                      <div className={`rounded-lg border p-3 space-y-3 ${rule.redirectProducts ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-neutral-50'}`}>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(rule.redirectProducts)}
                            onChange={(e) => updateInternationalRule(ruleIndex, { redirectProducts: e.target.checked })}
                            className="mt-0.5"
                          />
                          <span>
                            <span className={`block text-[10px] font-bold ${rule.redirectProducts ? 'text-amber-900' : 'text-neutral-700'}`}>Redirecionar produtos esgotados</span>
                            <span className="block text-[9px] text-neutral-500 mt-0.5 leading-relaxed">
                              Quando ativo, visitantes deste país não veem os itens da área Principal. A página fica limpa e mostra somente os produtos colocados em <strong>Redirecionar</strong>.
                            </span>
                          </span>
                        </label>
                        {rule.redirectProducts && (
                          <div className="space-y-2 pl-0 sm:pl-6">
                            <textarea
                              value={rule.redirectMessage || ''}
                              onChange={(e) => updateInternationalRule(ruleIndex, { redirectMessage: e.target.value })}
                              rows={3}
                              maxLength={1200}
                              placeholder="Ex.: Infelizmente, os produtos desta seleção não possuem envio internacional. Mas preparamos abaixo uma lista de produtos disponíveis para o seu país."
                              className="w-full min-w-0 px-3 py-2 rounded border border-amber-200 bg-white text-xs resize-y"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
                              <span className="text-neutral-500">A mensagem é manual e pode ser traduzida normalmente para cada país.</span>
                              <span className={`font-bold ${redirectDisplayProducts.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {redirectDisplayProducts.length > 0 ? `${redirectDisplayProducts.length} produto(s) em Redirecionar` : 'Nenhum produto em Redirecionar ainda'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <div className="mb-2">
                          <p className="text-[10px] font-bold text-neutral-700">O que aparece neste país</p>
                          <p className="text-[9px] text-neutral-500 mt-0.5">Parcelamento e benefícios começam desligados fora do Brasil. Os demais itens podem ser ocultados por mercado sem alterar a vitrine original.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {[
                            ['showPrices', 'Preços'],
                            ['showInstallments', 'Parcelamento sem juros'],
                            ['showCta', 'Botão de compra'],
                            ['showFooterCta', 'CTA final da página'],
                            ['showBenefits', 'Bloco de benefícios'],
                            ['showSoldQuantity', 'Quantidade vendida'],
                            ['showAvailableQuantity', 'Estoque disponível'],
                            ['showSizes', 'Tamanhos'],
                            ['showColors', 'Cores'],
                            ['showBadges', 'Selos / badges'],
                            ['showGift', 'Presente'],
                            ['showProductTimers', 'Timer nos produtos'],
                          ].map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(rule[key as keyof BestSellerInternationalCountryRule])}
                                onChange={(e) => updateInternationalRule(ruleIndex, { [key]: e.target.checked } as Partial<BestSellerInternationalCountryRule>)}
                              />
                              <span className="text-[10px] font-semibold text-neutral-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">Título traduzido</label>
                          <input value={rule.title || ''} onChange={(e) => updateInternationalRule(ruleIndex, { title: e.target.value })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs" placeholder={selectedList.title || 'Sem título'} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">Subtítulo traduzido</label>
                          <input value={rule.subtitle || ''} onChange={(e) => updateInternationalRule(ruleIndex, { subtitle: e.target.value })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs" placeholder={selectedList.subtitle || ''} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600">CTA traduzido</label>
                          <input value={rule.ctaText || ''} onChange={(e) => updateInternationalRule(ruleIndex, { ctaText: e.target.value })} className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs" placeholder={selectedList.ctaText || 'COMPRAR'} />
                        </div>
                      </div>

                      {selectedList.footerCtaEnabled && (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                          <div>
                            <p className="text-[10px] font-bold text-neutral-700">CTA final da página</p>
                            <p className="text-[9px] text-neutral-500 mt-0.5">Conteúdo manual: vazio herda o texto e o link definidos na vitrine principal.</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={rule.footerCtaText || ''}
                              onChange={(e) => updateInternationalRule(ruleIndex, { footerCtaText: e.target.value })}
                              placeholder={selectedList.footerCtaText || 'Texto do botão final'}
                              className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs"
                            />
                            <input
                              type="url"
                              value={rule.footerCtaUrl || ''}
                              onChange={(e) => updateInternationalRule(ruleIndex, { footerCtaUrl: e.target.value })}
                              placeholder={selectedList.footerCtaUrl || 'https://...'}
                              className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                        <label className="text-[10px] font-bold text-neutral-600">Destino dos botões neste país</label>
                        <select
                          value={rule.buttonDestination || 'product'}
                          onChange={(e) => updateInternationalRule(ruleIndex, { buttonDestination: e.target.value as 'product' | 'whatsapp' | 'custom' | 'form' })}
                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs"
                        >
                          <option value="product">Página original do produto</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="custom">URL personalizada</option>
                          <option value="form">Formulário internacional</option>
                        </select>

                        {(rule.buttonDestination || 'product') === 'whatsapp' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input value={rule.whatsappNumber || ''} onChange={(e) => updateInternationalRule(ruleIndex, { whatsappNumber: e.target.value })} placeholder="Telefone com país. Ex.: 5531999999999" className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs" />
                            <input value={rule.whatsappMessage || ''} onChange={(e) => updateInternationalRule(ruleIndex, { whatsappMessage: e.target.value })} placeholder="Mensagem opcional" className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs" />
                          </div>
                        )}
                        {rule.buttonDestination === 'custom' && (
                          <input type="url" value={rule.customUrl || ''} onChange={(e) => updateInternationalRule(ruleIndex, { customUrl: e.target.value })} placeholder="https://..." className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs" />
                        )}
                        {rule.buttonDestination === 'form' && (
                          <div className="space-y-2">
                            <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-[9px] leading-relaxed text-blue-800">
                              O botão abre um formulário dentro da própria vitrine e identifica automaticamente qual produto a pessoa clicou. Nome, e-mail, telefone, país e produto aparecem depois em <strong>Formulários</strong>.
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <input
                                value={rule.formTitle || ''}
                                onChange={(e) => updateInternationalRule(ruleIndex, { formTitle: e.target.value })}
                                placeholder="Título do formulário — vazio = tradução automática"
                                className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs"
                              />
                              <textarea
                                value={rule.formMessage || ''}
                                onChange={(e) => updateInternationalRule(ruleIndex, { formMessage: e.target.value })}
                                rows={3}
                                placeholder="Mensagem explicativa — vazio = texto automático informando que a compra online ainda não está adaptada ao país, mas a Zhaya vende e envia internacionalmente."
                                className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs resize-y"
                              />
                            </div>
                            <p className="text-[9px] text-neutral-500">
                              Se deixar os campos vazios, título e mensagem acompanham automaticamente o idioma configurado deste país. Preencha manualmente apenas quando quiser uma mensagem específica.
                            </p>
                          </div>
                        )}
                      </div>

                      {products.length > 0 && (
                        <details className="rounded-lg border border-neutral-200 overflow-hidden">
                          <summary className="px-3 py-2.5 bg-neutral-50 text-[10px] font-bold text-neutral-700 cursor-pointer select-none">
                            Tradução do conteúdo digitado ({products.length})
                          </summary>
                          <div className="p-3 space-y-3">
                            <p className="text-[9px] leading-relaxed text-neutral-500">
                              Os textos fixos da interface são automáticos. Aqui entram somente informações criadas manualmente por vocês. Campos vazios herdam o conteúdo original em português.
                            </p>
                            {products.map((product) => {
                              const translated = rule.productTranslations?.[product.id] || {};
                              const itemLabel = product.itemType === 'video' ? 'Vídeo' : product.itemType === 'benefits' ? 'Benefícios' : 'Produto';
                              const effectiveBadgeEnabled = product.badgeUseListDefault ? Boolean(selectedList?.defaultBadgeEnabled) : Boolean(product.badgeEnabled);
                              const effectiveBadgeText = product.badgeUseListDefault ? (selectedList?.defaultBadgeText || '') : (product.badgeText || '');
                              const usesListGift = (product.giftMode || 'inherit') === 'inherit';
                              const effectiveGiftEnabled = (product.giftMode || 'inherit') === 'off' ? false : usesListGift ? Boolean(selectedList?.giftEnabled) : Boolean(product.giftImageUrl);
                              const effectiveGiftLabel = usesListGift ? (selectedList?.giftLabel || '') : (product.giftLabel || '');
                              const effectiveGiftTitle = usesListGift ? (selectedList?.giftTitle || '') : (product.giftTitle || '');
                              const clearableText = (value: string) => value.trim() ? value : undefined;
                              const clearableList = (value: string) => value.trim() ? parseInternationalListInput(value) : undefined;
                              return (
                                <div key={product.id} className="rounded border border-neutral-100 p-2.5 space-y-2.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 text-[10px] font-bold text-neutral-800 truncate" title={product.name}>{product.name}</div>
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {product.displayGroup === 'redirect' && (
                                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-800">
                                          <Globe2 className="w-2.5 h-2.5" /> Redirecionar
                                        </span>
                                      )}
                                      <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400">{itemLabel}</span>
                                    </div>
                                  </div>

                                  {product.itemType === 'benefits' ? (
                                    <div className="grid grid-cols-1 gap-2">
                                      <input
                                        value={translated.name || ''}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { name: clearableText(e.target.value) })}
                                        placeholder={`Título · ${product.name || 'Vantagens Zhaya'}`}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                      />
                                      <textarea
                                        value={(translated.benefits || []).join('\n')}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { benefits: clearableList(e.target.value) })}
                                        placeholder={(product.benefits || []).join('\n') || 'Um benefício por linha'}
                                        rows={Math.max(3, Math.min(7, product.benefits?.length || 4))}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs resize-y"
                                      />
                                    </div>
                                  ) : product.itemType === 'video' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        value={translated.videoTitle || ''}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { videoTitle: clearableText(e.target.value) })}
                                        placeholder={`Título do vídeo · ${product.videoTitle || product.name || 'sem título'}`}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                      />
                                      <input
                                        value={translated.description || ''}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { description: clearableText(e.target.value) })}
                                        placeholder={`Descrição · ${product.category || 'sem descrição'}`}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                      />
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        value={translated.name || ''}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { name: clearableText(e.target.value) })}
                                        placeholder={`Nome · ${product.name}`}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                      />
                                      <input
                                        value={translated.description || ''}
                                        onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { description: clearableText(e.target.value) })}
                                        placeholder={`Descrição · ${product.description || product.category || 'sem descrição'}`}
                                        className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                      />
                                      {effectiveBadgeEnabled && (
                                        <input
                                          value={translated.badgeText || ''}
                                          onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { badgeText: clearableText(e.target.value) })}
                                          placeholder={`Selo · ${effectiveBadgeText || 'sem texto'}`}
                                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                        />
                                      )}
                                      {effectiveGiftEnabled && (
                                        <>
                                          <input
                                            value={translated.giftLabel || ''}
                                            onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { giftLabel: clearableText(e.target.value) })}
                                            placeholder={`Chamada do presente · ${effectiveGiftLabel || 'sem chamada'}`}
                                            className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                          />
                                          <input
                                            value={translated.giftTitle || ''}
                                            onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { giftTitle: clearableText(e.target.value) })}
                                            placeholder={`Nome do presente · ${effectiveGiftTitle || 'sem nome'}`}
                                            className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                          />
                                        </>
                                      )}
                                      {product.colors?.length > 0 && (
                                        <input
                                          value={(translated.colors || []).join(', ')}
                                          onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { colors: clearableList(e.target.value) })}
                                          placeholder={`Cores · ${product.colors.join(', ')}`}
                                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                        />
                                      )}
                                      {product.sizes?.length > 0 && (
                                        <input
                                          value={(translated.sizes || []).join(', ')}
                                          onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { sizes: clearableList(e.target.value) })}
                                          placeholder={`Tamanhos locais · ${product.sizes.join(', ')}`}
                                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                        />
                                      )}
                                      {product.outOfStockSizes && product.outOfStockSizes.length > 0 && (
                                        <input
                                          value={(translated.outOfStockSizes || []).join(', ')}
                                          onChange={(e) => updateInternationalProductTranslation(ruleIndex, product.id, { outOfStockSizes: clearableList(e.target.value) })}
                                          placeholder={`Tamanhos sem estoque · ${product.outOfStockSizes.join(', ')}`}
                                          className="w-full min-w-0 px-3 py-2 rounded border border-neutral-300 text-xs"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}

                {internationalRules.length === 0 && (
                  <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                    <Globe2 className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-neutral-700">Nenhum país configurado</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Escolha um país abaixo. Idioma, moeda e textos auxiliares serão preenchidos automaticamente.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Adicionar mercado</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={internationalCountryToAdd} onChange={(e) => setInternationalCountryToAdd(e.target.value)} className="flex-1 min-w-0 px-3 py-2 rounded border border-neutral-300 bg-white text-xs">
                    {INTERNATIONAL_COUNTRY_PRESETS.map((country) => (
                      <option key={country.code} value={country.code}>{country.name} · {country.localeLabel} · {country.currency}</option>
                    ))}
                  </select>
                  <button type="button" onClick={addInternationalRule} className="inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar país
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setInternationalModalOpen(false)} className="w-full sm:w-auto px-3.5 py-2 rounded text-xs font-semibold border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={saveInternationalConfig} disabled={internationalSaving} className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
                {internationalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar internacional
              </button>
            </div>
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
                <p className="text-[10px] text-neutral-500 mt-0.5">Dados, imagens e vídeos ficam salvos para reutilização em outras vitrines.</p>
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
                  const firstMedia = item.mediaItems?.[0];
                  const cover = firstMedia?.type === 'video' ? (firstMedia.posterUrl || item.imageUrl || item.imageUrls?.[0] || '') : (firstMedia?.url || item.imageUrl || item.imageUrls?.[0] || '');
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
