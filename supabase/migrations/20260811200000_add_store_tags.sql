-- Migration: Add store_tags to product_types table

ALTER TABLE public.product_types
ADD COLUMN IF NOT EXISTS store_tags text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.product_types.store_tags IS 'Tags de produtos da loja (Olist) para vinculação e seleção automática do tipo no widget';
