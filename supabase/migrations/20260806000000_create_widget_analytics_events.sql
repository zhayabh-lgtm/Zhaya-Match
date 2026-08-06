-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: TABELA DE EVENTOS DE ANALYTICS
-- Tabela idempotente para armazenar eventos anônimos do widget publicado
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.widget_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  visitor_id TEXT,
  session_id TEXT NOT NULL,
  product_type_id TEXT,
  product_type_name TEXT,
  product_category TEXT,
  recommendation_status TEXT,
  source_domain TEXT,
  page_path TEXT,
  device_type TEXT,
  config_version INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices otimizados para consultas de período e agregados
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_occurred_at ON public.widget_analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_event_name ON public.widget_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_session_id ON public.widget_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_name_occurred ON public.widget_analytics_events(event_name, occurred_at);

-- Habilita RLS
ALTER TABLE public.widget_analytics_events ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Somente usuários autenticados (administradores do painel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'widget_analytics_events' AND policyname = 'Admins can view analytics events'
  ) THEN
    CREATE POLICY "Admins can view analytics events"
      ON public.widget_analytics_events
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Política de inserção pública/anon via RLS para permitir inserção anônima direta ou via API
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'widget_analytics_events' AND policyname = 'Allow insert for analytics'
  ) THEN
    CREATE POLICY "Allow insert for analytics"
      ON public.widget_analytics_events
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
