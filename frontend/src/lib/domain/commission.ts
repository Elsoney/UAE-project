/**
 * Website commission (owner instructions §7, PRD P0-F009/F010).
 *
 * There is deliberately NO default rate. Without an approved setting the
 * result is `not_configured` and no commission record is created.
 *
 * Bases (the owner chooses one; recorded on each setting):
 *   gross           – the confirmed order value
 *   collected       – live money actually received (capped at the confirmed value)
 *   net_of_refunds  – live money received minus refunds
 *
 * Cancelled orders/requests are excluded (eligible amount 0), as the PRD
 * states; any different treatment is an owner decision and would be added to
 * the setting explicitly. Test (mock) payments must never be passed in.
 * Commission = rate% of the eligible amount, rounded half up to the fil.
 */
import type { Enums } from "@/types/database";
import { type Fils, assertFils, percentOf, percentToBasisPoints } from "./money";

export type CommissionBasis = Enums<"commission_basis">;

export type CommissionSetting = {
  id: string;
  ratePercent: number;
  basis: CommissionBasis;
};

export type CommissionInputs = {
  confirmedTotalFils: Fils;
  /** Succeeded LIVE payments only. */
  collectedFils: Fils;
  /** Succeeded refunds of those payments. */
  refundedFils: Fils;
  cancelled: boolean;
};

export type CommissionResult =
  | { status: "not_configured" }
  | {
      status: "calculated";
      settingId: string;
      ratePercent: number;
      basis: CommissionBasis;
      eligibleFils: Fils;
      commissionFils: Fils;
      inputs: CommissionInputs;
    };

export class CommissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionError";
  }
}

function validate(inputs: CommissionInputs, setting: CommissionSetting) {
  assertFils(inputs.confirmedTotalFils, "confirmed total");
  assertFils(inputs.collectedFils, "collected amount");
  assertFils(inputs.refundedFils, "refunded amount");
  if (inputs.refundedFils > inputs.collectedFils) {
    throw new CommissionError("refunds cannot exceed the amount collected");
  }
  const bp = percentToBasisPoints(setting.ratePercent);
  if (bp <= 0 || bp > 10_000) throw new CommissionError("commission rate must be above 0 and at most 100");
}

export function eligibleAmountFils(inputs: CommissionInputs, basis: CommissionBasis): Fils {
  if (inputs.cancelled) return 0;
  switch (basis) {
    case "gross":
      return inputs.confirmedTotalFils;
    case "collected":
      return Math.min(inputs.collectedFils, inputs.confirmedTotalFils);
    case "net_of_refunds":
      return Math.min(inputs.collectedFils - inputs.refundedFils, inputs.confirmedTotalFils);
  }
}

export function calculateCommission(inputs: CommissionInputs, setting: CommissionSetting | null): CommissionResult {
  if (!setting) return { status: "not_configured" };
  validate(inputs, setting);
  const eligibleFils = eligibleAmountFils(inputs, setting.basis);
  return {
    status: "calculated",
    settingId: setting.id,
    ratePercent: setting.ratePercent,
    basis: setting.basis,
    eligibleFils,
    commissionFils: percentOf(eligibleFils, setting.ratePercent),
    inputs,
  };
}

export type CurrentCommission = {
  version: number;
  settingId: string;
  eligibleFils: Fils;
  commissionFils: Fils;
} | null;

/**
 * Records are never rewritten: decide whether a recalculation needs a new
 * version (superseding the current one) or changes nothing.
 */
export function nextCommissionVersion(
  current: CurrentCommission,
  result: CommissionResult,
): { action: "none" } | { action: "create"; version: number } {
  if (result.status === "not_configured") return { action: "none" };
  if (
    current &&
    current.settingId === result.settingId &&
    current.eligibleFils === result.eligibleFils &&
    current.commissionFils === result.commissionFils
  ) {
    return { action: "none" };
  }
  return { action: "create", version: (current?.version ?? 0) + 1 };
}
