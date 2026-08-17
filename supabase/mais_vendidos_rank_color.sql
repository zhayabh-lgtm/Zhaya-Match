-- Zhaya Match — cor individual do ranking dos Mais Vendidos
-- Seguro para rodar em uma instalação existente. Não apaga dados.

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS rank_color TEXT NOT NULL DEFAULT '#FFFFFF';

NOTIFY pgrst, 'reload schema';
