# Claude project onboarding (provisional transfer instructions)

This handover accompanies the Umodai Restaurant & Catering Website repository. The source was inspected on 2026-10-09; see `docs/handover/REPOSITORY_INVENTORY.md` and the root `AUDIT_REPORT.md`. There is no root `CLAUDE.md` in the application repository. The frontend has `frontend/AGENTS.md` with Next.js-specific guidance.

Read `docs/handover/CLAUDE_PROJECT_CONTEXT.md`, `docs/handover/PROJECT_OVERVIEW.md`, `docs/handover/ARCHITECTURE.md`, `docs/handover/CURRENT_STATUS_AND_NEXT_STEPS.md` and `docs/handover/HANDOVER_QA.md` first.

The application repository is Umodai. `docs/source/PRD_MAKER_ORIGINAL.md` defines separate PRD Maker assistant behavior and is not an implementation requirement for this application. `docs/source/UMODAI_PRD_SOURCE.txt` is the supplied Umodai product PRD; compare it with the actual implementation before treating any item as complete. The current stack is verified in `frontend/package.json`.

For PRD Maker prompts, preserve applicable source instructions: ask minimum grouped questions; mandatory Groups 1–5; output complete English 17-section PRD; do not generate code as part of PRD creation. For Umodai implementation, preserve bilingual RTL/LTR, human-reviewed catering, payment webhook verification, auditability, separate order/payment statuses and website commission attribution as documented requirements.

Onboarding: inspect current git status, manifests, scripts, database policies, tests and instruction files; capture safe evidence and document versions/commands. Verified local checks are listed in `docs/handover/REPOSITORY_INVENTORY.md`. There is no test script, no migration directory, and no CI workflow in the inspected checkout. Label verified code/config versus documented plans versus inference/unknown.

Do not expose/commit secrets or customer data, alter architecture, deploy, run destructive DB migrations, access live payments or change permissions without explicit owner approval. Keep task ownership and small reviewed PRs. Update evidence register on discoveries. See `docs/handover/DEVELOPMENT_WORKFLOW.md`, `TESTING_AND_VALIDATION.md` and `MIGRATION_CHECKLIST.md`.
