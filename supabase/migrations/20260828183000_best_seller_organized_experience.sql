-- Zhaya Match — modo opcional "Imersiva organizada"
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS experience_mode TEXT NOT NULL DEFAULT 'traditional',
  ADD COLUMN IF NOT EXISTS organized_intro_count INTEGER NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_lists_experience_mode_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_experience_mode_check
      CHECK (experience_mode IN ('traditional', 'organized'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_lists_organized_intro_count_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_organized_intro_count_check
      CHECK (organized_intro_count BETWEEN 1 AND 12);
  END IF;
END $$;
