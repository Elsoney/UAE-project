# Tech Stack and Dependencies

**Snapshot:** 2026-10-09. Versions below are declared in `frontend/package.json` / `package-lock.json` unless labeled as the locally observed runtime.

## Actual application stack

| Layer | Verified state |
|---|---|
| Web framework | Next.js 16.4.0, App Router under `frontend/src/app/` |
| UI/runtime | React 19.3.0 |
| Language | TypeScript 5.9.3 |
| Styling | Tailwind CSS 4.3.3 |
| Backend client | Supabase JS 2.117.3 is declared; helper exists but is not imported by current pages |
| Database | Draft `supabase/schema.sql`; no migration history or live deployment verified |
| Package manager | npm with committed `frontend/package-lock.json` |
| Local runtime | Node v24.18.0, npm 11.16.0 |
| Spec Kit | Specify CLI 1.1.1, Codex integration, PowerShell scripts; local `.venv/` is ignored |

The frontend package declares `lint`, `build`, `dev`, and `start`. There is no test script. No CI workflow, payment SDK, maps SDK, or application authentication dependency was found in the inspected tree.

## Planned but not verified as deployed integrations

Vercel hosting, Supabase Auth/Storage/Edge Functions, UAE payment provider, Google Maps/Business Profile, GA4 and messaging/email are described in product/design documents but are not confirmed as connected services. Payment provider and commission rate/basis remain unresolved product decisions.

## Version/setup cautions

The plan permits Node 18+, which is outdated for the declared Next.js 16 dependency; use a currently supported Next.js runtime (Node 24.18.0 passed local checks). Reconcile plan documentation before onboarding a second developer. Use `npm ci` in `frontend/` to honor the lockfile; it was not run during this verification.

PRD Maker has no installable runtime in this repository; its supplied source is an instruction document only.
