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
} from 'lucide-react';
import { Repository } from '../../lib/repository';
import { getReadableTextColor } from '../../lib/contrast';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { BestSellerList, BestSellerProduct, BestSellerMediaItem } from '../../types/zhaya';

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
  logo_url TEXT,
  subtitle TEXT,
  cta_text TEXT,
  rank_color TEXT NOT NULL DEFAULT '#FFFFFF',
  size_color TEXT NOT NULL DEFAULT '#FFFFFF',
  background_video_url TEXT,
  background_video_path TEXT,
  background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22 CHECK (background_video_opacity >= 0 AND background_video_opacity <= 0.9),
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
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Garante colunas adicionais caso a tabela já tenha sido criada em versão prévia
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS rank_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS size_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_url TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_path TEXT;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22;
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

-- 3.2 Constraint do timer evergreen/looping para instalações existentes
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

  // State: List Modal (Create / Edit)
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [editingList, setEditingList] = useState<BestSellerList | null>(null);
  const [listFormTitle, setListFormTitle] = useState('Mais Vendidos do Dia');
  const [listFormLogoUrl, setListFormLogoUrl] = useState('');
  const [listFormSubtitle, setListFormSubtitle] = useState('');
  const [listFormCtaText, setListFormCtaText] = useState('');
  const [listFormRankColor, setListFormRankColor] = useState('#FFFFFF');
  const [listFormSizeColor, setListFormSizeColor] = useState('#FFFFFF');
  const [listFormBackgroundVideoUrl, setListFormBackgroundVideoUrl] = useState('');
  const [listFormBackgroundVideoPath, setListFormBackgroundVideoPath] = useState('');
  const [listFormBackgroundVideoOpacity, setListFormBackgroundVideoOpacity] = useState('0.22');
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
  const [savingList, setSavingList] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);

  // Logo Upload State
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
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
    setListFormLogoUrl('');
    setListFormSubtitle('');
    setListFormCtaText('');
    setListFormRankColor('#FFFFFF');
    setListFormSizeColor('#FFFFFF');
    setListFormBackgroundVideoUrl('');
    setListFormBackgroundVideoPath('');
    setListFormBackgroundVideoOpacity('0.22');
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
    setListFormLogoUrl(list.logoUrl || '');
    setListFormSubtitle(list.subtitle || '');
    setListFormCtaText(list.ctaText || '');
    setListFormRankColor(list.rankColor || '#FFFFFF');
    setListFormSizeColor(list.sizeColor || '#FFFFFF');
    setListFormBackgroundVideoUrl(list.backgroundVideoUrl || '');
    setListFormBackgroundVideoPath(list.backgroundVideoPath || '');
    setListFormBackgroundVideoOpacity(String(list.backgroundVideoOpacity ?? 0.22));
    setBackgroundVideoInputMode(list.backgroundVideoPath ? 'upload' : (list.backgroundVideoUrl ? 'url' : 'upload'));
    setListFormDate(list.listDate);
    setListFormActive(list.active);
    setListFormTimerEnabled(list.timerEnabled);
    setListFormTimerLooping(Boolean(list.timerLooping));
    const storedDuration = Number(list.timerDurationMinutes || 120);
    setListFormTimerDurationHours(String(Math.floor(storedDuration / 60)));
    setListFormTimerDurationMinutes(String(storedDuration % 60));
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
    purpose: 'product' | 'background' | 'logo',
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
        const uploaded = await uploadBestSellerFile(posterFile, 'image', 'product');
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
          posterUpload = await uploadBestSellerFile(posterFile, 'image', 'product');
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
          logoUrl: listFormLogoUrl.trim() || null,
          subtitle: listFormSubtitle.trim() || null,
          ctaText: listFormCtaText.trim() || null,
          rankColor: listFormRankColor || '#FFFFFF',
          sizeColor: listFormSizeColor || '#FFFFFF',
          backgroundVideoUrl: listFormBackgroundVideoUrl.trim() || null,
          backgroundVideoPath: listFormBackgroundVideoPath.trim() || null,
          backgroundVideoOpacity: Math.min(0.9, Math.max(0, Number(listFormBackgroundVideoOpacity || 0.22))),
          listDate: listFormDate,
          active: listFormActive,
          timerEnabled: listFormTimerEnabled,
          timerEnd: timerEndIso,
          timerLooping: listFormTimerEnabled && listFormTimerLooping,
          timerDurationMinutes: listFormTimerEnabled && listFormTimerLooping ? timerDurationMinutesValue : null,
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
          logoUrl: listFormLogoUrl.trim() || null,
          subtitle: listFormSubtitle.trim() || null,
          ctaText: listFormCtaText.trim() || null,
          rankColor: listFormRankColor || '#FFFFFF',
          sizeColor: listFormSizeColor || '#FFFFFF',
          backgroundVideoUrl: listFormBackgroundVideoUrl.trim() || null,
          backgroundVideoPath: listFormBackgroundVideoPath.trim() || null,
          backgroundVideoOpacity: Math.min(0.9, Math.max(0, Number(listFormBackgroundVideoOpacity || 0.22))),
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
          const uploadedPoster = await uploadBestSellerFile(posterFile, 'image', 'product');
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neutral-900" />
              Mais Vendidos do Dia
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
            Crie listas de produtos mais vendidos com rankings manuais, variações e timers diários.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/mais-vendidos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
            title="Abrir página pública /mais-vendidos em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            <span>Ver Vitrine Pública</span>
          </a>

          {selectedList ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedList(null)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Ver todas as listas
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
              Nova Lista
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
              Apenas 1 lista fica ativa publicamente por vez
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
                Crie a primeira lista de Mais Vendidos para começar a organizar os produtos e seu ranking diário.
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
                            Ativa Publicamente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-700">
                            Encerrada
                          </span>
                        )}

                        <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-neutral-400" />
                          {list.productsCount ?? 0} {list.productsCount === 1 ? 'produto' : 'produtos'}
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
                        {list.active ? 'Desativar' : 'Definir como Ativa'}
                      </button>

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
                      Ativa no Momento
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-700">
                      Encerrada
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
                </div>
                <h2 className="text-base font-bold text-neutral-900">{selectedList.title}</h2>
                {selectedList.subtitle && (
                  <p className="text-xs text-neutral-500 italic">{selectedList.subtitle}</p>
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
                  {selectedList.active ? 'Desativar Lista' : 'Ativar esta Lista'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditList(selectedList)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Dados da Lista
                </button>
              </div>
            </div>

            {/* Products Sub-section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-neutral-400" />
                    Produtos no Ranking ({products.length})
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    A posição (#1, #2, #3...) é controlada manualmente através das setas de ordenação.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateProduct}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Produto
                </button>
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
      {/* MODAL 1: Nova Lista / Editar Lista                                        */}
      {/* ========================================================================= */}
      {isListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingList ? 'Editar Lista de Mais Vendidos' : 'Criar Nova Lista de Mais Vendidos'}
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

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Título da Lista *</label>
                <input
                  type="text"
                  value={listFormTitle}
                  onChange={(e) => setListFormTitle(e.target.value)}
                  placeholder="Ex: Mais Vendidos do Dia"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 focus:outline-none text-xs"
                />
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
                      <video src={listFormBackgroundVideoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" style={{ opacity: Number(listFormBackgroundVideoOpacity || 0.22) }} />
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
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Data da Lista *</label>
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
                    <span className="font-semibold text-neutral-900">Definir como lista ativa publicamente</span>
                    <p className="text-[11px] text-neutral-500">
                      Ao ativar esta lista, qualquer outra lista ativa anterior será desativada automaticamente.
                    </p>
                  </div>
                </label>
              </div>

              {/* Timer */}
              <div className="pt-2 border-t border-neutral-100 space-y-3">
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
                  {savingList ? 'Salvando...' : editingList ? 'Salvar Alterações' : 'Criar Lista'}
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

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={prodFormBadgeEnabled}
                    onChange={(e) => setProdFormBadgeEnabled(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="font-semibold text-neutral-800">
                    Ativar tag/badge de destaque na imagem
                  </span>
                </label>

                {prodFormBadgeEnabled && (
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

              {/* SEÇÃO 5: PRÉVIA AO VIVO DA VITRINE (DARK) */}
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
