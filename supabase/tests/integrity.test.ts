/**
 * Data-integrity tests: money rules, deposits, payments idempotency, refunds,
 * attribution immutability, customers/email, history and audit trails.
 * Fixtures and statements run as the service role or owner (server code), so
 * these prove the database itself enforces the rules, not just the app.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createCatering,
  createCommissionSetting,
  createCustomer,
  createOrder,
  createPayment,
  firstMenuItem,
  futureDate,
  useTestDb,
} from "./helpers";

const db = useTestDb();
const CHECK = /violates check constraint|check_violation|exceed|immutable|not allowed|append-only|must|cannot|has no items|does not match|in the past|not available/;

describe("money and orders", () => {
  it("rejects negative or zero prices and quantities", async () => {
    const item = await firstMenuItem(db());
    await db().expectError("update public.menu_items set price_fils = 0 where id = $1", [item.id], CHECK);
    await db().expectError("update public.menu_items set price_fils = -100 where id = $1", [item.id], CHECK);
    const order = await createOrder(db());
    await db().expectError(
      `insert into public.order_items (order_id, menu_item_id, name_en, name_ar, quantity, unit_price_fils, total_price_fils)
       values ($1, $2, 'x', 'x', 0, 100, 0)`,
      [order.id, item.id],
      CHECK,
    );
  });

  it("rejects an order whose total does not add up", async () => {
    const customer = await createCustomer(db());
    await db().expectError(
      `insert into public.orders (customer_id, contact_name, contact_phone, contact_email, order_type, subtotal_fils, discount_fils, delivery_fee_fils, total_fils)
       values ($1, 'A', '+971501234567', $2, 'pickup', 5000, 500, 0, 5000)`,
      [customer.id, customer.email],
      CHECK,
    );
  });

  it("rejects a line whose total is not quantity x unit price", async () => {
    const order = await createOrder(db());
    const item = await firstMenuItem(db());
    await db().expectError(
      `insert into public.order_items (order_id, menu_item_id, name_en, name_ar, quantity, unit_price_fils, total_price_fils)
       values ($1, $2, 'x', 'x', 3, 1000, 2000)`,
      [order.id, item.id],
      CHECK,
    );
  });

  it("requires the order subtotal to equal the sum of its items (checked at commit)", async () => {
    const order = await createOrder(db());
    await db().query("update public.orders set subtotal_fils = subtotal_fils + 100, total_fils = total_fils + 100 where id = $1", [order.id]);
    await db().expectError("set constraints all immediate", [], /does not match/);
  });

  it("rejects an order without items (checked at commit)", async () => {
    const customer = await createCustomer(db());
    await db().query(
      `insert into public.orders (customer_id, contact_name, contact_phone, contact_email, order_type, subtotal_fils, total_fils)
       values ($1, 'A', '+971501234567', $2, 'pickup', 1000, 1000)`,
      [customer.id, customer.email],
    );
    await db().expectError("set constraints all immediate", [], /has no items/);
  });

  it("accepts a consistent order and its items", async () => {
    await createOrder(db());
    await db().checkDeferred();
  });

  it("requires an address for delivery orders", async () => {
    const customer = await createCustomer(db());
    await db().expectError(
      `insert into public.orders (customer_id, contact_name, contact_phone, contact_email, order_type, subtotal_fils, total_fils)
       values ($1, 'A', '+971501234567', $2, 'delivery', 1000, 1000)`,
      [customer.id, customer.email],
      CHECK,
    );
  });

  it("makes order lines immutable", async () => {
    const order = await createOrder(db());
    await db().expectError("update public.order_items set quantity = 5 where order_id = $1", [order.id], /append-only|not allowed/);
  });

  it("generates unambiguous public references", async () => {
    const order = await createOrder(db());
    const request = await createCatering(db());
    expect(order.reference).toMatch(/^UMD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(request.reference).toMatch(/^UMC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });

  it("rejects duplicate idempotency keys (no duplicate orders on retry)", async () => {
    const customer = await createCustomer(db());
    const key = `key-${randomUUID()}`;
    const insert = `insert into public.orders (customer_id, contact_name, contact_phone, contact_email, order_type, subtotal_fils, total_fils, idempotency_key)
                    values ($1, 'A', '+971501234567', $2, 'pickup', 1000, 1000, $3)`;
    await db().query(insert, [customer.id, customer.email, key]);
    await db().expectError(insert, [customer.id, customer.email, key], /duplicate key/);
  });
});

describe("attribution", () => {
  it("keeps the order source immutable", async () => {
    const order = await createOrder(db());
    await db().expectError("update public.orders set source = 'phone' where id = $1", [order.id], /immutable/);
  });

  it("keeps the catering request source immutable", async () => {
    const request = await createCatering(db());
    await db().expectError("update public.catering_requests set source = 'walk_in' where id = $1", [request.id], /immutable/);
  });

  it("defaults new orders and requests to website attribution", async () => {
    const order = await createOrder(db());
    const request = await createCatering(db());
    const [o] = await db().rows<{ source: string }>("select source from public.orders where id = $1", [order.id]);
    const [c] = await db().rows<{ source: string }>("select source from public.catering_requests where id = $1", [request.id]);
    expect(o.source).toBe("website");
    expect(c.source).toBe("website");
  });
});

describe("customers and email (guest checkout)", () => {
  it("requires an email", async () => {
    await db().expectError(
      `insert into public.customers (full_name, phone, email) values ('A', '+971501234567', null)`,
      [],
      /null value|not-null/,
    );
  });

  it("rejects malformed emails and phone numbers", async () => {
    await db().expectError(
      `insert into public.customers (full_name, phone, email) values ('A', '+971501234567', 'not-an-email')`,
      [],
      CHECK,
    );
    await db().expectError(
      `insert into public.customers (full_name, phone, email) values ('A', '0501234567', 'a@example.com')`,
      [],
      CHECK,
    );
  });

  it("keeps one customer per email, ignoring case and surrounding spaces", async () => {
    await createCustomer(db(), "Returning@Example.com");
    await db().expectError(
      `insert into public.customers (full_name, phone, email) values ('B', '+971501234567', '  returning@example.COM ')`,
      [],
      /duplicate key/,
    );
  });

  it("lets a returning customer be found by normalised email and linked to new orders", async () => {
    const customer = await createCustomer(db(), "Repeat@Example.com");
    await createOrder(db(), customer);
    await createCatering(db(), customer);
    const [found] = await db().rows<{ id: string }>(
      "select id from public.customers where email_normalized = lower(btrim($1))",
      [" repeat@example.com "],
    );
    expect(found.id).toBe(customer.id);
    const [counts] = await db().rows<{ orders: string; catering: string }>(
      `select (select count(*) from public.orders where customer_id = $1) as orders,
              (select count(*) from public.catering_requests where customer_id = $1) as catering`,
      [customer.id],
    );
    expect(counts).toEqual({ orders: "1", catering: "1" });
  });

  it("does not create a login account and cannot link an unverified one", async () => {
    const customer = await createCustomer(db());
    const [row] = await db().rows<{ auth_user_id: string | null }>(
      "select auth_user_id from public.customers where id = $1",
      [customer.id],
    );
    expect(row.auth_user_id).toBeNull();
    const userId = randomUUID();
    await db().query("insert into auth.users (id, email) values ($1, $2)", [userId, customer.email]);
    await db().expectError("update public.customers set auth_user_id = $1 where id = $2", [userId, customer.id], CHECK);
  });

  it("keeps marketing consent off unless explicitly granted, with an append-only history", async () => {
    const customer = await createCustomer(db());
    const [before] = await db().rows<{ marketing_consent: boolean }>(
      "select marketing_consent from public.customers where id = $1",
      [customer.id],
    );
    expect(before.marketing_consent).toBe(false);
    // An unverified opt-in (from a form) does not grant consent on its own.
    await db().query(
      "insert into public.consent_events (customer_id, consent_type, granted, source, locale) values ($1, 'marketing_email', true, 'catering_form', 'ar')",
      [customer.id],
    );
    const [pending] = await db().rows<{ marketing_consent: boolean }>("select marketing_consent from public.customers where id = $1", [customer.id]);
    expect(pending.marketing_consent).toBe(false);
    // Confirmed by the email owner.
    await db().query(
      "insert into public.consent_events (customer_id, consent_type, granted, source, locale, verified_at) values ($1, 'marketing_email', true, 'catering_form', 'ar', now())",
      [customer.id],
    );
    const [after] = await db().rows<{ marketing_consent: boolean; marketing_consent_source: string }>(
      "select marketing_consent, marketing_consent_source from public.customers where id = $1",
      [customer.id],
    );
    expect(after).toEqual({ marketing_consent: true, marketing_consent_source: "catering_form" });
    await db().query(
      "insert into public.consent_events (customer_id, consent_type, granted, source) values ($1, 'marketing_email', false, 'unsubscribe_link')",
      [customer.id],
    );
    const [withdrawn] = await db().rows<{ marketing_consent: boolean }>(
      "select marketing_consent from public.customers where id = $1",
      [customer.id],
    );
    expect(withdrawn.marketing_consent).toBe(false);
    await db().expectError("update public.consent_events set granted = true", [], /append-only/);
    await db().expectError("delete from public.consent_events", [], /append-only/);
  });
});

describe("catering requests", () => {
  it("always start as pending review", async () => {
    const request = await createCatering(db());
    const [row] = await db().rows<{ status: string; payment_status: string }>(
      "select status, payment_status from public.catering_requests where id = $1",
      [request.id],
    );
    expect(row).toEqual({ status: "pending_review", payment_status: "unpaid" });
    const customer = await createCustomer(db());
    await db().expectError(
      `insert into public.catering_requests (customer_id, contact_name, contact_phone, contact_email, event_date, event_time, guest_count, event_location, custom_request, status, quoted_total_fils, deposit_type)
       values ($1, 'A', '+971501234567', $2, $3, '19:00', 10, 'Ajman', 'x', 'confirmed', 1000, 'none')`,
      [customer.id, customer.email, futureDate()],
      /pending_review/,
    );
  });

  it("reject past dates and blocked dates", async () => {
    const customer = await createCustomer(db());
    const insert = `insert into public.catering_requests (customer_id, contact_name, contact_phone, contact_email, event_date, event_time, guest_count, event_location, custom_request)
                    values ($1, 'A', '+971501234567', $2, $3, '19:00', 10, 'Ajman', 'x')`;
    await db().expectError(insert, [customer.id, customer.email, "2020-01-01"], /in the past/);
    const blocked = futureDate(15);
    await db().query("insert into public.blocked_dates (blocked_on) values ($1)", [blocked]);
    await db().expectError(insert, [customer.id, customer.email, blocked], /not available/);
  });

  it("require a package or a custom request", async () => {
    const customer = await createCustomer(db());
    await db().expectError(
      `insert into public.catering_requests (customer_id, contact_name, contact_phone, contact_email, event_date, event_time, guest_count, event_location)
       values ($1, 'A', '+971501234567', $2, $3, '19:00', 10, 'Ajman')`,
      [customer.id, customer.email, futureDate()],
      CHECK,
    );
  });

  it("cannot be quoted without a confirmed total", async () => {
    const request = await createCatering(db());
    await db().expectError("update public.catering_requests set status = 'quoted' where id = $1", [request.id], CHECK);
  });

  it.each([
    ["percentage 0", "deposit_type = 'percentage', deposit_percentage = 0"],
    ["percentage 101", "deposit_type = 'percentage', deposit_percentage = 101"],
    ["percentage without a value", "deposit_type = 'percentage'"],
    ["fixed 0", "deposit_type = 'fixed', deposit_fixed_fils = 0"],
    ["fixed above the total", "deposit_type = 'fixed', deposit_fixed_fils = 300001"],
    ["a stray percentage value", "deposit_type = 'none', deposit_percentage = 50"],
    ["a stray fixed value", "deposit_type = 'full', deposit_fixed_fils = 100"],
  ])("reject an invalid deposit: %s", async (_label, assignment) => {
    const request = await createCatering(db());
    await db().expectError(
      `update public.catering_requests set quoted_total_fils = 300000, ${assignment} where id = $1`,
      [request.id],
      CHECK,
    );
  });

  it.each([
    ["no deposit", "deposit_type = 'none'"],
    ["fixed", "deposit_type = 'fixed', deposit_fixed_fils = 300000"],
    ["percentage 100", "deposit_type = 'percentage', deposit_percentage = 100"],
    ["percentage 12.5", "deposit_type = 'percentage', deposit_percentage = 12.5"],
    ["full payment", "deposit_type = 'full'"],
  ])("accept a valid deposit choice: %s", async (_label, assignment) => {
    const request = await createCatering(db());
    await db().expectOk(
      `update public.catering_requests set status = 'quoted', quoted_total_fils = 300000, ${assignment} where id = $1`,
      [request.id],
    );
  });

  it("cannot be confirmed before a payment requirement is chosen", async () => {
    const request = await createCatering(db());
    await db().expectError(
      "update public.catering_requests set status = 'confirmed', quoted_total_fils = 300000 where id = $1",
      [request.id],
      CHECK,
    );
  });
});

describe("payment requests", () => {
  async function cateringWithQuote(total = 300000) {
    const request = await createCatering(db());
    await db().query("update public.catering_requests set status = 'quoted', quoted_total_fils = $2 where id = $1", [request.id, total]);
    return request;
  }
  const insert = `insert into public.payment_requests
    (catering_request_id, kind, deposit_type, percentage, fixed_amount_fils, total_snapshot_fils, requested_amount_fils, provider, is_test)
    values ($1, $2, $3, $4, $5, $6, $7, 'mock', true)`;

  it("computes percentage deposits with half-up rounding to the fil", async () => {
    const request = await cateringWithQuote(33333);
    // 33333 * 12.5% = 4166.625 -> 4167
    await db().expectOk(insert, [request.id, "deposit", "percentage", 12.5, null, 33333, 4167]);
  });

  it("rejects a percentage request with the wrong amount", async () => {
    const request = await cateringWithQuote(33333);
    await db().expectError(insert, [request.id, "deposit", "percentage", 12.5, null, 33333, 4166], CHECK);
  });

  it("rejects a requested amount above the total snapshot", async () => {
    const request = await cateringWithQuote();
    await db().expectError(insert, [request.id, "balance", null, null, null, 300000, 300001], CHECK);
  });

  it("requires full-payment requests to equal the total", async () => {
    const request = await cateringWithQuote();
    await db().expectError(insert, [request.id, "full", "full", null, null, 300000, 150000], CHECK);
    await db().expectOk(insert, [request.id, "full", "full", null, null, 300000, 300000]);
  });

  it("requires exactly one parent (order or catering request)", async () => {
    const order = await createOrder(db());
    const request = await cateringWithQuote();
    await db().expectError(
      `insert into public.payment_requests (order_id, catering_request_id, kind, total_snapshot_fils, requested_amount_fils, provider, is_test)
       values ($1, $2, 'full', 1000, 1000, 'mock', true)`,
      [order.id, request.id],
      CHECK,
    );
    await db().expectError(
      `insert into public.payment_requests (kind, total_snapshot_fils, requested_amount_fils, provider, is_test)
       values ('full', 1000, 1000, 'mock', true)`,
      [],
      CHECK,
    );
  });

  it("allows only one open request at a time, and supersedes it atomically when the price changes", async () => {
    const request = await cateringWithQuote();
    const [first] = await db().rows<{ id: string }>(
      `${insert} returning id`,
      [request.id, "deposit", "fixed", null, 50000, 300000, 50000],
    );
    await db().expectError(insert, [request.id, "deposit", "fixed", null, 60000, 300000, 60000], /duplicate key/);
    // Price changes: supersede the old request and issue a new one in one transaction.
    const newId = randomUUID();
    await db().query("update public.payment_requests set status = 'superseded', superseded_by = $2 where id = $1", [first.id, newId]);
    await db().query(
      `insert into public.payment_requests (id, catering_request_id, kind, deposit_type, fixed_amount_fils, total_snapshot_fils, requested_amount_fils, provider, is_test)
       values ($1, $2, 'deposit', 'fixed', 60000, 350000, 60000, 'mock', true)`,
      [newId, request.id],
    );
    await db().checkDeferred();
  });
});

describe("payments, webhooks and refunds", () => {
  it("rejects duplicate provider transactions (idempotent webhooks)", async () => {
    const order = await createOrder(db());
    const sql = `insert into public.payments (order_id, provider, provider_reference, amount_fils, status, is_test, paid_at)
                 values ($1, 'mock', 'txn-123', $2, 'succeeded', true, now())`;
    await db().query(sql, [order.id, order.total]);
    await db().expectError(sql, [order.id, order.total], /duplicate key/);
  });

  it("rejects duplicate webhook events and keeps event contents immutable", async () => {
    const sql = `insert into public.payment_events (provider, provider_event_id, event_type, signature_verified, payload)
                 values ('mock', 'evt-1', 'payment.succeeded', true, '{"amount": 100}')`;
    await db().query(sql);
    await db().expectError(sql, [], /duplicate key/);
    await db().query("update public.payment_events set processed_at = now() where provider_event_id = 'evt-1'");
    await db().expectError(
      `update public.payment_events set payload = '{"amount": 999}' where provider_event_id = 'evt-1'`,
      [],
      /immutable/,
    );
    await db().expectError("delete from public.payment_events", [], /append-only/);
  });

  it("requires a payment to belong to exactly one order or catering request", async () => {
    await db().expectError(
      `insert into public.payments (provider, provider_reference, amount_fils, is_test) values ('mock', 'x', 100, true)`,
      [],
      CHECK,
    );
  });

  it("requires succeeded payments to have a paid_at time", async () => {
    const order = await createOrder(db());
    await db().expectError(
      `insert into public.payments (order_id, provider, provider_reference, amount_fils, status, is_test) values ($1, 'mock', 'x', 100, 'succeeded', true)`,
      [order.id],
      CHECK,
    );
  });

  it("does not mix test and live payments on one request", async () => {
    const order = await createOrder(db());
    const [request] = await db().rows<{ id: string }>(
      `insert into public.payment_requests (order_id, kind, total_snapshot_fils, requested_amount_fils, provider, is_test)
       values ($1, 'full', $2, $2, 'mock', true) returning id`,
      [order.id, order.total],
    );
    await db().expectError(
      `insert into public.payments (order_id, payment_request_id, provider, provider_reference, amount_fils, is_test)
       values ($1, $2, 'mock', 'live-1', $3, false)`,
      [order.id, request.id, order.total],
      /test and live/,
    );
  });

  it("never lets refunds exceed the payment", async () => {
    const order = await createOrder(db());
    const paymentId = await createPayment(db(), order.id, 10000);
    await db().query("insert into public.refunds (payment_id, amount_fils, reason, status) values ($1, 6000, 'Partial refund', 'succeeded')", [paymentId]);
    await db().expectError(
      "insert into public.refunds (payment_id, amount_fils, reason) values ($1, 4001, 'Too much')",
      [paymentId],
      /exceed/,
    );
    await db().expectOk("insert into public.refunds (payment_id, amount_fils, reason) values ($1, 4000, 'Rest')", [paymentId]);
  });

  it("only refunds succeeded payments", async () => {
    const order = await createOrder(db());
    const [payment] = await db().rows<{ id: string }>(
      `insert into public.payments (order_id, provider, provider_reference, amount_fils, status, is_test)
       values ($1, 'mock', 'pending-1', 1000, 'pending', true) returning id`,
      [order.id],
    );
    await db().expectError(
      "insert into public.refunds (payment_id, amount_fils, reason) values ($1, 100, 'x')",
      [payment.id],
      /succeeded payment/,
    );
  });
});

describe("commissions", () => {
  it("rejects invalid commission rates", async () => {
    for (const rate of [0, -1, 100.01]) {
      await db().expectError(
        `insert into public.commission_settings (rate_percent, basis, refund_treatment, cancellation_treatment, effective_from, approval_reference)
         values ($1, 'gross', 'x', 'y', now(), 'z')`,
        [rate],
        CHECK,
      );
    }
  });

  it("keeps settings append-only", async () => {
    await createCommissionSetting(db());
    await db().expectError("update public.commission_settings set rate_percent = 50", [], /append-only/);
    await db().expectError("delete from public.commission_settings", [], /append-only/);
  });

  it("versions commission records instead of rewriting them", async () => {
    const order = await createOrder(db());
    const settingId = await createCommissionSetting(db());
    const insert = `insert into public.commissions (order_id, setting_id, rate_percent, basis, eligible_amount_fils, commission_amount_fils, inputs, version)
                    values ($1, $2, 5, 'collected', $3, $4, '{}'::jsonb, $5) returning id`;
    const [v1] = await db().rows<{ id: string }>(insert, [order.id, settingId, 10000, 500, 1]);
    await db().expectError("update public.commissions set commission_amount_fils = 900 where id = $1", [v1.id], /immutable/);
    await db().expectError("delete from public.commissions where id = $1", [v1.id], /cannot be deleted/);
    // A second current record is not allowed until the first is superseded.
    await db().expectError(insert, [order.id, settingId, 8000, 400, 2], /duplicate key/);
    await db().query("update public.commissions set superseded_at = now() where id = $1", [v1.id]);
    await db().expectOk(insert, [order.id, settingId, 8000, 400, 2]);
    await db().expectError("update public.commissions set superseded_at = null where id = $1", [v1.id], /cannot be reactivated/);
  });

  it("finds the setting in force at a point in time", async () => {
    const id = await createCommissionSetting(db());
    await db().as("service_role");
    const [row] = await db().rows<{ id: string | null }>("select (public.commission_setting_at(now())).id as id");
    expect(row.id).toBe(id);
    const [none] = await db().rows<{ id: string | null }>("select (public.commission_setting_at(now() - interval '30 days')).id as id");
    expect(none.id).toBeNull();
  });
});

describe("history and audit", () => {
  it("records status and payment-status changes", async () => {
    const order = await createOrder(db());
    await db().query("update public.orders set order_status = 'confirmed' where id = $1", [order.id]);
    await db().query("update public.orders set payment_status = 'fully_paid' where id = $1", [order.id]);
    const rows = await db().rows<{ field: string; old_value: string | null; new_value: string }>(
      "select field, old_value, new_value from public.status_history where entity_id = $1 order by id",
      [order.id],
    );
    expect(rows).toEqual([
      { field: "status", old_value: null, new_value: "new" },
      { field: "payment_status", old_value: null, new_value: "unpaid" },
      { field: "status", old_value: "new", new_value: "confirmed" },
      { field: "payment_status", old_value: "unpaid", new_value: "fully_paid" },
    ]);
  });

  it("audits payments and keeps the audit log append-only", async () => {
    const order = await createOrder(db());
    const paymentId = await createPayment(db(), order.id, order.total);
    const rows = await db().rows<{ action: string }>(
      "select action from public.audit_log where entity_type = 'payments' and entity_id = $1",
      [paymentId],
    );
    expect(rows).toEqual([{ action: "INSERT" }]);
    await db().expectError("update public.audit_log set action = 'X'", [], /append-only/);
    await db().expectError("delete from public.audit_log", [], /append-only/);
    await db().expectError("update public.status_history set new_value = 'x'", [], /append-only/);
  });

  it("audits who changed a catering quote", async () => {
    const request = await createCatering(db());
    await db().query("update public.catering_requests set status = 'quoted', quoted_total_fils = 250000 where id = $1", [request.id]);
    const [row] = await db().rows<{ before: { quoted_total_fils: number | null }; after: { quoted_total_fils: number } }>(
      "select before, after from public.audit_log where entity_type = 'catering_requests' and entity_id = $1",
      [request.id],
    );
    expect(row.before.quoted_total_fils).toBeNull();
    expect(row.after.quoted_total_fils).toBe(250000);
  });
});

describe("email outbox", () => {
  it("validates recipient and template", async () => {
    const customer = await createCustomer(db());
    const sql = `insert into public.email_outbox (customer_id, entity_type, entity_id, template, locale, to_email, subject)
                 values ($1, 'order', gen_random_uuid(), $2, 'ar', $3, 'Subject')`;
    await db().expectError(sql, [customer.id, "marketing_blast", customer.email], CHECK);
    await db().expectError(sql, [customer.id, "order_received", "bad"], CHECK);
    await db().expectOk(sql, [customer.id, "order_received", customer.email]);
  });
});
