-- =============================================================================
-- Umodai — enums, shared helper functions, audit & status-history infrastructure
-- =============================================================================
-- Enum values are canonical: the TypeScript domain layer
-- (frontend/src/lib/domain/status.ts) and frontend/src/types/database.ts
-- mirror them exactly. Change both together.

-- ---------------------------------------------------------------- enums ----
create type public.locale as enum ('ar', 'en');

-- admin = restaurant administrator; operations_owner = website & operations owner
create type public.admin_role as enum ('admin', 'operations_owner');

create type public.order_type as enum ('pickup', 'delivery');
create type public.order_source as enum ('website', 'phone', 'walk_in', 'other');

create type public.order_status as enum (
  'new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
);

create type public.catering_status as enum (
  'pending_review', 'customer_contacted', 'quoted', 'awaiting_payment',
  'confirmed', 'preparing', 'completed', 'rejected', 'cancelled'
);

-- Payment state is tracked separately from operational state (PRD P0-F008).
create type public.payment_status as enum (
  'unpaid', 'payment_requested', 'deposit_paid', 'partially_paid',
  'fully_paid', 'payment_failed', 'partially_refunded', 'refunded'
);

-- Admin's payment requirement for a catering request (owner instructions §5).
create type public.deposit_type as enum ('none', 'fixed', 'percentage', 'full');

create type public.payment_request_kind as enum ('deposit', 'balance', 'full');
create type public.payment_request_status as enum (
  'pending', 'paid', 'expired', 'cancelled', 'failed', 'superseded'
);
create type public.payment_txn_status as enum ('pending', 'succeeded', 'failed', 'cancelled');
create type public.refund_status as enum ('pending', 'succeeded', 'failed');

create type public.commission_basis as enum ('gross', 'collected', 'net_of_refunds');
create type public.commission_status as enum ('pending', 'confirmed', 'void');

create type public.email_status as enum ('queued', 'sending', 'sent', 'failed');
create type public.consent_type as enum ('marketing_email');

-- ------------------------------------------------------- generic helpers ----

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Human-friendly public reference, e.g. UMD-7K4Q2XRM.
-- Alphabet excludes ambiguous characters (0, 1, I, L, O).
-- Uniqueness is enforced by a UNIQUE constraint on the column using it.
create or replace function public.generate_public_reference(prefix text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := uuid_send(gen_random_uuid());
  result text := '';
  i int;
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return prefix || '-' || result;
end;
$$;

-- Basic e-mail shape check shared by every table that stores an address.
create or replace function public.is_valid_email(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
     and char_length(value) <= 254
     and value ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$';
$$;

-- Phone numbers are stored normalised to E.164 (e.g. +971501234567).
create or replace function public.is_valid_e164(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null and value ~ '^\+[1-9][0-9]{7,14}$';
$$;

-- Rejects any UPDATE/DELETE/TRUNCATE: used to make history tables append-only.
-- Triggers apply to every role, including the service role.
create or replace function public.reject_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- -------------------------------------------------- audit infrastructure ----
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,                          -- auth.uid() of the acting user; null for service/system
  actor_role text not null,            -- database role that performed the change
  action text not null,                -- INSERT / UPDATE / DELETE or a named action
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function public.reject_modification();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.reject_modification();

-- The API role that is acting (anon / authenticated / service_role), even
-- inside SECURITY DEFINER functions where current_user is the function owner.
create or replace function public.acting_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('role', true), 'none'),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    session_user
  );
$$;

-- Generic row-audit trigger. SECURITY DEFINER so it can write audit_log even
-- though callers have no INSERT privilege on it.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old) ->> 'id')::uuid;
  else
    v_id := (to_jsonb(new) ->> 'id')::uuid;
  end if;

  insert into public.audit_log (actor, actor_role, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    public.acting_role(),
    tg_op,
    tg_table_name,
    v_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------- status history (append) ----
create table public.status_history (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('order', 'catering_request')),
  entity_id uuid not null,
  field text not null check (field in ('status', 'payment_status')),
  old_value text,
  new_value text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  note text
);
create index status_history_entity_idx on public.status_history (entity_type, entity_id, changed_at);

create trigger status_history_append_only
  before update or delete on public.status_history
  for each row execute function public.reject_modification();
create trigger status_history_no_truncate
  before truncate on public.status_history
  for each statement execute function public.reject_modification();

-- Records operational and payment status changes for orders and catering requests.
create or replace function public.record_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := case tg_table_name when 'orders' then 'order' else 'catering_request' end;
  v_new_status text;
  v_old_status text;
begin
  if tg_table_name = 'orders' then
    v_new_status := new.order_status::text;
    v_old_status := case when tg_op = 'UPDATE' then old.order_status::text end;
  else
    v_new_status := new.status::text;
    v_old_status := case when tg_op = 'UPDATE' then old.status::text end;
  end if;

  if tg_op = 'INSERT' or v_new_status is distinct from v_old_status then
    insert into public.status_history (entity_type, entity_id, field, old_value, new_value, changed_by)
    values (v_entity, new.id, 'status', v_old_status, v_new_status, auth.uid());
  end if;

  if tg_op = 'INSERT' or new.payment_status is distinct from old.payment_status then
    insert into public.status_history (entity_type, entity_id, field, old_value, new_value, changed_by)
    values (
      v_entity, new.id, 'payment_status',
      case when tg_op = 'UPDATE' then old.payment_status::text end,
      new.payment_status::text,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

-- --------------------------------------------- attribution immutability ----
-- `source` (website attribution, PRD P0-F009) is fixed at creation. The only
-- way to correct it is public.correct_source(), which sets a transaction-local
-- flag, is restricted to the operations owner and writes an audit entry.
create or replace function public.protect_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source is distinct from old.source
     and coalesce(current_setting('umodai.allow_source_correction', true), '') <> 'on' then
    raise exception 'source is immutable once recorded (use public.correct_source)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
