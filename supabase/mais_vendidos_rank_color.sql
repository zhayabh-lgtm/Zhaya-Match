-- Zhaya Match — cor única do ranking por lista de Mais Vendidos
-- Seguro para instalações existentes. Não apaga dados.

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS rank_color TEXT NOT NULL DEFAULT '#FFFFFF';

NOTIFY pgrst, 'reload schema';
