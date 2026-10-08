<!--
Sync Impact Report
- Version change: unratified scaffold -> 1.0.0 (initial project constitution).
- Modified principles: replaced all five unnamed scaffold principles with:
  I. Deliver the Approved v1 Scope
  II. Code Quality and Maintainability
  III. Tests Protect Commercial and Security Invariants
  IV. Security and Customer Privacy
  V. Supabase Data Integrity and Least Privilege
  VI. Verified and Recoverable Payments
  VII. Human-Controlled Catering and Accurate Deposits
  VIII. Auditable Attribution and Commission Tracking
  IX. Arabic and English as Equal Customer Experiences
  X. Measured Performance and Operational Reliability
- Added sections: Architecture and Product Constraints; Delivery Workflow and Release Gates.
- Removed sections: none; generic scaffold slots replaced with project-specific content.
- Template review: plan's Constitution Check supports these gates at runtime.
  Generic tasks-template test optionality does not override mandatory tests in this constitution.
  Template and command source files are unchanged, as required by the constitution skill.
- Follow-up: docs/PRD.md is referenced by the PRD but is absent; use root PRD.md until
  its canonical location is reconciled in a separate documentation change.
- Business decisions before relevant release gates: payment provider and onboarding,
  commission rate/basis/refund and cancellation treatment, privacy retention policy,
  service coverage, approved menu/pricing, and named operational owners.
  These are unresolved PRD decisions, not constitution placeholders.
- Remove this temporary report before committing the ratified constitution.
-->

# Umodai Restaurant and Catering Constitution

## Core Principles

### I. Deliver the Approved v1 Scope

Every feature MUST trace to an approved requirement in PRD-001 v1.0 and carry observable
acceptance criteria. P0 requirements take priority within the maximum five-week delivery
window; P1 work MUST be explicitly prioritized against remaining capacity. P2, P3, and
out-of-scope work MUST remain deferred unless the product owners approve a documented
scope change with its schedule impact. Delivery pressure MUST NOT waive financial,
security, or critical customer-flow release gates. External Google Business Profile
verification delays MUST be tracked separately and MUST NOT alone block website launch.

### II. Code Quality and Maintainability

Application code MUST use strict TypeScript, explicit contracts at system boundaries,
and shared validation and money-calculation rules. Business rules MUST be separated
from presentation and provider-specific code, with small modules that have clear
responsibilities. Changes MUST pass formatting, linting, type checking, and a production
build. New dependencies or abstractions MUST solve a stated requirement and have a
recorded maintenance justification; speculative frameworks are excluded from v1.
Configuration, environment variables, API contracts, and operational procedures MUST
be documented sufficiently for another maintainer to run and support the application.

### III. Tests Protect Commercial and Security Invariants

Changes to pricing, payments, deposits, refunds, commission, authorization, or state
transitions MUST include automated behavioral tests; defect fixes in these areas MUST
include a regression case. Use unit tests for deterministic rules, integration tests
for database constraints/RLS and provider boundaries, and end-to-end tests for critical
customer and admin journeys. Release evidence MUST cover regular ordering and reviewed
catering through payment, confirmation, and commission linkage in both locales.

Required cases MUST include rounding, invalid deposits, price changes after deposit,
partial payments/refunds, cancellation treatment, duplicate and out-of-order webhooks,
failed or interrupted checkout, submission retries, unavailable items, invalid/blocked
event dates, and unauthorized access. Tests MUST prove outcomes and invariants rather
than mirror implementation details. Lower-risk presentation changes MAY use focused
manual verification; this exception MUST NOT exempt critical financial or security paths.

### IV. Security and Customer Privacy

All external communication MUST use HTTPS/TLS. Privileged operations MUST authenticate
and authorize on the server; hiding UI controls is insufficient. Customer data MUST be
accessible only to authorized identities or narrowly scoped, expiring guest-access
capabilities. Public enquiry submission MUST NOT require account creation solely for
administrative convenience and MUST NOT expose submitted customer records publicly.

