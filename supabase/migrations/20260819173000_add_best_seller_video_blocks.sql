-- ZHAYA APP - Vídeo destaque 9:16 + autoplay por produto
-- Execute no Supabase SQL Editor antes de publicar a versão nova do site.

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS video_autoplay BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_loop BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_controls BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_title TEXT,
  ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Blocos de vídeo não precisam de uma imagem principal legada.
ALTER TABLE public.best_seller_products
  ALTER COLUMN image_url DROP NOT NULL;

UPDATE public.best_seller_products
SET item_type = 'product'
WHERE item_type IS NULL OR item_type NOT IN ('product', 'video');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_products_item_type_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_item_type_check
      CHECK (item_type IN ('product', 'video'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_best_seller_products_list_item_position
  ON public.best_seller_products(list_id, position ASC, item_type);

NOTIFY pgrst, 'reload schema';
