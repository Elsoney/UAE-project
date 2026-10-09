import { describe, expect, it } from "vitest";
import { cateringRequestSchema, dubaiDateTimeToUtc, todayInDubai, type CateringValidationContext } from "./catering";
import { fieldErrors } from "./validation";

// Friday 9 Oct 2026, 10:00 in Ajman (06:00 UTC)
const NOW = new Date("2026-10-09T06:00:00Z");
const PKG = "11111111-1111-4111-8111-111111111111";

const ctx: CateringValidationContext = {
  now: NOW,
  blockedDates: new Set(["2026-10-20"]),
  packages: new Map([[PKG, { minimumGuests: 15, maximumGuests: 40 }]]),
};

const valid = {
  fullName: "Sara Ali",
  phone: "050 123 4567",
  email: "sara@example.com",
  locale: "ar",
  packageId: PKG,
  eventDate: "2026-10-15",
  eventTime: "19:30",
  guestCount: "25",
  eventLocation: "Al Nuaimiya, Ajman",
  notes: "",
};

function errors(input: Record<string, unknown>, context = ctx) {
  const result = cateringRequestSchema(context).safeParse(input);
  return result.success ? {} : fieldErrors(result.error);
}

describe("Dubai time helpers", () => {
  it("uses Asia/Dubai (UTC+4) for 'today'", () => {
    expect(todayInDubai(new Date("2026-10-09T19:59:00Z"))).toBe("2026-10-09");
    expect(todayInDubai(new Date("2026-10-09T20:00:00Z"))).toBe("2026-10-10");
  });

  it("converts local event time to an instant and rejects impossible dates", () => {
    expect(dubaiDateTimeToUtc("2026-10-15", "19:30")?.toISOString()).toBe("2026-10-15T15:30:00.000Z");
    expect(dubaiDateTimeToUtc("2026-02-30", "10:00")).toBeNull();
    expect(dubaiDateTimeToUtc("15/10/2026", "10:00")).toBeNull();
    expect(dubaiDateTimeToUtc("2026-10-15", "25:00")).toBeNull();
  });
});

describe("guest catering request validation", () => {
  it("accepts a complete request and normalises it", () => {
    const parsed = cateringRequestSchema(ctx).parse(valid);
    expect(parsed).toMatchObject({
      phone: "+971501234567",
      guestCount: 25,
      packageId: PKG,
      customRequest: null,
      notes: null,
      marketingConsent: false,
    });
  });

  it("accepts a custom request without a package", () => {
    expect(errors({ ...valid, packageId: "", customRequest: "Vegetarian buffet for 30", guestCount: 30 })).toEqual({});
  });

  it("requires email, phone, name and location", () => {
    expect(errors({ ...valid, email: "", phone: "", fullName: "", eventLocation: "" })).toMatchObject({
      email: "errors.required",
      phone: "errors.required",
      fullName: "errors.required",
      eventLocation: "errors.required",
    });
  });

  it("requires a package or a custom request", () => {
    expect(errors({ ...valid, packageId: "" })).toMatchObject({ packageId: "errors.packageOrCustom" });
  });

  it("rejects unknown or inactive packages", () => {
    expect(errors({ ...valid, packageId: "22222222-2222-4222-8222-222222222222" })).toMatchObject({
      packageId: "errors.packageUnavailable",
    });
  });

  it("enforces the package guest range", () => {
    expect(errors({ ...valid, guestCount: 10 })).toMatchObject({ guestCount: "errors.guestCount" });
    expect(errors({ ...valid, guestCount: 41 })).toMatchObject({ guestCount: "errors.guestCount" });
    expect(errors({ ...valid, guestCount: 0, packageId: "", customRequest: "x" })).toMatchObject({ guestCount: "errors.guestCount" });
    expect(errors({ ...valid, guestCount: "abc" })).toMatchObject({ guestCount: "errors.guestCount" });
    const openEnded: CateringValidationContext = { ...ctx, packages: new Map([[PKG, { minimumGuests: 15, maximumGuests: null }]]) };
    expect(errors({ ...valid, guestCount: 400 }, openEnded)).toEqual({});
  });

  it("rejects past dates (in Dubai time)", () => {
    expect(errors({ ...valid, eventDate: "2026-10-08" })).toMatchObject({ eventDate: "errors.datePast" });
    expect(errors({ ...valid, eventDate: "2026-10-09", eventTime: "09:00" })).toMatchObject({ eventDate: "errors.datePast" });
  });

  it("rejects blocked dates", () => {
    expect(errors({ ...valid, eventDate: "2026-10-20" })).toMatchObject({ eventDate: "errors.dateBlocked" });
  });

  it("requires the lead time (48 hours by default)", () => {
    expect(errors({ ...valid, eventDate: "2026-10-10", eventTime: "20:00" })).toMatchObject({ eventDate: "errors.leadTime" });
    expect(errors({ ...valid, eventDate: "2026-10-11", eventTime: "10:00" })).toEqual({});
    expect(errors({ ...valid, eventDate: "2026-10-10", eventTime: "20:00" }, { ...ctx, leadTimeHours: 12 })).toEqual({});
  });

  it("rejects malformed dates and times", () => {
    expect(errors({ ...valid, eventDate: "15-10-2026" })).toMatchObject({ eventDate: "errors.date" });
    expect(errors({ ...valid, eventDate: "2026-02-30" })).toMatchObject({ eventDate: "errors.date" });
    expect(errors({ ...valid, eventTime: "7pm" })).toMatchObject({ eventTime: "errors.time" });
    expect(errors({ ...valid, eventDate: "" })).toMatchObject({ eventDate: "errors.required" });
  });

  it("limits free-text length", () => {
    expect(errors({ ...valid, notes: "x".repeat(2001) })).toMatchObject({ notes: "errors.tooLong" });
  });
});
