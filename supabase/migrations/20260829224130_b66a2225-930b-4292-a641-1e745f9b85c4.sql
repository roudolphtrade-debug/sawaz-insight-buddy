-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner','analyst','viewer');
CREATE TYPE public.collection_status AS ENUM ('draft','open','partially_submitted','submitted','closed');
CREATE TYPE public.submission_status AS ENUM ('working','submitted');
CREATE TYPE public.file_scan_status AS ENUM ('pending','clean','rejected');
CREATE TYPE public.review_status AS ENUM ('draft','in_review','approved','published','archived');
CREATE TYPE public.secure_link_scope AS ENUM ('collection','review');
CREATE TYPE public.recipient_status AS ENUM ('pending','opened','submitted','bounced');
CREATE TYPE public.analysis_type AS ENUM ('constat','hypothese','recommandation','note');
CREATE TYPE public.metric_provenance AS ENUM ('manual','csv','capture_ocr','derived');
CREATE TYPE public.notification_status AS ENUM ('queued','sent','failed');
CREATE TYPE public.actor_type AS ENUM ('user','link','system');
-- ============ UTILITAIRES ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
-- ============ USERS (équipe Sawaz) ============
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
-- ============ FONCTIONS DE PERMISSION (security definer) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = auth.uid() AND u.is_active
  );
$$;
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'analyst');
$$;
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'owner');
$$;
-- Affectation des membres d'équipe aux clients (cloisonnement tenant)
CREATE TABLE public.user_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_user_clients_user ON public.user_clients(user_id);
CREATE INDEX idx_user_clients_client ON public.user_clients(client_id);
CREATE OR REPLACE FUNCTION public.has_client_access(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_team_member() AND (
    public.has_role(auth.uid(),'owner')
    OR EXISTS (SELECT 1 FROM public.user_clients uc
               WHERE uc.user_id = auth.uid() AND uc.client_id = _client_id)
  );
$$;
CREATE OR REPLACE FUNCTION public.can_write_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_write() AND public.has_client_access(_client_id);
$$;
-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sector text,
  brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role_label text,
  is_primary boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_client ON public.contacts(client_id);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  period_label text,
  status text NOT NULL DEFAULT 'active',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE TABLE public.collection_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_templates_client ON public.collection_templates(client_id);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.collection_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ============ GRANTS ============
GRANT SELECT ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.user_clients TO authenticated;
GRANT ALL ON public.user_clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_templates TO authenticated;
GRANT ALL ON public.collection_templates TO service_role;
-- ============ RLS ============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_or_team_read ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_team_member());
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner());
CREATE POLICY user_clients_read ON public.user_clients FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner());
CREATE POLICY clients_read ON public.clients FOR SELECT TO authenticated
  USING (public.has_client_access(id));
CREATE POLICY clients_insert ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());
CREATE POLICY clients_update ON public.clients FOR UPDATE TO authenticated
  USING (public.can_write_client(id)) WITH CHECK (public.can_write_client(id));
CREATE POLICY clients_delete ON public.clients FOR DELETE TO authenticated
  USING (public.is_owner());
CREATE POLICY contacts_read ON public.contacts FOR SELECT TO authenticated
  USING (public.has_client_access(client_id));
CREATE POLICY contacts_write ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.can_write_client(client_id));
CREATE POLICY contacts_update ON public.contacts FOR UPDATE TO authenticated
  USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY contacts_delete ON public.contacts FOR DELETE TO authenticated
  USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated
  USING (public.has_client_access(client_id));
CREATE POLICY projects_write ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.can_write_client(client_id));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.can_write_client(client_id)) WITH CHECK (public.can_write_client(client_id));
CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated
  USING (public.is_owner() AND public.has_client_access(client_id));
CREATE POLICY templates_read ON public.collection_templates FOR SELECT TO authenticated
  USING (client_id IS NULL AND public.is_team_member() OR public.has_client_access(client_id));
CREATE POLICY templates_write ON public.collection_templates FOR INSERT TO authenticated
  WITH CHECK (client_id IS NULL AND public.is_owner() OR public.can_write_client(client_id));
CREATE POLICY templates_update ON public.collection_templates FOR UPDATE TO authenticated
  USING (client_id IS NULL AND public.is_owner() OR public.can_write_client(client_id))
  WITH CHECK (client_id IS NULL AND public.is_owner() OR public.can_write_client(client_id));
CREATE POLICY templates_delete ON public.collection_templates FOR DELETE TO authenticated
  USING (public.is_owner());
