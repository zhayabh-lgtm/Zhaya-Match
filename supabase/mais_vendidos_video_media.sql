-- ZHAYA MATCH — MÍDIA MISTA + VÍDEO DE FUNDO + LIMPEZA DE VÍDEOS ÓRFÃOS

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS background_video_url TEXT,
  ADD COLUMN IF NOT EXISTS background_video_path TEXT,
  ADD COLUMN IF NOT EXISTS background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22,
  ADD COLUMN IF NOT EXISTS background_video_blur NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Permite produto cuja primeira/única mídia seja vídeo.
ALTER TABLE public.best_seller_products
  ALTER COLUMN image_url DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_background_video_opacity_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_opacity_check
      CHECK (background_video_opacity >= 0 AND background_video_opacity <= 0.9);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_background_video_blur_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_blur_check
      CHECK (background_video_blur >= 0 AND background_video_blur <= 30);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.best_seller_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_cleanup
  ON public.best_seller_media_assets(media_type, last_used_at);

ALTER TABLE public.best_seller_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_media_assets FROM anon, authenticated;
GRANT ALL ON public.best_seller_media_assets TO service_role;

-- Bucket público para leitura. Uploads passam por URL assinada criada pela API admin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zhaya-match-media',
  'zhaya-match-media',
  true,
  104857600,
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
  ];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access zhaya-match-media'
  ) THEN
    CREATE POLICY "Public Access zhaya-match-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'zhaya-match-media');
  END IF;
END $$;

-- Não removemos as políticas existentes deste bucket porque outras áreas do Zhaya Match
-- também podem reutilizá-lo. Os uploads de Mais Vendidos usam URLs assinadas pela API admin.

NOTIFY pgrst, 'reload schema';
