CREATE OR REPLACE FUNCTION public.erase_client_data(_client_id uuid, _drop_client boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  n_files integer; n_subs integer; n_reviews integer;
BEGIN
  ALTER TABLE public.submissions DISABLE TRIGGER trg_submissions_immutable;
  ALTER TABLE public.answers DISABLE TRIGGER trg_answers_immutable;
  ALTER TABLE public.files DISABLE TRIGGER trg_files_immutable;
  ALTER TABLE public.review_versions DISABLE TRIGGER trg_review_versions_rules;
  ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_append_only;

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

  INSERT INTO public.audit_logs (client_id, actor_type, action, entity_type, entity_id, metadata)
  VALUES (
    CASE WHEN _drop_client THEN NULL ELSE _client_id END,
    'system', 'gdpr.erasure', 'client', _client_id,
    jsonb_build_object('files', n_files, 'submissions', n_subs, 'reviews', n_reviews)
  );

  IF _drop_client THEN
    UPDATE public.audit_logs SET client_id = NULL WHERE client_id = _client_id;
    DELETE FROM public.clients WHERE id = _client_id;
  END IF;

  ALTER TABLE public.submissions ENABLE TRIGGER trg_submissions_immutable;
  ALTER TABLE public.answers ENABLE TRIGGER trg_answers_immutable;
  ALTER TABLE public.files ENABLE TRIGGER trg_files_immutable;
  ALTER TABLE public.review_versions ENABLE TRIGGER trg_review_versions_rules;
  ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_append_only;

  result := jsonb_build_object('files', n_files, 'submissions', n_subs, 'reviews', n_reviews, 'client_deleted', _drop_client);
  RETURN result;
END; $function$;
