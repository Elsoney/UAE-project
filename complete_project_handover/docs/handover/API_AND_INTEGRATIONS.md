# Api And Integrations

**Snapshot:** 2026-10-09. Original handover text predates inspection of the application source. The actual routes and integration status are summarized in `REPOSITORY_INVENTORY.md` and the repository-root `AUDIT_REPORT.md`.

**Classification:** VERIFIED = directly observed in an accessible artifact (specify whether *document* or *implementation*); CONTEXT-BASED = described in accessible planning/history; INFERRED = technical interpretation requiring confirmation; UNKNOWN = not evidenced. A specification is not running software.

## Proposed Umodai endpoints — PRD §11, not verified implementation
- Public: `GET /api/v1/menu`, `GET /api/v1/menu/:id`, `GET /api/v1/catering/packages`, `GET /api/v1/catering/packages/:id`.
- Orders: `POST /api/v1/orders`, `GET /api/v1/orders/:id`, `PUT /api/v1/admin/orders/:id/status`.
- Catering: `POST /api/v1/catering/requests`, `GET /api/v1/admin/catering/requests`, `GET /api/v1/admin/catering/requests/:id`, `PUT /api/v1/admin/catering/requests/:id`, `PUT /api/v1/admin/catering/requests/:id/status`.
- Payment requests: `POST /api/v1/admin/payment-requests`, `GET /api/v1/payment-requests/:id`, `POST /api/v1/payment-requests/:id/checkout`.
- Payments: `POST /api/v1/payments/webhook`, `GET /api/v1/admin/payments/:id`, `POST /api/v1/admin/payments/:id/refund`.
- Menu admin: `POST /api/v1/admin/menu`, `PUT /api/v1/admin/menu/:id`, `DELETE /api/v1/admin/menu/:id`.
- Commission: `GET /api/v1/admin/commissions`, `GET /api/v1/admin/commissions/:id`.

No requests/responses, OpenAPI contract, auth scopes or routes in application code were available. The PRD may be a conceptual REST sketch; implementing Supabase directly would require reconciling this API interface. Never assert these are callable.

## External integrations
Payment provider **TBD**, Google Maps/Business Profile/Search Console/GA4, WhatsApp links, email provider TBD. Payment flow designed around signed server-side webhook + idempotency, but signatures and provider specification UNKNOWN. Verify and test 401/403 access to private orders, anti-enumeration of order IDs, retry/duplicate webhook semantics, failed/partial payments and refund reconciliation prior to production. All credentials must be configured individually.

## PRD Maker
No HTTP API, service endpoint or Claude SDK use is proven by the source instruction document.
