# Environment Setup

**Snapshot:** 2026-10-09. Verified against `frontend/package.json`, `.env.example`, and local validation on Windows.

## Local frontend setup

The frontend is an npm project with a committed `package-lock.json`. The observed local environment was Node v24.18.0 and npm 11.16.0. Lint, TypeScript and production build passed; a clean clone/install was not run in this verification.

1. Clone this repository and inspect `git status` before making changes.
2. In `frontend/`, use the Node.js version supported by Next.js 16; Node v24.18.0 was used for the recorded checks.
3. Run `npm ci` from `frontend/` to install from the committed lockfile.
4. `.env.example` documents variable names only. Create `frontend/.env.local` only if local Supabase use is needed; `.env*` is ignored. Never copy production values into PRs or archives.
5. Run lint, TypeScript and build checks as shown in `TESTING_AND_VALIDATION.md`.
6. Supabase is not required to render the current static pages. Do not apply `supabase/schema.sql` to production; it is a draft, not a safe migration.
7. No CI or deployment workflow was found. Configure those only after the team agrees the target environment and required safeguards.

## Environment variable names

`.env.example` declares `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL`. The current Supabase client helper reads only the first two. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side; it must never enter browser code. The values in `.env.example` are placeholders, not working credentials.

## Platform and service risks

Windows PowerShell and Unix shell differences, native package ABI compatibility, filesystem case sensitivity, UAE event-date/time-zone handling, payment redirects/webhook tunneling, locale and RTL behavior require environment-specific verification. No live Supabase, payment, or hosting configuration was inspected.

The ignored local `.venv/` contains Specify CLI 1.1.1 on the inspected machine. It is not transferred by Git; recreate it only if a contributor needs to run Spec Kit commands.
