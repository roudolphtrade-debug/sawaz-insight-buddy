DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_review_status') THEN
    CREATE TYPE public.metric_review_status AS ENUM ('a_verifier','valide','rejete');
  END IF;
END $$;
ALTER TABLE public.extracted_metrics
  ADD COLUMN IF NOT EXISTS review_status public.metric_review_status NOT NULL DEFAULT 'a_verifier',
  ADD COLUMN IF NOT EXISTS original_value_num numeric,
  ADD COLUMN IF NOT EXISTS original_value_text text,
  ADD COLUMN IF NOT EXISTS corrected_at timestamptz,
  ADD COLUMN IF NOT EXISTS corrected_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS review_note text;
CREATE INDEX IF NOT EXISTS extracted_metrics_review_status_idx
  ON public.extracted_metrics (client_id, review_status);