Secrets and Supabase privileged keys MUST remain server-side and outside source control,
browser bundles, and logs. Inputs MUST be validated on the server and supported by client
feedback; sensitive/public write endpoints MUST have abuse protection. Audit records
MUST capture actor, time, entity, and relevant changes for sensitive admin actions.
Raw card data and CVV MUST NOT enter Umodai application storage or logs. Collect only
necessary personal data; privacy notices, retention rules, and a review of applicable
UAE privacy obligations MUST be completed before production release.

### V. Supabase Data Integrity and Least Privilege

Supabase PostgreSQL MUST be the authoritative operational store. Schema, indexes,
constraints, functions, and RLS/storage policies MUST be reproducible through versioned
migrations and tested against an isolated environment. Dashboard-only changes MUST NOT
be the sole record of production schema or policy changes. Database types MUST be
regenerated when schema changes affect application contracts.

All exposed tables containing customer, order, payment, commission, or admin data MUST
have RLS enabled with explicit least-privilege policies. Admin and Operations Owner
permissions MUST follow the PRD role matrix, enforced by trusted server-side role data;
users MUST NOT grant themselves roles. Any privileged RLS bypass MUST be narrowly scoped
and validate identity, authority, and input before writing. Storage policies MUST
separate public catalog assets from private records and restrict upload types/sizes.

Foreign keys, uniqueness, checks, and atomic transactions MUST enforce financial linkage
and state invariants even under concurrent requests. Related financial writes MUST
commit together or roll back. Queries MUST be bounded, paginated where appropriate,
and indexed from measured access patterns. Production and test data/secrets MUST be
isolated. Destructive migrations MUST have a documented recovery strategy.

### VI. Verified and Recoverable Payments

The server MUST calculate payable amounts from authoritative prices and approved order
values. Money MUST use integer minor units or exact database decimals, explicit AED
currency, and a documented rounding rule; binary floating-point MUST NOT determine
stored financial amounts. Checkout MUST use the selected external UAE-compatible
provider's secure payment flow. Browser redirects MUST NOT establish payment success.

Authenticated provider webhooks or equivalent server verification MUST validate provider
identity, linked request/order, amount, currency, and transaction reference before
applying payment. Mismatches MUST be recorded for reconciliation and MUST NOT silently
confirm an order. Checkout creation and webhook processing MUST be idempotent, with
persistent unique provider references and atomic updates. Duplicate, delayed, and
out-of-order events MUST NOT double-credit balances, duplicate commission, or regress
confirmed payment state.

Payment state MUST remain separate from fulfillment state. Failed/abandoned payments
MUST remain recoverable without creating duplicate orders. Payment requests MUST expire
or be invalidated when replaced or no longer valid. Transaction history MUST preserve
verified events; corrections/refunds MUST be traceable adjustments. A privileged manual
correction MUST require evidence and an audit trail and MUST NOT masquerade as provider
verification. Reconciliation MUST identify unmatched gateway transactions and stalled
local updates. No live payment release is permitted before gateway sandbox validation
and restaurant approval of payment/cancellation/refund policies.

### VII. Human-Controlled Catering and Accurate Deposits

Catering submissions MUST begin as Pending Review and MUST NOT imply a confirmed booking.
Restaurant staff MUST review availability, contact the customer, approve the final
price, and select the payment requirement for each booking. Supported choices MUST be
no deposit, a positive fixed AED deposit, a percentage greater than zero and at most
100 percent, or full payment. Automatic deposit selection and automatic catering
acceptance are outside v1.

