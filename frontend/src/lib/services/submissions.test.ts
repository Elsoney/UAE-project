/**
 * Guest checkout and guest catering submissions (owner instructions §3, §4, §10):
 * submission without an account, returning-customer association by email,
 * privacy (nothing about other orders is returned), idempotent retries,
 * consent separation and localised confirmation emails.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { submitCateringRequest, submitGuestOrder, type SubmissionDeps } from "./submissions";
import { MemoryDatabase } from "./testing/memory";

const NOW = new Date("2026-10-09T06:00:00Z");
const PKG = "11111111-1111-4111-8111-111111111111";

let db: MemoryDatabase;
let deps: SubmissionDeps;
let refCounter: number;

beforeEach(() => {
  db = new MemoryDatabase();
  db.menu.set("machboos", { id: "machboos", nameEn: "Chicken Machboos", nameAr: "مجبوس دجاج", priceFils: 4200, isActive: true, isAvailable: true });
  db.menu.set("luqaimat", { id: "luqaimat", nameEn: "Luqaimat", nameAr: "لقيمات", priceFils: 1800, isActive: true, isAvailable: true });
  db.menu.set("harees", { id: "harees", nameEn: "Harees", nameAr: "هريس", priceFils: 3500, isActive: true, isAvailable: false });
  db.packages.set(PKG, { id: PKG, nameEn: "Family Gathering", nameAr: "تجمع عائلي", minimumGuests: 15, maximumGuests: 40 });
  db.blocked.add("2026-10-20");
  refCounter = 0;
  deps = {
    catalog: db,
    customers: db,
    submissions: db,
    clock: { now: () => NOW },
    brand: { nameEn: "Umodai", nameAr: "أمودي", phone: "+971 6 000 0000", siteUrl: "https://umodai.example" },
    newReference: (kind) => `${kind === "order" ? "UMD" : "UMC"}-TEST${String(++refCounter).padStart(4, "2")}`,
  };
});

const order = (overrides: Record<string, unknown> = {}) => ({
  fullName: "Omar Saeed",
  phone: "055 123 4567",
  email: "Omar@Example.com",
  locale: "ar",
  orderType: "pickup",
  items: [{ menuItemId: "machboos", quantity: 2 }, { menuItemId: "luqaimat", quantity: 1 }],
  idempotencyKey: `key-${Math.random().toString(36).slice(2)}`,
  ...overrides,
});

const catering = (overrides: Record<string, unknown> = {}) => ({
  fullName: "Sara Ali",
  phone: "050 123 4567",
  email: "sara@example.com",
  locale: "en",
  packageId: PKG,
  eventDate: "2026-10-15",
  eventTime: "19:30",
  guestCount: 25,
  eventLocation: "Al Nuaimiya, Ajman",
  ...overrides,
});

describe("guest checkout (regular orders)", () => {
  it("completes without an account and prices the order on the server", async () => {
    const result = await submitGuestOrder(deps, order());
    expect(result).toEqual({
      ok: true,
      duplicate: false,
      reference: "UMD-TEST2221",
      orderStatus: "new",
      paymentStatus: "unpaid",
      totalFils: 10200,
    });
    expect(db.orders).toHaveLength(1);
    expect(db.orders[0]).toMatchObject({
      subtotalFils: 10200,
      totalFils: 10200,
      contact: { name: "Omar Saeed", phone: "+971551234567", email: "Omar@Example.com" },
      locale: "ar",
    });
    expect(db.customers).toHaveLength(1);
  });

  it("returns ONLY the new reference and status (no customer or order history)", async () => {
    await submitGuestOrder(deps, order());
    const second = await submitGuestOrder(deps, order({ fullName: "Impostor" }));
    expect(Object.keys(second).sort()).toEqual(["duplicate", "ok", "orderStatus", "paymentStatus", "reference", "totalFils"]);
  });

  it("links a returning customer by email (case/space-insensitive) without overwriting their details", async () => {
    await submitGuestOrder(deps, order());
    await submitGuestOrder(deps, order({ email: "  omar@EXAMPLE.com ", fullName: "Someone Else", phone: "0559999999" }));
    expect(db.customers).toHaveLength(1);
    expect(db.customers[0]).toMatchObject({ fullName: "Omar Saeed", phone: "+971551234567" });
    expect(db.orders.map((o) => o.customerId)).toEqual(["cust-1", "cust-1"]);
    // what was submitted is kept on the order itself
    expect(db.orders[1].contact).toEqual({ name: "Someone Else", phone: "+971559999999", email: "omar@EXAMPLE.com" });
  });

  it("treats a retried submission as the same order (no duplicate)", async () => {
    const input = order({ idempotencyKey: "retry-key-123" });
    const first = await submitGuestOrder(deps, input);
    const retry = await submitGuestOrder(deps, input);
    expect(retry).toMatchObject({ ok: true, duplicate: true, reference: first.ok ? first.reference : "" });
    expect(db.orders).toHaveLength(1);
    expect(db.outbox).toHaveLength(1);
  });

  it("rejects unavailable items and tells the customer which ones", async () => {
    const result = await submitGuestOrder(deps, order({ items: [{ menuItemId: "harees", quantity: 1 }, { menuItemId: "ghost", quantity: 1 }] }));
    expect(result).toEqual({
      ok: false,
      kind: "cart",
      issues: [
        { menuItemId: "harees", code: "unavailable" },
        { menuItemId: "ghost", code: "not_found" },
      ],
    });
    expect(db.orders).toHaveLength(0);
    expect(db.customers).toHaveLength(0);
  });

  it("requires a valid email and returns localisable error keys", async () => {
    const result = await submitGuestOrder(deps, order({ email: "nope" }));
    expect(result).toEqual({ ok: false, kind: "validation", errors: { email: "errors.email" } });
  });

  it("queues a localised confirmation email with the reference", async () => {
    await submitGuestOrder(deps, order());
    expect(db.outbox).toEqual([
      expect.objectContaining({ template: "order_received", locale: "ar", toEmail: "Omar@Example.com", subject: expect.stringContaining("UMD-TEST2221") }),
    ]);
  });

  it("applies the delivery fee policy only to delivery orders", async () => {
    deps.deliveryFeeFils = 1000;
    const pickup = await submitGuestOrder(deps, order());
    const delivery = await submitGuestOrder(deps, order({ orderType: "delivery", deliveryAddress: "Villa 12, Al Rawda, Ajman" }));
    expect(pickup).toMatchObject({ totalFils: 10200 });
    expect(delivery).toMatchObject({ totalFils: 11200 });
    expect(db.orders[1]).toMatchObject({ deliveryAddress: "Villa 12, Al Rawda, Ajman", deliveryFeeFils: 1000 });
    deps.deliveryFeeFils = undefined;
    expect(await submitGuestOrder(deps, order({ orderType: "delivery", deliveryAddress: "Ajman" }))).toMatchObject({ totalFils: 10200 });
  });

  it("never records marketing consent unless the customer opts in", async () => {
    await submitGuestOrder(deps, order());
    expect(db.consentEvents).toEqual([]);
    expect(db.customers[0].marketingConsent).toBe(false);
    await submitGuestOrder(deps, order({ marketingConsent: true }));
    expect(db.consentEvents).toEqual([{ customerId: "cust-1", granted: true, source: "checkout" }]);
  });

  it("writes nothing if storage fails (no half-created order)", async () => {
    db.failNextWrite = true;
    await expect(submitGuestOrder(deps, order())).rejects.toThrow("simulated database failure");
    expect(db.orders).toHaveLength(0);
    expect(db.customers).toHaveLength(0);
    expect(db.outbox).toHaveLength(0);
  });

  it("uses the default reference generator", async () => {
    delete deps.newReference;
    const result = await submitGuestOrder(deps, order());
    expect(result.ok && result.reference).toMatch(/^UMD-[2-9A-Z]{8}$/);
  });
});

describe("guest catering requests", () => {
  it("submits without an account and always starts as pending review", async () => {
    const result = await submitCateringRequest(deps, catering());
    expect(result).toEqual({ ok: true, duplicate: false, reference: "UMC-TEST2221", status: "pending_review" });
    expect(db.catering[0]).toMatchObject({ guestCount: 25, eventDate: "2026-10-15", packageId: PKG, contact: { phone: "+971501234567" } });
  });

  it("emails that the request was received — not that the booking is confirmed", async () => {
    await submitCateringRequest(deps, catering());
    expect(db.outbox[0]).toMatchObject({ template: "catering_request_received", locale: "en", toEmail: "sara@example.com" });
    expect(db.outbox[0].subject).toMatch(/received/i);
    expect(db.outbox[0].subject).not.toMatch(/confirm/i);
  });

  it("uses the Arabic package name for Arabic requests and supports custom requests", async () => {
    await submitCateringRequest(deps, catering({ locale: "ar" }));
    expect(db.outbox[0].subject).toContain("UMC-");
    const custom = await submitCateringRequest(deps, catering({ packageId: "", customRequest: "Vegetarian buffet", guestCount: 60, email: "x@example.com" }));
    expect(custom).toMatchObject({ ok: true });
    expect(db.catering[1]).toMatchObject({ packageId: null, customRequest: "Vegetarian buffet" });
  });

  it("links the same customer across orders and catering requests", async () => {
    await submitGuestOrder(deps, order({ email: "sara@example.com" }));
    await submitCateringRequest(deps, catering({ email: "SARA@example.com" }));
    expect(db.customers).toHaveLength(1);
    expect(db.catering[0].customerId).toBe(db.orders[0].customerId);
  });

  it("rejects blocked dates, past dates and too-short notice", async () => {
    expect(await submitCateringRequest(deps, catering({ eventDate: "2026-10-20" }))).toEqual({
      ok: false,
      kind: "validation",
      errors: { eventDate: "errors.dateBlocked" },
    });
    expect(await submitCateringRequest(deps, catering({ eventDate: "2026-10-01" }))).toMatchObject({ errors: { eventDate: "errors.datePast" } });
    expect(await submitCateringRequest(deps, catering({ eventDate: "2026-10-10" }))).toMatchObject({ errors: { eventDate: "errors.leadTime" } });
    expect(await submitCateringRequest(deps, catering({ eventDate: "2026-10-10" }), { leadTimeHours: 24 })).toMatchObject({ ok: true });
    expect(db.catering).toHaveLength(1);
  });

  it("requires email", async () => {
    expect(await submitCateringRequest(deps, catering({ email: "" }))).toMatchObject({ errors: { email: "errors.required" } });
  });

  it("is idempotent when the form is resubmitted", async () => {
    const first = await submitCateringRequest(deps, catering({ idempotencyKey: "catering-key-1" }));
    const again = await submitCateringRequest(deps, catering({ idempotencyKey: "catering-key-1" }));
    expect(again).toMatchObject({ ok: true, duplicate: true, reference: first.ok ? first.reference : "" });
    expect(db.catering).toHaveLength(1);
  });

  it("records marketing consent separately, only on opt-in", async () => {
    await submitCateringRequest(deps, catering({ marketingConsent: true }));
    expect(db.consentEvents).toEqual([{ customerId: "cust-1", granted: true, source: "catering_form" }]);
  });
});
