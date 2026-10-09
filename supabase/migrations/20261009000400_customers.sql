-- =============================================================================
-- Customers (guest checkout) and marketing consent
-- =============================================================================
-- Owner instructions §3:
--  * Guest checkout: no account or password is needed to order or request catering.
--  * Email is mandatory; one customer record per (normalised) email so returning
--    customers are associated with their existing record.
--  * Submitting an email NEVER creates a login account and NEVER grants access to
--    previous orders. `auth_user_id` is reserved for a future verified login
--    (email OTP / magic link) and is set only by the server after verification.
--  * Transactional email and marketing consent are separate; consent history is
--    kept in the append-only consent_events table.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone text not null check (public.is_valid_e164(phone)),
  email text not null check (public.is_valid_email(btrim(email))),
  email_normalized text generated always as (lower(btrim(email))) stored,
  preferred_language public.locale not null default 'ar',
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email_verified_at timestamptz,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_email_normalized_key unique (email_normalized),
  -- a linked login must be a verified one
  constraint customers_auth_link_requires_verification
    check (auth_user_id is null or email_verified_at is not null)
);
create index customers_phone_idx on public.customers (phone);

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Profile corrections are audited (inserts happen on every first order and are
-- already traceable through the order/catering record).
create trigger customers_audit after update or delete on public.customers
  for each row execute function public.audit_row_change();

create table public.consent_events (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.customers (id) on delete restrict,
  consent_type public.consent_type not null,
  granted boolean not null,
  source text not null check (char_length(source) between 1 and 80), -- e.g. 'catering_form', 'checkout', 'unsubscribe_link'
  locale public.locale,
  created_at timestamptz not null default now()
);
create index consent_events_customer_idx on public.consent_events (customer_id, created_at);

create trigger consent_events_append_only
  before update or delete on public.consent_events
  for each row execute function public.reject_modification();
create trigger consent_events_no_truncate
  before truncate on public.consent_events
  for each statement execute function public.reject_modification();

-- The customer's current marketing-consent flag always follows the latest event.
create or replace function public.apply_consent_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.consent_type = 'marketing_email' then
    update public.customers
       set marketing_consent = new.granted,
           marketing_consent_at = new.created_at,
           marketing_consent_source = new.source
     where id = new.customer_id;
  end if;
  return new;
end;
$$;

create trigger consent_events_apply
  after insert on public.consent_events
  for each row execute function public.apply_consent_event();
