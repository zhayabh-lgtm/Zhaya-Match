-- Migration: Add clicks counter to live_invites and atomic RPC function
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

-- Atomic increment function for live invite clicks
CREATE OR REPLACE FUNCTION public.increment_live_invite_clicks(invite_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.live_invites
  SET clicks = clicks + 1
  WHERE slug = invite_slug
  RETURNING clicks INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock down direct execution to service_role only
REVOKE ALL ON FUNCTION public.increment_live_invite_clicks(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_live_invite_clicks(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
