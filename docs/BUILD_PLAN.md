# Umodai — Gap Analysis and Build Plan

**Date:** 2026-10-09 · **Baseline:** `master` @ `9e3cebc` + PR #1 (self-hosted fonts)
**Sources reviewed:** `PRD.md` (= `complete_project_handover/docs/source/UMODAI_PRD_SOURCE.txt`), `specs/001-umodai-restaurant/{spec,plan,tasks}.md`, `.specify/memory/constitution.md`, `AUDIT_REPORT.md`, every file in `complete_project_handover/`, all application code and `supabase/schema.sql`.

## 1. Where the project is today

| Area | State |
|---|---|
| Storefront | Static, English-only single page (`/`) with hard-coded menu/packages from `src/data/site.ts`. No mobile nav, placeholder phone/WhatsApp, enquiry form does not submit. |
| Admin | `/admin` is a static mock with fake orders, **no authentication**, and is linked from the public header. |
| Database | One non-migratable `schema.sql` (8 tables). **Critical:** every sensitive table (orders, customers' data, payments, commissions, `admin_users`) is open to *any* signed-in Supabase user, who can also add themselves as admin. No constraints, no bilingual fields, no payment idempotency, no audit trail. Unknown whether it was ever applied to a live project. |
| Supabase client | `src/lib/supabase.ts` exists but is never imported. |
| Ordering, cart, checkout, payments, deposits, refunds, commissions | Not started. |
| Arabic / RTL | Not started (`<html lang="en" dir="ltr">` hard-coded). |
| SEO | Title + description only. No sitemap, robots, JSON-LD, hreflang. |
| Quality | Lint + typecheck + build pass. **No tests, no CI.** 0 production npm vulnerabilities. |
| tasks.md | 33 tasks, all unchecked; T001 effectively done, ~10 partial, rest not started. Audit estimates 5–15 % of v1 complete. |

## 2. Rules every change follows (from the constitution and handover)

- Trace every feature to PRD-001; P0 first. Strict TypeScript; lint, typecheck, build and tests must pass.
- **Tests are mandatory** for pricing, deposits, payments, refunds, commission, authorization and state transitions.
- Authorization is enforced on the server and in RLS — never only by hiding UI. Service-role key is server-only.
- All schema/RLS changes are **versioned migrations**; nobody can grant themselves a role.
- Money in exact AED minor units (fils). A browser redirect never proves payment — only a verified, idempotent webhook does. Payment status is separate from order status.
- Catering starts at *Pending Review* and needs human approval. Deposit: none / fixed / percentage (0 < p ≤ 100) / full; never above the confirmed total; snapshotted on each payment request.
- `source` is set server-side and cannot be silently changed. **No default commission rate** (the PRD's 7 % is only an example).
- Arabic RTL and English LTR are first-class from day one; WCAG 2.1 AA on essential flows.
- **Owner approval required** before: deploying, applying migrations to any shared/production database, enabling live payments, changing permissions or architecture, or handling real customer data.

## 3. Decisions taken to unblock development (reversible; flag if you disagree)

| Open question | Working decision |
|---|---|
| Payment provider (TBD) | Provider-agnostic `PaymentProvider` interface + a **mock/sandbox adapter** for development and tests. Real gateway plugs in later without schema changes. |
| Commission rate/basis (TBD) | Stored as configuration with **no default**; basis selectable (gross / collected / net of refunds). Records are not created until a rate is configured. |
| Customer accounts | Guest checkout and guest catering enquiries (no account needed), per PRD §9. |
| URL & language | `/{lang}/…` with `ar` and `en`; locale detected from the browser, falling back to Arabic. |
| Server logic location | Next.js server actions / route handlers (incl. payment webhook) with a server-only Supabase service client; Supabase Edge Functions not needed for v1. |
| Order vs catering | Separate `orders` and `catering_requests` entities; payments, payment requests and commissions reference exactly one of them. |
| Order status vs payment status | Two separate columns and enums. Payment-flavoured order statuses from the PRD list are expressed through `payment_status`. |
| VAT | Not mentioned in the PRD — **open question for the owner**; amounts are stored so VAT can be added later. |

## 4. Phased build plan

### Phase 1 — Foundations (in progress, three parallel workstreams)

| Workstream | Branch | Scope |
|---|---|---|
| **A. Database & security** | `feat/db-migrations-rls` | Replace `schema.sql` with versioned migrations covering the full PRD data model, CHECK constraints and enums, `updated_at`/status-history/immutable-source triggers, audit log, `is_admin()`-based least-privilege RLS, payment idempotency, seed data, and automated RLS/constraint tests. |
| **B. App platform & domain logic** | `feat/platform-domain` | Vitest test stack, GitHub Actions CI (lint, typecheck, test, build), Node version pin, validated env config, server-only and browser Supabase clients, and fully tested domain modules: money (fils), deposits, order/catering/payment state machines, commission calculation, cart totals. |
| **C. Bilingual storefront** | `feat/i18n-storefront` | `/[lang]` routing (ar RTL / en LTR) with `proxy.ts` detection, dictionaries, language switcher, mobile navigation, accessibility fixes, working tel/WhatsApp/Maps links, separate menu / catering / contact pages, SEO (metadata, hreflang, sitemap, robots, Restaurant JSON-LD), `/admin` removed from public nav and set `noindex`. |

### Phase 2 — Core workflows
1. Admin authentication (Supabase Auth, server-verified admin role, protected `/admin`).
2. Catering request submission (server-validated, blocked dates, duplicate protection) → staff review → quote → deposit setup.
3. Database-backed catalog + admin menu/package/category management (images in Supabase Storage).
4. Cart and authoritative server-side order creation.

### Phase 3 — Money
5. Payment requests, hosted checkout via the provider interface, verified idempotent webhook, deposit/remaining balance tracking.
6. Refunds and cancellations; commission records and the commission report.

### Phase 4 — Launch readiness
7. Notifications (once the email provider is chosen), GA4 funnels, Google Business Profile/Search Console, performance budget, accessibility audit, Arabic content review, privacy policy, backups/restore drill, staging deployment — all requiring owner sign-off.

## 5. What we need from the owner

1. Payment gateway choice and sandbox credentials.
2. Commission rate, basis and refund/cancellation treatment.
3. Real business details: address, phone, WhatsApp number, opening hours, map location.
4. Approved bilingual menu, prices, photos and catering packages.
5. Delivery/pickup model, service area and catering lead time/capacity.
6. VAT handling, refund/cancellation policy, privacy/retention policy.
7. Supabase and Vercel projects for development/staging (and who owns production).
