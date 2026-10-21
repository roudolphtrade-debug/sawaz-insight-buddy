-- 1. Rate limiting -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, subject_hash, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Aucune policy : table strictement serveur (service_role uniquement).

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _bucket text,
  _subject text,
  _limit integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w timestamptz;
  c integer;
BEGIN
  w := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limits (bucket, subject_hash, window_start, hits)
  VALUES (_bucket, _subject, w, 1)
  ON CONFLICT (bucket, subject_hash, window_start)
    DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO c;
  RETURN c <= _limit;
END; $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
-- 2. Entretien / rétention ------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_rate_limits(_keep_hours integer DEFAULT 24)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - make_interval(hours => _keep_hours);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;
CREATE OR REPLACE FUNCTION public.purge_expired_sessions(_keep_days integer DEFAULT 7)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.link_sessions
  WHERE expires_at < now() - make_interval(days => _keep_days);
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;
CREATE OR REPLACE FUNCTION public.purge_audit_logs(_keep_days integer DEFAULT 365)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_append_only;
  DELETE FROM public.audit_logs WHERE created_at < now() - make_interval(days => _keep_days);
  GET DIAGNOSTICS n = ROW_COUNT;
  ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_append_only;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.purge_rate_limits(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_sessions(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_audit_logs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limits(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_sessions(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_audit_logs(integer) TO service_role;
-- 3. Effacement RGPD d'un client -------------------------------------
CREATE OR REPLACE FUNCTION public.erase_client_data(_client_id uuid, _drop_client boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  n_files integer; n_subs integer; n_reviews integer;
BEGIN
  ALTER TABLE public.submissions DISABLE TRIGGER trg_submissions_immutable;
  ALTER TABLE public.answers DISABLE TRIGGER trg_answers_immutable;
  ALTER TABLE public.files DISABLE TRIGGER trg_files_immutable;
  ALTER TABLE public.extracted_metrics DISABLE TRIGGER trg_metrics_immutable;
  ALTER TABLE public.review_versions DISABLE TRIGGER trg_review_versions_rules;

  SELECT count(*) INTO n_files FROM public.files WHERE client_id = _client_id;
  SELECT count(*) INTO n_subs FROM public.submissions WHERE client_id = _client_id;
  SELECT count(*) INTO n_reviews FROM public.reviews WHERE client_id = _client_id;

  DELETE FROM public.notifications WHERE client_id = _client_id;
  DELETE FROM public.link_sessions WHERE client_id = _client_id;
  DELETE FROM public.collection_recipients WHERE client_id = _client_id;
  DELETE FROM public.secure_links WHERE client_id = _client_id;
  DELETE FROM public.extracted_metrics WHERE client_id = _client_id;
  DELETE FROM public.analyses WHERE client_id = _client_id;
  UPDATE public.reviews SET current_version_id = NULL WHERE client_id = _client_id;
  DELETE FROM public.review_versions WHERE client_id = _client_id;
  DELETE FROM public.reviews WHERE client_id = _client_id;
  DELETE FROM public.files WHERE client_id = _client_id;
  DELETE FROM public.answers WHERE client_id = _client_id;
  DELETE FROM public.submissions WHERE client_id = _client_id;
  DELETE FROM public.collections WHERE client_id = _client_id;
  DELETE FROM public.collection_templates WHERE client_id = _client_id;
  DELETE FROM public.projects WHERE client_id = _client_id;
  DELETE FROM public.contacts WHERE client_id = _client_id;
  DELETE FROM public.user_clients WHERE client_id = _client_id;

  ALTER TABLE public.submissions ENABLE TRIGGER trg_submissions_immutable;
  ALTER TABLE public.answers ENABLE TRIGGER trg_answers_immutable;
  ALTER TABLE public.files ENABLE TRIGGER trg_files_immutable;
  ALTER TABLE public.extracted_metrics ENABLE TRIGGER trg_metrics_immutable;
  ALTER TABLE public.review_versions ENABLE TRIGGER trg_review_versions_rules;

  INSERT INTO public.audit_logs (client_id, actor_type, action, entity_type, entity_id, metadata)
  VALUES (
    CASE WHEN _drop_client THEN NULL ELSE _client_id END,
    'system', 'gdpr.erasure', 'client', _client_id,
    jsonb_build_object('files', n_files, 'submissions', n_subs, 'reviews', n_reviews)
  );

  IF _drop_client THEN
    DELETE FROM public.clients WHERE id = _client_id;
  END IF;

  result := jsonb_build_object('files', n_files, 'submissions', n_subs, 'reviews', n_reviews, 'client_deleted', _drop_client);
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.erase_client_data(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_client_data(uuid, boolean) TO service_role;
