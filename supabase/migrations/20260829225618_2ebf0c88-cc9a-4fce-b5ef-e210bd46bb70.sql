-- Seed du tenant de démonstration + lien de collecte (Pass 3C)
DO $$
DECLARE
  v_client uuid;
  v_contact uuid;
  v_project uuid;
  v_template uuid;
  v_collection uuid;
  v_link uuid;
BEGIN
  INSERT INTO public.clients (slug, name, sector, brand, theme_tokens, is_demo)
  VALUES ('lftc', 'LFTC', 'Formation & communauté', '{"logoAlt":"LFTC"}'::jsonb, '{}'::jsonb, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_client;

  INSERT INTO public.contacts (client_id, name, email, role_label, is_primary)
  VALUES (v_client, 'Raphaël', 'raphael@lftc.demo', 'Fondateur', true)
  RETURNING id INTO v_contact;

  INSERT INTO public.projects (client_id, name, period_label, status)
  VALUES (v_client, 'Phase 1 — Première vague', '365 derniers jours', 'active')
  RETURNING id INTO v_project;

  INSERT INTO public.collection_templates (client_id, version, schema, published_at)
  VALUES (v_client, 1, jsonb_build_object(
    'slots', jsonb_build_array(
      'yt.export','yt.capture.overview','yt.capture.content','yt.capture.audience',
      'c.guideVip','c.dixVideos','c.traffic','c.newReturning',
      'm.export','m.captures','m.results'
    ),
    'answerKeys', jsonb_build_array(
      'yt.mode','yt.exportImpossible','yt.missing.overview','yt.missing.content','yt.missing.audience',
      'c.membresVideos','c.membresDetail','c.guideVipMissing','c.skipDixVideos','c.traffic','c.newReturning',
      'm.periode','m.periodeAutre','m.objectifs','m.objectifAutre','m.destination','m.destinationAutre',
      'm.mode','m.exportImpossible','m.results','m.resultsAutre','m.resultsMissing','m.tracking'
    ),
    'maxFileBytes', 20971520,
    'mimes', jsonb_build_array(
      'application/pdf','image/png','image/jpeg','image/webp','text/csv',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  ), now())
  RETURNING id INTO v_template;

  INSERT INTO public.collections (client_id, project_id, template_id, template_version, status, opened_at)
  VALUES (v_client, v_project, v_template, 1, 'open', now())
  RETURNING id INTO v_collection;

  INSERT INTO public.secure_links (client_id, scope, target_id, token_hash, expires_at, max_uses)
  VALUES (v_client, 'collection', v_collection,
          encode(digest('demo-lftc-collecte-2026', 'sha256'), 'hex'),
          now() + interval '90 days', 1000)
  RETURNING id INTO v_link;

  INSERT INTO public.collection_recipients (collection_id, client_id, contact_id, secure_link_id, status)
  VALUES (v_collection, v_client, v_contact, v_link, 'pending');
END $$;
