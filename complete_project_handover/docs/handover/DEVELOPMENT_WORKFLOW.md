# Development Workflow

**Snapshot:** 2026-10-09. Workflow recommendations should be read with the actual repository map in `REPOSITORY_INVENTORY.md` and validation status in `TESTING_AND_VALIDATION.md`.

**Classification:** VERIFIED = directly observed in an accessible artifact (specify whether *document* or *implementation*); CONTEXT-BASED = described in accessible planning/history; INFERRED = technical interpretation requiring confirmation; UNKNOWN = not evidenced. A specification is not running software.

## Current vs recommended
**Current (UNKNOWN):** No actual Git branch naming, PR rules, CI enforcement or approvals are evidenced. PRD Maker instruction template suggests `NNN-feature-name`, but that is a planning convention, not a demonstrated practice.

**Recommended for two developers (new proposal, not existing policy):** One private Git remote and default protected `main`; short-lived `feature/NNN-summary` branches (or existing repo convention if already established); PR template requiring purpose, related requirement ID, tests and screenshots; one reviewer other than author; squash/rebase according to team agreement. Create `develop` only if release cadence actually requires it.

## Daily collaboration
- Shared issue board: owner, priority, acceptance criteria, dependency, branch/PR, status.
- Before coding: sync main, review scope/ownership, avoid editing same feature in parallel, coordinate migrations and generated files.
- Commit messages suggested `feat:`, `fix:`, `docs:`, `test:`, `chore:` with useful scopes.
- PR checks: lint, typecheck, unit/integration tests, security scan, bilingual mobile QA for customer-facing changes; do not merge failing checks without documented approval.
- Never commit secrets, user content, database dumps or Claude chat exports with private content.
- Every architecture alteration or new service goes into an ADR under `docs/decisions/` **if adopted by team**; proposed decision log is not proof of past decisions.
- Production deployment and migrations require explicit ownership, backup and rollback.

## Suggested first-day collaboration
Pair on source audit, one dev records reproducible setup and test commands, the other verifies features/security. End with one reviewed, nonfunctional documentation PR and agreed feature ownership.
