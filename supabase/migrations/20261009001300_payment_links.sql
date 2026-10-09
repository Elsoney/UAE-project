-- =============================================================================
-- Payment links for catering deposits and webhook processing helpers
-- =============================================================================
-- All functions here are SERVER-ONLY (service role). Staff actions call them
-- after requireStaff(); the payment webhook calls them after verifying the
-- provider's signature.

alter table public.payment_requests
  add column checkout_url text check (checkout_url is null or char_length(checkout_url) <= 2000);

-- Webhook processing lease: a delivery "claims" an event so a simultaneous
-- duplicate delivery waits (HTTP 503 -> provider retries) instead of racing.
alter table public.payment_events add column processing_started_at timestamptz;

-- ------------------------------------------------- request a payment ------
-- Creates the payment request for a quoted catering booking. The amount is
-- computed HERE from the agreed total and the admin's deposit choice (never
-- taken from the caller). An open request is superseded. Moves the booking to
-- awaiting_payment and the payment status to payment_requested.
create or replace function public.request_catering_payment(
  p_request uuid,
  p_staff uuid,
  p_provider text,
  p_is_test boolean,
  p_expires_at timestamptz
)
returns table (
  payment_request_id uuid,
  requested_amount_fils bigint,
  total_fils bigint,
  reference text,
  contact_name text,
  contact_email text,
  locale public.locale
)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  r public.catering_requests%rowtype;
  v_amount bigint;
  v_kind public.payment_request_kind;
  v_new uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.admin_users a where a.user_id = p_staff and a.is_active and a.role = 'admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into r from public.catering_requests c where c.id = p_request for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if r.status not in ('quoted', 'awaiting_payment') or r.quoted_total_fils is null then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if r.deposit_type is null or r.deposit_type = 'none' then
    raise exception 'no_payment_required' using errcode = 'P0001';
  end if;
  if r.payment_status in ('deposit_paid', 'fully_paid') then
    raise exception 'already_paid' using errcode = 'P0001';
  end if;
  if p_expires_at <= now() then
    raise exception 'invalid expiry' using errcode = 'P0001';
  end if;

  v_kind := case r.deposit_type when 'full' then 'full'::public.payment_request_kind else 'deposit'::public.payment_request_kind end;
  v_amount := case r.deposit_type
    when 'full' then r.quoted_total_fils
    when 'fixed' then r.deposit_fixed_fils
    -- round half up to the fil, identical to the payment_requests CHECK
    else round(r.quoted_total_fils * r.deposit_percentage / 100)::bigint
  end;

  update public.payment_requests pr
     set status = 'superseded', superseded_by = v_new
   where pr.catering_request_id = p_request and pr.status = 'pending';

  insert into public.payment_requests (
    id, catering_request_id, kind, deposit_type, percentage, fixed_amount_fils,
    total_snapshot_fils, requested_amount_fils, status, expires_at, provider, is_test, created_by
  ) values (
    v_new, p_request, v_kind, r.deposit_type,
    case when r.deposit_type = 'percentage' then r.deposit_percentage end,
    case when r.deposit_type = 'fixed' then r.deposit_fixed_fils end,
    r.quoted_total_fils, v_amount, 'pending', p_expires_at, p_provider, p_is_test, p_staff
  );

  update public.catering_requests c
     set status = 'awaiting_payment', payment_status = 'payment_requested'
   where c.id = p_request;

  return query select v_new, v_amount, r.quoted_total_fils, r.reference, r.contact_name, r.contact_email, r.locale;
end;
$$;

-- Stores the provider's hosted checkout and queues the "payment requested" email.
create or replace function public.attach_checkout(
  p_payment_request uuid,
  p_checkout_id text,
  p_checkout_url text,
  p_email_subject text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  update public.payment_requests pr
     set provider_checkout_id = p_checkout_id, checkout_url = p_checkout_url
   where pr.id = p_payment_request and pr.status = 'pending'
  returning pr.id, pr.catering_request_id into r;
  if r.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  insert into public.email_outbox (customer_id, entity_type, entity_id, template, locale, to_email, subject, dedupe_key)
  select c.customer_id, 'payment_request', p_payment_request, 'payment_requested', c.locale, c.contact_email, p_email_subject,
         'payment_requested:' || p_payment_request
    from public.catering_requests c
   where c.id = r.catering_request_id
  on conflict (dedupe_key) do nothing;
end;
$$;

-- ------------------------------------------------------ webhook helpers ----
create or replace function public.claim_payment_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  e record;
begin
  insert into public.payment_events (provider, provider_event_id, event_type, signature_verified, payload, processing_started_at)
  values (p_provider, p_event_id, p_event_type, true, p_payload, now())
  on conflict (provider, provider_event_id) do nothing;
  if found then
    return 'new';
  end if;

  select pe.id, pe.processed_at, pe.processing_started_at into e
    from public.payment_events pe
   where pe.provider = p_provider and pe.provider_event_id = p_event_id
     for update;
  if e.processed_at is not null then
    return 'duplicate';
  end if;
  if e.processing_started_at is not null and e.processing_started_at > now() - interval '2 minutes' then
    return 'busy';
  end if;
  update public.payment_events set processing_started_at = now() where id = e.id;
  return 'new';
end;
$$;

-- Money movements for one order or catering request (test or live mode only).
create or replace function public.payment_summary(p_kind text, p_id uuid, p_is_test boolean)
returns table (
  total_fils bigint,
  paid_fils bigint,
  refunded_fils bigint,
  required_deposit_fils bigint,
  has_open_request boolean,
  last_attempt_failed boolean
)
language sql
stable
set search_path = ''
as $$
  with pays as (
    select p.* from public.payments p
     where p.is_test = p_is_test
       and (case when p_kind = 'order' then p.order_id else p.catering_request_id end) = p_id
  ),
  reqs as (
    select pr.* from public.payment_requests pr
     where (case when p_kind = 'order' then pr.order_id else pr.catering_request_id end) = p_id
  )
  select
    (case when p_kind = 'order'
       then (select o.total_fils from public.orders o where o.id = p_id)
       else (select c.quoted_total_fils from public.catering_requests c where c.id = p_id) end)::bigint,
    coalesce((select sum(amount_fils) from pays where status = 'succeeded'), 0)::bigint,
    coalesce((select sum(r.amount_fils) from public.refunds r join pays on pays.id = r.payment_id where r.status = 'succeeded'), 0)::bigint,
    coalesce((select requested_amount_fils from reqs where kind = 'deposit' and status in ('pending', 'paid')
               order by created_at desc limit 1), 0)::bigint,
    exists (select 1 from reqs where status = 'pending'),
    coalesce((select status = 'failed' from pays order by updated_at desc limit 1), false);
$$;

revoke execute on function public.request_catering_payment(uuid, uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.attach_checkout(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.claim_payment_event(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.payment_summary(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.request_catering_payment(uuid, uuid, text, boolean, timestamptz) to service_role;
grant execute on function public.attach_checkout(uuid, text, text, text) to service_role;
grant execute on function public.claim_payment_event(text, text, text, jsonb) to service_role;
grant execute on function public.payment_summary(text, uuid, boolean) to service_role;
