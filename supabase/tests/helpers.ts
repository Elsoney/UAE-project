/**
 * Test helpers: every test runs inside a transaction that is rolled back, so
 * tests never see each other's data. `as()` switches to a Supabase API role
 * with JWT claims exactly as PostgREST does.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterEach, beforeEach, expect, inject } from "vitest";

export type ApiRole = "anon" | "authenticated" | "service_role";

export class TestDb {
  private savepoint = 0;

  constructor(readonly client: pg.Client) {}

  query<R extends pg.QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.client.query<R>(sql, params);
  }

  async rows<R extends pg.QueryResultRow = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return (await this.client.query<R>(sql, params)).rows;
  }

  /** Act as a Supabase API role. `userId` becomes auth.uid(). */
  async as(role: ApiRole, userId?: string, email?: string) {
    const claims = JSON.stringify({ role, ...(userId ? { sub: userId } : {}), ...(email ? { email } : {}) });
    await this.client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    await this.client.query(`set local role ${role}`);
  }

  /** Back to the database owner (used to arrange fixtures). */
  async asOwner() {
    await this.client.query("reset role");
    await this.client.query(`select set_config('request.jwt.claims', '', true)`);
  }

  /** Run a statement that must fail; returns the error message. */
  async expectError(sql: string, params: unknown[] = [], pattern?: RegExp): Promise<string> {
    const name = `sp_${++this.savepoint}`;
    await this.client.query(`savepoint ${name}`);
    try {
      await this.client.query(sql, params);
    } catch (error) {
      await this.client.query(`rollback to savepoint ${name}`);
      const message = (error as Error).message;
      if (pattern) expect(message).toMatch(pattern);
      return message;
    }
    await this.client.query(`rollback to savepoint ${name}`);
    throw new Error(`Expected statement to fail but it succeeded: ${sql}`);
  }

  /** Run a statement that must succeed even though it is wrapped in a savepoint. */
  async expectOk(sql: string, params: unknown[] = []) {
    const name = `sp_${++this.savepoint}`;
    await this.client.query(`savepoint ${name}`);
    try {
      const result = await this.client.query(sql, params);
      await this.client.query(`release savepoint ${name}`);
      return result;
    } catch (error) {
      await this.client.query(`rollback to savepoint ${name}`);
      throw error;
    }
  }

  /** Fire deferred constraint triggers now (they would otherwise run at COMMIT). */
  async checkDeferred() {
    await this.client.query("set constraints all immediate");
    await this.client.query("set constraints all deferred");
  }
}

/** Registers a fresh client + transaction per test and returns an accessor. */
export function useTestDb(): () => TestDb {
  let db: TestDb | undefined;
  beforeEach(async () => {
    const client = new pg.Client({ connectionString: inject("databaseUrl") });
    await client.connect();
    await client.query("begin");
    db = new TestDb(client);
  });
  afterEach(async () => {
    if (!db) return;
    await db.client.query("rollback");
    await db.client.end();
    db = undefined;
  });
  return () => {
    if (!db) throw new Error("test database not ready");
    return db;
  };
}

// ------------------------------------------------------------------ fixtures --
// All fixtures run as the database owner and leave the role as owner.

export async function createAuthUser(db: TestDb, email = `user-${randomUUID()}@example.com`) {
  await db.asOwner();
  const id = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  return { id, email };
}

export async function createStaff(db: TestDb, role: "admin" | "operations_owner", isActive = true) {
  const user = await createAuthUser(db);
  await db.query(
    "insert into public.admin_users (user_id, role, full_name, is_active) values ($1, $2, $3, $4)",
    [user.id, role, `Test ${role}`, isActive],
  );
  return user;
}

export async function createCustomer(db: TestDb, email = `guest-${randomUUID()}@example.com`) {
  await db.asOwner();
  const [row] = await db.rows<{ id: string }>(
    `insert into public.customers (full_name, phone, email) values ('Test Guest', '+971501234567', $1) returning id`,
    [email],
  );
  return { id: row.id, email };
}

export async function firstMenuItem(db: TestDb) {
  await db.asOwner();
  const [row] = await db.rows<{ id: string; price_fils: string; name_en: string; name_ar: string }>(
    "select id, price_fils, name_en, name_ar from public.menu_items where is_active order by sort_order, slug limit 1",
  );
  return { ...row, price: Number(row.price_fils) };
}

/** A consistent pickup order with one line (quantity 2). */
export async function createOrder(db: TestDb, customer?: { id: string; email: string }) {
  const c = customer ?? (await createCustomer(db));
  const item = await firstMenuItem(db);
  const subtotal = item.price * 2;
  const [order] = await db.rows<{ id: string; reference: string }>(
    `insert into public.orders
       (customer_id, contact_name, contact_phone, contact_email, order_type, subtotal_fils, total_fils)
     values ($1, 'Test Guest', '+971501234567', $2, 'pickup', $3, $3)
     returning id, reference`,
    [c.id, c.email, subtotal],
  );
  await db.query(
    `insert into public.order_items (order_id, menu_item_id, name_en, name_ar, quantity, unit_price_fils, total_price_fils)
     values ($1, $2, $3, $4, 2, $5, $6)`,
    [order.id, item.id, item.name_en, item.name_ar, item.price, subtotal],
  );
  return { ...order, customerId: c.id, total: subtotal };
}

export function futureDate(days = 10) {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export async function createCatering(db: TestDb, customer?: { id: string; email: string }) {
  const c = customer ?? (await createCustomer(db));
  const [pkg] = await db.rows<{ id: string }>("select id from public.catering_packages order by sort_order limit 1");
  const [row] = await db.rows<{ id: string; reference: string }>(
    `insert into public.catering_requests
       (customer_id, contact_name, contact_phone, contact_email, event_date, event_time, guest_count, event_location, package_id)
     values ($1, 'Test Guest', '+971501234567', $2, $3, '19:00', 25, 'Al Nuaimiya, Ajman', $4)
     returning id, reference`,
    [c.id, c.email, futureDate(), pkg.id],
  );
  return { ...row, customerId: c.id };
}

/** A succeeded (test-mode) payment for an order. */
export async function createPayment(db: TestDb, orderId: string, amount: number) {
  await db.asOwner();
  const [row] = await db.rows<{ id: string }>(
    `insert into public.payments (order_id, provider, provider_reference, amount_fils, status, is_test, paid_at)
     values ($1, 'mock', $2, $3, 'succeeded', true, now()) returning id`,
    [orderId, `ref-${randomUUID()}`, amount],
  );
  return row.id;
}

export async function createCommissionSetting(db: TestDb, createdBy: string | null = null) {
  await db.asOwner();
  const [row] = await db.rows<{ id: string }>(
    `insert into public.commission_settings
       (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference, created_by)
     values (5, 'collected', 'Refunds reduce the commissionable amount', 'Cancelled orders earn no commission',
             now() - interval '1 day', 'TEST ONLY', $1)
     returning id`,
    [createdBy],
  );
  return row.id;
}

export const SENSITIVE_TABLES = [
  "customers",
  "consent_events",
  "orders",
  "order_items",
  "catering_requests",
  "blocked_dates",
  "payment_requests",
  "payments",
  "payment_events",
  "refunds",
  "commission_settings",
  "commissions",
  "email_outbox",
  "status_history",
  "audit_log",
  "admin_users",
] as const;
