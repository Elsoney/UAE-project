/**
 * Payment webhook processing (owner instructions §6).
 *
 *  1. Verify authenticity (signature) — unauthenticated events are rejected.
 *  2. Record the provider event id; a duplicate delivery is acknowledged and
 *     ignored (no duplicate transactions).
 *  3. Check the event against its payment request: provider, test/live mode,
 *     currency and amount must match, otherwise nothing is marked paid and the
 *     event is flagged for manual review.
 *  4. Apply it idempotently: a success is recorded once; a late "failed"
 *     event never overrides a success (out-of-order delivery); a failure
 *     leaves the request open so the customer can retry; money for a
 *     superseded/cancelled/expired request is flagged for review. If
 *     processing throws, the event stays unprocessed and the provider's retry
 *     processes it again.
 *  5. Recompute the order/catering payment status from actual money movements.
 *
 * Storage is behind the PaymentStore interface so this logic is unit-tested
 * and the Supabase implementation stays thin.
 */
import { derivePaymentStatus, type PaymentStatus } from "@/lib/domain/status";
import type { Fils } from "@/lib/domain/money";
import { type PaymentProvider, type VerifiedPaymentEvent, WebhookVerificationError } from "./provider";

export type PaymentParent = { kind: "order"; id: string } | { kind: "catering_request"; id: string };

export type StoredPaymentRequest = {
  id: string;
  parent: PaymentParent;
  provider: string;
  isTest: boolean;
  status: "pending" | "paid" | "expired" | "cancelled" | "failed" | "superseded";
  requestedAmountFils: Fils;
  currency: "AED";
};

export type StoredPayment = {
  id: string;
  paymentRequestId: string;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  amountFils: Fils;
};

/**
 * Storage for webhook processing. Implementations must run each event's
 * processing in one database transaction holding a row lock on the
 * payment_events row (SELECT ... FOR UPDATE), so two simultaneous deliveries
 * of the same event are processed one after the other.
 */
export interface PaymentStore {
  /**
   * Inserts the event if new. Returns "duplicate" only when the same
   * (provider, eventId) was already PROCESSED; an event that was recorded but
   * whose processing failed returns "new" so the provider's retry reprocesses it.
   * "busy" means another delivery of the same event is being processed right now.
   */
  recordEvent(event: VerifiedPaymentEvent): Promise<"new" | "duplicate" | "busy">;
  markEventProcessed(provider: string, eventId: string, error: string | null): Promise<void>;
  findPaymentRequest(id: string): Promise<StoredPaymentRequest | null>;
  findPayment(provider: string, providerReference: string): Promise<StoredPayment | null>;
  /**
   * Inserts or updates the payment identified by (provider, providerReference).
   * Must never change a payment that already succeeded (the database enforces
   * this too), so concurrent or late events cannot downgrade it.
   */
  savePayment(input: {
    request: StoredPaymentRequest;
    providerReference: string;
    amountFils: Fils;
    status: "succeeded" | "failed";
    paidAt: Date | null;
    failureReason: string | null;
    isTest: boolean;
    metadata: VerifiedPaymentEvent["metadata"];
  }): Promise<void>;
  markRequestPaid(requestId: string): Promise<void>;
  updateRefundStatus(providerReference: string, refundReference: string, status: "succeeded" | "failed"): Promise<boolean>;
  /** Money movements for the parent, counting only payments with the given test/live mode. */
  paymentSummary(parent: PaymentParent, isTest: boolean): Promise<{
    totalFils: Fils;
    paidFils: Fils;
    refundedFils: Fils;
    requiredDepositFils: Fils;
    hasOpenRequest: boolean;
    lastAttemptFailed: boolean;
  }>;
  setPaymentStatus(parent: PaymentParent, status: PaymentStatus): Promise<void>;
}

export type WebhookResult =
  | { outcome: "processed"; httpStatus: 200; paymentStatus: PaymentStatus; parent: PaymentParent; event: VerifiedPaymentEvent }
  | { outcome: "duplicate"; httpStatus: 200 }
  | { outcome: "busy"; httpStatus: 503 }
  | { outcome: "ignored"; httpStatus: 200; reason: string }
  | { outcome: "needs_review"; httpStatus: 200; reason: string }
  | { outcome: "rejected"; httpStatus: 400 | 401; reason: string };

