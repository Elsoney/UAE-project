-- =============================================================================
-- Security hardening after independent review (2026-10-09)
-- =============================================================================
-- Fixes, each covered by supabase/tests/hardening.test.ts:
--  H1  commission_setting_at() leaked commission terms to any signed-in user.
--  M2  Unverified emails could opt someone else into marketing: opt-ins from
--      guest forms are now recorded as UNVERIFIED and do not grant consent
--      until the email owner confirms (double opt-in).
--  M3  Rate limit and M4 idempotency were racy under concurrent requests:
--      submissions now take advisory locks on the idempotency key and email.
--  M5  The operations owner could back-date commission settings.
--  L6  Integrity gaps: source correction flag usable outside correct_source(),
--      order lines deletable, audit/history tables writable and money tables
--      truncatable by the service role, succeeded payments changeable.
--  L7  Admins could set past/blocked event dates, forge reviewed_by /
--      confirmed_at, confirm without payment, or move statuses backwards.
--  I9  Submission functions accepted any client-chosen reference format.

-- --------------------------------------------------------------- H1 ----------
-- The acting API role is the SET ROLE value (PostgREST always sets it), or
-- the session user otherwise. JWT claims alone are never trusted for this.
create or replace function public.acting_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
$$;

-- Allow-list: only the operations owner and trusted server code.
create or replace function public.commission_setting_at(at_time timestamptz)
returns public.commission_settings
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.commission_settings;
begin
  if not (public.acting_role() = 'service_role' or public.has_admin_role('operations_owner')) then
    raise exception 'only the operations owner can view commission settings'
      using errcode = 'insufficient_privilege';
  end if;
  select s.* into v
    from public.commission_settings s
   where s.effective_from <= at_time
   order by s.effective_from desc
   limit 1;
  return v;
end;
$$;

-- --------------------------------------------------------------- M2 ----------
-- An opt-in counts only once verified (e.g. via a confirmation link sent to the
-- address). Withdrawals always apply immediately.
alter table public.consent_events add column verified_at timestamptz;

create or replace function public.apply_consent_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.consent_type = 'marketing_email' and (new.granted = false or new.verified_at is not null) then
    update public.customers
       set marketing_consent = new.granted,
           marketing_consent_at = new.created_at,
           marketing_consent_source = new.source
     where id = new.customer_id;
  end if;
  return new;
end;
$$;

-- Records an UNVERIFIED opt-in request (at most one open request per 30 days).
create or replace function public.record_marketing_opt_in(
  p_customer uuid,
  p_source text,
  p_locale public.locale
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.customers c where c.id = p_customer and c.marketing_consent) then
    return;
  end if;
  if exists (
    select 1 from public.consent_events e
     where e.customer_id = p_customer and e.consent_type = 'marketing_email'
       and e.granted and e.verified_at is null and e.created_at > now() - interval '30 days'
  ) then
    return;
  end if;
  insert into public.consent_events (customer_id, consent_type, granted, source, locale)
  values (p_customer, 'marketing_email', true, p_source, p_locale);
end;
$$;
revoke execute on function public.record_marketing_opt_in(uuid, text, public.locale) from public, anon, authenticated;

-- --------------------------------------------------------- M3 / M4 / I9 ------
create index orders_contact_email_recent_idx on public.orders (lower(btrim(contact_email)), created_at);
create index catering_requests_contact_email_recent_idx on public.catering_requests (lower(btrim(contact_email)), created_at);

-- Serialises submissions per idempotency key, then per email, so the
-- idempotency check and the rate limit cannot be raced. Lock order is fixed
-- (key, then email) to avoid deadlocks.
create or replace function public.lock_submission(p_key text, p_email text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_key is not null then
    perform pg_advisory_xact_lock(hashtextextended('umodai:idem:' || p_key, 0));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('umodai:email:' || lower(btrim(coalesce(p_email, ''))), 0));
end;
$$;
revoke execute on function public.lock_submission(text, text) from public, anon, authenticated;

