import { describe, expect, it } from "vitest";
import { nextOrderStep, planCateringReview, planOrderUpdate, type CateringReviewState } from "./review";

const fresh: CateringReviewState = { status: "pending_review", quotedTotalFils: null, depositType: null, paymentStatus: "unpaid" };
const quotedNone: CateringReviewState = { status: "quoted", quotedTotalFils: 300_000, depositType: "none", paymentStatus: "unpaid" };
const quotedDeposit: CateringReviewState = { ...quotedNone, depositType: "percentage" };

describe("catering review planning", () => {
  it("marks a new request as contacted", () => {
    expect(planCateringReview(fresh, { type: "contacted" })).toEqual({ ok: true, update: { status: "customer_contacted" } });
    expect(planCateringReview(quotedNone, { type: "contacted" })).toEqual({ ok: true, update: { status: "customer_contacted" } });
    expect(planCateringReview({ ...fresh, status: "confirmed" }, { type: "contacted" })).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("records the agreed price and deposit choice", () => {
    expect(planCateringReview(fresh, { type: "quote", totalAed: "3,000", depositType: "percentage", depositPercent: "25" })).toEqual({
      ok: true,
      update: { status: "quoted", quoted_total_fils: 300_000, deposit_type: "percentage", deposit_percentage: 25, deposit_fixed_fils: null },
    });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1500.50", depositType: "fixed", depositFixedAed: "500" })).toEqual({
      ok: true,
      update: { status: "quoted", quoted_total_fils: 150_050, deposit_type: "fixed", deposit_percentage: null, deposit_fixed_fils: 50_000 },
    });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "2000", depositType: "none" })).toMatchObject({ ok: true, update: { deposit_type: "none" } });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "2000", depositType: "full" })).toMatchObject({ ok: true, update: { deposit_type: "full" } });
  });

  it("rejects invalid amounts and deposits", () => {
    expect(planCateringReview(fresh, { type: "quote", totalAed: "abc", depositType: "none" })).toEqual({ ok: false, code: "invalid_amount" });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "0", depositType: "none" })).toEqual({ ok: false, code: "invalid_amount" });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1000", depositType: "fixed", depositFixedAed: "1500" })).toEqual({
      ok: false,
      code: "deposit_exceeds_total",
    });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1000", depositType: "fixed", depositFixedAed: "x" })).toEqual({ ok: false, code: "invalid_amount" });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1000", depositType: "percentage", depositPercent: "120" })).toEqual({
      ok: false,
      code: "deposit_invalid",
    });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1000", depositType: "percentage", depositPercent: "abc" })).toEqual({
      ok: false,
      code: "invalid_amount",
    });
  });

  it("re-quotes while awaiting payment (price changed) but not after confirmation", () => {
    const awaiting: CateringReviewState = { ...quotedDeposit, status: "awaiting_payment" };
    expect(planCateringReview(awaiting, { type: "quote", totalAed: "3500", depositType: "percentage", depositPercent: "25" })).toMatchObject({
      ok: true,
      update: { status: "quoted", quoted_total_fils: 350_000 },
    });
    expect(planCateringReview({ ...quotedNone, status: "confirmed" }, { type: "quote", totalAed: "1", depositType: "none" })).toEqual({ ok: false, code: "locked" });
  });

  it("confirms only when no payment is due or it has been received", () => {
    expect(planCateringReview(quotedNone, { type: "confirm" })).toEqual({ ok: true, update: { status: "confirmed" } });
    expect(planCateringReview(quotedDeposit, { type: "confirm" })).toEqual({ ok: false, code: "payment_not_received" });
    expect(planCateringReview(fresh, { type: "confirm" })).toEqual({ ok: false, code: "invalid_transition" });
    const paid: CateringReviewState = { ...quotedDeposit, status: "awaiting_payment", paymentStatus: "deposit_paid" };
    expect(planCateringReview(paid, { type: "confirm" })).toEqual({ ok: true, update: { status: "confirmed" } });
    expect(planCateringReview({ ...paid, paymentStatus: "payment_requested" }, { type: "confirm" })).toEqual({ ok: false, code: "payment_not_received" });
  });

  it("moves a confirmed booking through preparation", () => {
    const confirmed: CateringReviewState = { ...quotedNone, status: "confirmed" };
    expect(planCateringReview(confirmed, { type: "advance", to: "preparing" })).toEqual({ ok: true, update: { status: "preparing" } });
    expect(planCateringReview(confirmed, { type: "advance", to: "completed" })).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("requires a reason to reject or cancel", () => {
    expect(planCateringReview(fresh, { type: "reject", reason: "Fully booked that weekend" })).toEqual({
      ok: true,
      update: { status: "rejected", cancellation_reason: "Fully booked that weekend" },
    });
    expect(planCateringReview(fresh, { type: "cancel", reason: "" })).toEqual({ ok: false, code: "reason_required" });
    expect(planCateringReview({ ...fresh, status: "completed" }, { type: "cancel", reason: "Too late" })).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("saves notes and rejects malformed actions", () => {
    expect(planCateringReview(fresh, { type: "notes", notes: " Call after 5pm " })).toEqual({ ok: true, update: { admin_notes: "Call after 5pm" } });
    expect(planCateringReview(fresh, { type: "notes", notes: "" })).toEqual({ ok: true, update: { admin_notes: null } });
    expect(planCateringReview(fresh, { type: "delete" })).toEqual({ ok: false, code: "invalid_input" });
    expect(planCateringReview(fresh, { type: "quote", totalAed: "1", depositType: "free" })).toEqual({ ok: false, code: "invalid_input" });
  });
});

describe("order updates", () => {
  it("moves orders forward one step at a time", () => {
    expect(planOrderUpdate({ status: "new" }, { type: "advance", to: "confirmed" })).toEqual({ ok: true, update: { order_status: "confirmed" } });
    expect(planOrderUpdate({ status: "new" }, { type: "advance", to: "ready" })).toEqual({ ok: false, code: "invalid_transition" });
    expect(planOrderUpdate({ status: "completed" }, { type: "advance", to: "completed" })).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("cancels with a reason", () => {
    expect(planOrderUpdate({ status: "preparing" }, { type: "cancel", reason: "Customer asked" })).toEqual({
      ok: true,
      update: { order_status: "cancelled", cancellation_reason: "Customer asked" },
    });
    expect(planOrderUpdate({ status: "new" }, { type: "cancel", reason: "" })).toEqual({ ok: false, code: "reason_required" });
    expect(planOrderUpdate({ status: "cancelled" }, { type: "cancel", reason: "again" })).toEqual({ ok: false, code: "invalid_transition" });
  });

  it("saves notes and rejects malformed input", () => {
    expect(planOrderUpdate({ status: "new" }, { type: "notes", notes: "Extra bread" })).toEqual({ ok: true, update: { admin_notes: "Extra bread" } });
    expect(planOrderUpdate({ status: "new" }, { type: "notes", notes: "" })).toEqual({ ok: true, update: { admin_notes: null } });
    expect(planOrderUpdate({ status: "new" }, { type: "refund" })).toEqual({ ok: false, code: "invalid_input" });
  });

  it("knows the next step", () => {
    expect(["new", "confirmed", "preparing", "ready", "completed", "cancelled"].map((s) => nextOrderStep(s as never))).toEqual([
      "confirmed",
      "preparing",
      "ready",
      "completed",
      null,
      null,
    ]);
  });
});
