-- Migration: 20260813130000_create_live_invites.sql
-- Description: Create live_invites table with RLS for Live Invites feature (Optional persistence)

CREATE TABLE IF NOT EXISTS public.live_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_invites_slug ON public.live_invites(slug);
CREATE INDEX IF NOT EXISTS idx_live_invites_created_at ON public.live_invites(created_at DESC);

ALTER TABLE public.live_invites ENABLE ROW LEVEL SECURITY;

-- Revoke direct table operations from public anon and authenticated users
-- Secure server-side APIs use the Service Role exclusively.
REVOKE ALL ON public.live_invites FROM anon, authenticated;
GRANT ALL ON public.live_invites TO service_role;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
