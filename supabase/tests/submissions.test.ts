/**
 * Atomic guest submissions (owner §3–§4): server-only access, guest checkout
 * without accounts, returning-customer association by email, consent only on
 * opt-in, idempotency, catalog pricing, abuse limit, confirmation email queue.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAuthUser, futureDate, useTestDb } from "./helpers";

const db = useTestDb();

function catering(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: `cat-${randomUUID()}`,
    locale: "ar",
    contact: { name: "Sara Ali", phone: "+971501234567", email: "Sara@Example.com" },
    marketing_consent: false,
    package_slug: "family-gathering",
    event_date: futureDate(10),
    event_time: "19:30",
    guest_count: 25,
    event_location: "Al Nuaimiya, Ajman",
    notes: "No nuts please",
    email: { locale: "ar", subject: "استلمنا طلب الضيافة" },
    ...overrides,
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: `ord-${randomUUID()}`,
    locale: "en",
    contact: { name: "Omar Saeed", phone: "+971551234567", email: "omar@example.com" },
    order_type: "pickup",
    items: [
      { slug: "chicken-machboos", quantity: 2 },
      { slug: "luqaimat", quantity: 1 },
    ],
    expected_subtotal_fils: 2 * 4200 + 1800,
    email: { locale: "en", subject: "We received your order" },
    ...overrides,
  };
}

async function submitCatering(payload: object) {
  await db().as("service_role");
  const [row] = await db().rows<{ reference: string; status: string; duplicate: boolean }>(
    "select * from public.submit_catering_request($1::jsonb)",
    [JSON.stringify(payload)],
  );
  return row;
}

async function submitOrder(payload: object) {
  await db().as("service_role");
  const [row] = await db().rows<{ reference: string; order_status: string; payment_status: string; total_fils: string; duplicate: boolean }>(
    "select * from public.submit_guest_order($1::jsonb)",
    [JSON.stringify(payload)],
  );
  return row;
}

describe("access", () => {
  it("is server-only: visitors and signed-in users cannot call the submission functions", async () => {
    await db().as("anon");
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering())], /permission denied/);
    await db().expectError("select * from public.submit_guest_order($1::jsonb)", [JSON.stringify(order())], /permission denied/);
    const user = await createAuthUser(db());
    await db().as("authenticated", user.id);
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering())], /permission denied/);
    await db().expectError("select public.upsert_guest_customer('a','+971501234567','a@b.co','ar')", [], /permission denied/);
  });
});

describe("guest catering request", () => {
  it("is stored as pending review with a reference, a new customer and a queued confirmation email", async () => {
    const result = await submitCatering(catering());
    expect(result.reference).toMatch(/^UMC-[2-9A-Z]{8}$/);
    expect(result).toMatchObject({ status: "pending_review", duplicate: false });
    await db().asOwner();
    const [req] = await db().rows<Record<string, unknown>>(
      "select r.source, r.guest_count, r.customer_notes, c.email, c.marketing_consent, r.payment_status from public.catering_requests r join public.customers c on c.id = r.customer_id",
    );
    expect(req).toMatchObject({ source: "website", guest_count: 25, customer_notes: "No nuts please", email: "Sara@Example.com", marketing_consent: false, payment_status: "unpaid" });
    const outbox = await db().rows<Record<string, unknown>>("select template, locale, to_email, status from public.email_outbox");
    expect(outbox).toEqual([{ template: "catering_request_received", locale: "ar", to_email: "Sara@Example.com", status: "queued" }]);
    expect(await db().rows("select * from public.consent_events")).toEqual([]);
  });

  it("uses the reference chosen by the server when provided", async () => {
    const result = await submitCatering(catering({ reference: "UMC-ABCDEFGH" }));
    expect(result.reference).toBe("UMC-ABCDEFGH");
  });

  it("returns the original request when the same submission is retried", async () => {
    const payload = catering();
    const first = await submitCatering(payload);
    const again = await submitCatering(payload);
    expect(again).toEqual({ ...first, duplicate: true });
    await db().asOwner();
    expect(await db().rows("select id from public.catering_requests")).toHaveLength(1);
    expect(await db().rows("select id from public.email_outbox")).toHaveLength(1);
  });

  it("links a returning customer by email without overwriting their details", async () => {
    await submitCatering(catering());
    await submitCatering(catering({ contact: { name: "Someone Else", phone: "+971559999999", email: "  sara@EXAMPLE.com " } }));
    await db().asOwner();
    const customers = await db().rows<{ full_name: string; phone: string }>("select full_name, phone from public.customers");
    expect(customers).toEqual([{ full_name: "Sara Ali", phone: "+971501234567" }]);
    const snapshots = await db().rows<{ contact_name: string }>("select contact_name from public.catering_requests order by created_at, contact_name");
    expect(snapshots.map((s) => s.contact_name).sort()).toEqual(["Sara Ali", "Someone Else"]);
  });

  it("records marketing consent only on opt-in, once", async () => {
    await submitCatering(catering({ marketing_consent: true }));
    await submitCatering(catering({ marketing_consent: true }));
    await submitCatering(catering({ marketing_consent: false }));
    await db().asOwner();
    expect(await db().rows("select granted, source from public.consent_events")).toEqual([{ granted: true, source: "catering_form" }]);
    const [c] = await db().rows<{ marketing_consent: boolean }>("select marketing_consent from public.customers");
    expect(c.marketing_consent).toBe(true);
  });

  it("supports a custom request without a package", async () => {
    const result = await submitCatering(catering({ package_slug: "", custom_request: "Vegetarian buffet for 60" }));
    expect(result.status).toBe("pending_review");
  });

  it("rejects inactive packages, blocked dates and past dates", async () => {
    await db().asOwner();
    await db().query("update public.catering_packages set is_active = false where slug = 'corporate-lunch'");
    await db().query("insert into public.blocked_dates (blocked_on) values ($1)", [futureDate(20)]);
    await db().as("service_role");
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering({ package_slug: "corporate-lunch" }))], /package_unavailable/);
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering({ event_date: futureDate(20) }))], /not available/);
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering({ event_date: "2020-01-01" }))], /in the past/);
  });

  it("limits repeated submissions from the same email", async () => {
    for (let i = 0; i < 5; i++) await submitCatering(catering());
    await db().expectError("select * from public.submit_catering_request($1::jsonb)", [JSON.stringify(catering())], /rate_limited/);
    // A different customer is unaffected.
    await submitCatering(catering({ contact: { name: "B", phone: "+971501234567", email: "other@example.com" } }));
  });
});

describe("guest order", () => {
  it("prices from the catalog and writes order, items and confirmation email atomically", async () => {
    const result = await submitOrder(order());
    expect(result.reference).toMatch(/^UMD-[2-9A-Z]{8}$/);
    expect(result).toMatchObject({ order_status: "new", payment_status: "unpaid", total_fils: "10200", duplicate: false });
    await db().checkDeferred(); // subtotal equals the items
    await db().asOwner();
    const items = await db().rows<{ name_en: string; quantity: number; total_price_fils: string }>(
      "select name_en, quantity, total_price_fils from public.order_items order by name_en",
    );
    expect(items).toEqual([
      { name_en: "Chicken Machboos", quantity: 2, total_price_fils: "8400" },
      { name_en: "Luqaimat", quantity: 1, total_price_fils: "1800" },
    ]);
    expect(await db().rows("select template, to_email from public.email_outbox")).toEqual([
      { template: "order_received", to_email: "omar@example.com" },
    ]);
  });

  it("adds the delivery fee for delivery orders", async () => {
    const result = await submitOrder(order({ order_type: "delivery", delivery_address: "Villa 12, Al Rawda 3", delivery_fee_fils: 1000 }));
    expect(result.total_fils).toBe("11200");
  });

  it("refuses when prices changed since the customer saw them", async () => {
    await db().as("service_role");
    await db().expectError("select * from public.submit_guest_order($1::jsonb)", [JSON.stringify(order({ expected_subtotal_fils: 1 }))], /price_changed/);
  });

  it("refuses unavailable or unknown items", async () => {
    await db().asOwner();
    await db().query("update public.menu_items set is_available = false where slug = 'luqaimat'");
    await db().as("service_role");
    await db().expectError("select * from public.submit_guest_order($1::jsonb)", [JSON.stringify(order())], /item_unavailable/);
    await db().expectError(
      "select * from public.submit_guest_order($1::jsonb)",
      [JSON.stringify(order({ items: [{ slug: "ghost", quantity: 1 }], expected_subtotal_fils: 0 }))],
      /item_unavailable/,
    );
  });

  it("is idempotent and links the order to the same customer as their catering request", async () => {
    const payload = order({ contact: { name: "Sara", phone: "+971501234567", email: "sara@example.com" } });
    const first = await submitOrder(payload);
    expect(await submitOrder(payload)).toEqual({ ...first, duplicate: true });
    await submitCatering(catering());
    await db().asOwner();
    const [row] = await db().rows<{ customers: string }>("select count(distinct customer_id)::text as customers from (select customer_id from public.orders union all select customer_id from public.catering_requests) x");
    expect(row.customers).toBe("1");
  });

  it("requires an idempotency key", async () => {
    await db().as("service_role");
    await db().expectError("select * from public.submit_guest_order($1::jsonb)", [JSON.stringify(order({ idempotency_key: "" }))], /idempotency key/);
  });
});
