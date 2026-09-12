
create type public.app_role as enum ('owner', 'analyst', 'viewer');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sector text,
  is_demo boolean not null default false,
  brand jsonb not null default '{}'::jsonb,
  theme_tokens jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text not null,
  is_primary boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  period_label text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'open',
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.collection_recipients (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.secure_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  scope text not null,
  target_id uuid not null,
  token_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  max_uses integer not null default 1000,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index secure_links_active_token on public.secure_links (token_hash) where revoked_at is null;

create table public.link_sessions (
  id uuid primary key default gen_random_uuid(),
  secure_link_id uuid not null references public.secure_links(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_ip_hash text,
  created_at timestamptz not null default now()
);
create index link_sessions_token on public.link_sessions (session_token_hash);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'working',
  submitted_by_link_id uuid references public.secure_links(id) on delete set null,
  submitted_by_contact_id uuid references public.contacts(id) on delete set null,
  snapshot jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  question_key text not null,
  value jsonb,
  not_found boolean not null default false,
  created_at timestamptz not null default now(),
  unique (submission_id, question_key)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  slot_key text not null,
  storage_path text not null,
  original_name text not null,
  mime text,
  size_bytes bigint,
  scan_status text not null default 'pending',
  uploaded_at timestamptz not null default now()
);

create table public.extracted_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  metric_key text not null,
  platform text,
  value_num numeric,
  value_text text,
  unit text,
  period_start date,
  period_end date,
  provenance text not null default 'import',
  source_file_id uuid references public.files(id) on delete set null,
  confidence numeric,
  review_status text not null default 'a_verifier',
  original_value_num numeric,
  original_value_text text,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  corrected_by uuid references auth.users(id) on delete set null,
  corrected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text,
  body text,
  visibility text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  status text not null default 'draft',
  current_version_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_versions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  version_no integer not null,
  content jsonb not null default '{}'::jsonb,
  charts jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, version_no)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  type text not null,
  channel text not null default 'email',
  recipient text not null,
  related_type text,
  related_id uuid,
  review_version_id uuid references public.review_versions(id) on delete cascade,
  idempotency_key text unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempts integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Grants
grant select, insert, update, delete on public.users to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.collection_recipients to authenticated;
grant select, insert, update, delete on public.secure_links to authenticated;
grant select, insert, update, delete on public.link_sessions to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.answers to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update, delete on public.extracted_metrics to authenticated;
grant select, insert, update, delete on public.analyses to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.review_versions to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.audit_logs to authenticated;
grant all on public.users to service_role;
grant all on public.user_roles to service_role;
grant all on public.clients to service_role;
grant all on public.contacts to service_role;
grant all on public.projects to service_role;
grant all on public.collections to service_role;
grant all on public.collection_recipients to service_role;
grant all on public.secure_links to service_role;
grant all on public.link_sessions to service_role;
grant all on public.submissions to service_role;
grant all on public.answers to service_role;
grant all on public.files to service_role;
grant all on public.extracted_metrics to service_role;
grant all on public.analyses to service_role;
grant all on public.reviews to service_role;
grant all on public.review_versions to service_role;
grant all on public.notifications to service_role;
grant all on public.audit_logs to service_role;

-- RLS
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.collections enable row level security;
alter table public.collection_recipients enable row level security;
alter table public.secure_links enable row level security;
alter table public.link_sessions enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.files enable row level security;
alter table public.extracted_metrics enable row level security;
alter table public.analyses enable row level security;
alter table public.reviews enable row level security;
alter table public.review_versions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Role helpers (security definer, no recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id) $$;

