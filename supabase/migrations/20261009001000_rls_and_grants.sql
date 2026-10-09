-- =============================================================================
-- Row Level Security and privileges (least privilege)
-- =============================================================================
-- Replaces the old "any authenticated user can do anything" policies.
--
-- Roles:
--   anon               public visitor (not signed in)
--   authenticated      signed-in Supabase user; NOT staff unless listed in admin_users
--   admin              restaurant administrator (admin_users.role = 'admin')
--   operations_owner   website & operations owner (admin_users.role = 'operations_owner')
--   service_role       trusted server code only (bypasses RLS); never shipped to browsers
--
-- Principles:
--  * Customers use guest checkout. They have NO direct table access: orders,
--    catering requests, customers, payments and emails are written by server
--    code with the service role after validation. Knowing an email address
--    never grants access to anything.
--  * Privileges are granted per table and per column on top of RLS (defence
--    in depth). New tables get no anon/authenticated access unless granted here.
--  * Nobody can grant themselves a role: admin_users has no write policy.
--  * Money-moving and attribution changes (payments, refunds, payment
--    requests, commission records) are server-only; staff can read them.

-- ------------------------------------------------------------ enable RLS ----
alter table public.admin_users        enable row level security;
alter table public.categories         enable row level security;
alter table public.menu_items         enable row level security;
alter table public.catering_packages  enable row level security;
alter table public.customers          enable row level security;
alter table public.consent_events     enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.blocked_dates      enable row level security;
alter table public.catering_requests  enable row level security;
alter table public.payment_requests   enable row level security;
alter table public.payments           enable row level security;
alter table public.payment_events     enable row level security;
alter table public.refunds            enable row level security;
alter table public.commission_settings enable row level security;
alter table public.commissions        enable row level security;
alter table public.email_outbox       enable row level security;
alter table public.status_history     enable row level security;
alter table public.audit_log          enable row level security;

-- ----------------------------------------------------- baseline: no access ----
-- Supabase grants broad default privileges to anon/authenticated on new
-- tables. Revoke them and grant back only what each role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Pure validation helpers used by CHECK constraints.
grant execute on function public.is_valid_email(text) to anon, authenticated;
grant execute on function public.is_valid_e164(text) to anon, authenticated;

-- Role helpers used by policies.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_admin_role(public.admin_role) to authenticated;
grant execute on function public.current_admin_role() to authenticated;

-- Public, privacy-safe availability lookup.
grant execute on function public.get_blocked_dates(date, date) to anon, authenticated;

-- Operations-owner tools (each checks the role internally as well).
grant execute on function public.correct_source(text, uuid, public.order_source, text) to authenticated;
grant execute on function public.commission_setting_at(timestamptz) to authenticated;

-- ------------------------------------------------------------ admin_users ----
grant select on public.admin_users to authenticated;

create policy "Staff read own staff record; operations owner reads all"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or public.has_admin_role('operations_owner'));
-- No insert/update/delete policies: only the service role manages staff.

-- ---------------------------------------------------------------- catalog ----
grant select on public.categories, public.menu_items, public.catering_packages to anon, authenticated;
grant insert, update, delete on public.categories, public.menu_items, public.catering_packages to authenticated;

create policy "Public reads active categories"
  on public.categories for select to anon, authenticated
  using (is_active);
create policy "Staff read all categories"
  on public.categories for select to authenticated
  using (public.is_admin());
create policy "Admins insert categories"
  on public.categories for insert to authenticated
  with check (public.has_admin_role('admin'));
create policy "Admins update categories"
  on public.categories for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));
create policy "Admins delete categories"
  on public.categories for delete to authenticated
  using (public.has_admin_role('admin'));

create policy "Public reads active menu items in active categories"
  on public.menu_items for select to anon, authenticated
  using (
    is_active
    and exists (select 1 from public.categories c where c.id = category_id and c.is_active)
  );
create policy "Staff read all menu items"
  on public.menu_items for select to authenticated
  using (public.is_admin());
create policy "Admins insert menu items"
  on public.menu_items for insert to authenticated
  with check (public.has_admin_role('admin'));
create policy "Admins update menu items"
  on public.menu_items for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));
create policy "Admins delete menu items"
  on public.menu_items for delete to authenticated
  using (public.has_admin_role('admin'));

create policy "Public reads active catering packages"
  on public.catering_packages for select to anon, authenticated
  using (is_active);
create policy "Staff read all catering packages"
  on public.catering_packages for select to authenticated
  using (public.is_admin());
