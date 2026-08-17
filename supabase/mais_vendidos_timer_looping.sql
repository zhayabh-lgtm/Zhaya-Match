-- Zhaya Match — timer evergreen/looping por visitante
-- Seguro para instalações existentes. Não remove dados.

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;

UPDATE public.best_seller_lists
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'best_seller_lists_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_timer_duration_minutes_check
      CHECK (
        timer_duration_minutes IS NULL
        OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
