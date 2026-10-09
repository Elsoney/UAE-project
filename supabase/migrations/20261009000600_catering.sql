-- =============================================================================
-- Catering requests (human-reviewed) and blocked dates
-- =============================================================================
-- Owner instructions §4–§5 and PRD P0-F003/F007:
--  * A request always starts as 'pending_review'; submitting the form never
--    confirms a booking. Staff review, contact the customer, agree the price
--    (quoted_total_fils) and choose a payment requirement (deposit_type).
--  * Deposit options: none / fixed AED / percentage (0 < p <= 100) / full.
--    A deposit can never exceed the confirmed total.

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_on date not null unique,
  reason text check (reason is null or char_length(reason) <= 300), -- internal; not exposed publicly
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create trigger blocked_dates_audit after insert or update or delete on public.blocked_dates
  for each row execute function public.audit_row_change();

create table public.catering_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_public_reference('UMC'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 120),
  contact_phone text not null check (public.is_valid_e164(contact_phone)),
  contact_email text not null check (public.is_valid_email(btrim(contact_email))),
  locale public.locale not null default 'ar',
  source public.order_source not null default 'website',
  event_date date not null,
  event_time time not null,
  guest_count integer not null check (guest_count between 1 and 5000),
  event_location text not null check (char_length(btrim(event_location)) between 1 and 500),
  package_id uuid references public.catering_packages (id) on delete restrict,
  custom_request text check (custom_request is null or char_length(custom_request) <= 2000),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 2000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 4000),
  status public.catering_status not null default 'pending_review',
  payment_status public.payment_status not null default 'unpaid',
  quoted_total_fils bigint check (quoted_total_fils is null or quoted_total_fils > 0),
  deposit_type public.deposit_type,
  deposit_percentage numeric(5, 2),
  deposit_fixed_fils bigint,
  reviewed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  idempotency_key text unique check (idempotency_key is null or char_length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint catering_package_or_custom
    check (package_id is not null or nullif(btrim(custom_request), '') is not null),
  -- From 'quoted' onwards the confirmed price must be recorded.
  constraint catering_quote_required
    check (status in ('pending_review', 'customer_contacted', 'rejected', 'cancelled')
           or quoted_total_fils is not null),
  -- Deposit configuration is internally consistent.
  constraint catering_deposit_percentage_valid
    check (coalesce(deposit_type = 'percentage', false) = (deposit_percentage is not null)
           and (deposit_percentage is null or (deposit_percentage > 0 and deposit_percentage <= 100))),
  constraint catering_deposit_fixed_valid
    check (coalesce(deposit_type = 'fixed', false) = (deposit_fixed_fils is not null)
           and (deposit_fixed_fils is null or deposit_fixed_fils > 0)),
  constraint catering_deposit_requires_quote
    check (deposit_type is null or quoted_total_fils is not null),
  constraint catering_deposit_not_above_total
    check (deposit_fixed_fils is null or deposit_fixed_fils <= quoted_total_fils),
  constraint catering_confirmed_requires_payment_choice
    check (status not in ('confirmed', 'preparing', 'completed') or deposit_type is not null)
);
create index catering_requests_customer_idx on public.catering_requests (customer_id);
create index catering_requests_status_idx on public.catering_requests (status, created_at desc);
create index catering_requests_event_date_idx on public.catering_requests (event_date);
create index catering_requests_package_idx on public.catering_requests (package_id);
create index catering_requests_payment_status_idx on public.catering_requests (payment_status);

create trigger catering_requests_set_updated_at before update on public.catering_requests
  for each row execute function public.set_updated_at();
create trigger catering_requests_protect_source before update on public.catering_requests
  for each row execute function public.protect_source();
create trigger catering_requests_status_history after insert or update on public.catering_requests
  for each row execute function public.record_status_history();
create trigger catering_requests_audit after update or delete on public.catering_requests
  for each row execute function public.audit_row_change();

-- Database backstop for new requests: no past dates (Asia/Dubai) and no blocked
-- dates. The application validates the same rules (incl. lead time) first and
-- shows a friendly, localised message.
create or replace function public.validate_new_catering_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'pending_review' then
    raise exception 'new catering requests must start as pending_review'
      using errcode = 'check_violation';
  end if;
  if new.event_date < (now() at time zone 'Asia/Dubai')::date then
    raise exception 'event date % is in the past', new.event_date
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.blocked_dates b where b.blocked_on = new.event_date) then
    raise exception 'event date % is not available', new.event_date
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger catering_requests_validate_new before insert on public.catering_requests
  for each row execute function public.validate_new_catering_request();

-- Public, privacy-safe list of unavailable dates (reasons stay internal).
create or replace function public.get_blocked_dates(from_date date, to_date date)
returns setof date
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_on
  from public.blocked_dates b
  where b.blocked_on between from_date and least(to_date, from_date + 400)
  order by b.blocked_on;
$$;
