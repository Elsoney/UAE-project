# Umodai database (Supabase)

Versioned migrations for the Umodai restaurant & catering platform. They replace
the old `schema.sql`, whose policies let **any signed-in user read and change
every customer, order and payment record and make themselves an admin**.

> ⚠️ **Owner approval required** before applying these migrations to any shared,
> staging or production Supabase project (constitution §V, owner instructions §2).
> Never apply them to a database that holds real customer data without that
> approval and a backup.

## Layout

| Path | Purpose |
|---|---|
| `migrations/` | Ordered SQL migrations (apply in filename order) |
| `seed.sql` | **Placeholder** bilingual catalog for development. No customers, no commission rate. |
| `tests/` | Automated tests that run every migration on a throw-away PostgreSQL 17 |
| `scripts/generate-types.ts` | Regenerates `frontend/src/types/database.ts` from the schema |

## Data model (summary)

- **Catalog** — `categories`, `menu_items`, `catering_packages` (Arabic + English fields, prices in AED fils).
- **Customers** — guest checkout, one record per email (case-insensitive). No login account is created; `auth_user_id` is reserved for a future verified login (email OTP / magic link). Marketing consent is separate from transactional email and has an append-only history (`consent_events`).
- **Orders** — `orders` + `order_items` with a contact snapshot, immutable website attribution (`source`), separate `order_status` and `payment_status`, and totals that must add up.
- **Catering** — `catering_requests` always start as `pending_review`; staff record the agreed price and a payment requirement (`none` / `fixed` / `percentage` / `full`). Past and blocked dates are rejected.
- **Payments** — `payment_requests` (deposit snapshot, one open request at a time, superseded on price changes), `payments` (unique per provider transaction), `payment_events` (webhook dedup), `refunds` (never exceed the payment). Mock payments are flagged `is_test`.
- **Commission** — `commission_settings` (no default; each row records the owner's approval) and versioned, immutable `commissions`.
- **Trail** — `status_history` and `audit_log` (append-only), `email_outbox` for confirmation emails.

All money is stored as integer **fils** (1 AED = 100 fils).

## Who can do what

| Data | Visitor (anon) | Signed-in non-staff | Restaurant admin | Operations owner | Server (service role) |
|---|---|---|---|---|---|
| Active menu, categories, packages | read | read | read + manage | read | full |
| Blocked dates | dates only (`get_blocked_dates`) | dates only | manage | read | full |
| Customers | — | — | read; fix name/phone/language | read | full |
| Orders / order items | — | — | read; change operational status & notes | read | full |
| Catering requests | — | — | read; review, quote, choose deposit, status | read | full |
| Payment requests, payments, refunds, webhook events | — | — | read | read | full |
| Commission settings | — | — | — | read + add (own name) | full |
| Commission records | — | — | — | read | full |
| Audit log | — | — | — | read | insert (via triggers) |
| Staff list (`admin_users`) | — | — | own row | read all | **only writer** |

Nobody can grant themselves a role; staff accounts are added by the server
(service role) only. Knowing a customer's email never grants access to anything.

## Running the tests

```bash
cd supabase
npm ci
npm test
```

The tests download a PostgreSQL 17 binary through npm (`embedded-postgres`), add
a minimal stand-in for Supabase's `auth` schema and API roles
(`tests/supabase-stub.sql`, test-only), apply every migration and the seed, and
run each test in a rolled-back transaction. Set `TEST_DATABASE_URL` to use an
existing empty database instead.

## Regenerating TypeScript types

After any migration change:

```bash
cd supabase
npm run gen:types
```

CI fails if `frontend/src/types/database.ts` is out of date.

## Applying to a local Supabase project (developers)

```bash
supabase init           # once, from the repository root (creates supabase/config.toml)
supabase start          # local stack via the Supabase CLI (needs Docker)
supabase db reset       # applies migrations/ then seed.sql
```

Creating the first staff account (run with the service-role key, never from a browser):

```sql
insert into public.admin_users (user_id, role, full_name)
values ('<auth user id>', 'admin', 'Restaurant Admin');
```

## Open decisions (owner approval needed)

- Commission rate, basis and refund/cancellation treatment — **no default is configured**.
- Whether restaurant admins may see commission figures (currently: no).
- Whether the operations owner may change operational statuses (currently: no — read only).
- Payment gateway (a mock provider is used in development; mock payments are flagged `is_test`).
- VAT handling (not in the PRD).
