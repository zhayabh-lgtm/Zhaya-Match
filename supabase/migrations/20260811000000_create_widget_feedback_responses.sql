-- Migration: Add widget_feedback_responses table and enable_feedback_survey setting

ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS enable_feedback_survey BOOLEAN DEFAULT true;

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
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying feedback
CREATE INDEX IF NOT EXISTS idx_widget_feedback_submitted_at ON public.widget_feedback_responses (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_feedback_product_type ON public.widget_feedback_responses (product_type_id);

-- Enable Row Level Security
ALTER TABLE public.widget_feedback_responses ENABLE ROW LEVEL SECURITY;

-- Revoke direct anonymous insertion for security (must go through server endpoint)
DROP POLICY IF EXISTS "Allow direct insert for feedback" ON public.widget_feedback_responses;
REVOKE INSERT ON public.widget_feedback_responses FROM anon, authenticated;

-- Allow service role full read/write access
CREATE POLICY "Allow service role full access on widget_feedback_responses"
  ON public.widget_feedback_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);
