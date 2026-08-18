-- ==============================================================================
-- ZHAYA MATCH - SCHEMA COMPLETO E ATUALIZADO PARA O SUPABASE SQL EDITOR
-- Arquivo Idempotente (Pode ser executado no SQL Editor do Supabase sem erros)
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
  category TEXT,
  fit_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_path TEXT,
  measurement_image_url TEXT,
  measurement_image_path TEXT,
  measurement_image_caption TEXT,
  measurement_guide_tips JSONB DEFAULT '[]'::jsonb,
  measurement_guide_observation TEXT DEFAULT NULL,
  icon_url TEXT,
  use_icon_in_selector BOOLEAN NOT NULL DEFAULT false,
  store_tags TEXT[] DEFAULT '{}'::text[],
  measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir colunas adicionais caso a tabela já existisse previamente
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS fit_type TEXT;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS use_icon_in_selector BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS measurement_guide_tips JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS measurement_guide_observation TEXT DEFAULT NULL;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS store_tags TEXT[] DEFAULT '{}'::text[];

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
  enable_feedback_survey BOOLEAN NOT NULL DEFAULT true,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  allowed_domains JSONB NOT NULL DEFAULT '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  widget_url TEXT DEFAULT '/widget.js',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS enable_feedback_survey BOOLEAN NOT NULL DEFAULT true;

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
-- TABELA 7: widget_analytics_events (Eventos Analíticos do Widget)
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
  is_test BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_occurred_at ON public.widget_analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_event_name ON public.widget_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_events_session_id ON public.widget_analytics_events(session_id);

