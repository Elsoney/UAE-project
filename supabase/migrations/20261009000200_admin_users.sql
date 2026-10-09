-- =============================================================================
-- Staff identities and role checks
-- =============================================================================
-- Staff sign in through Supabase Auth. A user is staff only if a row exists
-- here. Rows can be created/changed ONLY by the service role (server-side
-- tooling run by the owner) — no policy lets a signed-in user grant
-- themselves a role.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create trigger admin_users_audit
  after insert or update or delete on public.admin_users
  for each row execute function public.audit_row_change();

-- True when the current user is an active staff member (any role).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active
  );
$$;

-- True when the current user is an active staff member with the given role.
create or replace function public.has_admin_role(required public.admin_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
      and a.is_active
      and a.role = required
  );
$$;

-- Role of the current user, or null when not active staff.
create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select a.role
  from public.admin_users a
  where a.user_id = (select auth.uid())
    and a.is_active;
$$;