create policy "Admins insert catering packages"
  on public.catering_packages for insert to authenticated
  with check (public.has_admin_role('admin'));
create policy "Admins update catering packages"
  on public.catering_packages for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));
create policy "Admins delete catering packages"
  on public.catering_packages for delete to authenticated
  using (public.has_admin_role('admin'));

-- -------------------------------------------------------------- customers ----
-- Staff may read customers; restaurant admins may correct name/phone/language.
-- Email (the identity key) and consent fields are not editable here.
grant select on public.customers to authenticated;
grant update (full_name, phone, preferred_language) on public.customers to authenticated;

create policy "Staff read customers"
  on public.customers for select to authenticated
  using (public.is_admin());
create policy "Admins correct customer contact details"
  on public.customers for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));

grant select on public.consent_events to authenticated;
create policy "Staff read consent history"
  on public.consent_events for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------- orders ----
-- Orders are created by the server. Restaurant admins may move the operational
-- status and add notes; they cannot change amounts, attribution, payment status
-- or the customer link.
grant select on public.orders, public.order_items to authenticated;
grant update (order_status, admin_notes, cancellation_reason, cancelled_at) on public.orders to authenticated;

create policy "Staff read orders"
  on public.orders for select to authenticated
  using (public.is_admin());
create policy "Admins update order status"
  on public.orders for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));
create policy "Staff read order items"
  on public.order_items for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- catering ----
grant select, insert, update, delete on public.blocked_dates to authenticated;

create policy "Staff read blocked dates"
  on public.blocked_dates for select to authenticated
  using (public.is_admin());
create policy "Admins insert blocked dates"
  on public.blocked_dates for insert to authenticated
  with check (public.has_admin_role('admin'));
create policy "Admins update blocked dates"
  on public.blocked_dates for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));
create policy "Admins delete blocked dates"
  on public.blocked_dates for delete to authenticated
  using (public.has_admin_role('admin'));

-- Restaurant admins review requests: status, notes, confirmed event details,
-- the agreed price and the payment requirement. Not: customer link, contact
-- snapshot, attribution or payment status.
grant select on public.catering_requests to authenticated;
grant update (
  status, admin_notes, quoted_total_fils, deposit_type, deposit_percentage, deposit_fixed_fils,
  event_date, event_time, guest_count, event_location, package_id, custom_request,
  reviewed_by, confirmed_at, cancellation_reason
) on public.catering_requests to authenticated;

create policy "Staff read catering requests"
  on public.catering_requests for select to authenticated
  using (public.is_admin());
create policy "Admins review catering requests"
  on public.catering_requests for update to authenticated
  using (public.has_admin_role('admin')) with check (public.has_admin_role('admin'));

-- --------------------------------------------------------------- payments ----
-- Read-only for staff. Payment requests, payments and refunds are created by
-- server actions (which verify the staff role) and verified webhooks.
grant select on public.payment_requests, public.payments, public.refunds, public.payment_events to authenticated;

create policy "Staff read payment requests"
  on public.payment_requests for select to authenticated
  using (public.is_admin());
create policy "Staff read payments"
  on public.payments for select to authenticated
  using (public.is_admin());
create policy "Staff read refunds"
  on public.refunds for select to authenticated
  using (public.is_admin());
create policy "Staff read payment events"
  on public.payment_events for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------ commissions ----
-- Commission configuration and records belong to the website & operations
-- owner. (Restaurant-admin visibility is an owner decision; default: none.)
grant select on public.commission_settings, public.commissions to authenticated;
grant insert (
  rate_percent, basis, refund_treatment, cancellation_treatment,
  effective_from, approval_reference, created_by
) on public.commission_settings to authenticated;

create policy "Operations owner reads commission settings"
  on public.commission_settings for select to authenticated
  using (public.has_admin_role('operations_owner'));
create policy "Operations owner adds commission settings"
  on public.commission_settings for insert to authenticated
  with check (public.has_admin_role('operations_owner') and created_by = (select auth.uid()));
create policy "Operations owner reads commissions"
  on public.commissions for select to authenticated
  using (public.has_admin_role('operations_owner'));

-- ------------------------------------------------------ emails & history ----
grant select on public.email_outbox, public.status_history to authenticated;

create policy "Staff read email outbox"
  on public.email_outbox for select to authenticated
  using (public.is_admin());
create policy "Staff read status history"
  on public.status_history for select to authenticated
  using (public.is_admin());

grant select on public.audit_log to authenticated;
create policy "Operations owner reads audit log"
  on public.audit_log for select to authenticated
  using (public.has_admin_role('operations_owner'));
