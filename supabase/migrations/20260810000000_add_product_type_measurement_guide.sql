-- Migration: Add measurement_guide_tips and measurement_guide_observation to product_types table

ALTER TABLE public.product_types
ADD COLUMN IF NOT EXISTS measurement_guide_tips JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.product_types
ADD COLUMN IF NOT EXISTS measurement_guide_observation TEXT DEFAULT NULL;

COMMENT ON COLUMN public.product_types.measurement_guide_tips IS 'Lista de dicas explicativas passo a passo para o guia de medidas deste tipo de produto';
COMMENT ON COLUMN public.product_types.measurement_guide_observation IS 'Observação de orientação com destaque centralizado na modal de medição do tipo de produto';
