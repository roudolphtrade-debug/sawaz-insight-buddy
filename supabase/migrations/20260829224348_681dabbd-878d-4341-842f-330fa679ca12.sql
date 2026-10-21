-- ============ SECURE LINKS ============
CREATE TABLE public.secure_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scope public.secure_link_scope NOT NULL,
  target_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_uses integer NOT NULL DEFAULT 1000,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_secure_links_target ON public.secure_links(scope, target_id);
CREATE INDEX idx_secure_links_client ON public.secure_links(client_id);
CREATE TABLE public.link_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secure_link_id uuid NOT NULL REFERENCES public.secure_links(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_link_sessions_link ON public.link_sessions(secure_link_id);
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_link_fk FOREIGN KEY (submitted_by_link_id)
  REFERENCES public.secure_links(id) ON DELETE SET NULL;
-- ============ DESTINATAIRES DE COLLECTE ============
CREATE TABLE public.collection_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  secure_link_id uuid REFERENCES public.secure_links(id) ON DELETE SET NULL,
  status public.recipient_status NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, contact_id)
);
CREATE INDEX idx_recipients_client ON public.collection_recipients(client_id);
CREATE TRIGGER trg_recipients_derive BEFORE INSERT OR UPDATE ON public.collection_recipients
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_collection();
-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  current_version_id uuid,
  status public.review_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_client ON public.reviews(client_id, status);
CREATE TABLE public.review_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  charts jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.review_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, version_no)
);
CREATE INDEX idx_review_versions_client ON public.review_versions(client_id, status);
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_current_version_fk FOREIGN KEY (current_version_id)
  REFERENCES public.review_versions(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.derive_tenant_from_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c uuid;
BEGIN
  SELECT client_id INTO c FROM public.reviews WHERE id = NEW.review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'review introuvable: %', NEW.review_id; END IF;
  NEW.client_id := c;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_review_versions_derive BEFORE INSERT OR UPDATE ON public.review_versions
  FOR EACH ROW EXECUTE FUNCTION public.derive_tenant_from_review();
-- Immutabilité + publication owner-only
CREATE OR REPLACE FUNCTION public.enforce_review_version_rules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('published','archived') THEN
      RAISE EXCEPTION 'version publiée immuable: suppression refusée';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' AND NOT public.is_owner() THEN
      RAISE EXCEPTION 'publication réservée au rôle owner';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'published' AND NEW.status <> 'archived' THEN
    RAISE EXCEPTION 'version publiée immuable: modification refusée';
  END IF;
  IF OLD.status = 'published' AND NEW.status = 'archived' THEN
    IF NOT public.is_owner() THEN RAISE EXCEPTION 'archivage réservé au rôle owner'; END IF;
    IF (to_jsonb(NEW) - 'status' - 'updated_at') <> (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'version publiée immuable: seul le statut peut passer à archived';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'published' AND OLD.status <> 'published' THEN
    IF NOT public.is_owner() THEN RAISE EXCEPTION 'publication réservée au rôle owner'; END IF;
    IF OLD.status <> 'approved' THEN RAISE EXCEPTION 'seule une version approuvée peut être publiée'; END IF;
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_review_versions_rules BEFORE INSERT OR UPDATE OR DELETE ON public.review_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_version_rules();
-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  related_type text,
  related_id uuid,
  review_version_id uuid REFERENCES public.review_versions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_client ON public.notifications(client_id, status);
-- La clé d'idempotence intègre systématiquement la version de review quand elle existe
CREATE OR REPLACE FUNCTION public.build_notification_idempotency_key()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.idempotency_key := concat_ws(':',
    NEW.type,
    COALESCE(NEW.review_version_id::text, ''),
    COALESCE(NEW.related_type, ''),
    COALESCE(NEW.related_id::text, ''),
    NEW.recipient);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notifications_key BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.build_notification_idempotency_key();
-- ============ AUDIT LOGS (append-only) ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  actor_type public.actor_type NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_client ON public.audit_logs(client_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.block_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'audit_logs est append-only'; END; $$;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
CREATE TRIGGER trg_secure_links_updated BEFORE UPDATE ON public.secure_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_recipients_updated BEFORE UPDATE ON public.collection_recipients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_review_versions_updated BEFORE UPDATE ON public.review_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
REVOKE EXECUTE ON FUNCTION public.derive_tenant_from_review() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_review_version_rules() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.build_notification_idempotency_key() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_audit_mutation() FROM anon, public, authenticated;
-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_recipients TO authenticated;
GRANT ALL ON public.collection_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_versions TO authenticated;
GRANT ALL ON public.review_versions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.secure_links TO authenticated;
GRANT ALL ON public.secure_links TO service_role;
GRANT ALL ON public.link_sessions TO service_role;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
-- ============ RLS ============
ALTER TABLE public.secure_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- link_sessions : aucune policy => uniquement service_role (serveur)
CREATE POLICY recipients_read ON public.collection_recipients FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY recipients_insert ON public.collection_recipients FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY recipients_update ON public.collection_recipients FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY recipients_delete ON public.collection_recipients FOR DELETE TO authenticated USING (public.can_write_client(client_id));
CREATE POLICY reviews_read ON public.reviews FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY reviews_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY reviews_update ON public.reviews FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY reviews_delete ON public.reviews FOR DELETE TO authenticated USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY review_versions_read ON public.review_versions FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY review_versions_insert ON public.review_versions FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY review_versions_update ON public.review_versions FOR UPDATE TO authenticated
  USING (public.can_write_client(client_id) AND (status <> 'published' OR public.is_owner()))
  WITH CHECK (public.can_write_client(client_id) AND (status <> 'published' OR public.is_owner()));
CREATE POLICY review_versions_delete ON public.review_versions FOR DELETE TO authenticated USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY secure_links_read ON public.secure_links FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY secure_links_insert ON public.secure_links FOR INSERT TO authenticated WITH CHECK (public.can_write_client(client_id));
CREATE POLICY secure_links_update ON public.secure_links FOR UPDATE TO authenticated USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING (public.has_client_access(client_id));
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.is_owner() AND (client_id IS NULL OR public.has_client_access(client_id)));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_team_member());
