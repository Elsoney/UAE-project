-- =============================================================================
-- Payment requests, payments, verified webhook events and refunds
-- =============================================================================
-- Owner instructions §6 and PRD P0-F006..F008:
--  * A payment is successful only after server-side verification (signed webhook);
--    a browser redirect never marks anything paid.
--  * Duplicate webhooks must not create duplicate transactions:
--    UNIQUE (provider, provider_reference) and UNIQUE (provider, provider_event_id).
--  * Mock/test payments are flagged is_test and must never count as real money.
--  * Raw card data is never stored. raw payloads hold provider metadata only.
--  * Each payment belongs to exactly one order or catering request.

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  catering_request_id uuid references public.catering_requests (id) on delete restrict,
  kind public.payment_request_kind not null,
  deposit_type public.deposit_type,          -- snapshot of the admin's choice
  percentage numeric(5, 2),
  fixed_amount_fils bigint,
  total_snapshot_fils bigint not null check (total_snapshot_fils > 0),
  requested_amount_fils bigint not null check (requested_amount_fils > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  status public.payment_request_status not null default 'pending',
  expires_at timestamptz,
  provider text not null check (char_length(provider) between 1 and 40),
  provider_checkout_id text,
  is_test boolean not null,
  -- Deferred so a replacement can be linked and inserted in one transaction
  -- (mark old as superseded -> insert new pending request with that id).
  superseded_by uuid references public.payment_requests (id) on delete restrict
    deferrable initially deferred,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_requests_one_parent check (num_nonnulls(order_id, catering_request_id) = 1),
  constraint payment_requests_not_above_total check (requested_amount_fils <= total_snapshot_fils),
  constraint payment_requests_kind_matches_deposit_type check (
    (kind = 'deposit' and deposit_type in ('fixed', 'percentage'))
    or (kind = 'full' and (deposit_type is null or deposit_type = 'full'))
    or (kind = 'balance' and deposit_type is null)
  ),
  constraint payment_requests_percentage_valid check (
    coalesce(deposit_type = 'percentage', false) = (percentage is not null)
    and (percentage is null or (
      percentage > 0 and percentage <= 100
      -- round half up to the fil; must match frontend/src/lib/domain/deposit.ts
      and requested_amount_fils = round(total_snapshot_fils * percentage / 100)::bigint
    ))
  ),
  constraint payment_requests_fixed_valid check (
    coalesce(deposit_type = 'fixed', false) = (fixed_amount_fils is not null)
    and (fixed_amount_fils is null or (fixed_amount_fils > 0 and requested_amount_fils = fixed_amount_fils))
  ),
  constraint payment_requests_full_is_total check (
    kind <> 'full' or requested_amount_fils = total_snapshot_fils
  ),
  constraint payment_requests_superseded_link check (
    (status = 'superseded') = (superseded_by is not null)
  )
);
create index payment_requests_order_idx on public.payment_requests (order_id);
create index payment_requests_catering_idx on public.payment_requests (catering_request_id);
create index payment_requests_status_idx on public.payment_requests (status);
-- At most one open request per order / catering request.
create unique index payment_requests_one_pending_per_order
  on public.payment_requests (order_id) where status = 'pending' and order_id is not null;
create unique index payment_requests_one_pending_per_catering
  on public.payment_requests (catering_request_id) where status = 'pending' and catering_request_id is not null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  catering_request_id uuid references public.catering_requests (id) on delete restrict,
  payment_request_id uuid references public.payment_requests (id) on delete restrict,
  provider text not null check (char_length(provider) between 1 and 40),
  provider_reference text not null check (char_length(provider_reference) between 1 and 200),
  amount_fils bigint not null check (amount_fils > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  status public.payment_txn_status not null default 'pending',
  is_test boolean not null,
  paid_at timestamptz,
  failure_reason text check (failure_reason is null or char_length(failure_reason) <= 500),
  raw_event jsonb,   -- provider metadata only; never card numbers or CVV
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_one_parent check (num_nonnulls(order_id, catering_request_id) = 1),
  constraint payments_provider_reference_key unique (provider, provider_reference),
  constraint payments_succeeded_has_paid_at check (status <> 'succeeded' or paid_at is not null)
);
create index payments_order_idx on public.payments (order_id);
create index payments_catering_idx on public.payments (catering_request_id);
create index payments_request_idx on public.payments (payment_request_id);
create index payments_status_idx on public.payments (status);

