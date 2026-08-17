-- Mais Vendidos: um link público único por lista
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.best_seller_lists
SET slug = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower(COALESCE(title, 'lista')), '[^a-z0-9]+', '-', 'g')), ''),
  'lista'
) || '-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_lists_slug
  ON public.best_seller_lists(slug);

ALTER TABLE public.best_seller_lists
  ALTER COLUMN slug SET NOT NULL;

NOTIFY pgrst, 'reload schema';
