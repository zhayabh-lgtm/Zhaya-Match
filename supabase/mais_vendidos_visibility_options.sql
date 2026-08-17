-- Opções de visibilidade da data e do ranking por lista.
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS show_date BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_ranking BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
