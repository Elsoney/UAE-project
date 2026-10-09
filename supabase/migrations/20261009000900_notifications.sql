-- =============================================================================
-- Transactional email outbox
-- =============================================================================
-- Confirmation emails (order received, catering request received, payment
-- requested/received, booking confirmed) are queued here by the server and
-- delivered by a worker through the selected email provider (TBD — owner
-- approval). Marketing email is NOT sent from this table.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete restrict,
  entity_type text not null check (entity_type in ('order', 'catering_request', 'payment_request', 'payment')),
  entity_id uuid not null,
  template text not null check (template in (
    'order_received', 'catering_request_received', 'payment_requested',
    'payment_received', 'catering_confirmed', 'order_cancelled', 'catering_cancelled', 'refund_issued'
  )),
  locale public.locale not null,
  to_email text not null check (public.is_valid_email(to_email)),
  subject text not null check (char_length(subject) between 1 and 300),
  status public.email_status not null default 'queued',
  attempts integer not null default 0 check (attempts >= 0),
  provider text,
  provider_message_id text,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  dedupe_key text unique check (dedupe_key is null or char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint email_outbox_sent_consistent check ((status = 'sent') = (sent_at is not null))
);
create index email_outbox_status_idx on public.email_outbox (status, created_at);
create index email_outbox_entity_idx on public.email_outbox (entity_type, entity_id);
create index email_outbox_customer_idx on public.email_outbox (customer_id);

create trigger email_outbox_set_updated_at before update on public.email_outbox
  for each row execute function public.set_updated_at();

-- ------------------------------------------------ audited source correction ----
-- The only sanctioned way to change an order's or catering request's source.
-- Restricted to the operations owner; requires a reason; audited.
create or replace function public.correct_source(
  entity text,
  entity_id uuid,
  new_source public.order_source,
  reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.order_source;
begin
  if not public.has_admin_role('operations_owner') then
    raise exception 'only the operations owner can correct attribution'
      using errcode = 'insufficient_privilege';
  end if;
  if reason is null or char_length(btrim(reason)) < 5 then
    raise exception 'a reason is required' using errcode = 'check_violation';
  end if;

  perform set_config('umodai.allow_source_correction', 'on', true);

  if entity = 'order' then
    select source into v_old from public.orders where id = entity_id for update;
    if not found then raise exception 'order not found'; end if;
    update public.orders set source = new_source where id = entity_id;
  elsif entity = 'catering_request' then
    select source into v_old from public.catering_requests where id = entity_id for update;
    if not found then raise exception 'catering request not found'; end if;
    update public.catering_requests set source = new_source where id = entity_id;
  else
    raise exception 'unknown entity %', entity;
  end if;

  perform set_config('umodai.allow_source_correction', 'off', true);

  insert into public.audit_log (actor, actor_role, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), public.acting_role(), 'SOURCE_CORRECTION',
    case entity when 'order' then 'orders' else 'catering_requests' end,
    entity_id,
    jsonb_build_object('source', v_old),
    jsonb_build_object('source', new_source, 'reason', reason)
  );
end;
$$;
