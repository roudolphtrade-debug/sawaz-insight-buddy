CREATE TABLE public.team_invites (
  email text PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'owner',
  claimed_at timestamptz,
  claimed_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_invites_owner_read" ON public.team_invites
  FOR SELECT TO authenticated USING (public.is_owner());
CREATE TRIGGER trg_team_invites_updated BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE FUNCTION public.claim_team_access()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  inv record;
BEGIN
  IF uid IS NULL THEN RETURN 'anonymous'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN RETURN 'already'; END IF;

  SELECT lower(u.email) INTO em FROM auth.users u WHERE u.id = uid;
  IF em IS NULL THEN RETURN 'anonymous'; END IF;

  SELECT * INTO inv FROM public.team_invites ti
   WHERE lower(ti.email) = em AND ti.claimed_at IS NULL;
  IF NOT FOUND THEN RETURN 'not_invited'; END IF;

  INSERT INTO public.users (id, email, name, is_active)
  VALUES (uid, em, split_part(em, '@', 1), true)
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.team_invites SET claimed_at = now(), claimed_by = uid WHERE email = inv.email;

  INSERT INTO public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, metadata)
  VALUES ('user', uid, 'team.access_claimed', 'user', uid, jsonb_build_object('role', inv.role));

  RETURN 'granted';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_team_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_access() TO authenticated;
