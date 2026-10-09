# Database And Data

**Snapshot:** 2026-10-09. Original handover text predates inspection of the application source. The actual draft schema and RLS findings are in `supabase/schema.sql` and the repository-root `AUDIT_REPORT.md`.

**Classification:** VERIFIED = directly observed in an accessible artifact (specify whether *document* or *implementation*); CONTEXT-BASED = described in accessible planning/history; INFERRED = technical interpretation requiring confirmation; UNKNOWN = not evidenced. A specification is not running software.

## Documented proposed data model (Umodai PRD §9)
**CONTEXT-BASED and unimplemented until verified.** Proposed entities: `users`, `customers`, `categories`, `menu_items`, `catering_packages`, `orders`, `order_items`, `catering_requests`, `payment_requests`, `payments`, `refunds`, `commissions`, `blocked_dates`, `status_history`.

| Data relationship | Basis | Verify |
|---|---|---|
| `menu_items.category_id` → `categories` | PRD field names | FK, deletion policy |
| `orders.customer_id` → `customers` | PRD field names | identity linking and guest orders |
| `order_items.order_id` → `orders` | PRD field names | price snapshot, tax, quantities |
| `catering_requests.customer_id`, `.package_id` | PRD field names | optional package/custom request |
| `payment_requests`, `payments`, `commissions` point to order *or* catering request | PRD uses `order_id/catering_request_id` placeholder | robust relational design, constraints |
| `refunds.payment_id` → `payments` | PRD field names | refund reconciliation |
| `status_history.entity_type/entity_id` | PRD field names | audit trail integrity |

Key fields described in original PRD in `docs/source/UMODAI_PRD_SOURCE.txt` section 9; consult it for authoritative draft rather than copying definitions into SQL. No migrations, RLS rules, constraints, actual data, seed scripts or backup settings inspected.

## Required checks before data migration
Examine migration folder and Supabase configuration; validate complete schema and least-privilege RLS, indexes, monetary `numeric` precision, AED currency semantics, UTC storage with event timezone, deletion/retention policy, idempotency for payment IDs and immutability of source attribution. Restore only synthetic/anonymized data into development and exercise reversible migrations on disposable DB. Never export live customer information into the handover archive.

## PRD Maker
No database is specified by its instruction document; existence of a persistence layer is **UNKNOWN**, not a confirmed absence.
