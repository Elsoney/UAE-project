-- =============================================================================
-- TEST-ONLY stand-in for the parts of Supabase the migrations rely on.
-- Never apply this to a real Supabase project (it already has these objects).
-- =============================================================================

-- Supabase API roles
-- Roles are cluster-wide, so create them only once per server.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- Minimal auth schema
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  encrypted_password text,  -- used only by the end-to-end auth stand-in
  created_at timestamptz not null default now()
);

-- Same semantics as Supabase: identity comes from the request JWT claims.
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

create function auth.role() returns text
language sql stable
as $$
  select auth.jwt() ->> 'role';
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase's default privileges: every new table/function/sequence in public is
-- granted to the API roles, so security must come from RLS + explicit revokes.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
