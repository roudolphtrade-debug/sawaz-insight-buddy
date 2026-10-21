-- P1-C: optimize RLS auth.uid() evaluation.
-- Business rules, roles and policy scope remain unchanged.

alter policy "users_self_or_team_read"
on public.users
using (
  (id = (select auth.uid()))
  or is_team_member()
);

alter policy "user_roles_read"
on public.user_roles
using (
  (user_id = (select auth.uid()))
  or is_owner()
);

alter policy "user_clients_read"
on public.user_clients
using (
  (user_id = (select auth.uid()))
  or is_owner()
);

-- Rollback:
-- alter policy "users_self_or_team_read"
-- on public.users
-- using ((id = auth.uid()) or is_team_member());
--
-- alter policy "user_roles_read"
-- on public.user_roles
-- using ((user_id = auth.uid()) or is_owner());
--
-- alter policy "user_clients_read"
-- on public.user_clients
-- using ((user_id = auth.uid()) or is_owner());
