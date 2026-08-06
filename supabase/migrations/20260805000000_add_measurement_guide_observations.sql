-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: OBSERVAÇÕES CONDICIONAIS EM MEASUREMENT_GUIDES
-- Adiciona a coluna observations JSONB de forma idempotente
-- ==============================================================================

ALTER TABLE public.measurement_guides
ADD COLUMN IF NOT EXISTS observations JSONB NOT NULL DEFAULT '[]'::jsonb;
