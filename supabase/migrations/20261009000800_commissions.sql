-- =============================================================================
-- Website commission settings and versioned commission records
-- =============================================================================
-- Owner instructions §7 and PRD P0-F009/F010:
--  * No default commission rate exists anywhere. The rate, calculation basis and
--    refund/cancellation treatment are commercial decisions the owner approves;
--    each setting row records that approval.
--  * Settings are append-only: a change is a new row with a later effective_from.
--  * Commission records are versioned and never rewritten; a recalculation
--    supersedes the previous version so the full history is preserved.
--  * Test (mock) payments never count toward commission (enforced in the app's
--    calculation; inputs are stored on each record for traceability).

create table public.commission_settings (
  id uuid primary key default gen_random_uuid(),
  rate_percent numeric(5, 2) not null check (rate_percent > 0 and rate_percent <= 100),
  basis public.commission_basis not null,
  refund_treatment text not null check (char_length(btrim(refund_treatment)) between 1 and 1000),
  cancellation_treatment text not null check (char_length(btrim(cancellation_treatment)) between 1 and 1000),
  effective_from timestamptz not null unique,
  approval_reference text not null check (char_length(btrim(approval_reference)) between 1 and 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create trigger commission_settings_append_only
  before update or delete on public.commission_settings
  for each row execute function public.reject_modification();
create trigger commission_settings_no_truncate
  before truncate on public.commission_settings
  for each statement execute function public.reject_modification();
create trigger commission_settings_audit after insert on public.commission_settings
  for each row execute function public.audit_row_change();

-- The setting in force at a point in time (null when none is configured).
create or replace function public.commission_setting_at(at_time timestamptz)
returns public.commission_settings
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.commission_settings s
  where s.effective_from <= at_time
  order by s.effective_from desc
  limit 1;
$$;

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  catering_request_id uuid references public.catering_requests (id) on delete restrict,
  setting_id uuid not null references public.commission_settings (id) on delete restrict,
  rate_percent numeric(5, 2) not null check (rate_percent > 0 and rate_percent <= 100),
  basis public.commission_basis not null,
  eligible_amount_fils bigint not null check (eligible_amount_fils >= 0),
  commission_amount_fils bigint not null check (commission_amount_fils >= 0),
  inputs jsonb not null,               -- totals used for the calculation (confirmed, collected, refunded …)
  status public.commission_status not null default 'pending',
  version integer not null check (version >= 1),
  calculated_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint commissions_one_parent check (num_nonnulls(order_id, catering_request_id) = 1),
  constraint commissions_not_above_eligible check (commission_amount_fils <= eligible_amount_fils),
  constraint commissions_order_version_key unique (order_id, version),
  constraint commissions_catering_version_key unique (catering_request_id, version)
);
create index commissions_order_idx on public.commissions (order_id);
create index commissions_catering_idx on public.commissions (catering_request_id);
create index commissions_setting_idx on public.commissions (setting_id);
create index commissions_status_idx on public.commissions (status);
-- Exactly one current (non-superseded) record per order / catering request.
create unique index commissions_one_current_per_order
  on public.commissions (order_id) where superseded_at is null and order_id is not null;
create unique index commissions_one_current_per_catering
  on public.commissions (catering_request_id) where superseded_at is null and catering_request_id is not null;

-- Calculation fields are immutable; only status and superseded_at may change.
create or replace function public.protect_commission_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'commission records cannot be deleted; void or supersede them'
      using errcode = 'insufficient_privilege';
  end if;
  if (new.order_id, new.catering_request_id, new.setting_id, new.rate_percent, new.basis,
      new.eligible_amount_fils, new.commission_amount_fils, new.inputs, new.version, new.calculated_at)
     is distinct from
     (old.order_id, old.catering_request_id, old.setting_id, old.rate_percent, old.basis,
      old.eligible_amount_fils, old.commission_amount_fils, old.inputs, old.version, old.calculated_at) then
    raise exception 'commission calculation fields are immutable; create a new version instead'
      using errcode = 'insufficient_privilege';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then
    raise exception 'a superseded commission record cannot be reactivated'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger commissions_protect
  before update or delete on public.commissions
  for each row execute function public.protect_commission_record();
create trigger commissions_audit after insert or update on public.commissions
  for each row execute function public.audit_row_change();
