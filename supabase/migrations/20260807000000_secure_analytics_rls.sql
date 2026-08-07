-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: REVOGAÇÃO DE INSERÇÃO PÚBLICA DIRETA
-- Remove permissão de inserção anônima direta na tabela widget_analytics_events.
-- Inserções devem ser realizadas exclusivamente no servidor backend usando SUPABASE_SERVICE_ROLE_KEY.
-- ==============================================================================

-- 1. Remove a política permissiva de inserção anônima se ela existir
DROP POLICY IF EXISTS "Allow insert for analytics" ON public.widget_analytics_events;

-- 2. Garante que RLS permanece ativada na tabela
ALTER TABLE public.widget_analytics_events ENABLE ROW LEVEL SECURITY;

-- 3. Revoga explicitamente permissão de INSERT para os papéis anon e authenticated
REVOKE INSERT ON public.widget_analytics_events FROM anon, authenticated;
