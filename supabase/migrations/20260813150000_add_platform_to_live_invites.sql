-- ==============================================================================
-- Migration: Adiciona suporte a plataforma e link de live personalizada
-- ==============================================================================

ALTER TABLE public.live_invites 
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS platform_url TEXT DEFAULT 'https://instagram.com/shoes.zhaya';

NOTIFY pgrst, 'reload schema';
