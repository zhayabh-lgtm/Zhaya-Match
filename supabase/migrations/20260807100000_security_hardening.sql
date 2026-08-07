-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: SEGURANÇA, RLS E HARDENING DE FUNÇÕES
-- Hardening de SECURITY DEFINER, revogação de privilégios e busca segura
-- ==============================================================================

-- 1. Recriação segura da função execute_system_activity_check com search_path seguro e validação de perfil
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
  -- Validação de Autorização: Garante que apenas usuários autenticados ou o serviço interno podem disparar a verificação
  IF auth.role() IS NULL OR (auth.role() <> 'authenticated' AND auth.role() <> 'service_role') THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador ou service_role.';
    END IF;
  END IF;

  -- Consulta leve real em tabela existente do sistema (app_settings)
  SELECT count(*) INTO v_count FROM public.app_settings;

  -- Atualiza a linha única do monitor em system_activity_status
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
    'success',
    NULL,
    v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    last_run_at = EXCLUDED.last_run_at,
    last_success_at = EXCLUDED.last_success_at,
    last_status = 'success',
    last_error = NULL,
    updated_at = EXCLUDED.updated_at;

  v_res := jsonb_build_object(
    'ok', true,
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
    'error',
    SQLERRM,
    v_now
  )
  ON CONFLICT (id) DO UPDATE SET
    last_run_at = EXCLUDED.last_run_at,
    last_status = 'error',
    last_error = SQLERRM,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'ok', false,
    'error', SQLERRM,
    'timestamp', v_now
  );
END;
$$;

-- 2. Restrição de execução da RPC execute_system_activity_check
REVOKE EXECUTE ON FUNCTION public.execute_system_activity_check() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_system_activity_check() TO authenticated, service_role;

-- 3. Revogação de permissões de escrita diretas em tabelas de auditoria e monitoramento para anon
REVOKE INSERT, UPDATE, DELETE ON public.widget_analytics_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.system_activity_status FROM anon;

-- 4. Garantia de RLS habilitada em todas as tabelas
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity_status ENABLE ROW LEVEL SECURITY;
