# Umodai — Build Plan, Status and Timeline

**Updated:** 2026-10-09 (end of day) · **Target:** production-ready v1 within 5 weeks of the October 2026 start (PRD §3)
**Binding inputs:** `PRD.md` (PRD-001 v1.0), `specs/001-umodai-restaurant/*`, `.specify/memory/constitution.md`, the handover docs, `AUDIT_REPORT.md` and the owner's instructions of 2026-10-09 (§1–§10).

## 1. Where we are

The pull requests are stacked, so merge them in order:

| PR | What it delivers | Tests |
|---|---|---|
| #1 ✅ merged | Builds no longer depend on Google Fonts | — |
| #2 | Secure database: versioned migrations, full data model, least-privilege RLS, audit trail | DB |
| #3 | Business rules (money, deposits, statuses, commission, guest checkout and catering validation), payment webhook logic, confirmation email templates (ar/en), CI | Unit |
| #4 | Arabic-first bilingual website: home, menu, catering, visit us, privacy; local SEO; accessibility | Unit |
| #5 | Catering requests saved online (atomic, server-only) plus end-to-end tests | DB + E2E |
| #6 | Fixes from the independent security review: 1 High, 4 Medium, 3 Low | DB + Unit |

**Checks on every PR:**
- Database: 139 tests.
- Unit: 219 tests, with 100% coverage of business rules.
- End-to-end: 40 checks, on desktop and mobile.
- Lint, typecheck and build.

## 2. P0 requirements — status

✅ = implemented and tested · 🟡 = partly done · ⬜ = not started · 🔒 = blocked on an owner decision or account

| PRD | Requirement | Status |
|---|---|---|
| P0-F001 | Bilingual site, native RTL, language switch | ✅ (Arabic copy needs native review) |
| P0-F002 | Menu and catering catalog | 🟡 Public pages use placeholder data identical to the DB seed; reading from the DB and admin catalog management are next |
| P0-F003 | Structured catering request, validation, *Pending Review* | ✅ Saved online with reference and queued email |
| P0-F004 | Cart and guest checkout for regular orders | 🟡 Server rules, DB function and tests are done; cart/checkout screens are not built |
| P0-F005 | Admin order and status management | 🟡 DB rules and permissions are done; staff sign-in and dashboard are next |
| P0-F006 | Online payment (UAE gateway), verified webhooks | 🟡🔒 Provider-agnostic design, mock provider and tested webhook logic are done; **real gateway not chosen** |
| P0-F007 | Admin-chosen deposit (none / fixed / % / full) | 🟡 Rules and DB constraints are done; admin screen and payment links are next |
| P0-F008 | Payment, deposit, remaining-balance and refund tracking | 🟡 Data model and rules are done; admin views are next |
| P0-F009 | Website attribution, immutable source | ✅ |
| P0-F010 | Configurable commission and records | 🟡🔒 Calculation, versioning and permissions are done; **rate/basis not decided**; report screen is next |
| P0-F011 | Google Maps, directions, Google Business Profile | 🟡🔒 Maps and directions links are done; **GBP account and real address needed** |
| P0-F012 | Local SEO | ✅ Technical SEO done · 🔒 Search Console account needed |
| P0-F013 | WhatsApp and phone CTAs | ✅ (placeholder numbers) |
| Owner §3 | Confirmation emails | 🟡🔒 Templates and queue are done; **email provider not chosen** |
| Owner §2 | Security | ✅ Reviewed independently; CAPTCHA and per-IP limit recommended before launch |

## 3. Remaining build work, in order

1. **Staff sign-in and admin dashboard.** Supabase Auth, staff roles, and a list and detail view for catering requests (review, quote, choose the deposit, change status) and orders.
2. **Payment links for catering.** Create a payment request from the deposit choice, a hosted checkout (mock until the gateway is chosen), the webhook route and the payment-status updates.
3. **Cart and guest checkout screens.** Regular orders, with online payment through the same flow.
4. **Catalog from the database, plus admin menu management** (images in Supabase Storage).
5. **Commission records and report** for the operations owner.
6. **Email delivery worker** for the chosen provider, and marketing double opt-in confirmation.
7. **Launch readiness:**
   - Staging deployment.
   - Backups and a restore drill.
   - Monitoring.
   - CAPTCHA and per-IP limits.
   - Performance and accessibility audit.
   - GA4.
   - Search Console and Google Business Profile.

Steps 1–5 are pure engineering. My estimate is about 2 to 2.5 weeks, building in the same tested, reviewed way.

## 4. Timeline assessment (for approval — the deadline has not been changed)

**The engineering can fit in the remaining weeks. The main risks are outside the code:**

| Risk | Why it matters | What would de-risk it |
|---|---|---|
| **Payment gateway** (highest) | UAE merchant onboarding (KYC, trade licence, bank account) often takes 2–4 weeks before sandbox and live keys | Choose the gateway **this week** and start onboarding now; we keep building against the mock |
| Email provider | Needed for confirmations | Pick one (e.g. Resend, Postmark, Amazon SES); setup takes about 1 day plus domain DNS records |
| Commission terms | Needed before any commission record is created | Decide rate, basis (gross / collected / net of refunds) and refund/cancellation treatment |
| Real content | Menu, prices, photos, address, hours, phone numbers | Send these to the team; Arabic copy needs a native reviewer |
| Google Business Profile | Verification can take days to weeks (PRD R002) | Start verification now; it must not block launch |
| Legal and privacy | UAE data-protection review of the privacy notice | Engage a reviewer before launch |
| Supabase and Vercel projects | Needed for staging | Create projects under the business's ownership; turn off public sign-ups |

**Options if the gateway is late (for your decision):**
- **A.** Launch on time with online catering requests, admin, menu and SEO. Online payment and checkout go live as soon as the gateway is approved. Deposits are collected offline in the meantime and recorded by staff.
- **B.** Keep payments in the launch scope and move the launch date to gateway approval.

I recommend deciding between these once the gateway onboarding timeline is known.

## 5. Working decisions taken (reversible)

**Approved by you (2026-10-09):**
- Guest checkout.
- Arabic as the default language.
- A mock payment provider during development.

**Pending your approval:**
- Catering lead time of 48 hours.
- Delivery fee of 0 until a policy is set.
- Cancelled orders earn no commission (as the PRD says).
- Double opt-in for marketing emails.
- A strict order-status flow.
- Restaurant admins cannot see commission figures.
- The operations owner has read-only access to operations.
- VAT handling (not in the PRD).
