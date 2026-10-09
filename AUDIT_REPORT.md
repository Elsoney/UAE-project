# Umodai Restaurant & Catering Website — Project Audit

**Audit performed:** 8 October 2026  
**Report exported:** 9 October 2026  
**Repository:** D:\umodai-restaurant  
**Scope:** Existing requirements, repository, implementation, security, dependencies, and available validation.

This document exports the audit previously presented in chat. It is not a fresh audit of changes made after 8 October 2026. All file paths are relative to the repository root so the report can be shared independently with ChatGPT.

The audit was read-only: no project files were created, deleted, or modified during the audit, and the final working tree was clean. This Markdown report was subsequently created at the user's request. No Supabase, payment, or production service was contacted. Production build artifacts were generated in a temporary copy outside the repository.

## 1. Executive summary

**The project is an early UI prototype, not a functioning restaurant ordering platform.** The storefront and mock admin dashboard build successfully, but neither connects to operational data.

The most urgent issue is the draft Supabase RLS configuration: it treats **every authenticated user as an administrator** across customer, order, payment, commission, and admin records.

| Check | Result |
|---|---|
| Installed dependencies | Consistent; npm ls passed |
| TypeScript | Passed |
| ESLint | Passed |
| Production build | Passed in an isolated temporary copy |
| Automated tests | None found |
| Dependency advisory scan | Five high-severity package entries from one underlying advisory |
| Complete P0/P1 features | **0 of 21 verified complete** |

This audit establishes repository-level findings. Actual deployed database policies, hosting settings, backups, and external accounts remain unverified.

## 2. Current project architecture

### Intended architecture

PRD.md and specs/001-umodai-restaurant/plan.md describe an appropriate architecture for a single-restaurant platform:

- One Next.js application for storefront and administration.
- Supabase PostgreSQL as the authoritative operational database.
- Supabase Auth, Storage, and Edge Functions.
- Provider-managed payments with verified server callbacks.
- Vercel hosting.
- Arabic/English customer journeys.
- Auditable orders, payments, deposits, refunds, attribution, and commissions.

### Actual architecture

- Next.js storefront reads hardcoded menu/package arrays.
- Next.js /admin renders hardcoded metrics and example orders.
- A Supabase client is defined but unused by application pages.
- A draft SQL schema exists; deployment was not verified.

Installed versions include Next.js **16.4.0**, React **19.3.0**, TypeScript **5.9.3**, Tailwind **4.3.3**, and Supabase JS **2.117.3**.

All existing page components are server components. Only / and /admin are implemented application routes. Menu, catering, and contact are homepage sections.

**Current development phase:** Incomplete shared foundation, with storefront and admin presentation prototypes created ahead of backend functionality.

### Requirements and roadmap inconsistencies

| Issue | Evidence and consequence |
|---|---|
| Runtime guidance is outdated | The plan allows Node 18. Installed Next.js requires Node >=20.9; Supabase JS requires Node >=22. Local Node 24.18 satisfies both. |
| Admin catalog management becomes optional | tasks.md T028 says “if required,” although the PRD requires administrative menu/package management and item activation. |
| Scheduling differs | PRD places payments in Week 3 and early admin work in Weeks 1–2. The plan puts payment integration in customer Phase 2 and admin login in Phase 3. Dependencies need explicit reconciliation. |
| Incomplete feature traceability | Tasks do not explicitly cover several P1 requirements, including promo codes, blocked dates, and customer history. PRD feature IDs are not mapped onto tasks. |
| Constitution check is incomplete | The plan's brief “no conflicts” check does not address the detailed migration, authorization, financial testing, bilingual, recovery, and observability requirements in the current constitution. |
| Document paths differ | PRD identifies docs/PRD.md; the authoritative file is at the repository root. Planned application paths use frontend/app; actual code uses frontend/src/app. |
| Progress tracking is stale | All 33 tasks remain unchecked, although some scaffolding exists. Existing files do not establish task completion. |

