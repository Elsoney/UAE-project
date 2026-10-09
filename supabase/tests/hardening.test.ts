/**
 * Regression tests for the independent security review (2026-10-09).
 * Each test reproduces a reported attack and proves it is now blocked.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { describe, expect, inject, it } from "vitest";
import {
  createAuthUser,
  createCatering,
  createCommissionSetting,
  createCustomer,
  createOrder,
  createPayment,
  createStaff,
  futureDate,
  useTestDb,
} from "./helpers";

const db = useTestDb();

describe("H1: commission terms are visible to the operations owner only", () => {
  it("blocks non-staff and restaurant admins from commission_setting_at()", async () => {
    const owner = await createStaff(db(), "operations_owner");
    await createCommissionSetting(db(), owner.id);
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    await db().expectError("select * from public.commission_setting_at(now())", [], /only the operations owner/);
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError("select * from public.commission_setting_at(now())", [], /only the operations owner/);
    await db().as("anon");
    await db().expectError("select * from public.commission_setting_at(now())", [], /permission denied|only the operations owner/);
  });

  it("still works for the operations owner and server code", async () => {
    const owner = await createStaff(db(), "operations_owner");
    const id = await createCommissionSetting(db(), owner.id);
    await db().as("authenticated", owner.id);
    expect(await db().rows("select (public.commission_setting_at(now())).id as id")).toEqual([{ id }]);
    await db().as("service_role");
    expect(await db().rows("select (public.commission_setting_at(now())).id as id")).toEqual([{ id }]);
  });
});

describe("M2: marketing consent needs the email owner's confirmation", () => {
  it("records a guest opt-in as unverified without granting consent", async () => {
    await db().as("service_role");
    await db().query("select * from public.submit_guest_order($1::jsonb)", [
      JSON.stringify({
        idempotency_key: `k-${randomUUID()}`,
        locale: "en",
        contact: { name: "Attacker", phone: "+971550000000", email: "victim@example.com" },
        marketing_consent: true,
        order_type: "pickup",
        items: [{ slug: "karak-tea", quantity: 1 }],
        expected_subtotal_fils: 600,
        email: { locale: "en", subject: "S" },
      }),
    ]);
    await db().asOwner();
    const [c] = await db().rows<{ marketing_consent: boolean }>("select marketing_consent from public.customers where email_normalized = 'victim@example.com'");
    expect(c.marketing_consent).toBe(false);
    const events = await db().rows<{ granted: boolean; verified_at: string | null }>("select granted, verified_at from public.consent_events");
    expect(events).toEqual([{ granted: true, verified_at: null }]);
  });

  it("grants consent once verified, and withdrawal always applies", async () => {
    const customer = await createCustomer(db());
    await db().query(
      "insert into public.consent_events (customer_id, consent_type, granted, source, verified_at) values ($1, 'marketing_email', true, 'confirmation_link', now())",
      [customer.id],
    );
    const [on] = await db().rows<{ marketing_consent: boolean }>("select marketing_consent from public.customers where id = $1", [customer.id]);
    expect(on.marketing_consent).toBe(true);
    await db().query("insert into public.consent_events (customer_id, consent_type, granted, source) values ($1, 'marketing_email', false, 'unsubscribe_link')", [customer.id]);
    const [off] = await db().rows<{ marketing_consent: boolean }>("select marketing_consent from public.customers where id = $1", [customer.id]);
    expect(off.marketing_consent).toBe(false);
  });
});

describe("M5: commission settings cannot be back-dated", () => {
  it("rejects an operations-owner setting that starts in the past", async () => {
    const owner = await createStaff(db(), "operations_owner");
    await db().as("authenticated", owner.id);
    await db().expectError(
      `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference, created_by)
       values (50, 'gross', 'x', 'y', now() - interval '6 days', 'z', $1)`,
      [owner.id],
      /row-level security/,
    );
    await db().expectOk(
      `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, approval_reference, created_by)
       values (5, 'gross', 'x', 'y', 'Agreement v2', $1)`,
      [owner.id],
    );
  });
});

describe("L6: integrity protections cannot be bypassed by server code", () => {
  it("source cannot be changed by setting the correction flag directly", async () => {
    const order = await createOrder(db());
    await db().as("service_role");
    await db().query("select set_config('umodai.allow_source_correction', 'on', true)");
    await db().expectError("update public.orders set source = 'phone' where id = $1", [order.id], /immutable/);
  });

  it("order lines cannot be deleted and their creation is audited", async () => {
    const order = await createOrder(db());
    await db().as("service_role");
    await db().expectError("delete from public.order_items where order_id = $1", [order.id], /append-only|not allowed/);
    await db().asOwner();
    const audit = await db().rows("select id from public.audit_log where entity_type = 'order_items'");
    expect(audit.length).toBe(1);
  });

  it("server code cannot forge audit or history rows or wipe tables", async () => {
    await db().as("service_role");
    await db().expectError(
      "insert into public.audit_log (actor_role, action, entity_type) values ('x', 'FORGED', 'orders')",
      [],
      /permission denied/,
    );
    await db().expectError(
      "insert into public.status_history (entity_type, entity_id, field, new_value) values ('order', gen_random_uuid(), 'status', 'completed')",
      [],
      /permission denied/,
    );
    await db().expectError("truncate public.orders, public.catering_requests cascade", [], /permission denied/);
    await db().expectError("truncate public.payments", [], /permission denied/);
  });

  it("a succeeded payment cannot be failed, re-priced or deleted", async () => {
    const order = await createOrder(db());
    const paymentId = await createPayment(db(), order.id, order.total);
    await db().as("service_role");
    await db().expectError("update public.payments set status = 'failed' where id = $1", [paymentId], /cannot be changed/);
    await db().expectError("update public.payments set amount_fils = 1 where id = $1", [paymentId], /cannot be changed/);
    await db().expectError("update public.payments set provider_reference = 'other' where id = $1", [paymentId], /identity/);
    await db().expectError("delete from public.payments where id = $1", [paymentId], /cannot be deleted/);
  });

  it("a succeeded refund is final and keeps its amount", async () => {
    const order = await createOrder(db());
    const paymentId = await createPayment(db(), order.id, order.total);
    const [refund] = await db().rows<{ id: string }>(
      "insert into public.refunds (payment_id, amount_fils, reason, status) values ($1, 100, 'Item missing', 'succeeded') returning id",
      [paymentId],
    );
    await db().expectError("update public.refunds set status = 'failed' where id = $1", [refund.id], /final/);
    await db().expectError("update public.refunds set amount_fils = 50 where id = $1", [refund.id], /cannot change/);
    await db().expectError("delete from public.refunds where id = $1", [refund.id], /cannot be deleted/);
  });
});

describe("L7: staff follow the workflow; the database records who and when", () => {
  it("rejects moving an order backwards", async () => {
    const order = await createOrder(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    for (const status of ["confirmed", "preparing", "ready", "completed"]) {
      await db().expectOk("update public.orders set order_status = $2 where id = $1", [order.id, status]);
    }
    await db().expectError("update public.orders set order_status = 'new' where id = $1", [order.id], /cannot move/);
  });

  it("sets cancelled_at itself and ignores client-supplied values", async () => {
    const order = await createOrder(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectOk("update public.orders set order_status = 'cancelled', cancelled_at = '2001-01-01' where id = $1", [order.id]);
    await db().asOwner();
    const [row] = await db().rows<{ recent: boolean }>("select cancelled_at > now() - interval '1 minute' as recent from public.orders where id = $1", [order.id]);
    expect(row.recent).toBe(true);
  });

  it("rejects past or blocked event dates when staff edit a request", async () => {
    const request = await createCatering(db());
    const blocked = futureDate(25);
    await db().query("insert into public.blocked_dates (blocked_on) values ($1)", [blocked]);
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectError("update public.catering_requests set event_date = '2020-01-01' where id = $1", [request.id], /in the past/);
    await db().expectError("update public.catering_requests set event_date = $2 where id = $1", [request.id, blocked], /not available/);
    await db().expectOk("update public.catering_requests set event_date = $2 where id = $1", [request.id, futureDate(26)]);
  });

  it("records the reviewing admin and confirmation time itself", async () => {
    const request = await createCatering(db());
    const owner = await createStaff(db(), "operations_owner");
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectOk(
      `update public.catering_requests
          set status = 'quoted', quoted_total_fils = 200000, deposit_type = 'none', reviewed_by = $2, confirmed_at = '2001-01-01'
        where id = $1`,
      [request.id, owner.id],
    );
    await db().expectOk("update public.catering_requests set status = 'confirmed' where id = $1", [request.id]);
    await db().asOwner();
    const [row] = await db().rows<{ reviewed_by: string; recent: boolean }>(
      "select reviewed_by, confirmed_at > now() - interval '1 minute' as recent from public.catering_requests where id = $1",
      [request.id],
    );
    expect(row).toEqual({ reviewed_by: admin.id, recent: true });
  });

  it("cannot confirm a booking before the required payment is received", async () => {
    const request = await createCatering(db());
    const admin = await createStaff(db(), "admin");
    await db().as("authenticated", admin.id);
    await db().expectOk(
      "update public.catering_requests set status = 'quoted', quoted_total_fils = 300000, deposit_type = 'percentage', deposit_percentage = 25 where id = $1",
      [request.id],
    );
    await db().expectError("update public.catering_requests set status = 'confirmed' where id = $1", [request.id], /required payment/);
    await db().expectOk("update public.catering_requests set status = 'awaiting_payment' where id = $1", [request.id]);
    await db().expectError("update public.catering_requests set status = 'confirmed' where id = $1", [request.id], /required payment/);
    // Once the verified deposit is recorded (server-side), staff can confirm.
    await db().as("service_role");
    await db().query("update public.catering_requests set payment_status = 'deposit_paid' where id = $1", [request.id]);
    await db().as("authenticated", admin.id);
    await db().expectOk("update public.catering_requests set status = 'confirmed' where id = $1", [request.id]);
  });

  it("rejects skipping review straight to completed", async () => {
    const request = await createCatering(db());
    await db().expectError("update public.catering_requests set status = 'completed', quoted_total_fils = 1000, deposit_type = 'none' where id = $1", [request.id], /cannot move/);
  });
});

describe("I9: submission functions only accept well-formed references", () => {
  it("rejects arbitrary references", async () => {
    await db().as("service_role");
    await db().expectError(
      "select * from public.submit_guest_order($1::jsonb)",
      [
        JSON.stringify({
          reference: "ATTACKER-REF",
          idempotency_key: `k-${randomUUID()}`,
          locale: "en",
          contact: { name: "A", phone: "+971550000000", email: "a@example.com" },
          order_type: "pickup",
          items: [{ slug: "karak-tea", quantity: 1 }],
          expected_subtotal_fils: 600,
          email: { locale: "en", subject: "S" },
        }),
      ],
      /invalid reference/,
    );
  });
});

describe("M3 / M4: concurrent submissions", () => {
  // These commit real rows, so they use a separate throw-away database.
  const url = inject("concurrencyDatabaseUrl");

  async function concurrently<T>(n: number, run: (client: pg.Client, i: number) => Promise<T>) {
    const clients = await Promise.all(
      Array.from({ length: n }, async () => {
        const c = new pg.Client({ connectionString: url });
        await c.connect();
        return c;
      }),
    );
    try {
      return await Promise.allSettled(
        clients.map(async (c, i) => {
          await c.query("begin");
          await c.query("set local role service_role");
          try {
            const result = await run(c, i);
            await c.query("commit");
            return result;
          } catch (error) {
            await c.query("rollback");
            throw error;
          }
        }),
      );
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  }

  const orderPayload = (email: string, key: string) =>
    JSON.stringify({
      idempotency_key: key,
      locale: "en",
      contact: { name: "Load Test", phone: "+971550000000", email },
      order_type: "pickup",
      items: [{ slug: "karak-tea", quantity: 1 }],
      expected_subtotal_fils: 600,
      email: { locale: "en", subject: "S" },
    });

  it.skipIf(!url)("enforces the rate limit under 12 simultaneous submissions", async () => {
    const email = `burst-${randomUUID()}@example.com`;
    const results = await concurrently(12, (c, i) => c.query("select * from public.submit_guest_order($1::jsonb)", [orderPayload(email, `burst-${i}-${randomUUID()}`)]));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const limited = results.filter((r) => r.status === "rejected" && String(r.reason).includes("rate_limited")).length;
    expect({ ok, limited }).toEqual({ ok: 5, limited: 7 });
  });

  it.skipIf(!url)("returns the original order to a simultaneous retry with the same key", async () => {
    const key = `same-${randomUUID()}`;
    const email = `retry-${randomUUID()}@example.com`;
    const results = await concurrently(2, (c) => c.query<{ reference: string; duplicate: boolean }>("select * from public.submit_guest_order($1::jsonb)", [orderPayload(email, key)]));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const rows = results.map((r) => (r as PromiseFulfilledResult<pg.QueryResult<{ reference: string; duplicate: boolean }>>).value.rows[0]);
    expect(rows[0].reference).toBe(rows[1].reference);
    expect(rows.map((r) => r.duplicate).sort()).toEqual([false, true]);
  });
});
