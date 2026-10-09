import { describe, expect, it } from "vitest";
import {
  DepositError,
  buildBalanceRequest,
  buildPaymentRequest,
  netPaidFils,
  remainingBalanceFils,
  requiredUpfrontFils,
  reviewTotalChange,
  validateDepositChoice,
} from "./deposit";

const TOTAL = 300_000; // AED 3,000.00

function code(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof DepositError) return error.code;
    throw error;
  }
  return "no error";
}

describe("catering deposit options", () => {
  it("no deposit requires nothing up front and issues no payment request", () => {
    expect(requiredUpfrontFils(TOTAL, { type: "none" })).toBe(0);
    expect(buildPaymentRequest(TOTAL, { type: "none" })).toBeNull();
  });

  it("fixed deposit requests exactly that amount", () => {
    expect(buildPaymentRequest(TOTAL, { type: "fixed", amountFils: 50_000 })).toEqual({
      kind: "deposit",
      depositType: "fixed",
      percentage: null,
      fixedAmountFils: 50_000,
      totalSnapshotFils: TOTAL,
      requestedAmountFils: 50_000,
    });
  });

  it("fixed deposit equal to the total is allowed", () => {
    expect(requiredUpfrontFils(TOTAL, { type: "fixed", amountFils: TOTAL })).toBe(TOTAL);
  });

  it("percentage deposit rounds half up to the fil", () => {
    expect(buildPaymentRequest(33_333, { type: "percentage", percent: 12.5 })).toEqual({
      kind: "deposit",
      depositType: "percentage",
      percentage: 12.5,
      fixedAmountFils: null,
      totalSnapshotFils: 33_333,
      requestedAmountFils: 4_167,
    });
    expect(requiredUpfrontFils(TOTAL, { type: "percentage", percent: 100 })).toBe(TOTAL);
    expect(requiredUpfrontFils(TOTAL, { type: "percentage", percent: 0.01 })).toBe(30);
  });

  it("full payment requests the whole total", () => {
    expect(buildPaymentRequest(TOTAL, { type: "full" })).toEqual({
      kind: "full",
      depositType: "full",
      percentage: null,
      fixedAmountFils: null,
      totalSnapshotFils: TOTAL,
      requestedAmountFils: TOTAL,
    });
  });

  it.each([
    ["percentage 0", { type: "percentage", percent: 0 } as const, "percentage_out_of_range"],
    ["percentage 101", { type: "percentage", percent: 101 } as const, "percentage_out_of_range"],
    ["percentage -5", { type: "percentage", percent: -5 } as const, "percentage_out_of_range"],
    ["percentage 12.345", { type: "percentage", percent: 12.345 } as const, "percentage_out_of_range"],
    ["fixed 0", { type: "fixed", amountFils: 0 } as const, "fixed_not_positive"],
    ["fixed fractional", { type: "fixed", amountFils: 10.5 } as const, "fixed_not_positive"],
    ["fixed above total", { type: "fixed", amountFils: TOTAL + 1 } as const, "exceeds_total"],
  ])("rejects %s", (_label, choice, expected) => {
    expect(code(() => validateDepositChoice(TOTAL, choice))).toBe(expected);
  });

  it("rejects a missing or invalid confirmed total", () => {
    expect(code(() => validateDepositChoice(0, { type: "full" }))).toBe("invalid_total");
    expect(code(() => validateDepositChoice(-1, { type: "full" }))).toBe("invalid_total");
    expect(code(() => validateDepositChoice(1.5, { type: "full" }))).toBe("invalid_total");
  });
});

describe("remaining balance", () => {
  it("is the total minus money kept (paid minus refunded)", () => {
    expect(remainingBalanceFils({ totalFils: TOTAL, paidFils: 0, refundedFils: 0 })).toBe(TOTAL);
    expect(remainingBalanceFils({ totalFils: TOTAL, paidFils: 75_000, refundedFils: 0 })).toBe(225_000);
    expect(remainingBalanceFils({ totalFils: TOTAL, paidFils: 75_000, refundedFils: 25_000 })).toBe(250_000);
    expect(remainingBalanceFils({ totalFils: TOTAL, paidFils: TOTAL, refundedFils: 0 })).toBe(0);
  });

  it("never goes negative", () => {
    expect(remainingBalanceFils({ totalFils: 100, paidFils: 150, refundedFils: 0 })).toBe(0);
  });

  it("rejects refunds above what was paid", () => {
    expect(() => netPaidFils(100, 150)).toThrow();
  });

  it("produces a balance request for what is still owed", () => {
    expect(buildBalanceRequest({ totalFils: TOTAL, paidFils: 75_000, refundedFils: 0 })).toEqual({
      kind: "balance",
      depositType: null,
      percentage: null,
      fixedAmountFils: null,
      totalSnapshotFils: TOTAL,
      requestedAmountFils: 225_000,
    });
    expect(buildBalanceRequest({ totalFils: TOTAL, paidFils: TOTAL, refundedFils: 0 })).toBeNull();
  });
});

describe("when the confirmed price changes (owner §5)", () => {
  const open = buildPaymentRequest(TOTAL, { type: "percentage", percent: 25 });

  it("recalculates a percentage deposit and supersedes the open request", () => {
    const review = reviewTotalChange({ newTotalFils: 400_000, choice: { type: "percentage", percent: 25 }, openRequest: open });
    expect(review).toEqual({
      action: "supersede",
      requiredUpfrontFils: 100_000,
      replacement: expect.objectContaining({ totalSnapshotFils: 400_000, requestedAmountFils: 100_000 }),
    });
  });

  it("leaves a matching open request untouched", () => {
    expect(reviewTotalChange({ newTotalFils: TOTAL, choice: { type: "percentage", percent: 25 }, openRequest: open })).toEqual({
      action: "unchanged",
    });
  });

  it("supersedes a fixed deposit's request when only the total changes", () => {
    const fixed = buildPaymentRequest(TOTAL, { type: "fixed", amountFils: 50_000 });
    const review = reviewTotalChange({ newTotalFils: 350_000, choice: { type: "fixed", amountFils: 50_000 }, openRequest: fixed });
    expect(review).toMatchObject({ action: "supersede", requiredUpfrontFils: 50_000 });
  });

  it("blocks when a fixed deposit would exceed the new, lower total", () => {
    const fixed = buildPaymentRequest(TOTAL, { type: "fixed", amountFils: 250_000 });
    expect(
      reviewTotalChange({ newTotalFils: 200_000, choice: { type: "fixed", amountFils: 250_000 }, openRequest: fixed }),
    ).toMatchObject({ action: "blocked", code: "exceeds_total" });
  });

  it("cancels the open request when the admin switches to no deposit", () => {
    expect(reviewTotalChange({ newTotalFils: TOTAL, choice: { type: "none" }, openRequest: open })).toEqual({
      action: "supersede",
      replacement: null,
      requiredUpfrontFils: 0,
    });
  });

  it("reports the new amount when no request is open", () => {
    expect(reviewTotalChange({ newTotalFils: 400_000, choice: { type: "full" }, openRequest: null })).toEqual({
      action: "recalculated",
      requiredUpfrontFils: 400_000,
    });
  });
});