No fundamental disagreement was found about the stack, hosted payments, manual catering review, or single-restaurant scope.

## 3. Files and folders already created

| Location | Existing contents |
|---|---|
| Repository root | PRD, README, environment example, Git ignore rules |
| frontend/src/app/ | Homepage, root layout, global styles, favicon, admin page |
| frontend/src/components/ | Menu card, catering card, section heading |
| frontend/src/data/ | Hardcoded menu, packages, and marketing statistics |
| frontend/src/lib/ | One Supabase client helper |
| frontend/public/ | Five default Next.js SVG assets |
| frontend/ | Package manifest/lockfile, TypeScript, ESLint, Next.js configuration, starter README, agent instructions |
| supabase/ | One schema.sql file |
| specs/001-umodai-restaurant/ | Specification, plan, and tasks |
| .specify/ | Constitution, templates, PowerShell tooling, integration metadata, workflow configuration |
| .agents/skills/ | Spec Kit workflow instructions |
| .vscode/ | Explorer visibility settings |
| .venv/ | Local Specify CLI environment described by README |

Existing ignored local artifacts include node_modules, .next, and generated next-env.d.ts.

**Not present:** API routes, server actions, authentication routes, route protection, checkout routes, Supabase migrations/functions/storage policies, automated tests, CI configuration, or planned data model/API contract documents.

Tooling under .specify/ and .agents/ supports development; it does not implement product functionality.

## 4. Existing implemented features

The following implementation is real and supported by the successful build:

- English marketing homepage with responsive layout classes.
- Four static menu cards and three static catering package cards.
- Homepage anchor navigation and a link to /admin.
- Reusable presentation components.
- English title and description mentioning Ajman.
- Static admin metrics and example order rows.
- Strict TypeScript and ESLint configuration.
- Conditional Supabase client helper.
- Draft SQL defining eight tables, indexes, and RLS policies.

Important limits:

- “Order now” scrolls to the menu; it does not start an order.
- Menu cards cannot be selected or added to a cart.
- “Send enquiry” is a type="button" without a handler.
- “New order” has no handler.
- Dashboard figures and customer names are hardcoded examples.
- No application file imports the Supabase helper.
- No payment, deposit, refund, balance, or commission calculation exists.

There are **no working end-to-end commercial workflows**.

## 5. PRD compliance matrix

**COMPLETE:** Implemented and verified against acceptance criteria.  
**PARTIAL:** Some scaffolding or presentation exists; this does not imply a usable workflow.  
**NOT STARTED:** No feature implementation found.  
**BLOCKED:** Unresolved external or commercial requirement; missing implementation is stated separately.

### P0 — Must have

