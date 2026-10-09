# Repository Inventory and Spec Kit Guide

**Verified against:** repository `Elsoney/UAE-project`, branch `master`, HEAD `d6cfff2` (2026-10-09).  
**Project identity:** Umodai Restaurant & Catering Website. PRD Maker is a supplied assistant-instructions document, not a second application in this repository.

## Actual repository layout

```text
.
├── .agents/
│   └── skills/
│       ├── speckit-analyze/SKILL.md
│       ├── speckit-checklist/SKILL.md
│       ├── speckit-clarify/SKILL.md
│       ├── speckit-constitution/SKILL.md
│       ├── speckit-converge/SKILL.md
│       ├── speckit-implement/SKILL.md
│       ├── speckit-plan/SKILL.md
│       ├── speckit-specify/SKILL.md
│       ├── speckit-tasks/SKILL.md
│       └── speckit-taskstoissues/SKILL.md
├── .specify/
│   ├── integrations/
│   │   ├── codex.manifest.json
│   │   └── speckit.manifest.json
│   ├── memory/
│   │   ├── .constitution-template.json
│   │   └── constitution.md
│   ├── scripts/powershell/
│   │   ├── check-prerequisites.ps1
│   │   ├── common.ps1
│   │   ├── create-new-feature.ps1
│   │   ├── resolve-template.ps1
│   │   ├── setup-plan.ps1
│   │   └── setup-tasks.ps1
│   ├── templates/
│   │   ├── checklist-template.md
│   │   ├── constitution-template.md
│   │   ├── plan-template.md
│   │   ├── spec-template.md
│   │   └── tasks-template.md
│   ├── workflows/speckit/workflow.yml
│   ├── workflows/workflow-registry.json
│   ├── init-options.json
│   └── integration.json
├── frontend/
│   ├── public/                         # Five starter SVG assets
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── catering-card.tsx
│   │   │   ├── menu-card.tsx
│   │   │   └── section-heading.tsx
│   │   ├── data/site.ts
│   │   └── lib/supabase.ts
│   ├── AGENTS.md
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── specs/001-umodai-restaurant/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── supabase/schema.sql
├── .env.example
├── .gitignore
├── PRD.md
└── README.md
```

`complete_project_handover/` is the imported documentation bundle. It contains `CLAUDE.md`, its own README, supplied source documents in `docs/source/`, and the handover reports in `docs/handover/`. It is documentation, not application source; the application source is in the repository root's `frontend/` and `supabase/` directories.

Ignored/local-only items observed during validation include `.venv/`, `frontend/node_modules/`, `frontend/.next/`, `frontend/next-env.d.ts`, `frontend/tsconfig.tsbuildinfo`, and `.specify/feature.json`. These are not source deliverables and should not be force-added. `.env*` is ignored except `.env.example`; do not add actual secret-bearing env files.

## Spec Kit in this repository

- Installed Spec Kit version: **1.1.1**, configured for **Codex** integration and PowerShell scripts.
- Local CLI observed at `.venv/Scripts/specify.exe`; the virtual environment is ignored and must be recreated on another machine if the CLI is needed.
- The ten project skill definitions are under `.agents/skills/` as listed in the tree.
- Templates, workflow definitions, integration manifests and PowerShell helpers are under `.specify/`.
- Project-specific artifacts are `specs/001-umodai-restaurant/spec.md`, `plan.md`, and `tasks.md`, plus `.specify/memory/constitution.md`.
- The root `README.md` documents the project's Spec Kit workflow. `.specify/feature.json` is ignored local state, not a required shared project artifact.
- The plan's proposed `frontend/app`, API routes, Supabase migrations/functions, and `tests/` layout is not the actual structure. The current frontend uses `frontend/src/app/`; no API routes, migrations, functions, test directory, or CI workflow were found.

## Verified application shape

- Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4, and Supabase JS 2 are declared in `frontend/package.json` / `package-lock.json`.
- Implemented routes are `/` and `/admin`; the home page uses hardcoded content, and the admin dashboard uses example metrics and rows.
- `frontend/src/lib/supabase.ts` creates a client only when the public URL and anonymous key are present; no application page imports it.
- `supabase/schema.sql` defines eight tables and RLS. Sensitive table policies currently check only whether a user is authenticated, not whether that user is an authorized administrator. Treat this as a critical release blocker; live deployment state was not checked.
- See the root [`AUDIT_REPORT.md`](../../../AUDIT_REPORT.md) for the detailed feature matrix and audit findings.

## Safe local checks run

From `frontend/`, on the inspected Windows environment (Node v24.18.0, npm 11.16.0):

| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npm exec tsc -- --noEmit` | Passed |
| `npm run build` | Passed; Next.js statically generated `/`, `/_not-found`, and `/admin` |
| `npm test` | Not run: no test script or test suite is defined |

These checks validate the current local checkout only. They do not validate Supabase policies against a live project or prove customer/order workflows.
