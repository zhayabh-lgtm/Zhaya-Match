-- Zhaya Match — ajustes premium do Mais Vendidos
-- Seguro para rodar em uma instalação existente. Não apaga dados.

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS cta_text TEXT;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS out_of_stock_sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS installments_count INTEGER,
  ADD COLUMN IF NOT EXISTS installment_value NUMERIC(10, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_installments_count_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_installments_count_check
      CHECK (installments_count IS NULL OR installments_count > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_installment_value_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_installment_value_check
      CHECK (installment_value IS NULL OR installment_value >= 0);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
