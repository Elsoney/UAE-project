import { describe, expect, it } from "vitest";
import {
  CATERING_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  TransitionError,
  allowedCateringTransitions,
  allowedOrderTransitions,
  assertCateringTransition,
  assertOrderTransition,
  canTransitionCatering,
  canTransitionOrder,
  cateringStatusLabel,
  derivePaymentStatus,
  orderStatusLabel,
  paymentStatusLabel,
  type CateringTransitionContext,
} from "./status";
import { Constants } from "@/types/database";

describe("status enums", () => {
  it("match the database enums exactly", () => {
    expect([...ORDER_STATUSES]).toEqual([...Constants.public.Enums.order_status]);
    expect([...CATERING_STATUSES]).toEqual([...Constants.public.Enums.catering_status]);
    expect([...PAYMENT_STATUSES]).toEqual([...Constants.public.Enums.payment_status]);
  });
});

describe("order status transitions", () => {
  const valid: [string, string][] = [
    ["new", "confirmed"],
    ["new", "cancelled"],
    ["confirmed", "preparing"],
    ["confirmed", "cancelled"],
    ["preparing", "ready"],
    ["preparing", "cancelled"],
    ["ready", "completed"],
    ["ready", "cancelled"],
  ];

  it("allows exactly the documented transitions", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        const expected = valid.some(([f, t]) => f === from && t === to);
        expect(canTransitionOrder(from, to), `${from} -> ${to}`).toBe(expected);
      }
    }
  });

  it("treats completed and cancelled as final", () => {
    expect(allowedOrderTransitions("completed")).toEqual([]);
    expect(allowedOrderTransitions("cancelled")).toEqual([]);
  });

  it("throws on invalid transitions", () => {
    expect(() => assertOrderTransition("new", "completed")).toThrow(TransitionError);
    expect(() => assertOrderTransition("new", "confirmed")).not.toThrow();
  });
});

describe("catering status transitions", () => {
  const quoted: CateringTransitionContext = { quotedTotalFils: 300_000, depositType: "percentage", requiredPaymentReceived: false };
  const noQuote: CateringTransitionContext = { quotedTotalFils: null, depositType: null, requiredPaymentReceived: false };

  function reason(from: Parameters<typeof assertCateringTransition>[0], to: Parameters<typeof assertCateringTransition>[1], ctx: CateringTransitionContext) {
    try {
      assertCateringTransition(from, to, ctx);
      return "ok";
    } catch (error) {
      return (error as TransitionError).code;
    }
  }

  it("never jumps straight from a new request to confirmed", () => {
    expect(reason("pending_review", "confirmed", { ...quoted, depositType: "none" })).toBe("invalid_transition");
  });

  it("requires the confirmed price before quoting", () => {
    expect(reason("pending_review", "quoted", noQuote)).toBe("quote_required");
    expect(reason("customer_contacted", "quoted", quoted)).toBe("ok");
  });

  it("requires a deposit or full payment before requesting payment", () => {
    expect(reason("quoted", "awaiting_payment", { ...quoted, depositType: null })).toBe("deposit_choice_required");
    expect(reason("quoted", "awaiting_payment", { ...quoted, depositType: "none" })).toBe("deposit_choice_required");
    expect(reason("quoted", "awaiting_payment", quoted)).toBe("ok");
    expect(reason("quoted", "awaiting_payment", { ...quoted, quotedTotalFils: null })).toBe("quote_required");
  });

  it("confirms from quoted only when no deposit is required", () => {
    expect(reason("quoted", "confirmed", { ...quoted, depositType: "none" })).toBe("ok");
    expect(reason("quoted", "confirmed", quoted)).toBe("payment_not_received");
    expect(reason("quoted", "confirmed", { ...quoted, depositType: null })).toBe("deposit_choice_required");
  });

  it("confirms after payment only once the payment is received", () => {
    expect(reason("awaiting_payment", "confirmed", quoted)).toBe("payment_not_received");
    expect(reason("awaiting_payment", "confirmed", { ...quoted, requiredPaymentReceived: true })).toBe("ok");
  });

  it("allows staff to reject or cancel early, and re-quote while awaiting payment", () => {
    expect(reason("pending_review", "rejected", noQuote)).toBe("ok");
    expect(reason("customer_contacted", "cancelled", noQuote)).toBe("ok");
    expect(reason("awaiting_payment", "quoted", quoted)).toBe("ok");
  });

  it("treats completed, rejected and cancelled as final", () => {
    for (const status of ["completed", "rejected", "cancelled"] as const) {
      expect(allowedCateringTransitions(status)).toEqual([]);
    }
    expect(canTransitionCatering("completed", "preparing", quoted)).toBe(false);
    expect(canTransitionCatering("confirmed", "preparing", quoted)).toBe(true);
  });
});

describe("payment status rollup", () => {
  const base = { totalFils: 300_000, paidFils: 0, refundedFils: 0, requiredDepositFils: 75_000, hasOpenRequest: false, lastAttemptFailed: false };

  it.each([
    ["nothing happened", {}, "unpaid"],
    ["a payment was requested", { hasOpenRequest: true }, "payment_requested"],
    ["the last attempt failed", { hasOpenRequest: true, lastAttemptFailed: true }, "payment_failed"],
    ["less than the deposit was paid", { paidFils: 10_000 }, "partially_paid"],
    ["the deposit was paid", { paidFils: 75_000 }, "deposit_paid"],
    ["more than the deposit was paid", { paidFils: 150_000 }, "deposit_paid"],
    ["everything was paid", { paidFils: 300_000 }, "fully_paid"],
    ["part was refunded", { paidFils: 300_000, refundedFils: 50_000 }, "partially_refunded"],
    ["everything was refunded", { paidFils: 300_000, refundedFils: 300_000 }, "refunded"],
    ["paid without a deposit requirement", { requiredDepositFils: 0, paidFils: 10_000 }, "partially_paid"],
  ] as const)("%s → %s", (_label, change, expected) => {
    expect(derivePaymentStatus({ ...base, ...change })).toBe(expected);
  });

  it("a later successful payment wins over an earlier failure", () => {
    expect(derivePaymentStatus({ ...base, paidFils: 300_000, lastAttemptFailed: true })).toBe("fully_paid");
  });
});

describe("status labels", () => {
  it("exist in Arabic and English for every status", () => {
    for (const s of ORDER_STATUSES) {
      expect(orderStatusLabel(s, "en")).toBeTruthy();
      expect(orderStatusLabel(s, "ar")).toMatch(/[؀-ۿ]/);
    }
    for (const s of CATERING_STATUSES) {
      expect(cateringStatusLabel(s, "en")).toBeTruthy();
      expect(cateringStatusLabel(s, "ar")).toMatch(/[؀-ۿ]/);
    }
    for (const s of PAYMENT_STATUSES) {
      expect(paymentStatusLabel(s, "en")).toBeTruthy();
      expect(paymentStatusLabel(s, "ar")).toMatch(/[؀-ۿ]/);
    }
  });

  it("never describe a pending catering request as confirmed", () => {
    expect(cateringStatusLabel("pending_review", "en")).not.toMatch(/confirm/i);
    expect(cateringStatusLabel("pending_review", "ar")).not.toMatch(/تأكيد|مؤكد/);
  });
});
