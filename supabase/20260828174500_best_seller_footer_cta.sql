-- Zhaya Match - CTA opcional no final da Vitrine Personalizada
-- Seguro para executar em bancos já configurados.

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS footer_cta_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS footer_cta_url TEXT;

COMMENT ON COLUMN public.best_seller_lists.footer_cta_enabled IS
  'Exibe um botão editorial opcional depois do último conteúdo da vitrine.';
COMMENT ON COLUMN public.best_seller_lists.footer_cta_text IS
  'Texto manual do CTA final da vitrine.';
COMMENT ON COLUMN public.best_seller_lists.footer_cta_url IS
  'URL externa do CTA final da vitrine.';
