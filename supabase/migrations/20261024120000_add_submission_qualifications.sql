-- P3.5-A2: qualification métier des submissions (Sawaz Pilot).
--
-- Objectif : qualifier une submission (référence, historique, brouillon, test,
-- exclue) et décider si elle alimente le corpus actif du diagnostic, sans jamais
-- modifier la donnée brute : submissions, answers, files et secure_links restent
-- intacts. Une qualification est une décision Sawaz, distincte de l'identité
-- technique du répondant.
--
-- Conventions reprises du schéma existant :
-- - client_id / collection_id dérivés de la submission par le trigger existant
--   public.derive_tenant_from_submission() (même règle que answers / files) ;
-- - lecture : public.has_client_access(client_id) ; écriture :
--   public.can_write_client(client_id) (owner, analyst) ; viewer en lecture seule ;
-- - aucune policy DELETE : on requalifie, on ne supprime pas ;
-- - références utilisateur en ON DELETE SET NULL ;
-- - ON DELETE CASCADE vers submissions / collections / clients, uniquement pour la
--   qualification elle-même : public.erase_client_data() (effacement RGPD) supprime
--   explicitement les submissions, une contrainte RESTRICT le bloquerait. Les
--   submissions soumises restent par ailleurs non supprimables (trigger existant).
--
-- Aucune contrainte n'impose une seule référence par collecte : une collecte peut
-- avoir plusieurs répondants légitimes.

create type public.submission_classification as enum (
  'reference',
  'historical',
  'draft',
  'test',
  'excluded'
);

create type public.submission_attribution_source as enum (
  'technical',
  'manual_sawaz',
  'unknown'
);

create table public.submission_qualifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  classification public.submission_classification not null,
  included_in_analysis boolean not null default false,
  respondent_label text null,
  attribution_source public.submission_attribution_source not null default 'unknown',
  reason text null,
  qualified_by uuid null references public.users(id) on delete set null,
  qualified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submission_qualifications_submission_key unique (submission_id),
  -- Une référence alimente toujours le corpus actif.
  constraint submission_qualifications_reference_included
    check (classification <> 'reference' or included_in_analysis),
  -- Un test, une exclusion ou un brouillon n'alimentent jamais le corpus actif.
  constraint submission_qualifications_non_analysable_excluded
    check (classification not in ('test', 'excluded', 'draft') or not included_in_analysis),
  -- Un répondant n'est jamais nommé sans source d'attribution connue.
  constraint submission_qualifications_label_has_source
    check (respondent_label is null or attribution_source <> 'unknown'),
  constraint submission_qualifications_label_format
    check (
      respondent_label is null
      or (respondent_label = btrim(respondent_label) and char_length(respondent_label) between 1 and 120)
    ),
  constraint submission_qualifications_reason_length
    check (reason is null or char_length(reason) <= 500)
);

comment on table public.submission_qualifications is
  'Qualification métier Sawaz d''une submission (corpus actif du diagnostic). Ne modifie jamais la donnée brute.';
comment on column public.submission_qualifications.respondent_label is
  'Répondant attribué par Sawaz : jamais une identité techniquement prouvée sauf attribution_source = technical.';

create index idx_submission_qualifications_client
  on public.submission_qualifications (client_id, included_in_analysis);
create index idx_submission_qualifications_collection
  on public.submission_qualifications (collection_id);
create index idx_submission_qualifications_qualified_by
  on public.submission_qualifications (qualified_by);

-- ============================================================
-- Triggers
-- ============================================================

