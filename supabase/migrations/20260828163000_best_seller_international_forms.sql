-- Leads de compra internacional gerados pela Vitrine Personalizada.
CREATE TABLE IF NOT EXISTS public.best_seller_international_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  list_title TEXT,
  product_id UUID REFERENCES public.best_seller_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  country_code TEXT,
  locale TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted')),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_created
  ON public.best_seller_international_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_list
  ON public.best_seller_international_forms(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_status
  ON public.best_seller_international_forms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_international_forms_country
  ON public.best_seller_international_forms(country_code, created_at DESC);

ALTER TABLE public.best_seller_international_forms ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.best_seller_international_forms IS
  'Solicitacoes de compra internacional enviadas pela Vitrine Personalizada. Escrita/leitura ocorre apenas pelas APIs server-side com service role.';
