# Known Issues And Technical Debt

**Snapshot:** 2026-10-09. Source-level implementation issues were inspected and are detailed in the repository-root `AUDIT_REPORT.md`; this file retains transfer and cross-check notes.

**Classification:** VERIFIED = directly observed in an accessible artifact (specify whether *document* or *implementation*); CONTEXT-BASED = described in accessible planning/history; INFERRED = technical interpretation requiring confirmation; UNKNOWN = not evidenced. A specification is not running software.

## Confirmed documentation/transfer risks (not confirmed code bugs)
| Severity | Issue | Evidence | Mitigation |
|---|---|---|---|
| Critical | Actual repository and implementation inaccessible | Supplied archive contains docs only | Obtain audited clone before migration approval |
| High | Unverified source secrets and repository hygiene | No Git history/worktree available | Secret scan source and history; investigate findings privately |
| High | No reproducible runtime/dependency lock available | No manifests/lockfiles supplied | Pin versions from source repo; clean-install trial |
| High | Payment provider unspecified | Umodai PRD explicitly TBD | Obtain provider decision and webhook/security contract |
| High | Commission percentage, calculation/refund basis TBD | Umodai PRD §§2,7 | Approve written commercial rules + reconciliation tests |
| Medium | Potential order/catering payment polymorphic link needs schema decision | PRD uses `order_id/catering_request_id` | Inspect actual schema and enforce integrity |
| Medium | Five-week schedule and P0 TODO may be stale | PRD created 2026-10-06 | Refresh implementation status with actual code |
| Medium | Claude PRD Maker rules and Umodai application goals are distinct | Two source docs | Confirm target and avoid instruction bleed |
| Medium | Target launch and external approvals can slip | Payment/Google verification dependence in PRD | Owner-approved contingency plan |

## Code technical debt and known runtime bugs
**UNKNOWN.** Cannot claim any confirmed code defect, vulnerability, fragile function, failing test or performance bottleneck without repository access and testing. Track discovered issues with file/line/commit and reproduction details after code audit.
