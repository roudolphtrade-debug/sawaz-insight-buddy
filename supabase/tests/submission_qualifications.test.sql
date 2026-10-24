-- Tests SQL de submission_qualifications (P3.5-A2).
--
-- À exécuter UNIQUEMENT sur une base locale ou de recette où la migration
-- 20261024120000_add_submission_qualifications.sql est appliquée, en tant que
-- postgres (ex. `psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/submission_qualifications.test.sql`).
-- Tout se déroule dans une transaction annulée à la fin : aucune donnée n'est conservée.
-- Chaque échec lève une exception « TEST FAILED » et interrompt le script.

begin;

-- ------------------------------------------------------------------
-- Fixtures : deux clients, une collecte chacun, rôles Sawaz.
-- ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@test.local'),
  ('00000000-0000-4000-8000-0000000000a2', 'analyst@test.local'),
  ('00000000-0000-4000-8000-0000000000a3', 'viewer@test.local'),
  ('00000000-0000-4000-8000-0000000000a4', 'outsider@test.local');

insert into public.users (id, email, is_active) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@test.local', true),
  ('00000000-0000-4000-8000-0000000000a2', 'analyst@test.local', true),
  ('00000000-0000-4000-8000-0000000000a3', 'viewer@test.local', true),
  ('00000000-0000-4000-8000-0000000000a4', 'outsider@test.local', true);

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner'),
  ('00000000-0000-4000-8000-0000000000a2', 'analyst'),
  ('00000000-0000-4000-8000-0000000000a3', 'viewer'),
  ('00000000-0000-4000-8000-0000000000a4', 'analyst');

insert into public.clients (id, slug, name) values
  ('00000000-0000-4000-8000-0000000000c1', 'test-qualif-a', 'Client A'),
  ('00000000-0000-4000-8000-0000000000c2', 'test-qualif-b', 'Client B');

-- L'analyste et le lecteur ont accès au client A ; l'« outsider » (analyste) au seul client B.
insert into public.user_clients (user_id, client_id) values
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000c1'),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000c2');

insert into public.projects (id, client_id, name) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', 'Mission A'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000c2', 'Mission B');

insert into public.collections (id, client_id, project_id, status) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1', 'open'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000d2', 'open');

insert into public.submissions (id, collection_id, client_id, status) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'working'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'working'),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'working'),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c2', 'working'),
  ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'working');

insert into public.answers (submission_id, collection_id, client_id, question_key, value) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000c1', 'yt.mode', '"export"');

update public.submissions set status = 'submitted'
where id in ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f2');

-- Empreinte de la donnée brute, comparée en fin de script.
create temporary table raw_before as
select
  (select count(*) from public.submissions) as submissions,
  (select count(*) from public.answers) as answers,
  (select count(*) from public.files) as files,
  (select md5(string_agg(id::text || status::text || coalesce(submitted_at::text, ''), ',' order by id)) from public.submissions) as submissions_hash;

-- Agit en tant qu'utilisateur authentifié (mêmes réglages que PostgREST).
create or replace function pg_temp.act_as(_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', _uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

-- ------------------------------------------------------------------
-- 1. Owner et analyst qualifient ; qualified_by / qualified_at imposés par la base.
-- ------------------------------------------------------------------
do $$
declare q record;
begin
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a1');
  insert into public.submission_qualifications (submission_id, client_id, collection_id, classification, included_in_analysis, respondent_label, attribution_source, reason, qualified_by)
  values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000e2',
          'reference', true, 'Répondant A', 'manual_sawaz', 'Test', '00000000-0000-4000-8000-0000000000a3');
  reset role;

  select * into q from public.submission_qualifications where submission_id = '00000000-0000-4000-8000-0000000000f1';
  if q.client_id <> '00000000-0000-4000-8000-0000000000c1' or q.collection_id <> '00000000-0000-4000-8000-0000000000e1' then
    raise exception 'TEST FAILED: client_id / collection_id non dérivés de la submission';
  end if;
  if q.qualified_by is distinct from '00000000-0000-4000-8000-0000000000a1'::uuid then
    raise exception 'TEST FAILED: qualified_by fourni par l''appelant au lieu de auth.uid()';
  end if;

  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a2');
  insert into public.submission_qualifications (submission_id, client_id, collection_id, classification)
  values ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', 'draft');
  reset role;
