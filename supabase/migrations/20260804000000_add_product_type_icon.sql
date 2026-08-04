-- ==============================================================================
-- ZHAYA MATCH - MIGRATION INCREMENTAL: SUPORTE A ÍCONES EM PRODUCT_TYPES
-- Adiciona colunas icon_url e use_icon_in_selector de forma idempotente
-- ==============================================================================

ALTER TABLE product_types 
ADD COLUMN IF NOT EXISTS icon_url TEXT,
ADD COLUMN IF NOT EXISTS use_icon_in_selector BOOLEAN NOT NULL DEFAULT FALSE;
