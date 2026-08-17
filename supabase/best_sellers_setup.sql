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
  logo_url TEXT,
  subtitle TEXT,
  cta_text TEXT,
  rank_color TEXT NOT NULL DEFAULT '#FFFFFF',
  size_color TEXT NOT NULL DEFAULT '#FFFFFF',
  list_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT false,
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_end TIMESTAMPTZ,
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
  image_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
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
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.best_seller_lists ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[];
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

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_best_seller_lists_active ON public.best_seller_lists(active);
CREATE INDEX IF NOT EXISTS idx_best_seller_lists_date ON public.best_seller_lists(list_date DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_products_list_pos ON public.best_seller_products(list_id, position ASC);

-- 5. Habilitação de Segurança por Linha (RLS)
ALTER TABLE public.best_seller_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_seller_products ENABLE ROW LEVEL SECURITY;

-- 6. Permissões de isolamento estrito (Gerenciamento via Service Role do Backend)
REVOKE ALL ON public.best_seller_lists FROM anon, authenticated;
GRANT ALL ON public.best_seller_lists TO service_role;

REVOKE ALL ON public.best_seller_products FROM anon, authenticated;
GRANT ALL ON public.best_seller_products TO service_role;

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

-- 9. Configuração do Storage (Bucket Público para Mídias e Logotipos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zhaya-match-media',
  'zhaya-match-media',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];

-- Políticas de acesso para o Storage do Supabase (Leitura e Upload)
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Uploads zhaya-match-media'
  ) THEN
    CREATE POLICY "Allow Uploads zhaya-match-media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'zhaya-match-media');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Updates zhaya-match-media'
  ) THEN
    CREATE POLICY "Allow Updates zhaya-match-media"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'zhaya-match-media');
  END IF;
END $$;

-- 10. Recarga do schema cache do PostgREST / Supabase API
NOTIFY pgrst, 'reload schema';