export async function handlePaymentWebhook(input: {
  provider: PaymentProvider;
  store: PaymentStore;
  rawBody: string;
  headers: Headers;
}): Promise<WebhookResult> {
  const { provider, store } = input;

  let event: VerifiedPaymentEvent;
  try {
    event = provider.verifyWebhook(input.rawBody, input.headers);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { outcome: "rejected", httpStatus: 401, reason: error.message };
    }
    throw error;
  }

  const claim = await store.recordEvent(event);
  if (claim === "duplicate") return { outcome: "duplicate", httpStatus: 200 };
  // The provider retries on 5xx, by which time the other delivery has finished.
  if (claim === "busy") return { outcome: "busy", httpStatus: 503 };

  const finish = async (result: WebhookResult, error: string | null = null) => {
    await store.markEventProcessed(event.provider, event.eventId, error);
    return result;
  };

  if (event.type === "refund.succeeded" || event.type === "refund.failed") {
    if (!event.refundReference) {
      return finish({ outcome: "needs_review", httpStatus: 200, reason: "refund event without refund id" }, "missing refund id");
    }
    // The refunded payment (not the event's claim) decides which order is affected.
    const payment = await store.findPayment(event.provider, event.providerReference);
    if (!payment) {
      return finish({ outcome: "needs_review", httpStatus: 200, reason: "refund for unknown payment" }, "unknown payment");
    }
    const owner = await store.findPaymentRequest(payment.paymentRequestId);
    if (!owner || owner.provider !== event.provider || owner.isTest !== event.isTest) {
      return finish(
        { outcome: "needs_review", httpStatus: 200, reason: "refund does not match its payment" },
        "refund mismatch",
      );
    }
    const updated = await store.updateRefundStatus(
      event.providerReference,
      event.refundReference,
      event.type === "refund.succeeded" ? "succeeded" : "failed",
    );
    if (!updated) {
      return finish({ outcome: "needs_review", httpStatus: 200, reason: "unknown refund" }, "unknown refund");
    }
    const status = await refreshStatus(store, owner.parent, owner.isTest);
    return finish({ outcome: "processed", httpStatus: 200, paymentStatus: status, parent: owner.parent, event });
  }

  const request = await store.findPaymentRequest(event.paymentRequestId);
  if (!request) {
    return finish({ outcome: "ignored", httpStatus: 200, reason: "unknown payment request" }, "unknown payment request");
  }
  if (request.provider !== event.provider || request.isTest !== event.isTest) {
    return finish(
      { outcome: "needs_review", httpStatus: 200, reason: "provider or test/live mode mismatch" },
      "provider or mode mismatch",
    );
  }

  const existing = await store.findPayment(event.provider, event.providerReference);
  const closed = request.status === "superseded" || request.status === "cancelled" || request.status === "expired";

  if (event.type === "payment.succeeded") {
    if (closed && existing?.status !== "succeeded") {
      // Money arrived for a request that is no longer valid (e.g. the price changed).
      return finish(
        { outcome: "needs_review", httpStatus: 200, reason: `payment for a ${request.status} payment request` },
        "payment for closed request",
      );
    }
    if (event.currency !== request.currency || event.amountFils !== request.requestedAmountFils) {
      return finish(
        { outcome: "needs_review", httpStatus: 200, reason: "amount or currency does not match the payment request" },
        "amount mismatch",
      );
    }
    if (existing?.status !== "succeeded") {
      await store.savePayment({
        request,
        providerReference: event.providerReference,
        amountFils: event.amountFils,
        status: "succeeded",
        paidAt: event.occurredAt,
        failureReason: null,
        isTest: event.isTest,
        metadata: event.metadata,
      });
    }
    // Only an open request becomes paid (a closed one keeps its status for review).
    if (request.status === "pending" || request.status === "failed") await store.markRequestPaid(request.id);
  } else {
    // payment.failed — never downgrade a payment that already succeeded.
    if (existing?.status === "succeeded") {
      return finish({ outcome: "ignored", httpStatus: 200, reason: "late failure after success" });
    }
    if (closed) {
      return finish({ outcome: "ignored", httpStatus: 200, reason: `failure for a ${request.status} payment request` });
    }
    await store.savePayment({
      request,
      providerReference: event.providerReference,
      amountFils: event.amountFils,
      status: "failed",
      paidAt: null,
      failureReason: event.failureReason ?? null,
      isTest: event.isTest,
      metadata: event.metadata,
    });
    // The request stays open (pending) so the customer can try again.
  }

  const status = await refreshStatus(store, request.parent, request.isTest);
  return finish({ outcome: "processed", httpStatus: 200, paymentStatus: status, parent: request.parent, event });
}

async function refreshStatus(store: PaymentStore, parent: PaymentParent, isTest: boolean): Promise<PaymentStatus> {
  const summary = await store.paymentSummary(parent, isTest);
  const status = derivePaymentStatus(summary);
  await store.setPaymentStatus(parent, status);
  return status;
}
