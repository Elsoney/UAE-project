/**
 * Staff review of catering requests and orders (owner §4–§5, PRD P0-F005/F007).
 *
 * Pure planning: turns a staff action into the exact database update, or a
 * reason it is not allowed. The database enforces the same rules again
 * (status transitions, deposit limits, payment before confirmation).
 */
import { z } from "zod";
import { DepositError, validateDepositChoice, type DepositChoice } from "@/lib/domain/deposit";
import { MoneyError, parseAed, type Fils } from "@/lib/domain/money";
import {
  TransitionError,
  assertCateringTransition,
  assertOrderTransition,
  type CateringStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/domain/status";
import type { TablesUpdate } from "@/types/database";

export type ReviewErrorCode =
  | "invalid_input"
  | "invalid_amount"
  | "deposit_exceeds_total"
  | "deposit_invalid"
  | "invalid_transition"
  | "quote_required"
  | "deposit_choice_required"
  | "payment_not_received"
  | "locked"
  | "reason_required";

export type Plan<T> = { ok: true; update: T } | { ok: false; code: ReviewErrorCode };

const text = (max: number) => z.string().trim().max(max);

export const cateringActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contacted") }),
  z.object({
    type: z.literal("quote"),
    totalAed: z.string().trim().min(1),
    depositType: z.enum(["none", "fixed", "percentage", "full"]),
    depositFixedAed: z.string().trim().optional(),
    depositPercent: z.string().trim().optional(),
  }),
  z.object({ type: z.literal("confirm") }),
  z.object({ type: z.literal("advance"), to: z.enum(["preparing", "completed"]) }),
  z.object({ type: z.literal("reject"), reason: text(500) }),
  z.object({ type: z.literal("cancel"), reason: text(500) }),
  z.object({ type: z.literal("notes"), notes: text(4000) }),
]);
export type CateringAction = z.infer<typeof cateringActionSchema>;

export type CateringReviewState = {
  status: CateringStatus;
  quotedTotalFils: Fils | null;
  depositType: DepositChoice["type"] | null;
  paymentStatus: PaymentStatus;
};

const LOCKED: readonly CateringStatus[] = ["confirmed", "preparing", "completed", "rejected", "cancelled"];

function transitionCode(error: unknown): ReviewErrorCode {
  if (error instanceof TransitionError) return error.code;
  return "invalid_transition";
}

function parseDeposit(action: Extract<CateringAction, { type: "quote" }>): DepositChoice | null {
  switch (action.depositType) {
    case "none":
      return { type: "none" };
    case "full":
      return { type: "full" };
    case "fixed":
      return { type: "fixed", amountFils: parseAed(action.depositFixedAed ?? "") };
    case "percentage": {
      const percent = Number(action.depositPercent);
      return Number.isFinite(percent) ? { type: "percentage", percent } : null;
    }
  }
}

export function planCateringReview(current: CateringReviewState, raw: unknown): Plan<TablesUpdate<"catering_requests">> {
  const parsed = cateringActionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const action = parsed.data;
  const ctx = {
    quotedTotalFils: current.quotedTotalFils,
    depositType: current.depositType,
    requiredPaymentReceived: current.paymentStatus === "deposit_paid" || current.paymentStatus === "fully_paid",
  };

  const move = (to: CateringStatus): ReviewErrorCode | null => {
    try {
      assertCateringTransition(current.status, to, ctx);
      return null;
    } catch (error) {
      return transitionCode(error);
    }
  };

  switch (action.type) {
    case "contacted": {
      const code = move("customer_contacted");
      return code ? { ok: false, code } : { ok: true, update: { status: "customer_contacted" } };
    }

    case "quote": {
      if (LOCKED.includes(current.status)) return { ok: false, code: "locked" };
      let total: Fils;
      let deposit: DepositChoice | null;
      try {
        total = parseAed(action.totalAed);
        deposit = parseDeposit(action);
      } catch (error) {
        if (error instanceof MoneyError) return { ok: false, code: "invalid_amount" };
        throw error;
      }
      if (total <= 0 || !deposit) return { ok: false, code: "invalid_amount" };
      try {
        validateDepositChoice(total, deposit);
      } catch (error) {
        if (error instanceof DepositError) {
          return { ok: false, code: error.code === "exceeds_total" ? "deposit_exceeds_total" : "deposit_invalid" };
        }
        throw error;
      }
      // A changed price while awaiting payment goes back to "quoted", so a new
      // payment request is issued for the new amount (owner §5).
      const status: CateringStatus = "quoted";
      if (current.status !== "quoted") {
        const code = (() => {
          try {
            assertCateringTransition(current.status, status, { ...ctx, quotedTotalFils: total });
            return null;
          } catch (error) {
            return transitionCode(error);
          }
        })();
        if (code) return { ok: false, code };
      }
      return {
        ok: true,
        update: {
          status,
          quoted_total_fils: total,
          deposit_type: deposit.type,
          deposit_percentage: deposit.type === "percentage" ? deposit.percent : null,
          deposit_fixed_fils: deposit.type === "fixed" ? deposit.amountFils : null,
        },
      };
    }

    case "confirm": {
      const code = move("confirmed");
      return code ? { ok: false, code } : { ok: true, update: { status: "confirmed" } };
    }

    case "advance": {
      const code = move(action.to);
      return code ? { ok: false, code } : { ok: true, update: { status: action.to } };
    }

    case "reject":
    case "cancel": {
      if (action.reason.length < 3) return { ok: false, code: "reason_required" };
      const to: CateringStatus = action.type === "reject" ? "rejected" : "cancelled";
      const code = move(to);
      return code ? { ok: false, code } : { ok: true, update: { status: to, cancellation_reason: action.reason } };
    }

    case "notes":
      return { ok: true, update: { admin_notes: action.notes || null } };
  }
}

export const orderActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("advance"), to: z.enum(["confirmed", "preparing", "ready", "completed"]) }),
  z.object({ type: z.literal("cancel"), reason: text(500) }),
  z.object({ type: z.literal("notes"), notes: text(2000) }),
]);

export function planOrderUpdate(current: { status: OrderStatus }, raw: unknown): Plan<TablesUpdate<"orders">> {
  const parsed = orderActionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const action = parsed.data;
  if (action.type === "notes") return { ok: true, update: { admin_notes: action.notes || null } };
  const to: OrderStatus = action.type === "cancel" ? "cancelled" : action.to;
  if (action.type === "cancel" && action.reason.length < 3) return { ok: false, code: "reason_required" };
  try {
    assertOrderTransition(current.status, to);
  } catch {
    return { ok: false, code: "invalid_transition" };
  }
  return {
    ok: true,
    update: action.type === "cancel" ? { order_status: "cancelled", cancellation_reason: action.reason } : { order_status: to },
  };
}

/** Next useful step for an order, shown as the primary button. */
export function nextOrderStep(status: OrderStatus): Exclude<OrderStatus, "new" | "cancelled"> | null {
  switch (status) {
    case "new":
      return "confirmed";
    case "confirmed":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return "completed";
    default:
      return null;
  }
}
