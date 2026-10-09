# Configuration and Secrets

**Snapshot:** 2026-10-09. Checked `.env.example`, `.gitignore`, and `frontend/src/lib/supabase.ts`. Secret values were not printed or inspected.

## Environment variable names

`.env.example` contains placeholders for:

| Name | Use / observed status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Read by the current optional Supabase client helper |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Read by the current optional Supabase client helper |
| `SUPABASE_SERVICE_ROLE_KEY` | Declared as a placeholder; no current app use found. Must remain server-side and must never be exposed to browser code. |
| `NEXT_PUBLIC_SITE_URL` | Declared as a placeholder; current app use was not found. |

`.gitignore` ignores `.env*` except `.env.example`. Use local environment files only for development, and never commit actual values, credentials, customer exports or service tokens.

## External services

No Vercel, Supabase, payment gateway, Google, messaging, analytics, or Claude account configuration was inspected or contacted. Provider credentials and service access remain unknown. Do not infer that an integration is configured from the product PRD or schema.

## Secure developer handoff

1. Invite each developer using their own GitHub account and least-privilege repository permissions.
2. Provide necessary development-only secrets through an approved secret manager, not Git, email, archive, or chat.
3. Keep sandbox and production credentials isolated.
4. If any real secret is accidentally committed, revoke/rotate it through the service owner's approved procedure; deleting the file alone is insufficient.
5. Use an approved secret scanner before adding more configuration. Do not include secret values in review notes or logs.