create or replace function public.check_reference(p_reference text, p_prefix text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reference is null or p_reference = '' then
    return null;
  end if;
  if p_reference !~ ('^' || p_prefix || '-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$') then
    raise exception 'invalid reference' using errcode = 'P0001';
  end if;
  return p_reference;
end;
$$;
revoke execute on function public.check_reference(text, text) from public, anon, authenticated;

create or replace function public.submit_catering_request(p jsonb)
returns table (reference text, status public.catering_status, duplicate boolean)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_key text := nullif(p ->> 'idempotency_key', '');
  v_locale public.locale := coalesce((p ->> 'locale')::public.locale, 'ar');
  v_customer uuid;
  v_package uuid;
  v_id uuid;
  v_ref text;
  v_status public.catering_status;
begin
  perform public.lock_submission(v_key, p #>> '{contact,email}');

  if v_key is not null then
    select r.reference, r.status into v_ref, v_status
      from public.catering_requests r where r.idempotency_key = v_key;
    if found then
      return query select v_ref, v_status, true;
      return;
    end if;
  end if;

  perform public.check_submission_rate(p #>> '{contact,email}');

  if nullif(p ->> 'package_slug', '') is not null then
    select cp.id into v_package
      from public.catering_packages cp
     where cp.slug = p ->> 'package_slug' and cp.is_active;
    if v_package is null then
      raise exception 'package_unavailable' using errcode = 'P0001';
    end if;
  end if;

  v_customer := public.upsert_guest_customer(
    p #>> '{contact,name}', p #>> '{contact,phone}', p #>> '{contact,email}', v_locale);

  if coalesce((p ->> 'marketing_consent')::boolean, false) then
    perform public.record_marketing_opt_in(v_customer, 'catering_form', v_locale);
  end if;

  insert into public.catering_requests (
    reference, customer_id, contact_name, contact_phone, contact_email, locale, source,
    event_date, event_time, guest_count, event_location, package_id, custom_request,
    customer_notes, idempotency_key
  ) values (
    coalesce(public.check_reference(p ->> 'reference', 'UMC'), public.generate_public_reference('UMC')),
    v_customer,
    btrim(p #>> '{contact,name}'), p #>> '{contact,phone}', btrim(p #>> '{contact,email}'),
    v_locale, 'website',
    (p ->> 'event_date')::date, (p ->> 'event_time')::time, (p ->> 'guest_count')::int,
    p ->> 'event_location', v_package, nullif(p ->> 'custom_request', ''),
    nullif(p ->> 'notes', ''), v_key
  )
  returning id, catering_requests.reference, catering_requests.status into v_id, v_ref, v_status;

  insert into public.email_outbox (customer_id, entity_type, entity_id, template, locale, to_email, subject, dedupe_key)
  values (
    v_customer, 'catering_request', v_id, 'catering_request_received',
    coalesce((p #>> '{email,locale}')::public.locale, v_locale),
    btrim(p #>> '{contact,email}'), p #>> '{email,subject}',
    'catering_request_received:' || v_id
  );

  return query select v_ref, v_status, false;
end;
$$;

create or replace function public.submit_guest_order(p jsonb)
returns table (reference text, order_status public.order_status, payment_status public.payment_status, total_fils bigint, duplicate boolean)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_key text := p ->> 'idempotency_key';
  v_locale public.locale := coalesce((p ->> 'locale')::public.locale, 'ar');
  v_customer uuid;
  v_id uuid;
  v_ref text;
  v_subtotal bigint;
  v_lines int;
  v_found int;
  v_delivery bigint := coalesce((p ->> 'delivery_fee_fils')::bigint, 0);
  v_os public.order_status;
  v_ps public.payment_status;
  v_total bigint;
begin
  if v_key is null or v_key = '' then
    raise exception 'idempotency key is required' using errcode = 'P0001';
  end if;

  perform public.lock_submission(v_key, p #>> '{contact,email}');

  select o.reference, o.order_status, o.payment_status, o.total_fils into v_ref, v_os, v_ps, v_total
    from public.orders o where o.idempotency_key = v_key;
  if found then
    return query select v_ref, v_os, v_ps, v_total, true;
    return;
  end if;

  perform public.check_submission_rate(p #>> '{contact,email}');

  select count(*) into v_lines from jsonb_array_elements(p -> 'items');
  select count(*), coalesce(sum((i ->> 'quantity')::int * m.price_fils), 0)
    into v_found, v_subtotal
    from jsonb_array_elements(p -> 'items') as i
    join public.menu_items m on m.slug = i ->> 'slug' and m.is_active and m.is_available
    join public.categories c on c.id = m.category_id and c.is_active;
  if v_lines = 0 or v_found <> v_lines then
    raise exception 'item_unavailable' using errcode = 'P0001';
  end if;
  if v_subtotal <> (p ->> 'expected_subtotal_fils')::bigint then
    raise exception 'price_changed' using errcode = 'P0001';
  end if;

  v_customer := public.upsert_guest_customer(
    p #>> '{contact,name}', p #>> '{contact,phone}', p #>> '{contact,email}', v_locale);

  if coalesce((p ->> 'marketing_consent')::boolean, false) then
    perform public.record_marketing_opt_in(v_customer, 'checkout', v_locale);
  end if;

  insert into public.orders (
    reference, customer_id, contact_name, contact_phone, contact_email, locale, order_type, source,
    subtotal_fils, discount_fils, delivery_fee_fils, total_fils, delivery_address, customer_notes, idempotency_key
  ) values (
    coalesce(public.check_reference(p ->> 'reference', 'UMD'), public.generate_public_reference('UMD')),
    v_customer,
    btrim(p #>> '{contact,name}'), p #>> '{contact,phone}', btrim(p #>> '{contact,email}'),
    v_locale, (p ->> 'order_type')::public.order_type, 'website',
    v_subtotal, 0, v_delivery, v_subtotal + v_delivery,
    nullif(p ->> 'delivery_address', ''), nullif(p ->> 'notes', ''), v_key
  )
  returning id, orders.reference, orders.order_status, orders.payment_status, orders.total_fils
    into v_id, v_ref, v_os, v_ps, v_total;

  insert into public.order_items (order_id, menu_item_id, name_en, name_ar, quantity, unit_price_fils, total_price_fils)
  select v_id, m.id, m.name_en, m.name_ar, (i ->> 'quantity')::int, m.price_fils, (i ->> 'quantity')::int * m.price_fils
    from jsonb_array_elements(p -> 'items') as i
    join public.menu_items m on m.slug = i ->> 'slug';

  insert into public.email_outbox (customer_id, entity_type, entity_id, template, locale, to_email, subject, dedupe_key)
  values (
    v_customer, 'order', v_id, 'order_received',
    coalesce((p #>> '{email,locale}')::public.locale, v_locale),
    btrim(p #>> '{contact,email}'), p #>> '{email,subject}',
    'order_received:' || v_id
  );

  return query select v_ref, v_os, v_ps, v_total, false;
end;
$$;

revoke execute on function public.submit_catering_request(jsonb) from public, anon, authenticated;
revoke execute on function public.submit_guest_order(jsonb) from public, anon, authenticated;
grant execute on function public.submit_catering_request(jsonb) to service_role;
grant execute on function public.submit_guest_order(jsonb) to service_role;

-- --------------------------------------------------------------- M5 ----------
alter table public.commission_settings alter column effective_from set default now();

drop policy "Operations owner adds commission settings" on public.commission_settings;
create policy "Operations owner adds future commission settings"
  on public.commission_settings for insert to authenticated
  with check (
    public.has_admin_role('operations_owner')
    and created_by = (select auth.uid())
    -- No back-dating: a new rate can only apply from now on.
    and effective_from >= now()
  );
grant insert (effective_from) on public.commission_settings to authenticated;

-- --------------------------------------------------------------- L6 ----------
-- Source corrections are allowed only inside correct_source() itself.
create or replace function public.protect_source()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner name;
begin
  if new.source is distinct from old.source then
    select pg_get_userbyid(p.proowner) into v_owner
      from pg_proc p
     where p.oid = 'public.correct_source(text, uuid, public.order_source, text)'::regprocedure;
    if coalesce(current_setting('umodai.allow_source_correction', true), '') <> 'on' or current_user <> v_owner then
      raise exception 'source is immutable once recorded (use public.correct_source)'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- Order lines can be neither changed nor removed, and their creation is audited.
drop trigger order_items_immutable on public.order_items;
create trigger order_items_immutable
  before update or delete on public.order_items
  for each row execute function public.reject_modification();
create trigger order_items_audit
  after insert on public.order_items
  for each row execute function public.audit_row_change();

-- Audit and history rows are written only by the definer triggers.
revoke insert, update, delete, truncate on public.audit_log, public.status_history from service_role;
-- No role can wipe tables in bulk.
revoke truncate on all tables in schema public from service_role, anon, authenticated;
alter default privileges in schema public revoke truncate on tables from service_role, anon, authenticated;

-- A succeeded payment is final: it cannot be failed, re-priced, re-parented or deleted.
create or replace function public.protect_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payments cannot be deleted' using errcode = 'insufficient_privilege';
  end if;
  if (new.order_id, new.catering_request_id, new.payment_request_id, new.provider, new.provider_reference, new.is_test, new.currency)
     is distinct from
     (old.order_id, old.catering_request_id, old.payment_request_id, old.provider, old.provider_reference, old.is_test, old.currency) then
    raise exception 'payment identity cannot change' using errcode = 'check_violation';
  end if;
  if old.status = 'succeeded'
     and (new.status <> 'succeeded' or new.amount_fils <> old.amount_fils or new.paid_at is distinct from old.paid_at) then
    raise exception 'a succeeded payment cannot be changed; record a refund instead' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger payments_protect
  before update or delete on public.payments
  for each row execute function public.protect_payment();

-- A refund keeps its payment and amount; a succeeded refund is final.
create or replace function public.protect_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'refunds cannot be deleted' using errcode = 'insufficient_privilege';
  end if;
  if new.payment_id <> old.payment_id or new.amount_fils <> old.amount_fils then
    raise exception 'refund amount and payment cannot change' using errcode = 'check_violation';
  end if;
  if old.status = 'succeeded' and new.status <> 'succeeded' then
    raise exception 'a succeeded refund is final' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger refunds_protect
  before update or delete on public.refunds
  for each row execute function public.protect_refund();

-- --------------------------------------------------------------- L7 ----------
create or replace function public.order_transition_allowed(f public.order_status, t public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case f
    when 'new' then t in ('confirmed', 'cancelled')
    when 'confirmed' then t in ('preparing', 'cancelled')
    when 'preparing' then t in ('ready', 'cancelled')
    when 'ready' then t in ('completed', 'cancelled')
    else false
  end;
$$;

create or replace function public.catering_transition_allowed(f public.catering_status, t public.catering_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case f
    when 'pending_review' then t in ('customer_contacted', 'quoted', 'rejected', 'cancelled')
    when 'customer_contacted' then t in ('quoted', 'rejected', 'cancelled')
    when 'quoted' then t in ('awaiting_payment', 'confirmed', 'customer_contacted', 'rejected', 'cancelled')
    when 'awaiting_payment' then t in ('confirmed', 'quoted', 'cancelled')
    when 'confirmed' then t in ('preparing', 'cancelled')
    when 'preparing' then t in ('completed', 'cancelled')
    else false
  end;
$$;

create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_status is distinct from old.order_status then
    if not public.order_transition_allowed(old.order_status, new.order_status) then
      raise exception 'order cannot move from % to %', old.order_status, new.order_status
        using errcode = 'check_violation';
    end if;
  end if;
  -- cancelled_at is set by the database when the order is cancelled.
  new.cancelled_at := case
    when new.order_status = 'cancelled' and old.order_status <> 'cancelled' then now()
    else old.cancelled_at
  end;
  return new;
end;
$$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

create or replace function public.guard_catering_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not public.catering_transition_allowed(old.status, new.status) then
      raise exception 'catering request cannot move from % to %', old.status, new.status
        using errcode = 'check_violation';
    end if;
    if new.status = 'confirmed' then
      if old.status = 'quoted' and new.deposit_type is distinct from 'none' then
        raise exception 'cannot confirm before the required payment is received'
          using errcode = 'check_violation';
      end if;
      if old.status = 'awaiting_payment' and new.payment_status not in ('deposit_paid', 'fully_paid') then
        raise exception 'cannot confirm before the required payment is received'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  -- Set by the database, never by the client.
  new.confirmed_at := case
    when new.status = 'confirmed' and old.status <> 'confirmed' then now()
    else old.confirmed_at
  end;
  if public.acting_role() = 'authenticated' then
    new.reviewed_by := auth.uid();
  end if;

  -- A changed event date must still be in the future and available.
  if new.event_date is distinct from old.event_date then
    if new.event_date < (now() at time zone 'Asia/Dubai')::date then
      raise exception 'event date % is in the past', new.event_date using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.blocked_dates b where b.blocked_on = new.event_date) then
      raise exception 'event date % is not available', new.event_date using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger catering_requests_guard_update
  before update on public.catering_requests
  for each row execute function public.guard_catering_update();

-- New helper functions are server/trigger-only.
revoke execute on function public.order_transition_allowed(public.order_status, public.order_status) from public, anon, authenticated;
revoke execute on function public.catering_transition_allowed(public.catering_status, public.catering_status) from public, anon, authenticated;
revoke execute on function public.protect_payment() from public, anon, authenticated;
revoke execute on function public.protect_refund() from public, anon, authenticated;
revoke execute on function public.guard_order_update() from public, anon, authenticated;
revoke execute on function public.guard_catering_update() from public, anon, authenticated;
