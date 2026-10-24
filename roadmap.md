# P3.4-D

- [x] Verify clean Git state, GitHub target feature/lftc-studio-ux and Sawaz Core connection.
- [x] Remove privileged studioBootstrap and its caller; preserve claim_team_access.
- [x] Align authenticated middleware with the external public Supabase connection.
- [x] Remove direct privileged publication reads; preserve Collect and shared server client.
- [x] Run focused auth tests and check preview/build diagnostics.
- [x] Report remaining privileged publication dependencies and verification limits.
- [x] Authenticated /studio, LFTC and RECETTE SAWAZ visibility validated by the user in P3.4-E context (not independently verified).
- [ ] Verify new SHA reached GitHub: Git sync status cannot be read by the agent.
- [ ] Make all Pilot publication operations service-role-free: existing notification/session policies deny user writes; requires a separately authorized design beyond the permitted no-policy-change scope. No further lot started.

# P3.4-E

- [x] Point homepage Sign in and Launch app to /auth; preserve demo (browser verified).
- [x] Present missing YouTube keys and unknown keys without technical identifiers (helper output verified).
- [x] Show explicit unidentified respondent when deterministic identity is absent (collection-recipient provenance rejected; four tests pass).
- [x] Verify navigation, identity rules, and preview diagnostics (11 focused tests pass; build OK; no browser runtime errors). Authenticated dossier presentation remains unverified because external session is unavailable.
- [ ] Test real LFTC document buttons: uploaded instructions stop after “bouton”; external authenticated session unavailable.