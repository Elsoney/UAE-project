/**
 * Payment gateway abstraction (owner instructions §6, PRD P0-F006).
 *
 * The real UAE gateway is still an owner decision. Any provider implements
 * this interface, so it can be plugged in without redesign. Card data never
 * touches Umodai: customers pay on the provider's hosted page; we only receive
 * signed webhook events, which are the ONLY proof of payment.
 */
import type { Fils } from "@/lib/domain/money";
import type { Locale } from "@/lib/domain/status";

export type CreateCheckoutInput = {
  paymentRequestId: string;
  amountFils: Fils;
  currency: "AED";
  /** Public order/catering reference shown on the payment page. */
  reference: string;
  customerEmail: string;
  locale: Locale;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
};

export type CheckoutSession = {
  providerCheckoutId: string;
  /** Hosted payment page to send the customer to. */
  redirectUrl: string;
  expiresAt: Date;
};

export type VerifiedPaymentEvent = {
  provider: string;
  /** Provider's unique event id (used to ignore duplicate deliveries). */
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "refund.failed";
  /** Provider's transaction id for the payment. */
  providerReference: string;
  paymentRequestId: string;
  amountFils: Fils;
  currency: string;
  occurredAt: Date;
  isTest: boolean;
  failureReason?: string;
  /** For refund events: the provider's refund id. */
  refundReference?: string;
  /** Provider metadata safe to store (never card numbers or CVV). */
  metadata: Record<string, string | number | boolean | null>;
};

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentProvider {
  readonly name: string;
  /** True for sandbox/mock providers. Test payments never count as real money. */
  readonly isTest: boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  /** Verifies authenticity of a webhook and parses it. Throws WebhookVerificationError. */
  verifyWebhook(rawBody: string, headers: Headers): VerifiedPaymentEvent;
  refund(input: { providerReference: string; amountFils: Fils; reason: string }): Promise<{
    refundReference: string;
    status: "pending" | "succeeded" | "failed";
  }>;
}
