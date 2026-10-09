# Developer Onboarding Checklist

**Snapshot:** 2026-10-09. Source checkout is in this Git repository; local verification is recorded in `TESTING_AND_VALIDATION.md`.

## Repository and source
- [ ] Invite each developer individually to the private GitHub repository using the least permission needed.
- [ ] Clone repository and check `git status --short --branch`, current branch and expected HEAD.
- [ ] Read `README.md`, `PRD.md`, `frontend/AGENTS.md`, `.specify/memory/constitution.md`, the feature spec/plan/tasks, and `complete_project_handover/docs/handover/REPOSITORY_INVENTORY.md`.
- [ ] Review `AUDIT_REPORT.md`; explicitly understand the sensitive-table RLS blocker before using real data.
- [ ] Check local `.env` files privately; never display or commit secret values.

## Local application checks
- [ ] In `frontend/`, install with `npm ci` using supported Node.js.
- [ ] Run `npm run lint`, `npm exec tsc -- --noEmit`, and `npm run build`.
- [ ] Confirm the test gap: no test script or test suite currently exists.
- [ ] Do not apply `supabase/schema.sql` to production; it is not a migration history and has unsafe policies.

## Services and production safety
- [ ] Confirm whether a development Supabase project exists and whether its schema is isolated from production.
- [ ] Review and replace permissive RLS policies before storing real customer/order data; add policy tests.
- [ ] Identify provider, payment and hosting ownership only with the service owner. None were contacted or verified in this audit.
- [ ] Keep development credentials in an approved secret manager; never share accounts or commit credentials.

## Pairing and signoff
- [ ] Agree code owner for authorization/data security and owner for tests/CI/documentation.
- [ ] Make small reviewed branches/PRs; do not deploy or run production migrations without owner approval.
- [ ] Record unresolved product decisions (payments, commission basis, data retention, service coverage) in `HANDOVER_QA.md`.
- [ ] Confirm the two developers can reproduce the same local checks.
