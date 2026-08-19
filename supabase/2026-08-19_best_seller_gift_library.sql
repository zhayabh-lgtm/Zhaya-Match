-- Zhaya Match — Biblioteca reutilizável de presentes
-- Pode executar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.best_seller_gift_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  image_path TEXT,
  title TEXT,
  label TEXT,
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  image_size INTEGER NOT NULL DEFAULT 48 CHECK (image_size >= 36 AND image_size <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS text_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS image_size INTEGER NOT NULL DEFAULT 48;
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.best_seller_gift_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_best_seller_gift_library_updated
  ON public.best_seller_gift_library(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_gift_library_image
  ON public.best_seller_gift_library(image_url);

ALTER TABLE public.best_seller_gift_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_gift_library FROM anon, authenticated;
GRANT ALL ON public.best_seller_gift_library TO service_role;

NOTIFY pgrst, 'reload schema';
