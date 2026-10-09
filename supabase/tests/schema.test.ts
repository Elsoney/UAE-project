import { describe, expect, it } from "vitest";
import { useTestDb } from "./helpers";

const db = useTestDb();

describe("migrations", () => {
  it("apply cleanly and create every expected table", async () => {
    const rows = await db().rows<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(rows.map((r) => r.tablename)).toEqual(
      [
        "admin_users",
        "audit_log",
        "blocked_dates",
        "catering_packages",
        "catering_requests",
        "categories",
        "commission_settings",
        "commissions",
        "consent_events",
        "customers",
        "email_outbox",
        "menu_items",
        "order_items",
        "orders",
        "payment_events",
        "payment_requests",
        "payments",
        "refunds",
        "status_history",
      ].sort(),
    );
  });

  it("enable Row Level Security on every public table", async () => {
    const rows = await db().rows<{ relname: string }>(
      `select c.relname
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });

  it("leave anon and authenticated with no privileges on tables that were not explicitly granted", async () => {
    // Guards against a future table silently inheriting Supabase's broad default grants.
    const rows = await db().rows<{ table_name: string; grantee: string; privilege_type: string }>(
      `select table_name, grantee, privilege_type
         from information_schema.role_table_grants
        where table_schema = 'public'
          and grantee in ('anon', 'authenticated')
        order by 1, 2, 3`,
    );
    const anon = rows.filter((r) => r.grantee === "anon");
    expect(new Set(anon.map((r) => r.privilege_type))).toEqual(new Set(["SELECT"]));
    expect(new Set(anon.map((r) => r.table_name))).toEqual(
      new Set(["categories", "menu_items", "catering_packages"]),
    );
    const authDelete = rows.filter((r) => r.grantee === "authenticated" && r.privilege_type === "DELETE");
    expect(new Set(authDelete.map((r) => r.table_name))).toEqual(
      new Set(["categories", "menu_items", "catering_packages", "blocked_dates"]),
    );
    const authInsert = rows.filter((r) => r.grantee === "authenticated" && r.privilege_type === "INSERT");
    expect(new Set(authInsert.map((r) => r.table_name))).toEqual(
      new Set(["categories", "menu_items", "catering_packages", "blocked_dates"]),
    );
  });

  it("load the placeholder seed catalog", async () => {
    const [counts] = await db().rows<{ categories: string; items: string; packages: string }>(
      `select (select count(*) from public.categories) as categories,
              (select count(*) from public.menu_items) as items,
              (select count(*) from public.catering_packages) as packages`,
    );
    expect(counts).toEqual({ categories: "4", items: "12", packages: "3" });
  });

  it("do not configure any commission rate by default", async () => {
    const rows = await db().rows("select * from public.commission_settings");
    expect(rows).toEqual([]);
  });

  it("seed no customer, order or staff data", async () => {
    const [counts] = await db().rows<Record<string, string>>(
      `select (select count(*) from public.customers) as customers,
              (select count(*) from public.orders) as orders,
              (select count(*) from public.catering_requests) as catering,
              (select count(*) from public.admin_users) as staff`,
    );
    expect(counts).toEqual({ customers: "0", orders: "0", catering: "0", staff: "0" });
  });
});
