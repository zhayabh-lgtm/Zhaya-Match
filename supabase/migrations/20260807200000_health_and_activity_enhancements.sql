-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: MONITOR DE ATIVIDADE E HEALTH CHECK
-- Suporte a status estendidos (healthy, stale, configuration_error, database_error)
-- RLS e privilégios ajustados para leitura segura e escrita restrita
-- ==============================================================================

-- 1. Permissões de leitura e restrição de escrita na tabela system_activity_status
GRANT SELECT ON public.system_activity_status TO authenticated, service_role, anon;
REVOKE INSERT, UPDATE, DELETE ON public.system_activity_status FROM anon;

-- 2. Garantia de Política RLS de Leitura na tabela system_activity_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_activity_status' AND policyname = 'Public read activity status'
  ) THEN
    CREATE POLICY "Public read activity status"
      ON public.system_activity_status
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 3. Atualização da RPC execute_system_activity_check com status 'healthy' e tratamento defensivo
CREATE OR REPLACE FUNCTION public.execute_system_activity_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_now TIMESTAMPTZ := now();
  v_res JSONB;
BEGIN
  -- Validação de Autorização: Apenas usuários autenticados, service_role ou superuser/postgres
  IF auth.role() IS NULL OR (auth.role() <> 'authenticated' AND auth.role() <> 'service_role') THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador ou service_role.';
    END IF;
  END IF;

  -- Consulta leve real em tabela existente do sistema
  SELECT count(*) INTO v_count FROM public.app_settings;

  -- Atualiza a linha do monitor em system_activity_status
  INSERT INTO public.system_activity_status (
    id,
    last_run_at,
    last_success_at,
    last_status,
    last_error,
    updated_at
  ) VALUES (
    'supabase-activity-monitor',
    v_now,
    v_now,
    'healthy',
    NULL,
    v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    last_run_at = EXCLUDED.last_run_at,
    last_success_at = EXCLUDED.last_success_at,
    last_status = 'healthy',
    last_error = NULL,
    updated_at = EXCLUDED.updated_at;

  v_res := jsonb_build_object(
    'ok', true,
    'status', 'healthy',
    'timestamp', v_now,
    'recordsChecked', v_count
  );

  RETURN v_res;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.system_activity_status (
    id,
    last_run_at,
    last_status,
    last_error,
    updated_at
  ) VALUES (
    'supabase-activity-monitor',
    v_now,
    'database_error',
    SQLERRM,
    v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    last_run_at = EXCLUDED.last_run_at,
    last_status = 'database_error',
    last_error = SQLERRM,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'ok', false,
    'status', 'database_error',
    'error', SQLERRM,
    'timestamp', v_now
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.execute_system_activity_check() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_system_activity_check() TO authenticated, service_role;