| Feature ID | Status | Current evidence and paths | Missing work |
|---|---|---|---|
| P0-F001 Bilingual website | **PARTIAL** | English responsive shell; frontend/src/app/layout.tsx, page.tsx, globals.css | Arabic content, locale switching/persistence, RTL, fallback behavior, bilingual QA |
| P0-F002 Menu & catering catalog | **PARTIAL** | Static AED prices and guest ranges; frontend/src/data/site.ts, frontend/src/components/menu-card.tsx, catering-card.tsx; draft SQL tables | Database-backed content, details, categories, images, availability enforcement, admin editing |
| P0-F003 Catering requests | **PARTIAL** | Inert consultation form in frontend/src/app/page.tsx; catering_requests in supabase/schema.sql | Required event fields, validation, submission, persistence, request reference, review/edit workflow |
| P0-F004 Regular ordering | **PARTIAL** | orders and order_items in supabase/schema.sql | Item selection, cart, checkout, customer capture, authoritative pricing, order creation, confirmation |
| P0-F005 Admin order management | **PARTIAL** | Mock table in frontend/src/app/admin/page.tsx | Login, role checks, actual records, details, filters, updates, status history, financial permissions |
| P0-F006 Online payments | **BLOCKED** | Draft payments table; provider remains TBD in PRD.md | Provider onboarding plus checkout creation, authenticated callbacks, idempotency, recovery, sandbox verification |
| P0-F007 Admin-controlled deposit | **PARTIAL** | deposit_amount column in supabase/schema.sql | No-deposit/fixed/percentage/full choices, validation, approval snapshots, payment requests, revisions |
| P0-F008 Payment & balance tracking | **PARTIAL** | Payment amount/status columns in supabase/schema.sql | Separate order payment state, requested/paid/refunded balances, immutable transactions, reconciliation |
| P0-F009 Website attribution | **PARTIAL** | source default 'website' on orders and catering requests in supabase/schema.sql | Trusted creation, preservation, audited corrections, reporting integration |
| P0-F010 Commission tracking | **BLOCKED** | commission_records draft table; commercial basis/rate TBD in PRD.md | Approved rules, configurable/versioned rates, eligibility, calculation, refund treatment, reconciliation |
| P0-F011 Maps & local presence | **PARTIAL** | Generic “Ajman, UAE” section in frontend/src/app/page.tsx | Verified address/hours, directions/map, accurate contacts, Business Profile setup/linkage |
| P0-F012 Local SEO | **PARTIAL** | English metadata in frontend/src/app/layout.tsx | Localized commercial URLs/metadata, canonical/alternate links, sitemap, robots, structured data, Search Console |
| P0-F013 WhatsApp & call | **NOT STARTED** | Placeholder phone text in frontend/src/app/page.tsx; no contact actions | Approved number, tel: and WhatsApp links, mobile verification, practical attribution |

### P1 — Should have

| Feature ID | Status | Current evidence and paths | Missing work |
|---|---|---|---|
| P1-F001 Order confirmation | **NOT STARTED** | No confirmation routes or notification code under frontend/src/ | Request/order references, accurate submission versus booking state, payment confirmation, notifications |
| P1-F002 Promo codes | **NOT STARTED** | No promo schema or application logic | Eligibility, expiry, usage limits, authoritative discounts |
| P1-F003 Catering availability | **NOT STARTED** | No blocked-date table or availability workflow in supabase/schema.sql | Staff date management, future-date/coverage checks, conflict handling |
| P1-F004 Operations dashboard | **PARTIAL** | Mock metrics in frontend/src/app/admin/page.tsx | Authorized live aggregates, dates, accurate payment and sales definitions |
| P1-F005 Commission report | **NOT STARTED** | One hardcoded metric in frontend/src/app/admin/page.tsx; no report | Order-level basis, collections, refunds, eligibility, commission totals |
| P1-F006 Customer history | **NOT STARTED** | No customer account linkage or history routes | Ownership model, authenticated history, privacy enforcement |
| P1-F007 Search & filters | **NOT STARTED** | Unfiltered arrays in frontend/src/data/site.ts | Search, categories, package filters, empty states |
| P1-F008 Cancellation & refunds | **NOT STARTED** | Generic SQL status fields; no refund entity or behavior | Approved transitions, provider refund handling, adjustments, customer communication, audit trail |

### P2/P3 — Deferred scope

| Feature ID | Status | Evidence / missing implementation |
|---|---|---|
| P2-F001 Saved customer details | **NOT STARTED** | No account-linked reusable customer profile |
| P2-F002 Reorder | **NOT STARTED** | No history, reorder flow, or availability/price revalidation |
| P2-F003 Bulk admin actions | **NOT STARTED** | No selection or bulk mutation controls in admin page |
| P2-F004 Advanced analytics | **NOT STARTED** | No analytics integration or conversion reporting |
| P2-F005 Automated deposit rules | **NOT STARTED** | No rule engine; explicitly deferred beyond v1 |
| P3-F001 Native mobile app | **NOT STARTED** | Intentionally excluded from v1 |
| P3-F002 Driver tracking | **NOT STARTED** | Intentionally excluded from v1 |
| P3-F003 Loyalty program | **NOT STARTED** | Intentionally excluded from v1 |
| P3-F004 Marketplace integrations | **NOT STARTED** | Intentionally excluded from v1 |
| P3-F005 AI chatbot | **NOT STARTED** | Intentionally excluded from v1 |
| P3-F006 ERP/CRM integration | **NOT STARTED** | Intentionally excluded from v1 |

