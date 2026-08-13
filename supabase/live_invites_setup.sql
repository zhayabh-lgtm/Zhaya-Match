-- ==============================================================================
-- ZHAYA MATCH - SETUP DE CONVITES DE LIVE (OPCIONAL)
-- ==============================================================================
-- Execute este script no SQL Editor do Supabase para habilitar o armazenamento
-- persistente de convites de lives com contador de cliques.
-- Se preferir não executar, o sistema continuará funcionando normalmente em modo de memória.
-- ==============================================================================

-- 1. Criação da tabela live_invites
CREATE TABLE IF NOT EXISTS public.live_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Adiciona a coluna clicks caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.live_invites ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

-- 2. Índices de performance
CREATE INDEX IF NOT EXISTS idx_live_invites_slug ON public.live_invites(slug);
CREATE INDEX IF NOT EXISTS idx_live_invites_created_at ON public.live_invites(created_at DESC);

-- 3. Habilitação de Segurança por Linha (Row Level Security - RLS)
ALTER TABLE public.live_invites ENABLE ROW LEVEL SECURITY;

-- 4. Isolamento estrito de acessos diretos do frontend (anon / authenticated)
-- As APIs do servidor com chave de serviço (Service Role) gerenciam a leitura e escrita com segurança.
REVOKE ALL ON public.live_invites FROM anon, authenticated;
GRANT ALL ON public.live_invites TO service_role;

-- 5. Função atômica para incremento seguro de cliques
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

REVOKE ALL ON FUNCTION public.increment_live_invite_clicks(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_live_invite_clicks(TEXT) TO service_role;

-- 6. Recarga do cache do PostgREST / Supabase API
NOTIFY pgrst, 'reload schema';
