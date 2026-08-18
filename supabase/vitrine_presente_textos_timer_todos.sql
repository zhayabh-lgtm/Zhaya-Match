-- VITRINE PERSONALIZADA — presente (texto, cor, tamanho) + timer em massa
-- Seguro para rodar mais de uma vez.

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS gift_label TEXT DEFAULT 'Você ganha',
  ADD COLUMN IF NOT EXISTS gift_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS gift_image_size INTEGER NOT NULL DEFAULT 48;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS gift_label TEXT DEFAULT 'Você ganha',
  ADD COLUMN IF NOT EXISTS gift_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS gift_image_size INTEGER NOT NULL DEFAULT 48;

UPDATE public.best_seller_lists
SET gift_text_color = '#FFFFFF'
WHERE gift_text_color IS NULL OR btrim(gift_text_color) = '';

UPDATE public.best_seller_products
SET gift_text_color = '#FFFFFF'
WHERE gift_text_color IS NULL OR btrim(gift_text_color) = '';



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