A deposit MUST NOT exceed the approved total. Each payment request MUST snapshot its
approved amount, rule, and order/quote revision. Price or payment-rule changes MUST be
audited, recalculate the balance, and review/invalidate stale requests before collection.
Verified payments and refunds MUST determine net paid amount and remaining balance;
overpayment/refund anomalies MUST be visible rather than hidden by clamping values.
Concurrent checkout and quote changes MUST NOT permit collection against an invalid
quote. Confirmation MUST require restaurant approval plus the selected payment condition,
with an explicitly audited no-deposit path. Customers MUST see the requested amount,
deposit, remaining balance, and actual booking state distinctly.

### VIII. Auditable Attribution and Commission Tracking

The server MUST persist website source attribution at order/request creation and preserve
it through quotation, payment, fulfillment, cancellation, and refund transitions.
Attribution MUST NOT depend solely on analytics cookies or client-supplied source fields.
Any correction MUST preserve the prior value, actor, reason, and timestamp.

Each commission record MUST reference its originating order/request and the applicable
approved rate, calculation basis, rule version, eligible amount, and resulting amount.
Reports MUST expose confirmed value, collected value, refunds, eligibility, and commission
status separately. Rate/rule changes MUST NOT silently rewrite historical entitlements;
recalculations MUST be versioned or represented as auditable adjustments. Duplicate
payment events MUST NOT create duplicate commission entries. Reports MUST reconcile to
operational and payment records without treating deposits as extra order revenue.

The PRD's seven-percent illustration MUST NOT become a default commercial agreement.
The rate, gross/collected/net basis, rounding, recognition timing, and refund/cancellation
treatment MUST be approved by both commercial parties before live commission accrual
and launch. Until approved, records MUST explicitly show pending configuration rather
than fabricate payable commission. Automated commission payouts remain outside v1.

### IX. Arabic and English as Equal Customer Experiences

Arabic RTL and English LTR MUST be supported from the initial architecture, with locale
selection preserved across navigation and critical customer journeys. Core commercial
content, forms, validation, checkout summaries, confirmations, and payment-status
messages MUST exist in both languages. Layout MUST use direction-aware styles and render
mixed-direction phone numbers, identifiers, dates, and AED prices intelligibly.

Both locales MUST pass mobile/desktop QA, including long text, keyboard navigation,
focus behavior, labels, and error recovery. Essential flows MUST target WCAG 2.1 AA.
A fallback for missing noncritical translation MUST be explicit and MUST NOT conceal
missing critical payment or booking content. Commercial pages MUST provide localized
metadata, canonical/alternate-language links, indexable content, and consistent Ajman
business information. Arabic content and RTL behavior MUST receive competent language
review before launch.

### X. Measured Performance and Operational Reliability

Public pages MUST target LCP <=2.5 seconds for at least 75 percent of real visits,
CLS <=0.1, and INP <=200 ms where feasible. Typical first-party server/database operations
MUST target <=500 ms excluding gateway latency; plans MUST define representative data,
network conditions, and measurement methods. Prelaunch measurements MUST be recorded
for Arabic and English mobile journeys, and field monitoring MUST verify targets once
traffic is available. Missed targets MUST produce explicit remediation work and release
risk review rather than unsubstantiated performance claims.

Use responsive modern-format images, reserve layout space, defer noncritical media/maps/
analytics, and minimize client JavaScript. Cache public catalog content where useful;
private data MUST NOT leak through shared caches, and checkout MUST revalidate price
and availability. Designs MUST support ten times the initial traffic without fundamental
redesign; capacity tuning MUST follow measurements rather than speculative infrastructure.

Operational monitoring MUST cover order submission errors, webhook failures, database
errors, authentication anomalies, and reconciliation gaps using correlation identifiers
without unnecessary personal data. Targets are 99.9 percent availability under the PRD's
exclusions and critical workflow error rate below 0.1 percent after stabilization.
Database backups MUST run at least daily, with a 30-day retention target where configured/
available. Restore procedures MUST be documented and exercised before launch; operational
ownership, alert response, and deploy rollback MUST be explicit.

## Architecture and Product Constraints

