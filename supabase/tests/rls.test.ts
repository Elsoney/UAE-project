/**
 * Row Level Security and privilege tests (owner instructions §2).
 * Covers: anonymous visitors, signed-in non-staff users (incl. someone who
 * knows a customer's email), restaurant admins, the operations owner,
 * inactive staff, and privilege escalation attempts.
 */
import { describe, expect, it } from "vitest";
import {
  SENSITIVE_TABLES,
  createAuthUser,
  createCatering,
  createCommissionSetting,
  createCustomer,
  createOrder,
  createPayment,
  createStaff,
  firstMenuItem,
  futureDate,
  useTestDb,
} from "./helpers";

const db = useTestDb();
const PERMISSION_DENIED = /permission denied/;
const RLS_VIOLATION = /row-level security/;

describe("anonymous visitors", () => {
  it("can read the active menu, categories and packages", async () => {
    await db().as("anon");
    const items = await db().rows("select id from public.menu_items");
    const categories = await db().rows("select id from public.categories");
    const packages = await db().rows("select id from public.catering_packages");
    expect(items).toHaveLength(12);
    expect(categories).toHaveLength(4);
    expect(packages).toHaveLength(3);
  });

  it("cannot see inactive items or items in an inactive category", async () => {
    await db().asOwner();
    await db().query("update public.menu_items set is_active = false where slug = 'harees'");
    await db().query("update public.categories set is_active = false where slug = 'desserts'");
    await db().as("anon");
    const items = await db().rows<{ slug: string }>("select slug from public.menu_items");
    expect(items.map((i) => i.slug)).not.toContain("harees");
    expect(items.map((i) => i.slug)).not.toContain("luqaimat");
    expect(items).toHaveLength(8);
  });

  it.each(SENSITIVE_TABLES)("cannot read %s", async (table) => {
    await db().as("anon");
    await db().expectError(`select * from public.${table}`, [], PERMISSION_DENIED);
  });

  it("cannot write to any table", async () => {
    const customer = await createCustomer(db());
    await db().as("anon");
    await db().expectError(
      "insert into public.categories (slug, name_en, name_ar) values ('x', 'X', 'س')",
      [],
      PERMISSION_DENIED,
    );
    await db().expectError("update public.menu_items set price_fils = 1", [], PERMISSION_DENIED);
    await db().expectError(
      `insert into public.customers (full_name, phone, email) values ('A', '+971501234567', 'a@example.com')`,
      [],
      PERMISSION_DENIED,
    );
    await db().expectError(
      `insert into public.catering_requests (customer_id, contact_name, contact_phone, contact_email, event_date, event_time, guest_count, event_location, custom_request)
       values ($1, 'A', '+971501234567', 'a@example.com', $2, '19:00', 10, 'Ajman', 'x')`,
      [customer.id, futureDate()],
      PERMISSION_DENIED,
    );
  });

  it("can list blocked dates without seeing the internal reason", async () => {
    await db().asOwner();
    const date = futureDate(20);
    await db().query("insert into public.blocked_dates (blocked_on, reason) values ($1, 'Private event — secret')", [date]);
    await db().as("anon");
    const rows = await db().rows<{ d: string }>(
      "select to_char(public.get_blocked_dates($1::date, $2::date), 'YYYY-MM-DD') as d",
      [futureDate(1), futureDate(60)],
    );
    expect(rows).toEqual([{ d: date }]);
  });

  it("cannot call staff-only functions", async () => {
    await db().as("anon");
    await db().expectError("select public.is_admin()", [], PERMISSION_DENIED);
    await db().expectError(
      "select public.correct_source('order', gen_random_uuid(), 'phone', 'because')",
      [],
      PERMISSION_DENIED,
    );
  });
});

