/**
 * Catering payment requirements (owner instructions §5, PRD P0-F007).
 *
 * After review the administrator chooses, per catering request, one of:
 *   none        – no payment is requested up front
 *   fixed       – a fixed AED amount (> 0)
 *   percentage  – a percentage of the confirmed total (0 < p <= 100)
 *   full        – the full confirmed total
 *
 * A deposit can never exceed the confirmed total: that is an error, never
 * silently clamped. Snapshots produced here satisfy the database CHECK
 * constraints on payment_requests exactly.
 */
import { type Fils, assertFils, percentOf, percentToBasisPoints, subtractFils } from "./money";

export type DepositType = "none" | "fixed" | "percentage" | "full";

export type DepositChoice =
  | { type: "none" }
  | { type: "fixed"; amountFils: Fils }
  | { type: "percentage"; percent: number }
  | { type: "full" };

export type DepositErrorCode =
  | "invalid_total"
  | "fixed_not_positive"
  | "percentage_out_of_range"
  | "exceeds_total";

export class DepositError extends Error {
  constructor(
    readonly code: DepositErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DepositError";
  }
}

export type PaymentRequestKind = "deposit" | "balance" | "full";

/** Mirrors the payment_requests columns that describe the amount. */
export type PaymentRequestSnapshot = {
  kind: PaymentRequestKind;
  depositType: Exclude<DepositType, "none"> | null;
  percentage: number | null;
  fixedAmountFils: Fils | null;
  totalSnapshotFils: Fils;
  requestedAmountFils: Fils;
};

function assertTotal(totalFils: Fils) {
  try {
    assertFils(totalFils, "confirmed total");
  } catch {
    throw new DepositError("invalid_total", "confirmed total must be a whole number of fils");
  }
  if (totalFils <= 0) throw new DepositError("invalid_total", "confirmed total must be greater than zero");
}

/** Validates a choice against the confirmed total. */
export function validateDepositChoice(totalFils: Fils, choice: DepositChoice): void {
  assertTotal(totalFils);
  if (choice.type === "fixed") {
    if (!Number.isSafeInteger(choice.amountFils) || choice.amountFils <= 0) {
      throw new DepositError("fixed_not_positive", "a fixed deposit must be greater than zero");
    }
    if (choice.amountFils > totalFils) {
      throw new DepositError("exceeds_total", "the deposit cannot exceed the confirmed total");
    }
  }
  if (choice.type === "percentage") {
    let bp: number;
    try {
      bp = percentToBasisPoints(choice.percent);
    } catch {
      throw new DepositError("percentage_out_of_range", "percentage must have at most two decimals");
    }
    if (bp <= 0 || bp > 10_000) {
      throw new DepositError("percentage_out_of_range", "percentage must be above 0 and at most 100");
    }
  }
}

/** Amount required up front for a choice (0 for "none"). */
export function requiredUpfrontFils(totalFils: Fils, choice: DepositChoice): Fils {
  validateDepositChoice(totalFils, choice);
  switch (choice.type) {
    case "none":
      return 0;
    case "fixed":
      return choice.amountFils;
    case "percentage":
      return percentOf(totalFils, choice.percent);
    case "full":
      return totalFils;
  }
}

/**
 * The payment request to issue for a choice, or null for "none".
 * Matches the payment_requests CHECK constraints.
 */
export function buildPaymentRequest(totalFils: Fils, choice: DepositChoice): PaymentRequestSnapshot | null {
  const requested = requiredUpfrontFils(totalFils, choice);
  switch (choice.type) {
    case "none":
      return null;
    case "full":
      return {
        kind: "full",
        depositType: "full",
        percentage: null,
        fixedAmountFils: null,
        totalSnapshotFils: totalFils,
        requestedAmountFils: requested,
      };
    case "fixed":
      // A "fixed" deposit equal to the total is still recorded as a deposit.
      return {
        kind: "deposit",
        depositType: "fixed",
        percentage: null,
        fixedAmountFils: choice.amountFils,
        totalSnapshotFils: totalFils,
        requestedAmountFils: requested,
      };
    case "percentage":
      return {
        kind: "deposit",
        depositType: "percentage",
        percentage: choice.percent,
        fixedAmountFils: null,
        totalSnapshotFils: totalFils,
        requestedAmountFils: requested,
      };
  }
}

/** Net amount actually kept: paid minus refunded. */
export function netPaidFils(paidFils: Fils, refundedFils: Fils): Fils {
  return subtractFils(paidFils, refundedFils);
}

/** What is still owed on the confirmed total (never negative). */
export function remainingBalanceFils(input: { totalFils: Fils; paidFils: Fils; refundedFils: Fils }): Fils {
  assertFils(input.totalFils, "total");
  const net = netPaidFils(input.paidFils, input.refundedFils);
  return Math.max(input.totalFils - net, 0);
}

/** A request for whatever remains after earlier payments, or null if nothing is owed. */
export function buildBalanceRequest(input: {
  totalFils: Fils;
  paidFils: Fils;
  refundedFils: Fils;
}): PaymentRequestSnapshot | null {
  assertTotal(input.totalFils);
  const remaining = remainingBalanceFils(input);
  if (remaining === 0) return null;
  return {
    kind: "balance",
    depositType: null,
    percentage: null,
    fixedAmountFils: null,
    totalSnapshotFils: input.totalFils,
    requestedAmountFils: remaining,
  };
}

export type TotalChangeReview =
  | { action: "unchanged" }
  | { action: "supersede"; replacement: PaymentRequestSnapshot | null; requiredUpfrontFils: Fils }
  | { action: "recalculated"; requiredUpfrontFils: Fils }
  | { action: "blocked"; code: DepositErrorCode; message: string };

/**
 * Owner instructions §5: when the confirmed price changes, the payment
 * requirement must be reviewed. Returns what to do with the open request:
 *  - unchanged:    the open request already matches the new total
 *  - supersede:    cancel the open request and issue `replacement` (null = none needed)
 *  - recalculated: no open request; the new amount due up front
 *  - blocked:      the existing choice is invalid for the new total (e.g. a fixed
 *                  deposit now above the total) — the admin must choose again
 */
export function reviewTotalChange(input: {
  newTotalFils: Fils;
  choice: DepositChoice;
  openRequest: PaymentRequestSnapshot | null;
}): TotalChangeReview {
  let replacement: PaymentRequestSnapshot | null;
  try {
    replacement = buildPaymentRequest(input.newTotalFils, input.choice);
  } catch (error) {
    // buildPaymentRequest validates first, so only DepositError can occur here.
    const e = error as DepositError;
    return { action: "blocked", code: e.code, message: e.message };
  }
  const required = replacement?.requestedAmountFils ?? 0;

  if (!input.openRequest) return { action: "recalculated", requiredUpfrontFils: required };

  const same =
    replacement !== null &&
    replacement.totalSnapshotFils === input.openRequest.totalSnapshotFils &&
    replacement.requestedAmountFils === input.openRequest.requestedAmountFils &&
    replacement.kind === input.openRequest.kind;
  if (same) return { action: "unchanged" };

  return { action: "supersede", replacement, requiredUpfrontFils: required };
}
