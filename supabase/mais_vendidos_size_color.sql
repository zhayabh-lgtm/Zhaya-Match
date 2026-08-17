-- Mais Vendidos: cor global dos tamanhos por lista
ALTER TABLE public.best_seller_lists
ADD COLUMN IF NOT EXISTS size_color TEXT NOT NULL DEFAULT '#FFFFFF';

NOTIFY pgrst, 'reload schema';