end;
$$;

-- ------------------------------------------------------------------
-- 2. Plusieurs références sont possibles dans une même collecte.
-- ------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a2');
  begin
    insert into public.submission_qualifications (submission_id, client_id, collection_id, classification, included_in_analysis, respondent_label, attribution_source)
    values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1',
            'reference', true, 'Répondant B', 'manual_sawaz');
  exception when unique_violation or check_violation then
    raise exception 'TEST FAILED: seconde référence refusée dans la même collecte (%)', sqlerrm;
  end;
  reset role;

  if (select count(*) from public.submission_qualifications
      where collection_id = '00000000-0000-4000-8000-0000000000e1' and classification = 'reference') <> 2 then
    raise exception 'TEST FAILED: deux références dans la même collecte refusées';
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 3. Une submission n'a qu'une qualification.
-- ------------------------------------------------------------------
do $$
begin
  begin
    insert into public.submission_qualifications (submission_id, client_id, collection_id, classification)
    values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', 'historical');
    raise exception 'TEST FAILED: seconde qualification acceptée';
  exception when unique_violation then null;
  end;
end;
$$;

-- ------------------------------------------------------------------
-- 4. Requalification : modifie la ligne existante, met à jour qualified_by /
--    qualified_at, conserve created_at. (now() est figé dans une transaction :
--    l'auteur, passé de l'analyste à l'owner, prouve la mise à jour.)
-- ------------------------------------------------------------------
do $$
declare before_row record; after_row record;
begin
  select * into before_row from public.submission_qualifications where submission_id = '00000000-0000-4000-8000-0000000000f3';
  if before_row.qualified_by is distinct from '00000000-0000-4000-8000-0000000000a2'::uuid then
    raise exception 'TEST FAILED: qualification initiale non attribuée à l''analyste';
  end if;
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a1');
  update public.submission_qualifications set classification = 'test', reason = 'Essai interne'
  where submission_id = '00000000-0000-4000-8000-0000000000f3';
  reset role;
  select * into after_row from public.submission_qualifications where submission_id = '00000000-0000-4000-8000-0000000000f3';
  if after_row.id <> before_row.id or after_row.classification <> 'test' then
    raise exception 'TEST FAILED: requalification non appliquée sur la ligne existante';
  end if;
  if after_row.qualified_by is distinct from '00000000-0000-4000-8000-0000000000a1'::uuid
     or after_row.qualified_at < before_row.qualified_at
     or after_row.created_at <> before_row.created_at then
    raise exception 'TEST FAILED: qualified_by / qualified_at / created_at incorrects après requalification';
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 5. Viewer : lecture seule.
-- ------------------------------------------------------------------
do $$
declare n integer;
begin
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a3');
  select count(*) into n from public.submission_qualifications;
  if n <> 3 then raise exception 'TEST FAILED: le lecteur voit % qualifications au lieu de 3', n; end if;

  -- Submission non qualifiée de son propre client : lecture autorisée, écriture refusée.
  begin
    insert into public.submission_qualifications (submission_id, client_id, collection_id, classification)
    values ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', 'test');
    raise exception 'TEST FAILED: le lecteur a pu créer une qualification';
  exception when insufficient_privilege then null;
  end;

  update public.submission_qualifications set classification = 'excluded', included_in_analysis = false
  where submission_id = '00000000-0000-4000-8000-0000000000f1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: le lecteur a pu requalifier'; end if;
  reset role;
end;
$$;

-- ------------------------------------------------------------------
-- 6. Utilisateur sans accès au client : ni lecture ni écriture.
-- ------------------------------------------------------------------
do $$
declare n integer;
begin
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a4');
  select count(*) into n from public.submission_qualifications where client_id = '00000000-0000-4000-8000-0000000000c1';
  if n <> 0 then raise exception 'TEST FAILED: un utilisateur sans accès lit % qualifications', n; end if;

  update public.submission_qualifications set reason = 'intrusion'
  where submission_id = '00000000-0000-4000-8000-0000000000f1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: un utilisateur sans accès a modifié une qualification'; end if;

  -- Usurpation du client : la dérivation ramène la ligne au client réel (A), refusé.
  begin
    insert into public.submission_qualifications (submission_id, client_id, collection_id, classification)
    values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000e2', 'test');
    raise exception 'TEST FAILED: écriture acceptée sur un client inaccessible';
  exception when insufficient_privilege or unique_violation then null;
  end;
  reset role;
end;
$$;

-- ------------------------------------------------------------------
-- 7. Aucune suppression applicative ; anon n'a aucun accès.
-- ------------------------------------------------------------------
do $$
begin
  perform pg_temp.act_as('00000000-0000-4000-8000-0000000000a1');
  begin
    delete from public.submission_qualifications where submission_id = '00000000-0000-4000-8000-0000000000f3';
    raise exception 'TEST FAILED: suppression autorisée';
  exception when insufficient_privilege then null;
  end;
  reset role;

  execute 'set local role anon';
  begin
    perform 1 from public.submission_qualifications limit 1;
    raise exception 'TEST FAILED: anon peut lire les qualifications';
  exception when insufficient_privilege then null;
  end;
  reset role;
end;
$$;

-- ------------------------------------------------------------------
-- 8. Cohérence métier imposée par la base.
-- ------------------------------------------------------------------
do $$
begin
  begin
    update public.submission_qualifications set included_in_analysis = false
    where submission_id = '00000000-0000-4000-8000-0000000000f1';
    raise exception 'TEST FAILED: référence hors corpus acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.submission_qualifications set classification = 'excluded'
    where submission_id = '00000000-0000-4000-8000-0000000000f1';
    raise exception 'TEST FAILED: exclusion incluse dans le corpus acceptée';
  exception when check_violation then null;
  end;
  begin
    update public.submission_qualifications set attribution_source = 'unknown'
    where submission_id = '00000000-0000-4000-8000-0000000000f1';
    raise exception 'TEST FAILED: répondant nommé sans source d''attribution accepté';
  exception when check_violation then null;
  end;
end;
$$;

-- ------------------------------------------------------------------
-- 9. Traçabilité : une ligne d'audit par qualification et par requalification.
-- ------------------------------------------------------------------
do $$
declare n integer;
begin
  select count(*) into n from public.audit_logs
  where entity_type = 'submission'
    and entity_id in ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f3')
    and action in ('submission.qualified', 'submission.requalified');
  if n <> 4 then raise exception 'TEST FAILED: % lignes d''audit au lieu de 4', n; end if;

  if not exists (
    select 1 from public.audit_logs
    where action = 'submission.requalified'
      and entity_id = '00000000-0000-4000-8000-0000000000f3'
      and actor_id = '00000000-0000-4000-8000-0000000000a1'
      and metadata ->> 'previous_classification' = 'draft'
      and metadata ->> 'classification' = 'test'
  ) then
    raise exception 'TEST FAILED: requalification non tracée avec l''auteur et l''ancienne valeur';
  end if;

  if exists (select 1 from public.audit_logs where metadata::text like '%Répondant A%') then
    raise exception 'TEST FAILED: le nom du répondant est recopié dans le journal';
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 10. La donnée brute n'a pas bougé.
-- ------------------------------------------------------------------
do $$
declare b record;
begin
  select * into b from raw_before;
  if b.submissions <> (select count(*) from public.submissions)
     or b.answers <> (select count(*) from public.answers)
     or b.files <> (select count(*) from public.files)
     or b.submissions_hash <> (select md5(string_agg(id::text || status::text || coalesce(submitted_at::text, ''), ',' order by id)) from public.submissions) then
    raise exception 'TEST FAILED: la donnée brute a été modifiée';
  end if;
end;
$$;

select 'submission_qualifications : tous les tests sont passés' as result;

rollback;
