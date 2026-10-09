# Claude Project Context

**Snapshot:** 2026-10-09. This is a handover for the Umodai application repository at HEAD `d6cfff2`; current structure and validation are in `REPOSITORY_INVENTORY.md`.

## Project identity and instructions

This repository implements Umodai Restaurant & Catering Website. `docs/source/PRD_MAKER_ORIGINAL.md` is a separate assistant prompt specification, not an application or requirement for this codebase. `docs/source/UMODAI_PRD_SOURCE.txt` and root `PRD.md` describe product intent; compare them to implementation before claiming completion.

No root `CLAUDE.md` exists. The frontend contains `frontend/AGENTS.md` with Next.js-specific coding guidance. Spec Kit 1.1.1 is configured for Codex; ten skill files are under `.agents/skills/`, with templates, PowerShell scripts, workflows and a constitution under `.specify/`. See `REPOSITORY_INVENTORY.md`.

## Verified implementation and checks

The app is a Next.js 16.4.0 / React 19 / TypeScript 5.9 / Tailwind 4 prototype. It has static `/` and `/admin` routes, hardcoded demo data, a Supabase client helper not used by the pages, and a draft schema with sensitive-table RLS policies based only on authentication. The UI has no order, catering submission, payment, or admin authorization workflow.

Local lint, typecheck and production build passed. No automated tests, migration directory, server/API routes or CI workflow were found. See root `AUDIT_REPORT.md` for details and release blockers.

## Onboarding guardrails

Never print or commit secrets. Do not deploy, use live payments, or apply the draft SQL to production. Keep documented plan separate from actual code; update facts with file paths and commit references. The major immediate blocker is a proper admin authorization/RLS model with tests before real customer data is connected.