-- ------------------------------------------------------------------------------
-- TABELA 8: widget_feedback_responses (Respostas da Pesquisa de Feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.widget_feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT,
  session_id TEXT,
  product_type_id TEXT,
  recommendation_status TEXT,
  recommended_size TEXT,
  alternate_size TEXT,
  adequacy_response TEXT NOT NULL,
  ease_rating INTEGER NOT NULL,
  comment TEXT,
  config_version INTEGER,
  is_test BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widget_feedback_submitted_at ON public.widget_feedback_responses (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_feedback_product_type ON public.widget_feedback_responses (product_type_id);

-- ------------------------------------------------------------------------------
-- TABELA 9: system_activity_status (Monitor de Saúde do Banco / Keep-Alive)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_activity_status (
  id TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.system_activity_status (id, last_status, updated_at)
VALUES ('supabase-activity-monitor', 'pending', now())
ON CONFLICT (id) DO NOTHING;

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
ALTER TABLE public.widget_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity_status ENABLE ROW LEVEL SECURITY;

-- Conceder permissões públicas de leitura para tabelas de configuração e saúde
GRANT SELECT ON public.product_types TO anon, authenticated, service_role;
GRANT SELECT ON public.popup_settings TO anon, authenticated, service_role;
GRANT SELECT ON public.text_settings TO anon, authenticated, service_role;
GRANT SELECT ON public.measurement_guides TO anon, authenticated, service_role;
GRANT SELECT ON public.app_settings TO anon, authenticated, service_role;
GRANT SELECT ON public.system_activity_status TO anon, authenticated, service_role;

-- Apenas a service_role pode gravar analytics e feedback diretamente
GRANT ALL ON public.widget_analytics_events TO service_role;
GRANT ALL ON public.widget_feedback_responses TO service_role;
GRANT SELECT ON public.widget_analytics_events TO authenticated;
GRANT SELECT ON public.widget_feedback_responses TO authenticated;

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

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read system_activity_status') THEN
    CREATE POLICY "Public read system_activity_status" ON public.system_activity_status FOR SELECT USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SEED DATA (DADOS INICIAIS DE COMPATIBILIDADE)
-- ------------------------------------------------------------------------------

INSERT INTO public.product_types (id, name, active, sort_order, store_tags, measurements, sizes) VALUES
('pt-jaqueta', 'Jaqueta', true, 1, ARRAY['jaqueta','jaquetas','casaco','blusa-frio'], '["bust", "waist", "shoulders"]'::jsonb, '[{"id": "sz-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "shoulders": {"min": 36, "max": 38}}}, {"id": "sz-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "shoulders": {"min": 39, "max": 41}}}, {"id": "sz-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "shoulders": {"min": 42, "max": 44}}}]'::jsonb),
('pt-blazer', 'Blazer', true, 2, ARRAY['blazer','blazers','alfaiataria'], '["bust", "waist", "shoulders"]'::jsonb, '[{"id": "sz-bl-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "shoulders": {"min": 37, "max": 39}}}, {"id": "sz-bl-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "shoulders": {"min": 40, "max": 42}}}, {"id": "sz-bl-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "shoulders": {"min": 43, "max": 45}}}]'::jsonb),
('pt-body', 'Body', true, 3, ARRAY['body','bodies'], '["bust", "waist", "hip", "torsoLength"]'::jsonb, '[{"id": "sz-bo-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 82, "max": 88}, "waist": {"min": 64, "max": 70}, "hip": {"min": 88, "max": 94}, "torsoLength": {"min": 60, "max": 64}}}, {"id": "sz-bo-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 89, "max": 95}, "waist": {"min": 71, "max": 77}, "hip": {"min": 95, "max": 101}, "torsoLength": {"min": 65, "max": 69}}}, {"id": "sz-bo-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 96, "max": 102}, "waist": {"min": 78, "max": 84}, "hip": {"min": 102, "max": 108}, "torsoLength": {"min": 70, "max": 74}}}]'::jsonb),
('pt-vestido', 'Vestido', true, 4, ARRAY['vestido','vestidos'], '["bust", "waist", "hip"]'::jsonb, '[{"id": "sz-ve-p", "label": "P", "order": 1, "ranges": {"bust": {"min": 84, "max": 90}, "waist": {"min": 66, "max": 72}, "hip": {"min": 90, "max": 96}}}, {"id": "sz-ve-m", "label": "M", "order": 2, "ranges": {"bust": {"min": 91, "max": 97}, "waist": {"min": 73, "max": 79}, "hip": {"min": 97, "max": 103}}}, {"id": "sz-ve-g", "label": "G", "order": 3, "ranges": {"bust": {"min": 98, "max": 104}, "waist": {"min": 80, "max": 86}, "hip": {"min": 104, "max": 110}}}]'::jsonb),
('pt-calca', 'Calça', true, 5, ARRAY['calca','calcas','jeans','pantalona'], '["waist", "hip", "thigh"]'::jsonb, '[{"id": "sz-ca-36", "label": "36", "order": 1, "ranges": {"waist": {"min": 64, "max": 68}, "hip": {"min": 90, "max": 94}, "thigh": {"min": 50, "max": 54}}}, {"id": "sz-ca-38", "label": "38", "order": 2, "ranges": {"waist": {"min": 69, "max": 73}, "hip": {"min": 95, "max": 99}, "thigh": {"min": 55, "max": 58}}}, {"id": "sz-ca-40", "label": "40", "order": 3, "ranges": {"waist": {"min": 74, "max": 78}, "hip": {"min": 100, "max": 104}, "thigh": {"min": 59, "max": 62}}}, {"id": "sz-ca-42", "label": "42", "order": 4, "ranges": {"waist": {"min": 79, "max": 83}, "hip": {"min": 105, "max": 109}, "thigh": {"min": 63, "max": 66}}}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

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
  "privacyNotice": "Suas medidas são utilizadas estritamente para esta recomendação.",
  "feedbackAdequacyQuestion": "A recomendação fez sentido para você?",
  "feedbackEaseQuestion": "Como foi o processo de medição?",
  "feedbackEaseMinLabel": "Muito difícil",
  "feedbackEaseMaxLabel": "Muito fácil",
  "feedbackCommentLabel": "Deixe seu comentário ou sugestão:",
  "feedbackCommentPlaceholder": "Escreva aqui seu comentário ou sugestão...",
  "feedbackSubmitButtonText": "Enviar",
  "feedbackSkipButtonText": "Pular",
  "feedbackThankYouMessage": "Obrigado pelo seu feedback!"
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.text_settings);

INSERT INTO public.measurement_guides (measurement_key, label, title, description) VALUES
('bust', 'Busto', 'Como medir o busto', 'Passe a fita ao redor da parte mais cheia do busto, mantendo-a reta e sem apertar.'),
('waist', 'Cintura', 'Como medir a cintura', 'Passe a fita ao redor da menor parte da cintura, logo acima do umbigo.'),
('hip', 'Quadril', 'Como medir o quadril', 'Passe a fita na parte mais larga do quadril com os pés juntos.'),
('shoulders', 'Ombros', 'Como medir os ombros', 'Meça na parte de trás, de uma extremidade do ombro à outra.'),
('thigh', 'Coxa', 'Como medir a coxa', 'Passe a fita ao redor da parte mais grossa da coxa.')
ON CONFLICT (measurement_key) DO NOTHING;

INSERT INTO public.app_settings (enabled, enable_feedback_survey, test_mode, allowed_domains, version, widget_url)
SELECT true, true, false, '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb, 1, '/widget.js'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Function for atomic configuration publication
CREATE OR REPLACE FUNCTION public.publish_all_config(
  p_appearance jsonb,
  p_texts jsonb,
  p_app_config jsonb,
  p_product_types jsonb,
  p_measurement_guides jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
DECLARE
  v_version integer;
  pt record;
  mg record;
BEGIN
  -- Versionamento Server-Side: calcula nova versão incrementando a versão máxima publicada
  SELECT COALESCE(
    (SELECT MAX(version) FROM (
      SELECT version FROM public.app_settings
      UNION ALL
      SELECT version FROM public.popup_settings
    ) AS versions),
    0
  ) + 1 INTO v_version;

  -- 1. Update or Insert popup_settings
  IF EXISTS (SELECT 1 FROM public.popup_settings LIMIT 1) THEN
    UPDATE public.popup_settings
    SET settings = p_appearance,
        version = v_version,
        updated_at = NOW();
  ELSE
    INSERT INTO public.popup_settings (settings, version, updated_at)
    VALUES (p_appearance, v_version, NOW());
  END IF;

  -- 2. Update or Insert text_settings
  IF EXISTS (SELECT 1 FROM public.text_settings LIMIT 1) THEN
    UPDATE public.text_settings
    SET settings = p_texts,
        updated_at = NOW();
  ELSE
    INSERT INTO public.text_settings (settings, updated_at)
    VALUES (p_texts, NOW());
  END IF;

  -- 3. Update or Insert app_settings
  IF EXISTS (SELECT 1 FROM public.app_settings LIMIT 1) THEN
    UPDATE public.app_settings
    SET enabled = COALESCE((p_app_config->>'enabled')::boolean, true),
        enable_feedback_survey = COALESCE((p_app_config->>'enableFeedbackSurvey')::boolean, true),
        widget_url = COALESCE(p_app_config->>'widgetUrl', ''),
        test_mode = COALESCE((p_app_config->>'testMode')::boolean, false),
        allowed_domains = COALESCE(p_app_config->'allowedDomains', '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb),
        version = v_version,
        updated_at = NOW();
  ELSE
    INSERT INTO public.app_settings (
      enabled, enable_feedback_survey, widget_url, test_mode, allowed_domains, version, updated_at
    ) VALUES (
      COALESCE((p_app_config->>'enabled')::boolean, true),
      COALESCE((p_app_config->>'enableFeedbackSurvey')::boolean, true),
      COALESCE(p_app_config->>'widgetUrl', ''),
      COALESCE((p_app_config->>'testMode')::boolean, false),
      COALESCE(p_app_config->'allowedDomains', '["zhaya.com.br", "www.zhaya.com.br"]'::jsonb),
      v_version,
      NOW()
    );
  END IF;

  -- 4. Sincronizar product_types (Exclusão dos removidos e Upsert dos mantidos)
  IF p_product_types IS NOT NULL THEN
    IF jsonb_array_length(p_product_types) = 0 THEN
      DELETE FROM public.product_types;
    ELSE
      DELETE FROM public.product_types
      WHERE id NOT IN (
        SELECT x.id FROM jsonb_to_recordset(p_product_types) AS x(id text) WHERE x.id IS NOT NULL
      );

      FOR pt IN SELECT * FROM jsonb_to_recordset(p_product_types) AS x(
        id text,
        name text,
        category text,
        fit_type text,
        active boolean,
        sort_order integer,
        image_url text,
        icon_url text,
        use_icon_in_selector boolean,
        measurement_image_url text,
        measurement_image_caption text,
        measurement_guide_tips jsonb,
        measurement_guide_observation text,
        store_tags jsonb,
        measurements jsonb,
        sizes jsonb
      )
      LOOP
        INSERT INTO public.product_types (
          id, name, category, fit_type, active, sort_order, image_url, icon_url,
          use_icon_in_selector, measurement_image_url, measurement_image_caption,
          measurement_guide_tips, measurement_guide_observation, store_tags, measurements, sizes, updated_at
        ) VALUES (
          pt.id, pt.name, pt.category, pt.fit_type, COALESCE(pt.active, true), COALESCE(pt.sort_order, 0),
          pt.image_url, pt.icon_url, COALESCE(pt.use_icon_in_selector, false), pt.measurement_image_url,
          pt.measurement_image_caption, COALESCE(pt.measurement_guide_tips, '[]'::jsonb),
          pt.measurement_guide_observation,
          (SELECT COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(pt.store_tags, '[]'::jsonb))), '{}'::text[])),
          COALESCE(pt.measurements, '[]'::jsonb), COALESCE(pt.sizes, '[]'::jsonb), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          fit_type = EXCLUDED.fit_type,
          active = EXCLUDED.active,
          sort_order = EXCLUDED.sort_order,
          image_url = EXCLUDED.image_url,
          icon_url = EXCLUDED.icon_url,
          use_icon_in_selector = EXCLUDED.use_icon_in_selector,
          measurement_image_url = EXCLUDED.measurement_image_url,
          measurement_image_caption = EXCLUDED.measurement_image_caption,
          measurement_guide_tips = EXCLUDED.measurement_guide_tips,
          measurement_guide_observation = EXCLUDED.measurement_guide_observation,
          store_tags = EXCLUDED.store_tags,
          measurements = EXCLUDED.measurements,
          sizes = EXCLUDED.sizes,
          updated_at = NOW();
      END LOOP;
    END IF;
  END IF;

  -- 5. Upsert measurement_guides if provided
  IF p_measurement_guides IS NOT NULL AND jsonb_array_length(p_measurement_guides) > 0 THEN
    FOR mg IN SELECT * FROM jsonb_to_recordset(p_measurement_guides) AS x(
      measurement_key text,
      label text,
      title text,
      description text,
      image_url text,
      observations jsonb,
      active boolean
    )
    LOOP
      INSERT INTO public.measurement_guides (
        measurement_key, label, title, description, image_url, observations, active, updated_at
      ) VALUES (
        mg.measurement_key, mg.label, mg.title, mg.description, mg.image_url,
        COALESCE(mg.observations, '[]'::jsonb), COALESCE(mg.active, true), NOW()
      )
      ON CONFLICT (measurement_key) DO UPDATE SET
        label = EXCLUDED.label,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        observations = EXCLUDED.observations,
        active = EXCLUDED.active,
        updated_at = NOW();
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'version', v_version,
    'published_at', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transaction failed in publish_all_config: %', SQLERRM;
END;
$;

REVOKE EXECUTE ON FUNCTION public.publish_all_config(jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_all_config(jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- TABELA 9: best_seller_lists (Listas de Mais Vendidos do Dia)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.best_seller_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Mais Vendidos do Dia',
  slug TEXT,
  logo_url TEXT,
  subtitle TEXT,
  cta_text TEXT,
  show_date BOOLEAN NOT NULL DEFAULT true,
  show_ranking BOOLEAN NOT NULL DEFAULT true,
  rank_color TEXT NOT NULL DEFAULT '#FFFFFF',
  size_color TEXT NOT NULL DEFAULT '#FFFFFF',
  list_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT false,
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_end TIMESTAMPTZ,
  timer_looping BOOLEAN NOT NULL DEFAULT false,
  timer_duration_minutes INTEGER CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

-- ------------------------------------------------------------------------------
-- TABELA 10: best_seller_products (Produtos dos Mais Vendidos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.best_seller_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produto',
  image_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  product_url TEXT,
  original_price NUMERIC(10, 2) CHECK (original_price IS NULL OR original_price >= 0),
  promotional_price NUMERIC(10, 2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  sold_quantity INTEGER CHECK (sold_quantity IS NULL OR sold_quantity >= 0),
  show_sold_quantity BOOLEAN NOT NULL DEFAULT true,
  available_quantity INTEGER CHECK (available_quantity IS NULL OR available_quantity >= 0),
  sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  out_of_stock_sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  colors TEXT[] NOT NULL DEFAULT '{}'::text[],
  installments_count INTEGER CHECK (installments_count IS NULL OR installments_count > 0),
  installment_value NUMERIC(10, 2) CHECK (installment_value IS NULL OR installment_value >= 0),
  badge_enabled BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  timer_enabled BOOLEAN NOT NULL DEFAULT false,
  timer_end TIMESTAMPTZ,
  timer_looping BOOLEAN NOT NULL DEFAULT false,
  timer_duration_minutes INTEGER CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)),
  timer_color TEXT NOT NULL DEFAULT '#FFFFFF',
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compatibilidade com instalações existentes: adiciona campos sem apagar dados.
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS show_date BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS show_ranking BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS rank_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS size_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10, 2);
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS out_of_stock_sizes TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS installments_count INTEGER;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS installment_value NUMERIC(10, 2);
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS timer_looping BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS timer_duration_minutes INTEGER;
ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS timer_color TEXT NOT NULL DEFAULT '#FFFFFF';

UPDATE public.best_seller_products
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_products_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_timer_duration_minutes_check
      CHECK (timer_duration_minutes IS NULL OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080));
  END IF;
END $$;

UPDATE public.best_seller_lists
SET timer_duration_minutes = NULL
WHERE timer_duration_minutes IS NOT NULL
  AND (timer_duration_minutes < 1 OR timer_duration_minutes > 10080);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_timer_duration_minutes_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_timer_duration_minutes_check
      CHECK (
        timer_duration_minutes IS NULL
        OR (timer_duration_minutes >= 1 AND timer_duration_minutes <= 10080)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_best_seller_lists_active ON public.best_seller_lists(active);
CREATE INDEX IF NOT EXISTS idx_best_seller_lists_date ON public.best_seller_lists(list_date DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_products_list_pos ON public.best_seller_products(list_id, position ASC);

ALTER TABLE public.best_seller_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_seller_products ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.best_seller_lists FROM anon, authenticated;
GRANT ALL ON public.best_seller_lists TO service_role;

REVOKE ALL ON public.best_seller_products FROM anon, authenticated;
GRANT ALL ON public.best_seller_products TO service_role;

-- Função atômica para ativar uma lista desativando todas as outras
CREATE OR REPLACE FUNCTION public.set_active_best_seller_list(target_list_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.best_seller_lists
  SET active = false
  WHERE active = true;

  UPDATE public.best_seller_lists
  SET active = true, updated_at = now()
  WHERE id = target_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.set_active_best_seller_list(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_best_seller_list(UUID) TO service_role;

-- Função atômica para registrar cliques de produtos de forma segura
CREATE OR REPLACE FUNCTION public.increment_best_seller_product_clicks(product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_clicks INTEGER;
BEGIN
  UPDATE public.best_seller_products
  SET clicks = clicks + 1
  WHERE id = product_id
  RETURNING clicks INTO new_clicks;
  
  RETURN COALESCE(new_clicks, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_best_seller_product_clicks(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_best_seller_product_clicks(UUID) TO service_role;



-- ==============================================================================
-- EXTENSÃO: MÍDIA MISTA / VÍDEOS DOS MAIS VENDIDOS
-- ==============================================================================
-- ZHAYA MATCH — MÍDIA MISTA + VÍDEO DE FUNDO + LIMPEZA DE VÍDEOS ÓRFÃOS

ALTER TABLE public.best_seller_lists
  ADD COLUMN IF NOT EXISTS background_video_url TEXT,
  ADD COLUMN IF NOT EXISTS background_video_path TEXT,
  ADD COLUMN IF NOT EXISTS background_video_opacity NUMERIC(4,3) NOT NULL DEFAULT 0.22,
  ADD COLUMN IF NOT EXISTS background_video_blur NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.best_seller_products
  ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Permite produto cuja primeira/única mídia seja vídeo.
ALTER TABLE public.best_seller_products
  ALTER COLUMN image_url DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_background_video_opacity_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_opacity_check
      CHECK (background_video_opacity >= 0 AND background_video_opacity <= 0.9);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'best_seller_lists_background_video_blur_check'
  ) THEN
    ALTER TABLE public.best_seller_lists
      ADD CONSTRAINT best_seller_lists_background_video_blur_check
      CHECK (background_video_blur >= 0 AND background_video_blur <= 30);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.best_seller_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_cleanup
  ON public.best_seller_media_assets(media_type, last_used_at);

ALTER TABLE public.best_seller_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_media_assets FROM anon, authenticated;
GRANT ALL ON public.best_seller_media_assets TO service_role;

-- Bucket público para leitura. Uploads passam por URL assinada criada pela API admin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zhaya-match-media',
  'zhaya-match-media',
  true,
  104857600,
  ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
  ];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access zhaya-match-media'
  ) THEN
    CREATE POLICY "Public Access zhaya-match-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'zhaya-match-media');
  END IF;
END $$;

-- Remove políticas antigas que permitiam upload/update direto do navegador sem assinatura.
-- Mantém políticas existentes do bucket para não quebrar outros módulos que o reutilizam.

NOTIFY pgrst, 'reload schema';


-- Slug público único para cada lista existente e futura
UPDATE public.best_seller_lists
SET slug = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower(COALESCE(title, 'lista')), '[^a-z0-9]+', '-', 'g')), ''),
  'lista'
) || '-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_lists_slug
  ON public.best_seller_lists(slug);

ALTER TABLE public.best_seller_lists
  ALTER COLUMN slug SET NOT NULL;


-- ===== BIBLIOTECA REUTILIZÁVEL DE MAIS VENDIDOS =====
-- ==============================================================================
-- MAIS VENDIDOS — BIBLIOTECA REUTILIZÁVEL + RETENÇÃO DE MÍDIA TEMPORÁRIA (7 DIAS)
-- Seguro/idempotente para instalações existentes.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.best_seller_product_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Produto',
  image_url TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}'::text[],
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_url TEXT,
  original_price NUMERIC(10,2) CHECK (original_price IS NULL OR original_price >= 0),
  promotional_price NUMERIC(10,2) CHECK (promotional_price IS NULL OR promotional_price >= 0),
  sizes TEXT[] NOT NULL DEFAULT '{}'::text[],
  colors TEXT[] NOT NULL DEFAULT '{}'::text[],
  installments_count INTEGER CHECK (installments_count IS NULL OR installments_count > 0),
  installment_value NUMERIC(10,2) CHECK (installment_value IS NULL OR installment_value >= 0),
  badge_enabled BOOLEAN NOT NULL DEFAULT false,
  badge_text TEXT,
  badge_color TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Produto';
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS media_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS colors TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS installments_count INTEGER;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS installment_value NUMERIC(10,2);
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS badge_color TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.best_seller_product_library ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.best_seller_products ADD COLUMN IF NOT EXISTS library_product_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'best_seller_products_library_product_id_fkey'
  ) THEN
    ALTER TABLE public.best_seller_products
      ADD CONSTRAINT best_seller_products_library_product_id_fkey
      FOREIGN KEY (library_product_id)
      REFERENCES public.best_seller_product_library(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_best_seller_products_library_product
  ON public.best_seller_products(library_product_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_library_updated
  ON public.best_seller_product_library(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_product_library_product_url
  ON public.best_seller_product_library(product_url);

ALTER TABLE public.best_seller_product_library ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_product_library FROM anon, authenticated;
GRANT ALL ON public.best_seller_product_library TO service_role;

-- Registry de mídia temporária. Imagens normais de produto não entram aqui e
-- permanecem disponíveis para reaproveitamento na biblioteca.
CREATE TABLE IF NOT EXISTS public.best_seller_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  purpose TEXT NOT NULL DEFAULT 'product_video',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.best_seller_media_assets ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'product_video';
CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_cleanup ON public.best_seller_media_assets(last_used_at);
CREATE INDEX IF NOT EXISTS idx_best_seller_media_assets_purpose_cleanup ON public.best_seller_media_assets(purpose, last_used_at);
ALTER TABLE public.best_seller_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_media_assets FROM anon, authenticated;
GRANT ALL ON public.best_seller_media_assets TO service_role;

-- A remoção física acontece no cron diário do projeto somente após ~7 dias sem
-- qualquer referência. Isso cobre product_video, background_video, logo e video_poster.
NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- MAIS VENDIDOS — ANALYTICS SIMPLES POR LISTA
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.best_seller_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.best_seller_products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'product_play', 'product_click')),
  visitor_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_created ON public.best_seller_analytics_events(list_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_list_event ON public.best_seller_analytics_events(list_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_product_event ON public.best_seller_analytics_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_best_seller_analytics_visitor ON public.best_seller_analytics_events(list_id, visitor_id);
ALTER TABLE public.best_seller_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_analytics_events FROM anon, authenticated;
GRANT ALL ON public.best_seller_analytics_events TO service_role;

-- =============================================================================
-- Mais Vendidos: visitantes únicos + tempo engajado + horários
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.best_seller_visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.best_seller_lists(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  country_code TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engaged_seconds INTEGER NOT NULL DEFAULT 0 CHECK (engaged_seconds >= 0),
  UNIQUE (list_id, visitor_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_unique ON public.best_seller_visitor_sessions(list_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_best_seller_visitor_sessions_first_seen ON public.best_seller_visitor_sessions(list_id, first_seen_at);
ALTER TABLE public.best_seller_visitor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.best_seller_visitor_sessions FROM anon, authenticated;
GRANT ALL ON public.best_seller_visitor_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_best_seller_visitor_session(
  p_list_id UUID,
  p_visitor_id TEXT,
  p_engaged_seconds_total INTEGER DEFAULT 0,
  p_device_type TEXT DEFAULT 'unknown',
  p_country_code TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.best_seller_visitor_sessions (
    list_id, visitor_id, device_type, country_code, region, city, referrer,
    first_seen_at, last_seen_at, engaged_seconds
  ) VALUES (
    p_list_id, p_visitor_id, COALESCE(NULLIF(p_device_type, ''), 'unknown'),
    NULLIF(p_country_code, ''), NULLIF(p_region, ''), NULLIF(p_city, ''), NULLIF(p_referrer, ''),
    now(), now(), GREATEST(COALESCE(p_engaged_seconds_total, 0), 0)
  )
  ON CONFLICT (list_id, visitor_id)
  DO UPDATE SET
    last_seen_at = now(),
    engaged_seconds = GREATEST(public.best_seller_visitor_sessions.engaged_seconds, EXCLUDED.engaged_seconds),
    device_type = CASE WHEN EXCLUDED.device_type <> 'unknown' THEN EXCLUDED.device_type ELSE public.best_seller_visitor_sessions.device_type END,
    country_code = COALESCE(public.best_seller_visitor_sessions.country_code, EXCLUDED.country_code),
    region = COALESCE(public.best_seller_visitor_sessions.region, EXCLUDED.region),
    city = COALESCE(public.best_seller_visitor_sessions.city, EXCLUDED.city),
    referrer = COALESCE(public.best_seller_visitor_sessions.referrer, EXCLUDED.referrer);
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_best_seller_visitor_session(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
