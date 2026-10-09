import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./checkout";
import { fieldErrors, VALIDATION_MESSAGE_KEYS } from "./validation";

const valid = {
  fullName: "Omar Saeed",
  phone: "0551234567",
  email: "omar@example.com",
  locale: "en",
  orderType: "pickup",
  items: [{ menuItemId: "a", quantity: "2" }],
  idempotencyKey: "checkout-0001",
};

function errors(input: Record<string, unknown>) {
  const result = checkoutSchema.safeParse(input);
  return result.success ? {} : fieldErrors(result.error);
}

describe("guest checkout validation", () => {
  it("accepts a pickup order without an account", () => {
    const parsed = checkoutSchema.parse(valid);
    expect(parsed).toMatchObject({ phone: "+971551234567", items: [{ menuItemId: "a", quantity: 2 }], deliveryAddress: null, notes: null });
  });

  it("requires email (owner §3)", () => {
    expect(errors({ ...valid, email: undefined })).toMatchObject({ email: "errors.required" });
  });

  it("requires a delivery address for delivery orders", () => {
    expect(errors({ ...valid, orderType: "delivery" })).toMatchObject({ deliveryAddress: "errors.deliveryAddress" });
    expect(errors({ ...valid, orderType: "delivery", deliveryAddress: "Villa 12, Al Rawda 3, Ajman" })).toEqual({});
  });

  it("rejects an empty cart and invalid quantities", () => {
    expect(errors({ ...valid, items: [] })).toMatchObject({ items: "errors.cartEmpty" });
    expect(errors({ ...valid, items: undefined })).toMatchObject({ items: "errors.cartEmpty" });
    expect(errors({ ...valid, items: [{ menuItemId: "a", quantity: 0 }] })).toMatchObject({ "items.0.quantity": "errors.quantity" });
    expect(errors({ ...valid, items: [{ menuItemId: "a", quantity: 51 }] })).toMatchObject({ "items.0.quantity": "errors.quantity" });
  });

  it("requires an idempotency key so retries never create duplicate orders", () => {
    expect(errors({ ...valid, idempotencyKey: undefined })).toMatchObject({ idempotencyKey: "errors.generic" });
  });

  it("does not accept prices from the browser", () => {
    const parsed = checkoutSchema.parse({ ...valid, items: [{ menuItemId: "a", quantity: 1, priceFils: 1 }], totalFils: 1 });
    expect(parsed.items[0]).toEqual({ menuItemId: "a", quantity: 1 });
    expect("totalFils" in parsed).toBe(false);
  });
});

describe("validation message keys", () => {
  it("maps unknown messages to errors.generic", () => {
    const result = checkoutSchema.safeParse({ ...valid, orderType: "drone" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).orderType).toBe("errors.required");
    expect(VALIDATION_MESSAGE_KEYS).toContain("errors.generic");
  });
});

describe("checkout optional fields", () => {
  it("keeps notes and drops empty ones", () => {
    expect(checkoutSchema.parse({ ...valid, notes: " Extra spicy " }).notes).toBe("Extra spicy");
    expect(checkoutSchema.parse({ ...valid, notes: "   " }).notes).toBeNull();
  });
});
