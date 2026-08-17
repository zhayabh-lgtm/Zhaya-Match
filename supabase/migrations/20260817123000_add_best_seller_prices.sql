-- Zhaya Match — preços dos produtos em Mais Vendidos
-- Seguro para instalações existentes e sem perda de dados.

ALTER TABLE IF EXISTS public.best_seller_products
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);

ALTER TABLE IF EXISTS public.best_seller_products
  ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);

NOTIFY pgrst, 'reload schema';
