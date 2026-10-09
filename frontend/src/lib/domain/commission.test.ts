import { describe, expect, it } from "vitest";
import { CommissionError, calculateCommission, eligibleAmountFils, nextCommissionVersion, type CommissionInputs } from "./commission";

const order: CommissionInputs = { confirmedTotalFils: 100_000, collectedFils: 100_000, refundedFils: 0, cancelled: false };
const setting = (basis: "gross" | "collected" | "net_of_refunds", ratePercent = 5) => ({ id: "setting-1", basis, ratePercent });

describe("commission", () => {
  it("is not calculated at all without an approved setting (no default rate)", () => {
    expect(calculateCommission(order, null)).toEqual({ status: "not_configured" });
  });

  it("gross basis uses the confirmed value", () => {
    const result = calculateCommission({ ...order, collectedFils: 30_000 }, setting("gross"));
    expect(result).toMatchObject({ status: "calculated", eligibleFils: 100_000, commissionFils: 5_000, basis: "gross" });
  });

  it("collected basis counts only money actually received (partial payments)", () => {
    expect(calculateCommission({ ...order, collectedFils: 30_000 }, setting("collected"))).toMatchObject({
      eligibleFils: 30_000,
      commissionFils: 1_500,
    });
  });

  it("collected basis is capped at the confirmed value", () => {
    expect(eligibleAmountFils({ ...order, collectedFils: 120_000 }, "collected")).toBe(100_000);
  });

  it("net basis subtracts refunds", () => {
    expect(calculateCommission({ ...order, refundedFils: 40_000 }, setting("net_of_refunds"))).toMatchObject({
      eligibleFils: 60_000,
      commissionFils: 3_000,
    });
    expect(eligibleAmountFils({ ...order, collectedFils: 120_000, refundedFils: 10_000 }, "net_of_refunds")).toBe(100_000);
  });

  it("excludes cancelled orders under every basis", () => {
    for (const basis of ["gross", "collected", "net_of_refunds"] as const) {
      expect(calculateCommission({ ...order, cancelled: true }, setting(basis))).toMatchObject({ eligibleFils: 0, commissionFils: 0 });
    }
  });

  it("rounds half up to the fil", () => {
    expect(calculateCommission({ ...order, confirmedTotalFils: 33_333 }, setting("gross", 12.5))).toMatchObject({ commissionFils: 4_167 });
  });

  it("keeps the inputs used, for the audit trail", () => {
    const result = calculateCommission(order, setting("gross"));
    expect(result).toMatchObject({ inputs: order, settingId: "setting-1", ratePercent: 5 });
  });

  it("rejects inconsistent inputs and invalid rates", () => {
    expect(() => calculateCommission({ ...order, refundedFils: 200_000 }, setting("net_of_refunds"))).toThrow(CommissionError);
    expect(() => calculateCommission(order, setting("gross", 0))).toThrow(CommissionError);
    expect(() => calculateCommission(order, setting("gross", 100.5))).toThrow(CommissionError);
    expect(() => calculateCommission({ ...order, collectedFils: -1 }, setting("gross"))).toThrow();
  });

  describe("versioning", () => {
    const calc = calculateCommission(order, setting("gross"));

    it("creates version 1 the first time", () => {
      expect(nextCommissionVersion(null, calc)).toEqual({ action: "create", version: 1 });
    });

    it("does nothing when the result has not changed", () => {
      expect(nextCommissionVersion({ version: 1, settingId: "setting-1", eligibleFils: 100_000, commissionFils: 5_000 }, calc)).toEqual({
        action: "none",
      });
    });

    it("creates a new version (never rewrites) when a refund changes the result", () => {
      const after = calculateCommission({ ...order, refundedFils: 50_000 }, setting("net_of_refunds"));
      expect(nextCommissionVersion({ version: 1, settingId: "setting-1", eligibleFils: 100_000, commissionFils: 5_000 }, after)).toEqual({
        action: "create",
        version: 2,
      });
    });

    it("does nothing when commission is not configured", () => {
      expect(nextCommissionVersion(null, { status: "not_configured" })).toEqual({ action: "none" });
    });
  });
});