Absent implementations were checked against frontend/src/, supabase/, the dependency manifest, and repository inventory. Deferred P2/P3 features are not counted as launch deficiencies.

## 6. Security vulnerabilities and technical issues

### Critical

**C1 — Authenticated users receive unrestricted operational access.**

Policies in supabase/schema.sql, starting at line 123, use:

    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated')

These FOR ALL policies cover orders, order items, catering requests, payments, commissions, and admin users. They never check administrative membership, role, activation, or record ownership.

If deployed with corresponding table grants, any authenticated user could read customer details, alter financial records, delete records, and modify admin membership. admin_users is itself writable under the same condition.

Supabase's authenticated role means signed-in access, not administrator authorization; grants and policies must both enforce intended permissions. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Deployment and actual exploitability were not tested against a live database.**

### High

| Finding | Evidence and impact |
|---|---|
| **H1 — Admin route has no protection** | frontend/src/app/admin/page.tsx is statically generated without authentication. Current content is mock data, so a real customer-data leak was not demonstrated. Connecting live data requires server authorization first. |
| **H2 — Financial constraints are missing** | supabase/schema.sql permits negative prices/amounts, nonpositive quantities, invalid rates, and deposits exceeding totals. Stored line totals and order totals have no enforced consistency. |
| **H3 — Payment idempotency and linkage are absent** | provider_reference is nullable and nonunique. Payments can reference both an order and catering request, or neither. No payment request, expiration, verified-event, or refund model exists. |
| **H4 — Audit and attribution integrity are absent** | Source fields remain editable; no status history or financial audit records exist. Deleting orders cascades item deletion and clears financial references through ON DELETE SET NULL. |
| **H5 — Schema cannot represent required workflows** | Orders lack separate payment status. Catering lacks event time, location, package linkage, and review details. Refunds, payment requests, blocked dates, and customer/auth linkage are absent. |
| **H6 — No behavioral verification exists** | No tests cover RLS, money, deposits, refunds, state transitions, duplicate callbacks, or critical journeys, despite constitution requirements. |
| **H7 — Vulnerable development dependency chain** | Lockfile contains braces@3.0.3 through micromatch -> fast-glob -> @next/eslint-plugin-next -> eslint-config-next. npm reports five high-severity entries from one stack-exhaustion advisory. This is development tooling; public runtime exploitability was not established. |

