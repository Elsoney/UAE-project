import { describe, expect, it } from "vitest";
import type { NewCateringRequest, NewOrder } from "./ports";
import { rejectionFromDatabaseError, toCateringPayload, toOrderPayload } from "./supabase-ports";

describe("database error mapping", () => {
  it.each([
    [{ code: "P0001", message: "rate_limited" }, "rate_limited"],
    [{ code: "P0001", message: "package_unavailable" }, "package_unavailable"],
    [{ code: "P0001", message: "item_unavailable" }, "item_unavailable"],
    [{ code: "P0001", message: "price_changed" }, "price_changed"],
    [{ code: "23514", message: "event date 2026-10-20 is not available" }, "date_blocked"],
    [{ code: "23514", message: "event date 2020-01-01 is in the past" }, "date_past"],
    [{ code: "23505", message: "duplicate key value" }, null],
    [null, null],
  ] as const)("%j → %s", (error, expected) => {
    expect(rejectionFromDatabaseError(error)).toBe(expected);
  });
});

const email = { template: "order_received" as const, locale: "en" as const, toEmail: "a@example.com", subject: "S" };

describe("payloads sent to the database functions", () => {
  it("sends only ids and quantities for orders — the database prices them", () => {
    const order: NewOrder = {
      reference: "UMD-ABCDEFGH",
      idempotencyKey: "key-12345678",
      customer: { action: "reuse", id: "c1" },
      consentEvent: { consentType: "marketing_email", granted: true, source: "checkout", locale: "en" },
      contact: { name: "Omar", phone: "+971551234567", email: "a@example.com" },
      locale: "en",
      orderType: "pickup",
      deliveryAddress: null,
      notes: null,
      lines: [{ menuItemId: "luqaimat", nameEn: "L", nameAr: "ل", quantity: 2, unitPriceFils: 1800, totalPriceFils: 3600 }],
      subtotalFils: 3600,
      discountFils: 0,
      deliveryFeeFils: 0,
      totalFils: 3600,
      email,
    };
    expect(toOrderPayload(order)).toEqual({
      reference: "UMD-ABCDEFGH",
      idempotency_key: "key-12345678",
      locale: "en",
      contact: { name: "Omar", phone: "+971551234567", email: "a@example.com" },
      marketing_consent: true,
      order_type: "pickup",
      delivery_address: null,
      notes: null,
      items: [{ slug: "luqaimat", quantity: 2 }],
      expected_subtotal_fils: 3600,
      delivery_fee_fils: 0,
      email: { locale: "en", subject: "S" },
    });
  });

  it("maps catering requests and never sends consent unless opted in", () => {
    const request: NewCateringRequest = {
      reference: "UMC-ABCDEFGH",
      idempotencyKey: null,
      customer: { action: "create", fullName: "S", phone: "+971501234567", email: "s@example.com", emailNormalized: "s@example.com", preferredLanguage: "ar" },
      consentEvent: null,
      contact: { name: "S", phone: "+971501234567", email: "s@example.com" },
      locale: "ar",
      eventDate: "2026-10-15",
      eventTime: "19:30",
      guestCount: 25,
      eventLocation: "Ajman",
      packageId: "family-gathering",
      customRequest: null,
      notes: null,
      email: { ...email, template: "catering_request_received", locale: "ar" },
    };
    expect(toCateringPayload(request)).toMatchObject({ marketing_consent: false, package_slug: "family-gathering", guest_count: 25, idempotency_key: null });
  });
});
