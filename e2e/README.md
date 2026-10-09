# End-to-end tests

Real customer journeys through the whole system, with no Docker and no
external accounts:

```
Chromium  →  Next.js (production build)  →  PostgREST (Supabase's REST layer)  →  PostgreSQL 17 + all migrations
```

What they prove today:

- **Catering request (Arabic and English)**: a guest sends a request without
  an account. It is stored as *pending review* with a reference, website
  attribution, normalised phone and a queued confirmation email in the right
  language, and the page never presents it as a confirmed booking.
- **Returning customer**: the same email (any capitalisation) links to one
  customer record without overwriting their details. Marketing consent is
  recorded only on opt-in.
- **Errors**: the browser check (missing email) and the server check (fully
  booked date) both appear in the visitor's language, and typed entries are kept.
- **Privacy through the public API**: with the key every browser has, nobody
  can read customers, orders, requests, payments, commissions, the audit log
  or the staff list. Knowing an email reveals nothing. The server-only
  functions can't be called, users can't make themselves staff, and the
  service-role key never appears in browser JavaScript.
- **Languages**: Arabic by default, English for English browsers, a language
  switch that keeps the page and is remembered, Arabic menu search, and a
  bilingual 404.

Every test runs on a desktop and a mobile viewport.

## Running locally

```bash
cd supabase && npm ci && cd ..
cd frontend && npm ci && cd ..
cd e2e && npm ci
npx playwright install chromium            # once
curl -sSfL -o /tmp/pgrst.tar.xz \
  https://github.com/PostgREST/postgrest/releases/download/v13.0.7/postgrest-v13.0.7-linux-static-x86-64.tar.xz
tar -xf /tmp/pgrst.tar.xz -C /tmp
POSTGREST_BIN=/tmp/postgrest npm test
```

`E2E_VERBOSE=1` shows the Next.js build output. The suite builds the frontend
with test settings (`APP_ENV=test`, mock payments) and uses throw-away JWT
keys that only work against this local stack.

Not covered here: Supabase Auth sign-in (staff), real email delivery and real
payments. Those use mock providers until you choose the real ones.
