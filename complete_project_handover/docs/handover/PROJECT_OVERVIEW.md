# Project Overview

**Snapshot:** 2026-10-09. Verified against repository `Elsoney/UAE-project`, branch `master`, HEAD `d6cfff2`.

## Project identity

- **VERIFIED (repository): Umodai Restaurant & Catering Website**, a Next.js app and Supabase schema prototype for a restaurant in Ajman, UAE.
- **VERIFIED (document only): PRD Maker**, a Claude-oriented PRD-authoring assistant specification preserved under `docs/source/PRD_MAKER_ORIGINAL.md`. It is not an application in this repository.
- **VERIFIED (document): Umodai PRD**, requirements for the bilingual restaurant/catering product. It describes intended scope; it is not proof that features work.

## Proposed Umodai product outcomes

The Umodai PRD describes a mobile-first Arabic/English restaurant and catering website for Ajman. Its planned scope includes catalog browsing, online food orders, staff-reviewed catering inquiries, deposits, verified online payments, website-order attribution, commission reports, Maps and local SEO. Commission rate and basis are unresolved business decisions. Native apps, driver tracking, loyalty, marketplace integrations and AI chatbot are deferred from v1.

## Current implementation

- **VERIFIED:** Static English storefront and static `/admin` dashboard; hardcoded content; draft Supabase schema.
- **NOT IMPLEMENTED:** ordering/cart/checkout, working catering submission, admin login/authorization, live Supabase reads/writes, payment workflows, refunds, commissions and Arabic/RTL.
- **VERIFIED (validation):** ESLint, TypeScript no-emit check and production build passed locally on 2026-10-09. No automated test suite or test script exists.
- **UNKNOWN:** deployed database policies, hosting configuration, production URL, service access, backups, and whether the schema was applied remotely.

For the source tree and Spec Kit artifacts, see `REPOSITORY_INVENTORY.md`. For detailed feature evidence and audit findings, see the repository-root `AUDIT_REPORT.md`.

## What to hand off

Repository and history, nonsecret configuration template, content/assets rights and ownership, current execution state, user-approved decision records, individual access to hosted services, and signed-off validation. See `HANDOVER_QA.md` and `MIGRATION_CHECKLIST.md`.
