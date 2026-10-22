-- P1-L: keep backend-only tables inaccessible to browser roles.
-- RLS remains enabled with no policies; service_role/postgres grants are unchanged.

revoke all on table public.link_sessions from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;
