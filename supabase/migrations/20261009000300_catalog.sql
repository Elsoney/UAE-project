-- =============================================================================
-- Menu and catering catalog (bilingual)
-- =============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 80),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 120),
  description_en text not null default '' check (char_length(description_en) <= 600),
  description_ar text not null default '' check (char_length(description_ar) <= 600),
  price_fils bigint not null check (price_fils > 0),
  image_path text,                         -- path in the Supabase Storage "menu" bucket
  is_active boolean not null default true, -- false = hidden from the public menu
  is_available boolean not null default true, -- false = shown as unavailable, cannot be ordered
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id);
create index menu_items_active_idx on public.menu_items (is_active, sort_order);

create table public.catering_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 120),
  description_en text not null default '' check (char_length(description_en) <= 1200),
  description_ar text not null default '' check (char_length(description_ar) <= 1200),
  included_items_en text[] not null default '{}',
  included_items_ar text[] not null default '{}',
  terms_en text not null default '' check (char_length(terms_en) <= 2000),
  terms_ar text not null default '' check (char_length(terms_ar) <= 2000),
  base_price_fils bigint not null check (base_price_fils >= 0),
  price_per_guest_fils bigint check (price_per_guest_fils >= 0),
  minimum_guests integer not null check (minimum_guests >= 1),
  maximum_guests integer check (maximum_guests is null or maximum_guests >= minimum_guests),
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catering_packages_active_idx on public.catering_packages (is_active, sort_order);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
create trigger catering_packages_set_updated_at before update on public.catering_packages
  for each row execute function public.set_updated_at();

-- Catalog changes are admin actions: audit updates and deletes.
create trigger categories_audit after update or delete on public.categories
  for each row execute function public.audit_row_change();
create trigger menu_items_audit after update or delete on public.menu_items
  for each row execute function public.audit_row_change();
create trigger catering_packages_audit after update or delete on public.catering_packages
  for each row execute function public.audit_row_change();