-- A payment linked to a request must belong to the same order/catering request
-- and share its test/live mode.
create or replace function public.check_payment_matches_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.payment_requests%rowtype;
begin
  if new.payment_request_id is null then
    return new;
  end if;
  select * into r from public.payment_requests where id = new.payment_request_id;
  if r.order_id is distinct from new.order_id
     or r.catering_request_id is distinct from new.catering_request_id then
    raise exception 'payment parent does not match its payment request'
      using errcode = 'check_violation';
  end if;
  if r.is_test <> new.is_test then
    raise exception 'test and live payments cannot be mixed'
      using errcode = 'check_violation';
  end if;
  if r.provider <> new.provider then
    raise exception 'payment provider does not match its payment request'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger payments_match_request
  before insert or update on public.payments
  for each row execute function public.check_payment_matches_request();

-- Log of received webhook events, used for idempotency and forensics.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null check (char_length(provider) between 1 and 40),
  provider_event_id text not null check (char_length(provider_event_id) between 1 and 200),
  event_type text not null check (char_length(event_type) between 1 and 100),
  signature_verified boolean not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  constraint payment_events_provider_event_key unique (provider, provider_event_id)
);
create index payment_events_received_idx on public.payment_events (received_at desc);

-- Only processing metadata may change after an event is recorded.
create or replace function public.protect_payment_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payment_events are append-only' using errcode = 'insufficient_privilege';
  end if;
  if (new.provider, new.provider_event_id, new.event_type, new.signature_verified, new.payload, new.received_at)
     is distinct from
     (old.provider, old.provider_event_id, old.event_type, old.signature_verified, old.payload, old.received_at) then
    raise exception 'payment event contents are immutable' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger payment_events_protect
  before update or delete on public.payment_events
  for each row execute function public.protect_payment_event();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_fils bigint not null check (amount_fils > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status public.refund_status not null default 'pending',
  provider_reference text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_provider_reference_key unique (payment_id, provider_reference)
);
create index refunds_payment_idx on public.refunds (payment_id);

-- Refunds may only be issued against a succeeded payment, and the total of
-- non-failed refunds can never exceed the amount paid.
create or replace function public.check_refund_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid bigint;
  v_status public.payment_txn_status;
  v_refunded bigint;
begin
  select p.amount_fils, p.status into v_paid, v_status
    from public.payments p
   where p.id = new.payment_id
     for update;

  if v_status <> 'succeeded' then
    raise exception 'refunds require a succeeded payment' using errcode = 'check_violation';
  end if;

  select coalesce(sum(r.amount_fils), 0) into v_refunded
    from public.refunds r
   where r.payment_id = new.payment_id
     and r.status <> 'failed'
     and r.id <> new.id;

  if new.status <> 'failed' and v_refunded + new.amount_fils > v_paid then
    raise exception 'refunds (% + %) exceed the payment amount (%)', v_refunded, new.amount_fils, v_paid
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refunds_check_total
  before insert or update on public.refunds
  for each row execute function public.check_refund_total();

create trigger payment_requests_set_updated_at before update on public.payment_requests
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger refunds_set_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

create trigger payment_requests_audit after insert or update or delete on public.payment_requests
  for each row execute function public.audit_row_change();
create trigger payments_audit after insert or update or delete on public.payments
  for each row execute function public.audit_row_change();
create trigger refunds_audit after insert or update or delete on public.refunds
  for each row execute function public.audit_row_change();
