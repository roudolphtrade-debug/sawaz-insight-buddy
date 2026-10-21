ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_visibility_check;
ALTER TABLE public.analyses
  ADD CONSTRAINT analyses_visibility_check
  CHECK (visibility IN ('internal','client') AND (type <> 'note' OR visibility = 'internal'));
