-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: TABELA E CRON DE MONITOR DE ATIVIDADE
-- Registra e monitora execuções periódicas para manutenção do Supabase Free
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_activity_status (
  id TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita Row Level Security
ALTER TABLE public.system_activity_status ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Somente usuários autenticados (administradores do painel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_activity_status' AND policyname = 'Admins can view activity status'
  ) THEN
    CREATE POLICY "Admins can view activity status"
      ON public.system_activity_status
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Linha inicial idempotente para o monitor de atividade
INSERT INTO public.system_activity_status (id, last_status, updated_at)
VALUES ('supabase-activity-monitor', 'pending', now())
ON CONFLICT (id) DO NOTHING;

-- Função SQL idempotente para executar o teste leve de saúde e registrar atividade
CREATE OR REPLACE FUNCTION public.execute_system_activity_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_now TIMESTAMPTZ := now();
  v_res JSONB;
BEGIN
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

-- Agendamento automático via pg_cron (se disponível na instância Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedules existing job with same name if present
    PERFORM cron.unschedule('zhaya-match-daily-activity')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zhaya-match-daily-activity');

    -- Schedule once daily at 03:00 UTC (00:00 BRT)
    PERFORM cron.schedule(
      'zhaya-match-daily-activity',
      '0 3 * * *',
      'SELECT public.execute_system_activity_check();'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback seguro se pg_cron não estiver instalado
  NULL;
END $$;
