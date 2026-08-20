-- =============================================================================
-- ZHAYA MATCH — MELHORIAS 20/08/2026
-- Live por vitrine + Internacional por país + reforço de localização dos cliques
-- Idempotente: pode executar novamente sem apagar dados existentes.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. VITRINE: vínculo com Live + configuração internacional manual
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.best_seller_lists') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.best_seller_lists não existe. Execute primeiro o setup da Vitrine Personalizada.';
  END IF;
END $$;

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS live_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS international_config JSONB;

COMMENT ON COLUMN public.best_seller_lists.live_enabled IS
  'Habilita os controles Iniciar/Pausar/Parar Live para a vitrine.';
COMMENT ON COLUMN public.best_seller_lists.international_config IS
  'Regras manuais por país: idioma, moeda, taxa, aviso de conversão e destino dos CTAs.';

-- -----------------------------------------------------------------------------
-- 2. SESSÕES DE LIVE
-- accumulated_seconds guarda apenas o tempo efetivamente em andamento.
-- Períodos pausados não contam na duração.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.best_seller_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_resumed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.best_seller_live_sessions
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'running',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.best_seller_live_sessions
SET status = 'stopped'
WHERE status IS NULL OR status NOT IN ('running', 'paused', 'stopped');

UPDATE public.best_seller_live_sessions
SET accumulated_seconds = 0
WHERE accumulated_seconds IS NULL OR accumulated_seconds < 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_live_sessions_status_check'
      AND conrelid = 'public.best_seller_live_sessions'::regclass
  ) THEN
    ALTER TABLE public.best_seller_live_sessions
      ADD CONSTRAINT best_seller_live_sessions_status_check
      CHECK (status IN ('running', 'paused', 'stopped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_live_sessions_accumulated_check'
      AND conrelid = 'public.best_seller_live_sessions'::regclass
  ) THEN
    ALTER TABLE public.best_seller_live_sessions
      ADD CONSTRAINT best_seller_live_sessions_accumulated_check
      CHECK (accumulated_seconds >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_best_seller_live_sessions_list_started
  ON public.best_seller_live_sessions(list_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_live_sessions_list_status
  ON public.best_seller_live_sessions(list_id, status);

ALTER TABLE public.best_seller_live_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_live_sessions FROM anon, authenticated;
GRANT ALL ON public.best_seller_live_sessions TO service_role;
GRANT ALL ON public.best_seller_lists TO service_role;

-- -----------------------------------------------------------------------------
-- 3. LOCALIZAÇÃO DOS CLIQUES / VISITANTES
-- As colunas não guardam IP nem coordenadas; apenas país/região/cidade aproximados
-- recebidos da infraestrutura da Vercel.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.best_seller_analytics_events') IS NOT NULL THEN
    ALTER TABLE public.best_seller_analytics_events
      ADD COLUMN IF NOT EXISTS country_code TEXT,
      ADD COLUMN IF NOT EXISTS region TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT;
    GRANT ALL ON public.best_seller_analytics_events TO service_role;
  END IF;

  IF to_regclass('public.best_seller_visitor_sessions') IS NOT NULL THEN
    ALTER TABLE public.best_seller_visitor_sessions
      ADD COLUMN IF NOT EXISTS country_code TEXT,
      ADD COLUMN IF NOT EXISTS region TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT;
    GRANT ALL ON public.best_seller_visitor_sessions TO service_role;
  END IF;
END $$;

-- Atualiza imediatamente o schema cache utilizado pela API do Supabase/PostgREST.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Diagnóstico final. As duas primeiras colunas devem retornar TRUE.
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'best_seller_lists'
      AND column_name = 'live_enabled'
  ) AS live_enabled_ok,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'best_seller_lists'
      AND column_name = 'international_config'
  ) AS international_ok,
  to_regclass('public.best_seller_live_sessions') AS tabela_live;
