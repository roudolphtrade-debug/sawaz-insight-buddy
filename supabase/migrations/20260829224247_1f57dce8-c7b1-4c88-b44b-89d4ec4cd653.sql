-- ============ COLLECTIONS ============
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.collection_templates(id) ON DELETE SET NULL,
  template_version integer NOT NULL DEFAULT 1,
  status public.collection_status NOT NULL DEFAULT 'draft',
  opened_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collections_client ON public.collections(client_id, status);
CREATE INDEX idx_collections_project ON public.collections(project_id);
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status public.submission_status NOT NULL DEFAULT 'working',
  submitted_at timestamptz,
  submitted_by_link_id uuid,
  submitted_by_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_collection ON public.submissions(collection_id, status);
CREATE INDEX idx_submissions_client ON public.submissions(client_id);
CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  value jsonb,
  is_optional boolean NOT NULL DEFAULT false,
  not_found boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, question_key)
);
CREATE INDEX idx_answers_submission ON public.answers(submission_id);
CREATE INDEX idx_answers_client ON public.answers(client_id, collection_id);
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  slot_key text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime text,
  size_bytes bigint,
  checksum text,
  scan_status public.file_scan_status NOT NULL DEFAULT 'pending',
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_files_submission ON public.files(submission_id);
CREATE INDEX idx_files_client ON public.files(client_id, collection_id);
CREATE TABLE public.extracted_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  platform text,
  value_num numeric,
  value_text text,
  unit text,
  period_start date,
  period_end date,
  provenance public.metric_provenance NOT NULL DEFAULT 'manual',
  source_file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  extracted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_metrics_submission ON public.extracted_metrics(submission_id);
CREATE INDEX idx_metrics_client ON public.extracted_metrics(client_id, metric_key);
CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type public.analysis_type NOT NULL DEFAULT 'note',
  title text,
  body text,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility = 'internal'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analyses_client ON public.analyses(client_id, collection_id);
-- ============ DÉRIVATION SERVEUR DES CLÉS DÉNORMALISÉES ============
CREATE OR REPLACE FUNCTION public.derive_tenant_from_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF NEW.submission_id IS NULL THEN
    RETURN NEW; -- fichiers de brouillon non encore rattachés
  END IF;
  SELECT collection_id, client_id INTO s FROM public.submissions WHERE id = NEW.submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission introuvable: %', NEW.submission_id; END IF;
  NEW.collection_id := s.collection_id;
  NEW.client_id := s.client_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_answers_derive BEFORE INSERT OR UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_submission();
CREATE TRIGGER trg_files_derive BEFORE INSERT OR UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_submission();
CREATE TRIGGER trg_metrics_derive BEFORE INSERT OR UPDATE ON public.extracted_metrics
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_submission();
-- submissions : client_id dérivé de la collection
CREATE OR REPLACE FUNCTION public.derive_tenant_from_collection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid;
BEGIN
  SELECT client_id INTO c FROM public.collections WHERE id = NEW.collection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'collection introuvable: %', NEW.collection_id; END IF;
  NEW.client_id := c;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_submissions_derive BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_collection();
-- ============ IMMUTABILITÉ DES SUBMISSIONS SOUMISES ============
CREATE OR REPLACE FUNCTION public.enforce_submission_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'submitted' THEN
      RAISE EXCEPTION 'submission soumise immuable: suppression refusée';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'submission soumise immuable: modification refusée';
  END IF;
  IF NEW.status = 'submitted' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_submissions_immutable BEFORE UPDATE OR DELETE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_immutable();
CREATE OR REPLACE FUNCTION public.enforce_child_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.submission_status; sid uuid;
BEGIN
  sid := COALESCE(CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END,
                  CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE OLD.submission_id END);
  IF sid IS NULL THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  SELECT status INTO st FROM public.submissions WHERE id = sid;
  IF st = 'submitted' THEN
    RAISE EXCEPTION 'donnée rattachée à une submission soumise: modification refusée';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
CREATE TRIGGER trg_answers_immutable BEFORE UPDATE OR DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_immutable();
CREATE TRIGGER trg_files_immutable BEFORE UPDATE OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_immutable();
CREATE TRIGGER trg_metrics_immutable BEFORE UPDATE OR DELETE ON public.extracted_metrics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_immutable();
-- Insertion interdite sous une submission déjà soumise
CREATE OR REPLACE FUNCTION public.enforce_child_insert_open()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.submission_status;
BEGIN
  IF NEW.submission_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO st FROM public.submissions WHERE id = NEW.submission_id;
  IF st = 'submitted' THEN
    RAISE EXCEPTION 'submission soumise immuable: insertion refusée';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_answers_insert_open BEFORE INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_insert_open();
CREATE TRIGGER trg_files_insert_open BEFORE INSERT ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_insert_open();
CREATE TRIGGER trg_metrics_insert_open BEFORE INSERT ON public.extracted_metrics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_child_insert_open();
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_answers_updated BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_files_updated BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_metrics_updated BEFORE UPDATE ON public.extracted_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_analyses_updated BEFORE UPDATE ON public.analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
REVOKE EXECUTE ON FUNCTION public.derive_tenant_from_submission() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.derive_tenant_from_collection() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_submission_immutable() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_child_immutable() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_child_insert_open() FROM anon, public, authenticated;
-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_metrics TO authenticated;
GRANT ALL ON public.extracted_metrics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
-- ============ RLS ============
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY collections_read ON public.collections FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY collections_insert ON public.collections FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY collections_update ON public.collections FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY collections_delete ON public.collections FOR DELETE TO authenticated USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY submissions_read ON public.submissions FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY submissions_insert ON public.submissions FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY submissions_update ON public.submissions FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY submissions_delete ON public.submissions FOR DELETE TO authenticated USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY answers_read ON public.answers FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY answers_insert ON public.answers FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY answers_update ON public.answers FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY answers_delete ON public.answers FOR DELETE TO authenticated USING (public.can_write_client(client_id));
CREATE POLICY files_read ON public.files FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY files_insert ON public.files FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY files_update ON public.files FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY files_delete ON public.files FOR DELETE TO authenticated USING (public.can_write_client(client_id));
CREATE POLICY metrics_read ON public.extracted_metrics FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY metrics_insert ON public.extracted_metrics FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY metrics_update ON public.extracted_metrics FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY metrics_delete ON public.extracted_metrics FOR DELETE TO authenticated USING (public.can_write_client(client_id));
CREATE POLICY analyses_read ON public.analyses FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY analyses_insert ON public.analyses FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY analyses_update ON public.analyses FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY analyses_delete ON public.analyses FOR DELETE TO authenticated USING (public.can_write_client(client_id));
