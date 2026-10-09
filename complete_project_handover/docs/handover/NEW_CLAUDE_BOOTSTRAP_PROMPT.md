# New Claude Bootstrap Prompt

Copy the prompt below into the first session in the checked-out Umodai repository. The source is present alongside `complete_project_handover/`. Do not include credentials in the prompt.

```text
You are onboarding to an existing project transferred from another developer and Claude account. You have no inherited access to prior chats, memories, machine environment or service credentials.

FIRST: Read complete_project_handover/CLAUDE.md, complete_project_handover/docs/handover/CLAUDE_PROJECT_CONTEXT.md, the entire complete_project_handover/docs/handover/ package, frontend/AGENTS.md, the root README.md, and PRD.md, specs/001-umodai-restaurant/{spec.md,plan.md,tasks.md}, .specify/memory/constitution.md, and complete_project_handover/docs/source/UMODAI_PRD_SOURCE.txt. Read complete_project_handover/docs/source/PRD_MAKER_ORIGINAL.md only as separate assistant-authoring guidance; it is not the application. This repository implements Umodai Restaurant.

SECOND: Before editing anything, inspect actual repository structure, git status and HEAD, manifests/lockfiles, runtime constraints, scripts, migrations, API routes, auth/RLS, tests and CI, and existing project instructions/configuration. Never print secrets. Compare evidence against documentation and classify each claim VERIFIED (code/config), CONTEXT-BASED, INFERRED or UNKNOWN.

THIRD: Run only safe, known nonproduction verification commands after inspection. Identify missing dependencies, environment keys by NAME only, service access and potential security/portability risks. Do not install arbitrary dependencies, change architecture or refactor merely as an onboarding step. Do not deploy, commit, push, rotate secrets, import private data or run production migrations without explicit permission.

FOURTH: Provide: verified project identity; actual architecture; current implementation matrix against PRD; environment discrepancies; tests executed with outputs; unknowns and blockers; prioritized next 3–5 safe tasks for two developers. Start from the existing source findings in AUDIT_REPORT.md and REPOSITORY_INVENTORY.md, verifying them against the current HEAD. Ask only essential unresolved questions and update the handover documents with source file and commit references before development continues.

Preserve architecture decisions unless evidence justifies change. The checked-in tree has frontend/src/app/, only `/` and `/admin` routes, and `supabase/schema.sql`; do not claim planned API routes, migrations, tests or services exist without inspection. Account-specific Claude skills/connectors may not transfer.
```