Dependency advisory: [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

No payment or commission formulas exist to verify. The issue is missing logic and enforcement, rather than a demonstrated arithmetic bug.

### Medium

| Finding | Evidence and impact |
|---|---|
| **M1 — SQL deployment is not reproducible** | Only schema.sql exists. Re-running unconditional CREATE POLICY statements would encounter existing policies; CREATE TABLE IF NOT EXISTS does not migrate existing structures. |
| **M2 — Authorization model is incomplete** | admin_users.id is not linked to auth.users; role values are unrestricted. Catalog tables only have active-row read policies, so ordinary authenticated admins cannot manage them through these policies. Guest submissions also have no authorized write path. |
| **M3 — Frontend/backend contracts differ** | Frontend prices and guest ranges are display strings; SQL uses decimals and different field names. Frontend records lack stable IDs, availability, and bilingual fields. No generated database types exist. |
| **M4 — Arabic architecture is absent** | Root layout hardcodes lang="en" and dir="ltr". Content, metadata, fields, and CSS have no locale mechanism or direction-aware implementation. |
| **M5 — Accessibility and contrast defects** | Form fields use placeholders without labels; focus outlines are suppressed. The shared heading sets dark text inside the dark catering section, including identical heading/background color classes. Mobile navigation disappears without replacement. |
| **M6 — Environment setup is incomplete** | .env.example is at repository root, while Next.js runs from frontend/. Documentation does not explain placement. No local frontend environment file was found. Missing Supabase configuration is invisible while the client remains unused. |
| **M7 — Deployment and operations are unverified** | No CI, monitoring, reconciliation process, backup/restore guide, production runtime pin, or deployment runbook exists. updated_at values have defaults but no update mechanism. |

Public submission validation, abuse protection, loading/error states, and server-side financial validation are unimplemented. No existing submission endpoint was found to test for exploitation.

### Low

- Default SVG assets appear unused.
- Geist fonts are downloaded, but body explicitly uses Arial/Helvetica; review unnecessary font payload.
- Starter documentation references app/page.tsx instead of actual src/app/page.tsx.
- Public “Bilingual” and “Online” statistics imply capabilities the site does not provide.
- No significant duplicated business logic was found.

**Positive security evidence:** RLS is enabled on all eight draft tables; environment files are ignored; committed environment example contains placeholders; no raw-card storage or actual service-role key was found in inspected application files.

## 7. Build and test results

| Validation | Actual result | Limits |
|---|---|---|
| Runtime | Node **24.18.0**, npm **11.16.0** | Compatible with inspected dependency engine requirements |
| npm ls --depth=0 | **Passed, exit 0** | No missing/invalid direct packages reported |
| tsc --noEmit --incremental false | **Passed, exit 0** | Avoided emitted files and incremental cache writes |
| npm run lint -- --no-cache | **Passed, exit 0** | No warnings/errors reported |
| Automated tests | **Unavailable** | No test script, suites, or installed test framework |
| npm run build | **Passed, exit 0** | Executed from temporary copy with existing installed dependencies |
| Generated pages | /, /admin, framework not-found route | Storefront and admin content confirmed in generated HTML |
| npm advisory scan | **Completed, exit 1: five high entries** | Initial certificate failure resolved using process-local system CA trust |
| Database/RLS integration tests | **Not run** | No isolated configured database/test suite |
| Browser, accessibility, RTL, performance QA | **Not run** | Source findings do not substitute for browser or field measurements |
| Final Git verification during audit | **Clean** | No tracked changes or new project files at audit completion |

Successful build validates compilation and prerendering. It does **not** validate ordering, authentication, payment handling, or database deployment.

Installed Next.js documentation confirms cacheComponents and partialPrefetching are valid together. No configuration error or broken import was observed.

### Dependency scan details

Command: npm audit --package-lock-only --ignore-scripts --json.

Initial attempt failed with “unable to verify the first certificate.” A subsequent attempt succeeded using NODE_USE_SYSTEM_CA=1 for that process only. TLS verification was not disabled, packages were not installed or changed, and npm configuration was not modified.

Reported affected package entries:

- braces@3.0.3
- micromatch@4.0.8
- fast-glob@3.3.1
- @next/eslint-plugin-next@16.4.0
- eslint-config-next@16.4.0

These five entries propagate from one underlying advisory, rather than representing five independent vulnerabilities. Advisory status is time-sensitive and should be rechecked before remediation or release.

## 8. Missing dependencies and external requirements

### Engineering capabilities

- Cookie/session-aware server authentication and trusted authorization.
- Generated database types and shared request/response contracts.
- Runtime input validation and exact money rules.
- Migration and isolated database testing setup.
- Unit/integration/end-to-end test tooling.
- Payment and notification integrations.
- Media storage policies and approved imagery.
- CI checks, monitoring, and operational documentation.

These capabilities do not all require additional packages. Map links can work without a Maps SDK, and payment integration choices depend on the selected provider.

### Business and external inputs

| Requirement | Needed decision or configuration |
|---|---|
| Payment gateway | Provider, account approval, sandbox credentials, supported methods, webhook contract |
| Commission | Rate, basis, rounding, eligibility timing, refund/cancellation treatment, rule ownership |
| Restaurant content | Approved bilingual menu, prices, packages, photographs, branding |
| Fulfillment | Delivery/service coverage, charges, hours, catering capacity and event-time semantics |
| Contact/discovery | Correct address, phone, WhatsApp, Business Profile access/verification |
| Infrastructure | Domain, staging/production Supabase and Vercel environments, deployment ownership |
| Notifications | Provider and confirmation/retry policy |
| Policies | Cancellation/refund, privacy, retention, relevant cookie notice |
| Operations | Backup retention, restore procedure, alerts, reconciliation and incident owners |
| Analytics/SEO | Search Console and GA4 configuration |

External setup was not inferred from placeholder documentation. Google Business verification should be tracked separately from technical launch readiness.

## 9. Estimated project completion status

**Estimate: approximately 5–15% of the complete v1 platform, with around 10% as a planning midpoint.**

This is an engineering judgment based on remaining effort, not a measured project metric.

The UI shell and draft schema represent useful groundwork, but nearly all integrations, authorization, commerce, financial integrity, localization, and release validation remain.

A more objective indicator is **0 of 21 P0/P1 features verified complete**. The project has not yet met the PRD foundation exit criterion: a staging application connected to Supabase with protected administrative access.

## 10. Recommended next development phase and prioritized tasks

**Finish the secure shared foundation, then deliver one real catering workflow before expanding regular ordering and payments.** Begin gateway onboarding and commission decisions immediately alongside engineering work.

The following ten tasks are in priority order. Paths marked **new** are recommendations, not files created during the audit.

### Task 1 — Reconcile requirements, contracts, and business decisions

- **Priority:** P0.
- **Related PRD features:** P0-F003–F010; all-feature traceability.
- **Files:** specs/001-umodai-restaurant/spec.md, plan.md, tasks.md; **new** data-model.md, contracts/.
- **Dependencies:** Named owners for gateway, commission, coverage, pricing, and refund decisions.
- **Acceptance criteria:** Every P0/P1 feature has explicit tasks and acceptance criteria; admin catalog management is mandatory; Node requirements are corrected; unresolved decisions have owners and release gates.
- **Verification:** Requirements-to-task review against PRD and constitution.

### Task 2 — Replace permissive RLS and establish administrator identity

- **Priority:** P0 — immediate security blocker.
- **Related PRD features:** P0-F005, P0-F008, P0-F010.
- **Files:** supabase/schema.sql; **new** migrations, authorization functions, supabase/tests/.
- **Dependencies:** Approved Customer/Admin/Operations Owner permission matrix.
- **Acceptance criteria:** Non-admin users cannot read or mutate operational records or grant roles; inactive admins are denied; catalog management has explicit permissions.
- **Verification:** Isolated database allow/deny tests for guest, customer, inactive admin, admin, and operations roles.

### Task 3 — Create versioned migrations and complete domain constraints

- **Priority:** P0.
- **Related PRD features:** P0-F002–F010, P1-F003, P1-F008.
- **Files:** **new** supabase/migrations/, database types; update SQL reference.
- **Dependencies:** Task 1 contracts; Task 2 authorization design.
- **Acceptance criteria:** Required entities and fields exist; amounts, quantities, rates, linkage, statuses, provider references, and audit preservation are enforced.
- **Verification:** Fresh migration application plus constraint, relationship, duplicate-reference, and deletion tests.

### Task 4 — Implement protected admin sessions and safe server boundaries

- **Priority:** P0.
- **Related PRD features:** P0-F005.
- **Files:** frontend/src/lib/supabase.ts, frontend/src/app/admin/; **new** auth routes/server utilities.
- **Dependencies:** Tasks 2–3; isolated Supabase environment.
- **Acceptance criteria:** Login/logout works; protected reads and mutations authorize on server; privileged keys remain server-only; missing configuration produces actionable errors.
- **Verification:** Session and authorization integration tests, including direct unauthorized requests.

### Task 5 — Establish bilingual routing and database-backed catalog

- **Priority:** P0.
- **Related PRD features:** P0-F001, P0-F002, P1-F007.
- **Files:** Layout, homepage, cards, static data; **new** locale routes/dictionaries/catalog queries.
- **Dependencies:** Catalog schema and approved bilingual content.
- **Acceptance criteria:** Locale persists; Arabic renders RTL; catalog uses stable IDs and actual availability; prices remain numeric internally; unavailable items cannot enter orders.
- **Verification:** Both-locale browser journeys, catalog integration tests, native Arabic review, keyboard/mobile checks.

### Task 6 — Deliver real catering submission and restaurant review

- **Priority:** P0.
- **Related PRD features:** P0-F003, P0-F005, P0-F009, P1-F001, P1-F003.
- **Files:** Homepage form, admin pages; **new** validated submission/review services and availability logic.
- **Dependencies:** Tasks 2–5; service-area and date/time rules.
- **Acceptance criteria:** Complete guest enquiries persist as Pending Review with unique reference and trusted website source; invalid dates/data are rejected; staff edits and transitions are audited.
- **Verification:** Guest submission-to-admin end-to-end test, invalid/blocked-date tests, retry and unauthorized-access tests.

### Task 7 — Implement authoritative cart and regular order creation

- **Priority:** P0.
- **Related PRD features:** P0-F004, P0-F009, P1-F001.
- **Files:** Menu cards; **new** cart, checkout, order service, confirmation route.
- **Dependencies:** Catalog, customer capture, money and fulfillment rules.
- **Acceptance criteria:** Server recalculates price/availability; orders and items commit atomically; retries avoid duplicates; operational and payment states remain separate.
- **Verification:** Price tampering, unavailable-item, rounding, rollback, retry, and checkout journey tests.

### Task 8 — Implement reviewed deposits and verified payment processing

- **Priority:** P0.
- **Related PRD features:** P0-F006–F008, P1-F008.
- **Files:** **new** payment services, Supabase functions, webhook/event handling, payment-request UI.
- **Dependencies:** Provider sandbox/onboarding, approved payment policy, Tasks 3–7.
- **Acceptance criteria:** All four payment choices work; quote revisions invalidate stale requests; verified amount/currency/reference controls payment state; refunds and balances reconcile.
- **Verification:** Gateway sandbox tests for duplicate/out-of-order events, mismatches, expiry, failure, quote changes, partial payment/refund, and invalid deposits.

### Task 9 — Implement commission calculation and operational reporting

- **Priority:** P0 for tracking; P1 for report enhancements.
- **Related PRD features:** P0-F010, P1-F004, P1-F005.
- **Files:** Commission migrations, **new** calculation/report modules, admin dashboard.
- **Dependencies:** Approved commission agreement, authoritative attribution and payment records.
- **Acceptance criteria:** Versioned rules produce auditable results; deposits are not counted as extra revenue; refunds/cancellations adjust eligibility; reports reconcile to underlying records.
- **Verification:** Financial rule tests and dataset reconciliation, including repeated events and historical rate changes.

### Task 10 — Complete discovery, accessibility, and release gates

- **Priority:** P0 before launch; explicitly prioritize remaining P1 scope.
- **Related PRD features:** P0-F011–F013, P1-F002, P1-F006–F008.
- **Files:** Contact and heading components, metadata, configuration, READMEs; **new** sitemap, robots, CI, policy and operations documentation.
- **Dependencies:** Verified business information, staging workflows, approved P1 deferrals.
- **Acceptance criteria:** Contact/map actions work; localized SEO exists; contrast/labels/focus issues are resolved; dependency advisory handling is documented; monitoring, restore, deployment, and rollback procedures are verified.
- **Verification:** CI checks, bilingual mobile/browser QA, accessibility/performance review, sandbox financial journeys, restore exercise, and owner launch approval.

For the dependency advisory, review compatible upstream remediation rather than applying npm's suggested downgrade automatically: its proposed eslint-config-next@14.2.35 would diverge from the installed Next.js 16 stack.