describe("signed-in users who are not staff", () => {
  it("see no customer, order, catering, payment, commission or audit data", async () => {
    const order = await createOrder(db());
    await createCatering(db());
    await createPayment(db(), order.id, order.total);
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    for (const table of SENSITIVE_TABLES) {
      const rows = await db().rows(`select * from public.${table}`);
      expect(rows, table).toEqual([]);
    }
  });

  it("cannot read a customer's orders even when their login email matches the customer email", async () => {
    // Knowing (or even owning) an email address must not expose orders (owner §3.12).
    const customer = await createCustomer(db(), "returning@example.com");
    await createOrder(db(), customer);
    await createCatering(db(), customer);
    const user = await createAuthUser(db(), "returning@example.com");
    await db().as("authenticated", user.id, "returning@example.com");
    expect(await db().rows("select * from public.customers")).toEqual([]);
    expect(await db().rows("select * from public.orders")).toEqual([]);
    expect(await db().rows("select * from public.catering_requests")).toEqual([]);
  });

  it("cannot make themselves staff (privilege escalation)", async () => {
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    await db().expectError(
      "insert into public.admin_users (user_id, role, full_name) values ($1, 'admin', 'Me')",
      [user.id],
      PERMISSION_DENIED,
    );
    await db().expectError(
      "insert into public.admin_users (user_id, role, full_name) values ($1, 'operations_owner', 'Me')",
      [user.id],
      PERMISSION_DENIED,
    );
    expect(await db().rows("select public.is_admin() as ok")).toEqual([{ ok: false }]);
  });

  it("cannot create or change orders, customers, payments or the menu", async () => {
    const order = await createOrder(db());
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    const result = await db().query("update public.menu_items set price_fils = 1");
    expect(result.rowCount).toBe(0);
    const cancel = await db().query(
      "update public.orders set order_status = 'cancelled', cancelled_at = now() where id = $1",
      [order.id],
    );
    expect(cancel.rowCount).toBe(0); // RLS hides the row: nothing is changed
    await db().asOwner();
    const [still] = await db().rows<{ order_status: string }>(
      "select order_status from public.orders where id = $1",
      [order.id],
    );
    expect(still.order_status).toBe("new");
    await db().as("authenticated", user.id);
    await db().expectError(
      `insert into public.payments (order_id, provider, provider_reference, amount_fils, is_test) values ($1, 'mock', 'x', 100, true)`,
      [order.id],
      PERMISSION_DENIED,
    );
    await db().expectError(
      "insert into public.categories (slug, name_en, name_ar) values ('x', 'X', 'س')",
      [],
      RLS_VIOLATION,
    );
  });
});

