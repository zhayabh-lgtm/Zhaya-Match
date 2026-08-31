-- Zhaya Match - Cupons Live V3 (visual)
-- Execute uma vez no SQL Editor do Supabase. Pode ser reexecutado com segurança.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coupon_campaigns'
      AND column_name = 'timer_color'
  ) THEN
    ALTER TABLE public.coupon_campaigns ADD COLUMN timer_color TEXT;
    UPDATE public.coupon_campaigns
    SET timer_color = COALESCE(NULLIF(text_color, ''), '#FFFFFF');
    ALTER TABLE public.coupon_campaigns ALTER COLUMN timer_color SET DEFAULT '#FFFFFF';
    ALTER TABLE public.coupon_campaigns ALTER COLUMN timer_color SET NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
