-- Les métriques extraites sont des données dérivées produites après la soumission
-- (extraction, revue humaine, correction tracée). Elles ne doivent pas hériter du
-- verrou d'immuabilité des submissions envoyées, contrairement aux answers et files.
DROP TRIGGER IF EXISTS trg_metrics_immutable ON public.extracted_metrics;
DROP TRIGGER IF EXISTS trg_metrics_insert_open ON public.extracted_metrics;