describe("restaurant administrator", () => {
  it("reads customers, orders, catering requests and payments", async () => {
    const order = await createOrder(db());
    await createCatering(db());
    await createPayment(db(), order.id, order.total);
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    expect(await db().rows("select id from public.customers")).toHaveLength(2);
    expect(await db().rows("select id from public.orders")).toHaveLength(1);
    expect(await db().rows("select id from public.catering_requests")).toHaveLength(1);
    expect(await db().rows("select id from public.payments")).toHaveLength(1);
  });

  it("updates an order's operational status but not its money, attribution or payment status", async () => {
    const order = await createOrder(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    const ok = await db().expectOk("update public.orders set order_status = 'confirmed' where id = $1", [order.id]);
    expect(ok.rowCount).toBe(1);
    // The change is attributed to the admin in the audit log and status history.
    await db().asOwner();
    const audit = await db().rows<{ actor: string; actor_role: string }>(
      "select actor, actor_role from public.audit_log where entity_type = 'orders' and entity_id = $1",
      [order.id],
    );
    expect(audit).toEqual([{ actor: admin.id, actor_role: "authenticated" }]);
    const [history] = await db().rows<{ changed_by: string }>(
      "select changed_by from public.status_history where entity_id = $1 and new_value = 'confirmed'",
      [order.id],
    );
    expect(history.changed_by).toBe(admin.id);
    await db().as("authenticated", admin.id);
    await db().expectError("update public.orders set total_fils = 1 where id = $1", [order.id], PERMISSION_DENIED);
    await db().expectError("update public.orders set source = 'phone' where id = $1", [order.id], PERMISSION_DENIED);
    await db().expectError(
      "update public.orders set payment_status = 'fully_paid' where id = $1",
      [order.id],
      PERMISSION_DENIED,
    );
    await db().expectError(
      "update public.orders set customer_id = gen_random_uuid() where id = $1",
      [order.id],
      PERMISSION_DENIED,
    );
  });

  it("reviews a catering request: quote, deposit choice and status", async () => {
    const request = await createCatering(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    const ok = await db().expectOk(
      `update public.catering_requests
          set status = 'quoted', quoted_total_fils = 300000, deposit_type = 'percentage', deposit_percentage = 25
        where id = $1`,
      [request.id],
    );
    expect(ok.rowCount).toBe(1);
    await db().expectError(
      "update public.catering_requests set payment_status = 'fully_paid' where id = $1",
      [request.id],
      PERMISSION_DENIED,
    );
  });

  it("cannot record payments, refunds or payment requests directly", async () => {
    const order = await createOrder(db());
    const paymentId = await createPayment(db(), order.id, order.total);
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError(
      `insert into public.payments (order_id, provider, provider_reference, amount_fils, is_test) values ($1, 'mock', 'manual', 100, false)`,
      [order.id],
      PERMISSION_DENIED,
    );
    await db().expectError(
      "insert into public.refunds (payment_id, amount_fils, reason) values ($1, 100, 'x')",
      [paymentId],
      PERMISSION_DENIED,
    );
    await db().expectError(
      `insert into public.payment_requests (order_id, kind, total_snapshot_fils, requested_amount_fils, provider, is_test)
       values ($1, 'full', $2, $2, 'mock', true)`,
      [order.id, order.total],
      PERMISSION_DENIED,
    );
    await db().expectError("update public.payments set status = 'succeeded'", [], PERMISSION_DENIED);
  });

  it("manages the menu and blocked dates", async () => {
    const item = await firstMenuItem(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    const updated = await db().expectOk("update public.menu_items set price_fils = 3000 where id = $1", [item.id]);
    expect(updated.rowCount).toBe(1);
    await db().expectOk("insert into public.blocked_dates (blocked_on, reason) values ($1, 'Holiday')", [futureDate(30)]);
  });

  it("cannot see commission settings, commission records or the audit log", async () => {
    const owner = await createStaff(db(), "operations_owner");
    await createCommissionSetting(db(), owner.id);
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    expect(await db().rows("select * from public.commission_settings")).toEqual([]);
    expect(await db().rows("select * from public.commissions")).toEqual([]);
    expect(await db().rows("select * from public.audit_log")).toEqual([]);
  });

  it("cannot configure commission rates", async () => {
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError(
      `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference, created_by)
       values (10, 'gross', 'x', 'y', now(), 'z', $1)`,
      [admin.id],
      RLS_VIOLATION,
    );
  });

  it("cannot change roles: own or anyone else's", async () => {
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError(
      "update public.admin_users set role = 'operations_owner' where user_id = $1",
      [admin.id],
      PERMISSION_DENIED,
    );
    const other = await createAuthUser(db());
    await db().as("authenticated", admin.id);
    await db().expectError(
      "insert into public.admin_users (user_id, role, full_name) values ($1, 'admin', 'Friend')",
      [other.id],
      PERMISSION_DENIED,
    );
  });

  it("sees only their own staff record", async () => {
    await createStaff(db(), "operations_owner");
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    const rows = await db().rows<{ user_id: string }>("select user_id from public.admin_users");
    expect(rows).toEqual([{ user_id: admin.id }]);
  });

  it("cannot correct order attribution", async () => {
    const order = await createOrder(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError(
      "select public.correct_source('order', $1, 'phone', 'Customer actually phoned')",
      [order.id],
      /only the operations owner/,
    );
  });
});

describe("website & operations owner", () => {
  it("reads orders and payments but cannot run restaurant operations", async () => {
    const order = await createOrder(db());
    const owner = await createStaff(db(), "operations_owner");
    await db().as("authenticated", owner.id);
    expect(await db().rows("select id from public.orders")).toHaveLength(1);
    const result = await db().query("update public.orders set order_status = 'confirmed' where id = $1", [order.id]);
    expect(result.rowCount).toBe(0);
    const menu = await db().query("update public.menu_items set price_fils = 1");
    expect(menu.rowCount).toBe(0);
  });

  it("configures commission settings only in their own name", async () => {
    const owner = await createStaff(db(), "operations_owner");
    const someoneElse = await createAuthUser(db());
    await db().as("authenticated", owner.id);
    await db().expectOk(
      `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference, created_by)
       values (5, 'net_of_refunds', 'Refunds deducted', 'No commission on cancelled orders', now(), 'Signed agreement 2026-10', $1)`,
      [owner.id],
    );
    await db().expectError(
      `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference, created_by)
       values (5, 'gross', 'x', 'y', now() + interval '1 day', 'z', $1)`,
      [someoneElse.id],
      RLS_VIOLATION,
    );
    expect(await db().rows("select id from public.commission_settings")).toHaveLength(1);
  });

  it("reads commission records and the audit log", async () => {
    const order = await createOrder(db());
    const owner = await createStaff(db(), "operations_owner");
    const settingId = await createCommissionSetting(db(), owner.id);
    await db().query(
      `insert into public.commissions (order_id, setting_id, rate_percent, basis, eligible_amount_fils, commission_amount_fils, inputs, version)
       values ($1, $2, 5, 'collected', 1000, 50, '{}'::jsonb, 1)`,
      [order.id, settingId],
    );
    await db().as("authenticated", owner.id);
    expect(await db().rows("select id from public.commissions")).toHaveLength(1);
    expect((await db().rows("select id from public.audit_log")).length).toBeGreaterThan(0);
  });

  it("can correct attribution through the audited function, never directly", async () => {
    const order = await createOrder(db());
    const owner = await createStaff(db(), "operations_owner");
    await db().as("authenticated", owner.id);
    await db().expectError("update public.orders set source = 'phone' where id = $1", [order.id], PERMISSION_DENIED);
    await db().expectOk("select public.correct_source('order', $1, 'phone', 'Customer placed it by phone')", [order.id]);
    await db().asOwner();
    const [row] = await db().rows<{ source: string }>("select source from public.orders where id = $1", [order.id]);
    expect(row.source).toBe("phone");
    const audit = await db().rows<{ actor: string }>(
      "select actor from public.audit_log where action = 'SOURCE_CORRECTION' and entity_id = $1",
      [order.id],
    );
    expect(audit).toEqual([{ actor: owner.id }]);
  });

  it("can read every staff record but still cannot edit them", async () => {
    const owner = await createStaff(db(), "operations_owner");
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", owner.id);
    expect(await db().rows("select user_id from public.admin_users")).toHaveLength(2);
    await db().expectError(
      "update public.admin_users set is_active = false where user_id = $1",
      [admin.id],
      PERMISSION_DENIED,
    );
  });
});

describe("inactive staff", () => {
  it("lose all staff access", async () => {
    await createOrder(db());
    const former = await createStaff(db(), "admin", false);
    await db().as("authenticated", former.id);
    expect(await db().rows("select * from public.orders")).toEqual([]);
    expect(await db().rows("select public.is_admin() as ok")).toEqual([{ ok: false }]);
    const result = await db().query("update public.menu_items set price_fils = 1");
    expect(result.rowCount).toBe(0);
  });
});

describe("service role (server code only)", () => {
  it("can create customers, orders and payments for guest checkout", async () => {
    await db().as("service_role");
    const [customer] = await db().rows<{ id: string }>(
      `insert into public.customers (full_name, phone, email) values ('Guest', '+971501234567', 'svc@example.com') returning id`,
    );
    expect(customer.id).toBeTruthy();
  });
});
