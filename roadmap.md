# P3.4-D

- [x] Verify clean Git state, GitHub target feature/lftc-studio-ux and Sawaz Core connection.
- [x] Remove privileged studioBootstrap and its caller; preserve claim_team_access.
- [x] Align authenticated middleware with the external public Supabase connection.
- [x] Remove direct privileged publication reads; preserve Collect and shared server client.
- [x] Run focused auth tests and check preview/build diagnostics.
- [x] Report remaining privileged publication dependencies and verification limits.
- [ ] Verify authenticated /studio and real client count: unavailable session for external unmanaged Supabase.
- [ ] Verify new SHA reached GitHub: Git sync status cannot be read by the agent.
- [ ] Make all Pilot publication operations service-role-free: existing notification/session policies deny user writes; requires a separately authorized design beyond the permitted no-policy-change scope. No further lot started.