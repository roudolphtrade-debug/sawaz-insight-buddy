-- P1-D: harden SECURITY DEFINER functions.
-- Privileged implementations live in a non-exposed private schema.
-- Public entry points remain for RLS/application compatibility and run as SECURITY INVOKER.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated, service_role;

-- ============================================================
-- Private privileged implementations
-- ============================================================

create or replace function private.has_role(
  _user_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.users u on u.id = ur.user_id
    where ur.user_id = auth.uid()
      and u.is_active
  );
$$;

create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(auth.uid(), 'owner'::public.app_role);
$$;

create or replace function private.can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_role(auth.uid(), 'owner'::public.app_role)
    or private.has_role(auth.uid(), 'analyst'::public.app_role);
$$;

create or replace function private.has_client_access(_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_team_member()
    and (
      private.has_role(auth.uid(), 'owner'::public.app_role)
      or exists (
        select 1
        from public.user_clients uc
        where uc.user_id = auth.uid()
          and uc.client_id = _client_id
      )
    );
$$;

create or replace function private.can_write_client(_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_write()
    and private.has_client_access(_client_id);
$$;

create or replace function private.claim_team_access()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  em text;
  inv record;
begin
  if uid is null then
    return 'anonymous';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_id = uid
  ) then
    return 'already';
  end if;

  select lower(u.email)
  into em
  from auth.users u
  where u.id = uid;

  if em is null then
    return 'anonymous';
  end if;

  select *
  into inv
  from public.team_invites ti
  where lower(ti.email) = em
    and ti.claimed_at is null;

  if not found then
    return 'not_invited';
  end if;

  insert into public.users (id, email, name, is_active)
  values (uid, em, split_part(em, '@', 1), true)
  on conflict (id)
  do update set is_active = true;

  insert into public.user_roles (user_id, role)
  values (uid, inv.role)
  on conflict (user_id, role)
  do nothing;

  update public.team_invites
  set claimed_at = now(),
      claimed_by = uid
  where email = inv.email;

  insert into public.audit_logs (
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    'user',
    uid,
    'team.access_claimed',
    'user',
    uid,
    jsonb_build_object('role', inv.role)
  );

  return 'granted';
end;
$$;

-- Private functions are not exposed through the Data API.
-- Explicit privileges are still restricted to the roles that need them.

revoke all on function private.has_role(uuid, public.app_role)
  from public, anon, authenticated, service_role;
revoke all on function private.is_team_member()
  from public, anon, authenticated, service_role;
revoke all on function private.is_owner()
  from public, anon, authenticated, service_role;
revoke all on function private.can_write()
  from public, anon, authenticated, service_role;
revoke all on function private.has_client_access(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.can_write_client(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.claim_team_access()
  from public, anon, authenticated, service_role;

grant execute on function private.has_role(uuid, public.app_role)
  to authenticated, service_role;
grant execute on function private.is_team_member()
  to authenticated, service_role;
grant execute on function private.is_owner()
  to authenticated, service_role;
grant execute on function private.can_write()
  to authenticated, service_role;
grant execute on function private.has_client_access(uuid)
  to authenticated, service_role;
grant execute on function private.can_write_client(uuid)
  to authenticated, service_role;
grant execute on function private.claim_team_access()
  to authenticated, service_role;

-- ============================================================
-- Public SECURITY INVOKER compatibility layer
-- ============================================================

create or replace function public.can_write()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.can_write();
$$;

create or replace function public.can_write_client(_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.can_write_client(_client_id);
$$;

create or replace function public.has_client_access(_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_client_access(_client_id);
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_owner();
$$;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_team_member();
$$;

-- Authenticated users may only inspect their own role.
-- service_role/postgres retain administrative lookup capability.

create or replace function public.has_role(
  _user_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when current_user in ('postgres', 'service_role')
      then private.has_role(_user_id, _role)
    else
      (_user_id = auth.uid())
      and private.has_role(_user_id, _role)
  end;
$$;

create or replace function public.claim_team_access()
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.claim_team_access();
$$;

-- Explicit API privileges.
-- anon and PUBLIC must not execute these entry points.

revoke execute on function public.can_write()
  from public, anon;
revoke execute on function public.can_write_client(uuid)
  from public, anon;
revoke execute on function public.claim_team_access()
  from public, anon;
revoke execute on function public.has_client_access(uuid)
  from public, anon;
revoke execute on function public.has_role(uuid, public.app_role)
  from public, anon;
revoke execute on function public.is_owner()
  from public, anon;
revoke execute on function public.is_team_member()
  from public, anon;

grant execute on function public.can_write()
  to authenticated, service_role;
grant execute on function public.can_write_client(uuid)
  to authenticated, service_role;
grant execute on function public.claim_team_access()
  to authenticated, service_role;
grant execute on function public.has_client_access(uuid)
  to authenticated, service_role;
grant execute on function public.has_role(uuid, public.app_role)
  to authenticated, service_role;
grant execute on function public.is_owner()
  to authenticated, service_role;
grant execute on function public.is_team_member()
  to authenticated, service_role;

commit;