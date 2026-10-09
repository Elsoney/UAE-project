-- =============================================================================
-- Regular restaurant orders (guest checkout)
-- =============================================================================
-- Orders are created only by the server (service role) after recomputing prices
-- from menu_items — client-side prices are never trusted. Amounts are AED fils.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.generate_public_reference('UMD'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  -- What the customer submitted, kept even if the customer profile changes later.
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 120),
  contact_phone text not null check (public.is_valid_e164(contact_phone)),
  contact_email text not null check (public.is_valid_email(btrim(contact_email))),
  locale public.locale not null default 'ar',
  order_type public.order_type not null,
  source public.order_source not null default 'website',
  subtotal_fils bigint not null check (subtotal_fils >= 0),
  discount_fils bigint not null default 0 check (discount_fils >= 0),
  delivery_fee_fils bigint not null default 0 check (delivery_fee_fils >= 0),
  total_fils bigint not null check (total_fils >= 0),
  currency text not null default 'AED' check (currency = 'AED'),
  order_status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'unpaid',
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 500),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 1000),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  cancelled_at timestamptz,
  idempotency_key text unique check (idempotency_key is null or char_length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_discount_not_above_subtotal check (discount_fils <= subtotal_fils),
  constraint orders_total_consistent
    check (total_fils = subtotal_fils - discount_fils + delivery_fee_fils),
  constraint orders_delivery_needs_address
    check (order_type <> 'delivery' or nullif(btrim(delivery_address), '') is not null),
  constraint orders_cancelled_consistent
    check ((order_status = 'cancelled') = (cancelled_at is not null))
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (order_status, created_at desc);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_source_idx on public.orders (source);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  name_en text not null,   -- snapshot at order time
  name_ar text not null,   -- snapshot at order time
  quantity integer not null check (quantity between 1 and 100),
  unit_price_fils bigint not null check (unit_price_fils > 0),
  total_price_fils bigint not null check (total_price_fils >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_total_consistent check (total_price_fils = quantity * unit_price_fils)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger orders_protect_source before update on public.orders
  for each row execute function public.protect_source();
create trigger orders_status_history after insert or update on public.orders
  for each row execute function public.record_status_history();
create trigger orders_audit after update or delete on public.orders
  for each row execute function public.audit_row_change();

-- An order's subtotal must equal the sum of its items, checked at commit so an
-- order and its items can be inserted in one transaction. An order must have
-- at least one item.
create or replace function public.check_order_subtotal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_subtotal bigint;
  v_items_total bigint;
  v_item_count int;
begin
  if tg_table_name = 'orders' then
    v_order_id := new.id;
  elsif tg_op = 'DELETE' then
    v_order_id := old.order_id;
  else
    v_order_id := new.order_id;
  end if;

  select o.subtotal_fils into v_subtotal from public.orders o where o.id = v_order_id;
  if not found then
    return null; -- order itself was removed; nothing to check
  end if;

  select coalesce(sum(i.total_price_fils), 0), count(*)
    into v_items_total, v_item_count
    from public.order_items i
   where i.order_id = v_order_id;

  if v_item_count = 0 then
    raise exception 'order % has no items', v_order_id using errcode = 'check_violation';
  end if;
  if v_items_total <> v_subtotal then
    raise exception 'order % subtotal (%) does not match its items (%)', v_order_id, v_subtotal, v_items_total
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger orders_subtotal_matches_items
  after insert or update of subtotal_fils on public.orders
  deferrable initially deferred
  for each row execute function public.check_order_subtotal();

create constraint trigger order_items_subtotal_matches_order
  after insert or update or delete on public.order_items
  deferrable initially deferred
  for each row execute function public.check_order_subtotal();

-- Order line items are immutable once written (corrections = cancel + new order).
create trigger order_items_immutable
  before update on public.order_items
  for each row execute function public.reject_modification();