-- Locataire dérivé de la submission (jamais fourni par l'appelant).
create trigger trg_submission_qualifications_derive
  before insert or update on public.submission_qualifications
  for each row execute function public.derive_tenant_from_submission();

-- Horodatage et auteur imposés par la base : qualified_by = utilisateur authentifié
-- (null dans un contexte système, ex. cette migration), qualified_at / updated_at à
-- chaque (re)qualification. L'identité de la ligne et sa submission sont immuables.
create or replace function public.stamp_submission_qualification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.submission_id <> old.submission_id then
      raise exception 'submission_qualifications : identifiant et submission immuables';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  new.qualified_by := auth.uid();
  new.qualified_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_submission_qualifications_stamp
  before insert or update on public.submission_qualifications
  for each row execute function public.stamp_submission_qualification();

-- Traçabilité : chaque qualification ou requalification écrit une ligne dans le
-- journal append-only existant. SECURITY INVOKER : l'écriture passe par la policy
-- audit_insert (membre de l'équipe) ; si elle est refusée, la qualification l'est
-- aussi, aucune qualification n'existe donc sans trace. Le libellé du répondant
-- n'est pas recopié dans le journal (seulement sa présence), pour qu'un effacement
-- RGPD du client n'y laisse pas de nom.
create or replace function public.audit_submission_qualification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  insert into public.audit_logs (
    client_id,
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new.client_id,
    case when actor is null then 'system'::public.actor_type else 'user'::public.actor_type end,
    actor,
    case when tg_op = 'INSERT' then 'submission.qualified' else 'submission.requalified' end,
    'submission',
    new.submission_id,
    jsonb_build_object(
      'qualification_id', new.id,
      'classification', new.classification,
      'included_in_analysis', new.included_in_analysis,
      'attribution_source', new.attribution_source,
      'respondent_label_set', new.respondent_label is not null,
      'previous_classification', case when tg_op = 'UPDATE' then to_jsonb(old.classification) else null end,
      'previous_included_in_analysis', case when tg_op = 'UPDATE' then to_jsonb(old.included_in_analysis) else null end,
      'previous_attribution_source', case when tg_op = 'UPDATE' then to_jsonb(old.attribution_source) else null end
    )
  );
  return new;
end;
$$;

create trigger trg_submission_qualifications_audit
  after insert or update on public.submission_qualifications
  for each row execute function public.audit_submission_qualification();

revoke execute on function public.stamp_submission_qualification() from public, anon, authenticated;
revoke execute on function public.audit_submission_qualification() from public, anon, authenticated;

-- ============================================================
-- Droits et RLS
-- ============================================================

revoke all on table public.submission_qualifications from public, anon, authenticated;
grant select, insert, update on table public.submission_qualifications to authenticated;
grant all on table public.submission_qualifications to service_role;

alter table public.submission_qualifications enable row level security;

create policy submission_qualifications_read
  on public.submission_qualifications
  for select to authenticated
  using (public.has_client_access(client_id));

create policy submission_qualifications_insert
  on public.submission_qualifications
  for insert to authenticated
  with check (public.can_write_client(client_id));

create policy submission_qualifications_update
  on public.submission_qualifications
  for update to authenticated
  using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- Aucune policy DELETE : la suppression est refusée à tout utilisateur applicatif.

-- ============================================================
-- Qualifications initiales LFTC (validées par Sawaz)
-- ============================================================
--
-- La référence de Raphaël est une attribution métier validée manuellement par Sawaz,
-- pas une identité techniquement prouvée par la submission. Les données attendues
-- sont vérifiées avant toute écriture : si l'une ne correspond pas, la migration
-- échoue entièrement (aucune qualification partielle). Dans un environnement sans
-- ces submissions (base locale vide), seule la structure est créée.

do $$
declare
  ref_id constant uuid := '831da37a-661e-424b-9449-9e77edf3908f';
  late_id constant uuid := '86b0c97e-3be6-4702-b6bc-7e6c5eac2227';
  draft_id constant uuid := 'f7c57492-a2a6-491a-aedd-b21d7f2ab3c0';
  ref record;
  n integer;
begin
  select id, client_id, status, submitted_at into ref
  from public.submissions
  where id = ref_id;

  if not found then
    raise notice 'Qualifications LFTC non initialisées : submission de référence absente de cette base.';
    return;
  end if;

  if ref.status <> 'submitted'
    or ref.submitted_at is null
    or to_char(ref.submitted_at at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI') <> '2026-10-21 13:39' then
    raise exception 'Référence LFTC inattendue (statut % / soumise le %)', ref.status, ref.submitted_at;
  end if;

  select count(*) into n from public.answers where submission_id = ref_id;
  if n <> 14 then raise exception 'Référence LFTC : % réponses au lieu de 14', n; end if;

  select count(*) into n from public.files where submission_id = ref_id;
  if n <> 16 then raise exception 'Référence LFTC : % documents au lieu de 16', n; end if;

  select count(*) into n from public.submissions where client_id = ref.client_id;
  if n <> 7 then raise exception 'Dossier LFTC : % submissions au lieu de 7', n; end if;

  if not exists (
    select 1 from public.submissions
    where id = late_id and client_id = ref.client_id and status = 'submitted'
  ) then
    raise exception 'Submission LFTC du 21/10 22:13 introuvable ou non soumise';
  end if;

  if not exists (
    select 1 from public.submissions
    where id = draft_id and client_id = ref.client_id and status = 'working'
  ) then
    raise exception 'Brouillon LFTC introuvable ou déjà soumis';
  end if;

  select count(*) into n
  from public.submissions
  where client_id = ref.client_id
    and status = 'submitted'
    and id not in (ref_id, late_id, draft_id);
  if n <> 4 then raise exception 'Dossier LFTC : % anciennes submissions soumises au lieu de 4', n; end if;

  insert into public.submission_qualifications (
    submission_id, collection_id, client_id, classification, included_in_analysis,
    respondent_label, attribution_source, reason
  )
  select ref_id, s.collection_id, s.client_id, 'reference', true,
    'Raphaël', 'manual_sawaz', 'Attribution métier validée par Sawaz pour le diagnostic LFTC'
  from public.submissions s
  where s.id = ref_id
  on conflict (submission_id) do nothing;

  insert into public.submission_qualifications (
    submission_id, collection_id, client_id, classification, included_in_analysis,
    respondent_label, attribution_source, reason
  )
  select late_id, s.collection_id, s.client_id, 'excluded', false,
    null, 'unknown', 'Collecte distincte non retenue comme réponse de référence'
  from public.submissions s
  where s.id = late_id
  on conflict (submission_id) do nothing;

  insert into public.submission_qualifications (
    submission_id, collection_id, client_id, classification, included_in_analysis,
    attribution_source
  )
  select draft_id, s.collection_id, s.client_id, 'draft', false, 'unknown'
  from public.submissions s
  where s.id = draft_id
  on conflict (submission_id) do nothing;

  insert into public.submission_qualifications (
    submission_id, collection_id, client_id, classification, included_in_analysis,
    attribution_source
  )
  select s.id, s.collection_id, s.client_id, 'historical', false, 'unknown'
  from public.submissions s
  where s.client_id = ref.client_id
    and s.status = 'submitted'
    and s.id not in (ref_id, late_id, draft_id)
  on conflict (submission_id) do nothing;
end;
$$;

-- ============================================================
-- Rollback (à exécuter manuellement, dans une transaction)
-- ============================================================
-- Ne touche ni submissions, ni answers, ni files, ni reviews, ni clients. Seules les
-- qualifications sont perdues : les exporter avant si besoin. Les lignes déjà écrites
-- dans audit_logs (append-only) sont conservées.
--
-- begin;
-- drop policy if exists submission_qualifications_update on public.submission_qualifications;
-- drop policy if exists submission_qualifications_insert on public.submission_qualifications;
-- drop policy if exists submission_qualifications_read on public.submission_qualifications;
-- drop trigger if exists trg_submission_qualifications_audit on public.submission_qualifications;
-- drop trigger if exists trg_submission_qualifications_stamp on public.submission_qualifications;
-- drop trigger if exists trg_submission_qualifications_derive on public.submission_qualifications;
-- drop index if exists public.idx_submission_qualifications_qualified_by;
-- drop index if exists public.idx_submission_qualifications_collection;
-- drop index if exists public.idx_submission_qualifications_client;
-- drop table if exists public.submission_qualifications;
-- drop function if exists public.audit_submission_qualification();
-- drop function if exists public.stamp_submission_qualification();
-- drop type if exists public.submission_attribution_source;
-- drop type if exists public.submission_classification;
-- commit;
