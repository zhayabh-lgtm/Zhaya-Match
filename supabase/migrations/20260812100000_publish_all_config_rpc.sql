-- Migration: Atomic configuration publication RPC function
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
AS $$
DECLARE
  v_version integer;
  pt record;
  mg record;
BEGIN
  v_version := COALESCE((p_app_config->>'version')::integer, 1);

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

  -- 4. Upsert product_types if provided
  IF p_product_types IS NOT NULL AND jsonb_array_length(p_product_types) > 0 THEN
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
        pt.measurement_guide_observation, COALESCE(pt.store_tags, '[]'::jsonb),
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
$$;

REVOKE EXECUTE ON FUNCTION public.publish_all_config(jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_all_config(jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
