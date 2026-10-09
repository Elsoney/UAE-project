-- =============================================================================
-- Atomic guest submissions (server-only)
-- =============================================================================
-- PostgREST runs each request in its own transaction, so a guest order (customer
-- + order + items + consent + confirmation email) must be written by ONE
-- database function to succeed or fail as a whole.
--
-- These functions are called only by trusted server code with the service role
-- after validation. They are NOT executable by anon or authenticated users.
--
-- Rules enforced here as well as in the app:
--  * Returning customers are matched by normalised email and never overwritten.
--  * Marketing consent is recorded only on explicit opt-in (never revoked here).
--  * Idempotency: the same idempotency key returns the original submission.
--  * Prices are taken from menu_items, never from the request.
--  * Simple abuse limit: at most 5 submissions per email per hour.
--
-- Errors use SQLSTATE P0001 with a stable machine-readable MESSAGE code:
--   rate_limited, package_unavailable, item_unavailable, price_changed

create or replace function public.upsert_guest_customer(
  p_full_name text,
  p_phone text,
  p_email text,
  p_locale public.locale
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.customers (full_name, phone, email, preferred_language)
  values (btrim(p_full_name), p_phone, btrim(p_email), p_locale)
  on conflict (email_normalized) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id from public.customers c where c.email_normalized = lower(btrim(p_email));
  end if;
  return v_id;
end;
$$;

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
  if not exists (select 1 from public.customers c where c.id = p_customer and c.marketing_consent) then
    insert into public.consent_events (customer_id, consent_type, granted, source, locale)
    values (p_customer, 'marketing_email', true, p_source, p_locale);
  end if;
end;
$$;

create or replace function public.check_submission_rate(p_email text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count int;
begin
  select (select count(*) from public.orders o
           where lower(btrim(o.contact_email)) = lower(btrim(p_email)) and o.created_at > now() - interval '1 hour')
       + (select count(*) from public.catering_requests r
           where lower(btrim(r.contact_email)) = lower(btrim(p_email)) and r.created_at > now() - interval '1 hour')
    into v_count;
  if v_count >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end;
$$;

-- ----------------------------------------------------------- catering ----
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
    coalesce(nullif(p ->> 'reference', ''), public.generate_public_reference('UMC')),
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

-- ------------------------------------------------------------- orders ----
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

  select o.reference, o.order_status, o.payment_status, o.total_fils into v_ref, v_os, v_ps, v_total
    from public.orders o where o.idempotency_key = v_key;
  if found then
    return query select v_ref, v_os, v_ps, v_total, true;
    return;
  end if;

  perform public.check_submission_rate(p #>> '{contact,email}');

  -- Authoritative pricing from the catalog (active, available items in active categories).
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
    coalesce(nullif(p ->> 'reference', ''), public.generate_public_reference('UMD')),
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

-- ------------------------------------------------------------- grants ----
-- Server only. (Supabase's default privileges would otherwise let anon and
-- authenticated users execute new functions.)
revoke execute on function public.upsert_guest_customer(text, text, text, public.locale) from public, anon, authenticated;
revoke execute on function public.record_marketing_opt_in(uuid, text, public.locale) from public, anon, authenticated;
revoke execute on function public.check_submission_rate(text) from public, anon, authenticated;
revoke execute on function public.submit_catering_request(jsonb) from public, anon, authenticated;
revoke execute on function public.submit_guest_order(jsonb) from public, anon, authenticated;
grant execute on function public.submit_catering_request(jsonb) to service_role;
grant execute on function public.submit_guest_order(jsonb) to service_role;
