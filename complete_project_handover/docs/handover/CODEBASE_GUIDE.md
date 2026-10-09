# Codebase Guide

**Snapshot:** 2026-10-09. Verified against the Umodai repository at HEAD `d6cfff2`.

## Project identity and root map

This is the Umodai Restaurant & Catering Website project. PRD Maker is a supplied assistant-instructions document under `docs/source/`, not a second application. The complete source tree and Spec Kit guide are in [`REPOSITORY_INVENTORY.md`](REPOSITORY_INVENTORY.md).

| Area | Location | Current role |
|---|---|---|
| Customer site | `frontend/src/app/page.tsx` | Static English marketing page with menu, catering and contact sections |
| Admin presentation | `frontend/src/app/admin/page.tsx` | Static example dashboard; no authentication or live data |
| Shared UI | `frontend/src/components/` | Menu, catering and section-heading components |
| Demo content | `frontend/src/data/site.ts` | Hardcoded menu, packages and statistics |
| Supabase client | `frontend/src/lib/supabase.ts` | Optional client helper; no current page imports it |
| Database draft | `supabase/schema.sql` | Eight-table schema and RLS policies; not versioned migrations |
| Product/design artifacts | `PRD.md`, `specs/001-umodai-restaurant/` | Product requirements, feature spec, plan and tasks |
| Spec Kit | `.agents/skills/`, `.specify/` | Codex skills, templates, PowerShell workflows and constitution |
| Handover docs | `complete_project_handover/` | Imported transfer package; not executable application code |

## Implemented and absent surfaces

Implemented Next.js routes are `/` and `/admin`. No API routes, auth routes, server actions, tests, Supabase migrations/functions, or GitHub Actions workflows were found. The directory map and exact tracked paths are recorded in `REPOSITORY_INVENTORY.md`.

The homepage and dashboard are prototypes; buttons/forms do not implement commercial workflows. The sensitive-table RLS policies in `supabase/schema.sql` authorize any authenticated role rather than checking admin membership. Do not deploy the current policies with real customer data.

For a full requirement-by-requirement audit, use the repository-root `AUDIT_REPORT.md`. That report distinguishes implementation evidence from deployment facts that were not verified.
