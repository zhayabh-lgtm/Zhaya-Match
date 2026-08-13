-- Migration: Adiciona coluna is_test para separar eventos e feedbacks de diagnóstico
-- Garante que requisições de teste da Central de Diagnóstico não contaminem as métricas reais.

ALTER TABLE public.widget_analytics_events
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.widget_feedback_responses
ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_is_test ON public.widget_analytics_events(is_test);
CREATE INDEX IF NOT EXISTS idx_widget_feedback_responses_is_test ON public.widget_feedback_responses(is_test);