- Use Next.js, strict TypeScript, and Tailwind CSS for the customer/admin application;
  Supabase PostgreSQL, Auth, Storage, and Edge Functions for backend capabilities;
  and Vercel for frontend hosting. A stack change requires a documented amendment.
- PRD-001 v1.0 is the product baseline. Its intended path is `docs/PRD.md`, but the
  currently available authoritative file is root `PRD.md`. Until the path is reconciled,
  references MUST use the existing file rather than assume a missing document exists.
- Launch coverage MUST trace all thirteen P0 features, including Maps/local presence,
  local SEO, and WhatsApp/call contact as well as commerce. P1 deferrals MUST be explicit;
  customer confirmation and safe handling of financial reversals remain mandatory
  integrity requirements even when related UI enhancements are deferred.
- Unresolved gateway, email provider, commission agreement, privacy retention, service
  area, content/pricing, and operational-owner decisions MUST have owners and due gates
  in feature planning. Technical plans MUST NOT silently choose commercial terms.
- Record event-date/time semantics for Ajman/UAE operations explicitly; browser timezone
  differences MUST NOT move event dates or admit past/blocked dates.
- Keep admin workflows simple and status-driven. Customer actions MUST provide validation,
  loading, error recovery, and a success reference without disclosing internal details.

## Delivery Workflow and Release Gates

1. Before implementation, each feature MUST have a specification with PRD traceability,
   measurable acceptance criteria, a plan, and dependency-ordered tasks. Plans MUST check
   this constitution before research and after design, record unresolved decisions,
   and identify the security/financial invariants touched by the change.
2. Tasks MUST explicitly include required tests and migration/policy validation. Generic
   template language describing tests as optional MUST NOT override Principle III.
   Existing specifications, plans, and tasks MUST be reviewed against this initial
   constitution before their implementation proceeds.
3. Every change MUST receive a compliance review proportionate to its risk, with passing
   automated quality gates and evidence for affected acceptance criteria. Financial,
   permission, and bilingual critical-flow failures MUST block the affected release.
4. Staging MUST prove customer order and catering flows, sandbox gateway verification,
   deposit/refund reconciliation, commission linkage under approved rules, and RLS denial
   cases. Production secrets and live customer data MUST NOT be used as test fixtures.
5. Before public launch, Umodai and the Website & Operations Owner MUST approve the
   production candidate. Evidence MUST include approved menu/pricing, catering workflow,
   payment policy, commission rules, locale/accessibility QA, performance findings,
   privacy/retention decisions, backups/recovery, and monitoring ownership. External
   Google verification delays MUST be recorded with a follow-up owner.
6. After launch, review operational and commercial metrics at one week, two weeks,
   30 days, and monthly thereafter, including payment/commission reconciliation.

## Governance

This constitution governs project engineering and integrity decisions; PRD-001 governs
product scope. Conflicts MUST be made explicit and resolved through documented changes
rather than by silently overriding either document. Security and financial invariants
MUST NOT be bypassed to meet a deadline.

Amendments MUST record the reason, changed principles, impact on existing artifacts/data,
and any migration or remediation work. Scope/commercial changes require the affected
product/commercial owners' approval; constitution amendments require approval by Umodai
and the Website & Operations Owner. The initial version is adopted through this project
constitution request; future amendments MUST preserve the original ratification date.

Use semantic versioning: MAJOR for incompatible removals or redefinitions, MINOR for new
principles or materially expanded obligations, and PATCH for nonsemantic clarifications.
Update the amendment date whenever content changes. Reviews MUST cite applicable
principles and record justified implementation tradeoffs; a tradeoff MUST NOT exempt
payment verification, financial integrity, authorization, or critical privacy rules.

Dependent Spec Kit commands MUST read this constitution at runtime and apply it to
specifications, plans, tasks, analysis, implementation, and convergence. This workflow
modifies only `.specify/memory/constitution.md`; template or application changes are
separate tasks. No unresolved constitution placeholders are retained.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
