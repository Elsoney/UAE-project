/**
 * Operational status machines and the payment-status rollup.
 *
 * Enum values match the database enums exactly (supabase/migrations). The
 * operational status (what the kitchen/staff are doing) and the payment status
 * (what money has moved) are separate, per PRD P0-F004/F008.
 */
import type { Enums } from "@/types/database";
import type { DepositType } from "./deposit";
import type { Fils } from "./money";

export type OrderStatus = Enums<"order_status">;
export type CateringStatus = Enums<"catering_status">;
export type PaymentStatus = Enums<"payment_status">;
export type Locale = Enums<"locale">;

export const ORDER_STATUSES = ["new", "confirmed", "preparing", "ready", "completed", "cancelled"] as const satisfies readonly OrderStatus[];

export const CATERING_STATUSES = [
  "pending_review",
  "customer_contacted",
  "quoted",
  "awaiting_payment",
  "confirmed",
  "preparing",
  "completed",
  "rejected",
  "cancelled",
] as const satisfies readonly CateringStatus[];

export const PAYMENT_STATUSES = [
  "unpaid",
  "payment_requested",
  "deposit_paid",
  "partially_paid",
  "fully_paid",
  "payment_failed",
  "partially_refunded",
  "refunded",
] as const satisfies readonly PaymentStatus[];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const CATERING_TRANSITIONS: Record<CateringStatus, readonly CateringStatus[]> = {
  pending_review: ["customer_contacted", "quoted", "rejected", "cancelled"],
  customer_contacted: ["quoted", "rejected", "cancelled"],
  quoted: ["awaiting_payment", "confirmed", "customer_contacted", "rejected", "cancelled"],
  awaiting_payment: ["confirmed", "quoted", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export class TransitionError extends Error {
  constructor(
    readonly code: "invalid_transition" | "quote_required" | "deposit_choice_required" | "payment_not_received",
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new TransitionError("invalid_transition", `order cannot move from ${from} to ${to}`);
  }
}

export type CateringTransitionContext = {
  /** Confirmed price recorded by staff, if any. */
  quotedTotalFils: Fils | null;
  /** Payment requirement chosen by staff, if any. */
  depositType: DepositType | null;
  /** True once the payment required up front has been received (verified). */
  requiredPaymentReceived: boolean;
};

export function allowedCateringTransitions(from: CateringStatus): readonly CateringStatus[] {
  return CATERING_TRANSITIONS[from];
}

/** Throws a TransitionError explaining why a catering status change is not allowed. */
export function assertCateringTransition(
  from: CateringStatus,
  to: CateringStatus,
  context: CateringTransitionContext,
): void {
  if (!CATERING_TRANSITIONS[from].includes(to)) {
    throw new TransitionError("invalid_transition", `catering request cannot move from ${from} to ${to}`);
  }
  if ((to === "quoted" || to === "awaiting_payment" || to === "confirmed") && !context.quotedTotalFils) {
    throw new TransitionError("quote_required", "record the confirmed price first");
  }
  if (to === "awaiting_payment" && (context.depositType === null || context.depositType === "none")) {
    throw new TransitionError("deposit_choice_required", "choose a deposit or full payment before requesting payment");
  }
  if (to === "confirmed") {
    if (context.depositType === null) {
      throw new TransitionError("deposit_choice_required", "choose the payment requirement before confirming");
    }
    // Booking is confirmed straight from "quoted" only when nothing is due up front.
    if (from === "quoted" && context.depositType !== "none") {
      throw new TransitionError("payment_not_received", "request and receive the payment before confirming");
    }
    if (from === "awaiting_payment" && !context.requiredPaymentReceived) {
      throw new TransitionError("payment_not_received", "the required payment has not been received yet");
    }
  }
}

export function canTransitionCatering(
  from: CateringStatus,
  to: CateringStatus,
  context: CateringTransitionContext,
): boolean {
  try {
    assertCateringTransition(from, to, context);
    return true;
  } catch {
    return false;
  }
}

export type PaymentSummary = {
  totalFils: Fils;
  /** Sum of succeeded, LIVE payments (test payments are excluded by the caller). */
  paidFils: Fils;
  /** Sum of succeeded refunds. */
  refundedFils: Fils;
  /** Amount required up front (deposit); 0 when none. */
  requiredDepositFils: Fils;
  hasOpenRequest: boolean;
  lastAttemptFailed: boolean;
};

/** Derives the payment_status rollup from the actual money movements. */
export function derivePaymentStatus(s: PaymentSummary): PaymentStatus {
  if (s.refundedFils > 0) {
    return s.refundedFils >= s.paidFils ? "refunded" : "partially_refunded";
  }
  if (s.paidFils > 0) {
    if (s.paidFils >= s.totalFils) return "fully_paid";
    if (s.requiredDepositFils > 0 && s.paidFils >= s.requiredDepositFils) return "deposit_paid";
    return "partially_paid";
  }
  if (s.lastAttemptFailed) return "payment_failed";
  if (s.hasOpenRequest) return "payment_requested";
  return "unpaid";
}

// ---------------------------------------------------------------- labels ----

const ORDER_LABELS: Record<OrderStatus, Record<Locale, string>> = {
  new: { en: "New", ar: "جديد" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  ready: { en: "Ready", ar: "جاهز" },
  completed: { en: "Completed", ar: "مكتمل" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

const CATERING_LABELS: Record<CateringStatus, Record<Locale, string>> = {
  pending_review: { en: "Pending review", ar: "قيد المراجعة" },
  customer_contacted: { en: "Customer contacted", ar: "تم التواصل مع العميل" },
  quoted: { en: "Quote ready", ar: "تم إعداد عرض السعر" },
  awaiting_payment: { en: "Awaiting payment", ar: "بانتظار الدفع" },
  confirmed: { en: "Booking confirmed", ar: "تم تأكيد الحجز" },
  preparing: { en: "Preparing", ar: "قيد التحضير" },
  completed: { en: "Completed", ar: "مكتمل" },
  rejected: { en: "Not available", ar: "غير متاح" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

const PAYMENT_LABELS: Record<PaymentStatus, Record<Locale, string>> = {
  unpaid: { en: "Unpaid", ar: "غير مدفوع" },
  payment_requested: { en: "Payment requested", ar: "تم طلب الدفع" },
  deposit_paid: { en: "Deposit paid", ar: "تم دفع العربون" },
  partially_paid: { en: "Partially paid", ar: "مدفوع جزئياً" },
  fully_paid: { en: "Fully paid", ar: "مدفوع بالكامل" },
  payment_failed: { en: "Payment failed", ar: "فشل الدفع" },
  partially_refunded: { en: "Partially refunded", ar: "مسترد جزئياً" },
  refunded: { en: "Refunded", ar: "مسترد" },
};

export function orderStatusLabel(status: OrderStatus, locale: Locale): string {
  return ORDER_LABELS[status][locale];
}

export function cateringStatusLabel(status: CateringStatus, locale: Locale): string {
  return CATERING_LABELS[status][locale];
}

export function paymentStatusLabel(status: PaymentStatus, locale: Locale): string {
  return PAYMENT_LABELS[status][locale];
}
