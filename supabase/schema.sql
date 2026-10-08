create extension if not exists "pgcrypto";

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catering_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_price numeric(10,2) not null,
  guest_range text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  status text not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'AED',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid,
  item_name text not null,
  qty integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.catering_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  event_date date,
  guest_count integer,
  notes text,
  status text not null default 'pending_review',
  deposit_amount numeric(10,2) default 0,
  total_amount numeric(10,2) default 0,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  catering_request_id uuid references public.catering_requests(id) on delete set null,
  provider text not null,
  provider_reference text,
  amount numeric(10,2) not null,
  currency text not null default 'AED',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commission_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  catering_request_id uuid references public.catering_requests(id) on delete set null,
  rate numeric(5,2) not null default 0,
  base_amount numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_active_idx on public.menu_items (is_active);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists catering_requests_status_idx on public.catering_requests (status);
create index if not exists payments_status_idx on public.payments (status);

alter table public.menu_items enable row level security;
alter table public.catering_packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.catering_requests enable row level security;
alter table public.payments enable row level security;
alter table public.commission_records enable row level security;
alter table public.admin_users enable row level security;

create policy "Public menu items are viewable by anyone"
on public.menu_items for select
using (is_active = true);

create policy "Public catering packages are viewable by anyone"
on public.catering_packages for select
using (is_active = true);

create policy "Authenticated admins can manage orders"
on public.orders for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage order items"
on public.order_items for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage catering requests"
on public.catering_requests for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage payments"
on public.payments for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage commission records"
on public.commission_records for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated admins can manage admin users"
on public.admin_users for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