create or replace function public.can_write(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','analyst')) $$;

-- Own-account policies
create policy users_select_own on public.users for select to authenticated using (id = auth.uid());
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Staff read / writer write policies on all client-data tables
create policy clients_read on public.clients for select to authenticated using (public.is_staff(auth.uid()));
create policy clients_write on public.clients for insert to authenticated with check (public.can_write(auth.uid()));
create policy clients_update on public.clients for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy clients_delete on public.clients for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy contacts_read on public.contacts for select to authenticated using (public.is_staff(auth.uid()));
create policy contacts_write on public.contacts for insert to authenticated with check (public.can_write(auth.uid()));
create policy contacts_update on public.contacts for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy contacts_delete on public.contacts for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy projects_read on public.projects for select to authenticated using (public.is_staff(auth.uid()));
create policy projects_write on public.projects for insert to authenticated with check (public.can_write(auth.uid()));
create policy projects_update on public.projects for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy projects_delete on public.projects for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy collections_read on public.collections for select to authenticated using (public.is_staff(auth.uid()));
create policy collections_write on public.collections for insert to authenticated with check (public.can_write(auth.uid()));
create policy collections_update on public.collections for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy collections_delete on public.collections for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy collection_recipients_read on public.collection_recipients for select to authenticated using (public.is_staff(auth.uid()));
create policy collection_recipients_write on public.collection_recipients for insert to authenticated with check (public.can_write(auth.uid()));
create policy collection_recipients_update on public.collection_recipients for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy collection_recipients_delete on public.collection_recipients for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy secure_links_read on public.secure_links for select to authenticated using (public.is_staff(auth.uid()));
create policy secure_links_write on public.secure_links for insert to authenticated with check (public.can_write(auth.uid()));
create policy secure_links_update on public.secure_links for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy secure_links_delete on public.secure_links for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy link_sessions_read on public.link_sessions for select to authenticated using (public.is_staff(auth.uid()));
create policy link_sessions_write on public.link_sessions for insert to authenticated with check (public.can_write(auth.uid()));
create policy link_sessions_update on public.link_sessions for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy link_sessions_delete on public.link_sessions for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy submissions_read on public.submissions for select to authenticated using (public.is_staff(auth.uid()));
create policy submissions_write on public.submissions for insert to authenticated with check (public.can_write(auth.uid()));
create policy submissions_update on public.submissions for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy submissions_delete on public.submissions for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy answers_read on public.answers for select to authenticated using (public.is_staff(auth.uid()));
create policy answers_write on public.answers for insert to authenticated with check (public.can_write(auth.uid()));
create policy answers_update on public.answers for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy answers_delete on public.answers for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy files_read on public.files for select to authenticated using (public.is_staff(auth.uid()));
create policy files_write on public.files for insert to authenticated with check (public.can_write(auth.uid()));
create policy files_update on public.files for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy files_delete on public.files for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy metrics_read on public.extracted_metrics for select to authenticated using (public.is_staff(auth.uid()));
create policy metrics_write on public.extracted_metrics for insert to authenticated with check (public.can_write(auth.uid()));
create policy metrics_update on public.extracted_metrics for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy metrics_delete on public.extracted_metrics for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy analyses_read on public.analyses for select to authenticated using (public.is_staff(auth.uid()));
create policy analyses_write on public.analyses for insert to authenticated with check (public.can_write(auth.uid()));
create policy analyses_update on public.analyses for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy analyses_delete on public.analyses for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy reviews_read on public.reviews for select to authenticated using (public.is_staff(auth.uid()));
create policy reviews_write on public.reviews for insert to authenticated with check (public.can_write(auth.uid()));
create policy reviews_update on public.reviews for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy reviews_delete on public.reviews for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy review_versions_read on public.review_versions for select to authenticated using (public.is_staff(auth.uid()));
create policy review_versions_write on public.review_versions for insert to authenticated with check (public.can_write(auth.uid()));
create policy review_versions_update on public.review_versions for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy review_versions_delete on public.review_versions for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy notifications_read on public.notifications for select to authenticated using (public.is_staff(auth.uid()));
create policy notifications_write on public.notifications for insert to authenticated with check (public.can_write(auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using (public.can_write(auth.uid())) with check (public.can_write(auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

create policy audit_read on public.audit_logs for select to authenticated using (public.is_staff(auth.uid()));
create policy audit_write on public.audit_logs for insert to authenticated with check (public.is_staff(auth.uid()));

-- updated_at maintenance
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create trigger trg_submissions_updated before update on public.submissions for each row execute function public.update_updated_at_column();
create trigger trg_metrics_updated before update on public.extracted_metrics for each row execute function public.update_updated_at_column();
create trigger trg_analyses_updated before update on public.analyses for each row execute function public.update_updated_at_column();
create trigger trg_reviews_updated before update on public.reviews for each row execute function public.update_updated_at_column();
create trigger trg_review_versions_updated before update on public.review_versions for each row execute function public.update_updated_at_column();

-- submitted_at set on transition to 'submitted'
create or replace function public.set_submitted_at()
returns trigger language plpgsql set search_path = public
as $$ begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' and new.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end $$;
create trigger trg_submissions_submitted before update on public.submissions for each row execute function public.set_submitted_at();

-- Published / archived review versions are immutable
create or replace function public.review_version_immutable()
returns trigger language plpgsql set search_path = public
as $$ begin
  if old.status in ('published','archived')
     and (new.content is distinct from old.content or new.charts is distinct from old.charts) then
    raise exception 'Version % immuable', old.status;
  end if;
  return new;
end $$;
create trigger trg_review_version_immutable before update on public.review_versions for each row execute function public.review_version_immutable();

-- Idempotency key for notifications
create or replace function public.build_notification_idempotency_key()
returns trigger language plpgsql set search_path = public
as $$ begin
  if new.idempotency_key is null or new.idempotency_key = 'auto' then
    new.idempotency_key = coalesce(new.type, 'notification') || ':'
      || coalesce(new.review_version_id::text, new.related_id::text, 'none') || ':'
      || lower(new.recipient);
  end if;
  return new;
end $$;
create trigger trg_notifications_idempotency before insert on public.notifications for each row execute function public.build_notification_idempotency_key();
