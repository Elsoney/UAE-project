import { describe, expect, it } from "vitest";
import { contactSchema, normalizeEmail, normalizePhone, resolveCustomer, type Contact } from "./customer";
import { fieldErrors } from "./validation";

describe("email normalisation", () => {
  it("trims and lowercases only", () => {
    expect(normalizeEmail("  Sara.Ali@Example.COM ")).toBe("sara.ali@example.com");
    // no provider-specific rewriting
    expect(normalizeEmail("first.last+tag@gmail.com")).toBe("first.last+tag@gmail.com");
  });
});

describe("phone normalisation", () => {
  it.each([
    ["050 123 4567", "+971501234567"],
    ["0501234567", "+971501234567"],
    ["501234567", "+971501234567"],
    ["+971 50 123 4567", "+971501234567"],
    ["00971501234567", "+971501234567"],
    ["(050) 123-4567", "+971501234567"],
    ["06 123 4567", "+97161234567"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "abc", "+971 12", "+97150123456789", "0012", "+0123456789"])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("contact details (guest checkout)", () => {
  it("requires name, phone and email", () => {
    const result = contactSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toMatchObject({
        fullName: "errors.required",
        phone: "errors.required",
        email: "errors.required",
      });
    }
  });

  it("validates email and phone with localised message keys", () => {
    const result = contactSchema.safeParse({ fullName: "Sara", phone: "123", email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toMatchObject({ phone: "errors.phone", email: "errors.email" });
    }
  });

  it("normalises and defaults: Arabic, no marketing consent", () => {
    const parsed = contactSchema.parse({ fullName: "  Sara Ali ", phone: "050 123 4567", email: " sara@example.com " });
    expect(parsed).toEqual({
      fullName: "Sara Ali",
      phone: "+971501234567",
      email: "sara@example.com",
      locale: "ar",
      marketingConsent: false,
    });
  });

  it("rejects over-long values", () => {
    const result = contactSchema.safeParse({ fullName: "x".repeat(121), phone: "0501234567", email: `${"a".repeat(250)}@x.co` });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toMatchObject({ fullName: "errors.tooLong", email: "errors.tooLong" });
  });
});

describe("returning-customer association", () => {
  const contact: Contact = { fullName: "Sara Ali", phone: "+971501234567", email: "Sara@Example.com", locale: "en", marketingConsent: false };

  it("creates a customer for a new email (no login account involved)", () => {
    expect(resolveCustomer(null, contact, "checkout")).toEqual({
      customer: {
        action: "create",
        fullName: "Sara Ali",
        phone: "+971501234567",
        email: "Sara@Example.com",
        emailNormalized: "sara@example.com",
        preferredLanguage: "en",
      },
      consentEvent: null,
    });
  });

  it("reuses the existing record for the same email and does not overwrite it", () => {
    const result = resolveCustomer({ id: "cust-1", marketingConsent: false }, { ...contact, fullName: "Someone Else", phone: "+971559999999" }, "checkout");
    expect(result.customer).toEqual({ action: "reuse", id: "cust-1" });
  });

  it("records marketing consent only on explicit opt-in", () => {
    expect(resolveCustomer(null, contact, "catering_form").consentEvent).toBeNull();
    expect(resolveCustomer(null, { ...contact, marketingConsent: true }, "catering_form").consentEvent).toEqual({
      consentType: "marketing_email",
      granted: true,
      source: "catering_form",
      locale: "en",
    });
  });

  it("does not duplicate consent for a customer who already opted in, and never withdraws it by ordering", () => {
    expect(resolveCustomer({ id: "c", marketingConsent: true }, { ...contact, marketingConsent: true }, "checkout").consentEvent).toBeNull();
    expect(resolveCustomer({ id: "c", marketingConsent: true }, contact, "checkout").consentEvent).toBeNull();
    expect(resolveCustomer({ id: "c", marketingConsent: false }, { ...contact, marketingConsent: true }, "checkout").consentEvent).toMatchObject({
      granted: true,
    });
  });
});
