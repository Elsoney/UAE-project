# Handover Qa

**Snapshot:** 2026-10-09. These are remaining owner questions after source inspection; code-level facts are documented in `REPOSITORY_INVENTORY.md` and the repository-root `AUDIT_REPORT.md`.

**Classification:** VERIFIED = directly observed in an accessible artifact (specify whether *document* or *implementation*); CONTEXT-BASED = described in accessible planning/history; INFERRED = technical interpretation requiring confirmation; UNKNOWN = not evidenced. A specification is not running software.

## Questions original developer must answer (not recoverable from supplied evidence)
1. Is the transferred repository PRD Maker, Umodai Restaurant or both? Provide each private repo location and authoritative branch/commit.
2. Where is actual source and what is implemented today? Which feature did you work on last and which changes are uncommitted?
3. What are the operating system, runtime versions, package manager, lockfile, local services, build/run/test commands and successful outputs?
4. Which architectural decisions differ from the PRD (Next.js/Supabase/Vercel), and why?
5. Which database schema/migrations, seed data, storage buckets and RLS policies exist? What is the safe development-data strategy?
6. Which payment provider/environment, webhook verification/commission rules and merchant account are approved? Who can access sandbox?
7. Which domain, DNS, deploy environments, Vercel/Supabase projects and Git permissions already exist, and who owns them?
8. Which credentials are source-machine-only; how will appropriate dev secrets be securely issued?
9. Which Claude project instructions, plugins/skills, connector definitions and important decisions from past chats should be transferred, subject to privacy review?
10. What open issues, failing tests, abandoned solutions, branch-specific work and known production risks should the new dev avoid repeating?
11. Which restaurant approvals/content/commission rules are finalized; what is target delivery area and fulfillment model?
12. What are the team review process, task ownership, change approval authority and allowed production access?

Ask only the blockers at onboarding; record answers with links/commits and update `CURRENT_STATUS_AND_NEXT_STEPS.md`.
