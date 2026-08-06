-- ==============================================================================
-- ZHAYA MATCH - SCHEMA COMPLETO E ATUALIZADO PARA O SUPABASE SQL EDITOR
-- Arquivo Idempotente (Pode ser executado várias vezes sem duplicar nada)
-- ==============================================================================

-- 1. Função de Atualização Automática de Timestamp (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- TABELA 1: product_types (Tipos de Peça e Tabelas de Medidas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_path TEXT,
  measurement_image_url TEXT,
  measurement_image_path TEXT,
  measurement_image_caption TEXT,
  icon_url TEXT,
  use_icon_in_selector BOOLEAN NOT NULL DEFAULT false,
  measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas mais recentes caso a tabela já existisse
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS use_icon_in_selector BOOLEAN NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS tr_product_types_updated_at ON public.product_types;
CREATE TRIGGER tr_product_types_updated_at
BEFORE UPDATE ON public.product_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABELA 2: popup_settings (Aparência Visual do Popup e Botão)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.popup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_popup_settings_updated_at ON public.popup_settings;
CREATE TRIGGER tr_popup_settings_updated_at
BEFORE UPDATE ON public.popup_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABELA 3: text_settings (Textos e Rótulos Personalizados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.text_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_text_settings_updated_at ON public.text_settings;
CREATE TRIGGER tr_text_settings_updated_at
BEFORE UPDATE ON public.text_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABELA 4: measurement_guides (Guias de Medição e 'Como Medir')
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measurement_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_path TEXT,
  alt_text TEXT,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir coluna de observações condicionais caso a tabela já existisse
ALTER TABLE public.measurement_guides ADD COLUMN IF NOT EXISTS observations JSONB NOT NULL DEFAULT '[]'::jsonb;

DROP TRIGGER IF EXISTS tr_measurement_guides_updated_at ON public.measurement_guides;
CREATE TRIGGER tr_measurement_guides_updated_at
BEFORE UPDATE ON public.measurement_guides
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABELA 5: app_settings (Configurações Gerais, Domínios Permitidos e Test Mode)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  allowed_domains JSONB NOT NULL DEFAULT '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  widget_url TEXT DEFAULT '/widget.js',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER tr_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- TABELA 6: media_assets (Mídias e Imagens de Suporte)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABELA 7: widget_analytics_events (Eventos Analíticos do Widget Publicado)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_occurred_at ON public.widget_analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_event_name ON public.widget_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_session_id ON public.widget_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_name_occurred ON public.widget_analytics_events(event_name, occurred_at);

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET: zhaya-match-media
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('zhaya-match-media', 'zhaya-match-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ------------------------------------------------------------------------------
-- SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics_events ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active product_types') THEN
    CREATE POLICY "Public read active product_types" ON public.product_types FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read popup_settings') THEN
    CREATE POLICY "Public read popup_settings" ON public.popup_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read text_settings') THEN
    CREATE POLICY "Public read text_settings" ON public.text_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active measurement_guides') THEN
    CREATE POLICY "Public read active measurement_guides" ON public.measurement_guides FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read app_settings') THEN
    CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read media_assets') THEN
    CREATE POLICY "Public read media_assets" ON public.media_assets FOR SELECT USING (true);
  END IF;
END $$;

-- Políticas de Acesso Administrativo (Autenticado)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access product_types') THEN
    CREATE POLICY "Authenticated full access product_types" ON public.product_types FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access popup_settings') THEN
    CREATE POLICY "Authenticated full access popup_settings" ON public.popup_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access text_settings') THEN
    CREATE POLICY "Authenticated full access text_settings" ON public.text_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access measurement_guides') THEN
    CREATE POLICY "Authenticated full access measurement_guides" ON public.measurement_guides FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access app_settings') THEN
    CREATE POLICY "Authenticated full access app_settings" ON public.app_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access media_assets') THEN
    CREATE POLICY "Authenticated full access media_assets" ON public.media_assets FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view analytics events') THEN
    CREATE POLICY "Admins can view analytics events" ON public.widget_analytics_events FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert for analytics') THEN
    CREATE POLICY "Allow insert for analytics" ON public.widget_analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

-- Políticas de Storage para o Bucket 'zhaya-match-media'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read zhaya-match-media') THEN
    CREATE POLICY "Public Read zhaya-match-media" ON storage.objects FOR SELECT USING (bucket_id = 'zhaya-match-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Insert zhaya-match-media') THEN
    CREATE POLICY "Authenticated Insert zhaya-match-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'zhaya-match-media' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Update zhaya-match-media') THEN
    CREATE POLICY "Authenticated Update zhaya-match-media" ON storage.objects FOR UPDATE USING (bucket_id = 'zhaya-match-media' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Delete zhaya-match-media') THEN
    CREATE POLICY "Authenticated Delete zhaya-match-media" ON storage.objects FOR DELETE USING (bucket_id = 'zhaya-match-media' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- DADOS INICIAIS (SEED DATA)
-- ------------------------------------------------------------------------------

-- Inserir Categorias e Tipos Padrão
INSERT INTO public.product_types (id, name, active, sort_order, measurements, sizes) VALUES
('pt-jaqueta', 'Jaqueta', true, 1, '["bust", "waist", "shoulders"]'::jsonb, '[{"id": "sz-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "shoulders": {"min": 36, "max": 38}}}, {"id": "sz-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "shoulders": {"min": 39, "max": 41}}}, {"id": "sz-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "shoulders": {"min": 42, "max": 44}}}]'::jsonb),
('pt-blazer', 'Blazer', true, 2, '["bust", "waist", "shoulders"]'::jsonb, '[{"id": "sz-bl-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "shoulders": {"min": 37, "max": 39}}}, {"id": "sz-bl-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "shoulders": {"min": 40, "max": 42}}}, {"id": "sz-bl-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "shoulders": {"min": 43, "max": 45}}}]'::jsonb),
('pt-body', 'Body', true, 3, '["bust", "waist", "hip", "torsoLength"]'::jsonb, '[{"id": "sz-bo-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 82, "max": 88}, "waist": {"min": 64, "max": 70}, "hip": {"min": 88, "max": 94}, "torsoLength": {"min": 60, "max": 64}}}, {"id": "sz-bo-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 89, "max": 95}, "waist": {"min": 71, "max": 77}, "hip": {"min": 95, "max": 101}, "torsoLength": {"min": 65, "max": 69}}}, {"id": "sz-bo-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 96, "max": 102}, "waist": {"min": 78, "max": 84}, "hip": {"min": 102, "max": 108}, "torsoLength": {"min": 70, "max": 74}}}]'::jsonb),
('pt-vestido', 'Vestido', true, 4, '["bust", "waist", "hip"]'::jsonb, '[{"id": "sz-ve-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "hip": {"min": 90, "max": 96}}}, {"id": "sz-ve-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "hip": {"min": 97, "max": 103}}}, {"id": "sz-ve-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "hip": {"min": 104, "max": 110}}}]'::jsonb),
('pt-calca', 'Calça', true, 5, '["waist", "hip", "thigh"]'::jsonb, '[{"id": "sz-ca-36", "label": "36", "order": 1, "ranges": {"waist": {"min": 64, "max": 68}, "hip": {"min": 90, "max": 94}, "thigh": {"min": 50, "max": 54}}}, {"id": "sz-ca-38", "label": "38", "order": 2, "ranges": {"waist": {"min": 69, "max": 73}, "hip": {"min": 95, "max": 99}, "thigh": {"min": 55, "max": 58}}}, {"id": "sz-ca-40", "label": "40", "order": 3, "ranges": {"waist": {"min": 74, "max": 78}, "hip": {"min": 100, "max": 104}, "thigh": {"min": 59, "max": 62}}}, {"id": "sz-ca-42", "label": "42", "order": 4, "ranges": {"waist": {"min": 79, "max": 83}, "hip": {"min": 105, "max": 109}, "thigh": {"min": 63, "max": 66}}}]'::jsonb),
('pt-short', 'Short', true, 6, '["waist", "hip"]'::jsonb, '[{"id": "sz-sh-36", "label": "36", "order": 1, "ranges": {"waist": {"min": 64, "max": 68}, "hip": {"min": 90, "max": 94}}}, {"id": "sz-sh-38", "label": "38", "order": 2, "ranges": {"waist": {"min": 69, "max": 73}, "hip": {"min": 95, "max": 99}}}, {"id": "sz-sh-40", "label": "40", "order": 3, "ranges": {"waist": {"min": 74, "max": 78}, "hip": {"min": 100, "max": 104}}}]'::jsonb),
('pt-saia', 'Saia', true, 7, '["waist", "hip"]'::jsonb, '[{"id": "sz-sa-p", "label": "P", "order": 1, "ranges": {"waist": {"min": 64, "max": 70}, "hip": {"min": 90, "max": 96}}}, {"id": "sz-sa-m", "label": "M", "order": 2, "ranges": {"waist": {"min": 71, "max": 77}, "hip": {"min": 97, "max": 103}}}, {"id": "sz-sa-g", "label": "G", "order": 3, "ranges": {"waist": {"min": 78, "max": 84}, "hip": {"min": 104, "max": 110}}}]'::jsonb),
('pt-macacao', 'Macacão', true, 8, '["bust", "waist", "hip", "torsoLength"]'::jsonb, '[{"id": "sz-mc-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "hip": {"min": 90, "max": 96}, "torsoLength": {"min": 60, "max": 64}}}, {"id": "sz-mc-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "hip": {"min": 97, "max": 103}, "torsoLength": {"min": 65, "max": 69}}}, {"id": "sz-mc-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "hip": {"min": 104, "max": 110}, "torsoLength": {"min": 70, "max": 74}}}]'::jsonb),
('pt-sapato', 'Sapato', true, 9, '["footLength", "footWidth"]'::jsonb, '[{"id": "sz-sp-35", "label": "35", "order": 1, "ranges": {"footLength": {"min": 22.5, "max": 23.2}, "footWidth": {"min": 8.5, "max": 9.0}}}, {"id": "sz-sp-36", "label": "36", "order": 2, "ranges": {"footLength": {"min": 23.3, "max": 23.9}, "footWidth": {"min": 9.1, "max": 9.4}}}, {"id": "sz-sp-37", "label": "37", "order": 3, "ranges": {"footLength": {"min": 24.0, "max": 24.6}, "footWidth": {"min": 9.5, "max": 9.8}}}, {"id": "sz-sp-38", "label": "38", "order": 4, "ranges": {"footLength": {"min": 24.7, "max": 25.3}, "footWidth": {"min": 9.9, "max": 10.2}}}, {"id": "sz-sp-39", "label": "39", "order": 5, "ranges": {"footLength": {"min": 25.4, "max": 26.0}, "footWidth": {"min": 10.3, "max": 10.6}}}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Inserir Aparência Padrão do Popup
INSERT INTO public.popup_settings (settings, version)
SELECT '{
  "showLogo": true,
  "logoSize": 24,
  "logoPosition": "center",
  "customFontUrl": "",
  "mainMeasurementImageUrl": "",
  "mainMeasurementImageCaption": "Áreas de medição do corpo (busto, cintura e quadril)",
  "showMeasurementCaption": true,
  "imageAreaBgColor": "#0A0A0A",
  "imageColumnWidth": 42,
  "backgroundColor": "#000000",
  "textColor": "#FFFFFF",
  "secondaryTextColor": "#A3A3A3",
  "buttonColor": "#FFFFFF",
  "buttonTextColor": "#000000",
  "borderColor": "#262626",
  "borderRadius": 8,
  "desktopWidth": 820,
  "mobileFormat": "modal",
  "paddingInternal": 24,
  "overlayColor": "#000000",
  "overlayOpacity": 0.75,
  "enableBlur": true,
  "blurAmount": 3,
  "closeOnClickOutside": true,
  "buttonText": "Descubra seu tamanho",
  "buttonStyle": "border"
}'::jsonb, 1
WHERE NOT EXISTS (SELECT 1 FROM public.popup_settings);

-- Inserir Textos Padrão
INSERT INTO public.text_settings (settings)
SELECT '{
  "buttonText": "Descubra seu tamanho",
  "initialTitle": "Curadoria de Tamanho Zhaya",
  "welcomeMessage": "Seja bem-vinda à experiência personalizada Zhaya. Em poucos passos, indicamos o tamanho ideal para o seu corpo com máxima precisão e elegância.",
  "welcomeButtonText": "Iniciar Curadoria",
  "typeChoiceTitle": "Qual peça você deseja escolher?",
  "measurementsTitle": "Insira suas medidas corporais",
  "calculateButtonText": "Descobrir meu tamanho",
  "resultTitle": "Sugerimos o tamanho",
  "betweenSizesMessage": "Você está entre dois tamanhos.",
  "notFoundMessage": "Não foi possível recomendar um tamanho automaticamente com base nestas medidas. Nossa equipe está à disposição para atendimento personalizado.",
  "recalculateButtonText": "Calcular novamente",
  "closeButtonText": "Concluir",
  "backButtonText": "Voltar",
  "privacyNotice": "Suas medidas são utilizadas estritamente para esta recomendação."
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.text_settings);

-- Inserir Guias 'Como Medir'
INSERT INTO public.measurement_guides (measurement_key, label, title, description) VALUES
('bust', 'Busto', 'Como medir o busto', 'Passe a fita ao redor da parte mais cheia do busto, mantendo-a reta e sem apertar.'),
('waist', 'Cintura', 'Como medir a cintura', 'Passe a fita ao redor da menor parte da cintura, logo acima do umbigo.'),
('hip', 'Quadril', 'Como medir o quadril', 'Passe a fita na parte mais larga do quadril com os pés juntos.'),
('shoulders', 'Ombros', 'Como medir os ombros', 'Meça na parte de trás, de uma extremidade do ombro à outra.'),
('thigh', 'Coxa', 'Como medir a coxa', 'Passe a fita ao redor da parte mais grossa da coxa.'),
('torsoLength', 'Comprimento do tronco', 'Como medir o tronco', 'Meça da base do pescoço até a linha da cintura.'),
('footLength', 'Comprimento do pé', 'Como medir o pé', 'Meça do calcanhar até a ponta do dedo mais longo.'),
('footWidth', 'Largura do pé', 'Como medir a largura do pé', 'Meça na parte mais larga da planta do pé.')
ON CONFLICT (measurement_key) DO NOTHING;

-- Inserir Configuração Geral do App
INSERT INTO public.app_settings (enabled, test_mode, allowed_domains, version, widget_url)
SELECT true, false, '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb, 1, '/widget.js'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);
