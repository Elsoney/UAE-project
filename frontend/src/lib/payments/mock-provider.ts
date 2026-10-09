/**
 * MOCK payment provider for development and automated tests ONLY.
 *
 * - Every payment it produces is flagged isTest = true; the database keeps
 *   test and live payments apart and commission ignores test payments.
 * - lib/env.ts refuses to start production with PAYMENT_PROVIDER=mock.
 * - Webhooks are signed with HMAC-SHA256 over "<timestamp>.<raw body>" and
 *   verified with a timing-safe comparison, mirroring how real gateways work,
 *   so the webhook pipeline is exercised end to end.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  type CheckoutSession,
  type CreateCheckoutInput,
  type PaymentProvider,
  type VerifiedPaymentEvent,
  WebhookVerificationError,
} from "./provider";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
const TOLERANCE_SECONDS = 300;

export type MockEventPayload = {
  id: string;
  type: VerifiedPaymentEvent["type"];
  created: number; // unix seconds
  data: {
    transaction_id: string;
    payment_request_id: string;
    amount_fils: number;
    currency: string;
    failure_reason?: string;
    refund_id?: string;
  };
};

/** Produces the header value a mock webhook must carry. */
export function signMockPayload(secret: string, rawBody: string, timestamp: number): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isTest = true;

  constructor(
    private readonly options: {
      webhookSecret: string;
      /** Base URL of the site; the mock "hosted page" lives under it. */
      siteUrl: string;
      now?: () => Date;
    },
  ) {
    if (options.webhookSecret.length < 16) {
      throw new Error("mock webhook secret must be at least 16 characters");
    }
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const providerCheckoutId = `mock_cs_${randomUUID()}`;
    const url = new URL(`/${input.locale}/mock-checkout/${providerCheckoutId}`, this.options.siteUrl);
    url.searchParams.set("request", input.paymentRequestId);
    return { providerCheckoutId, redirectUrl: url.toString(), expiresAt: input.expiresAt };
  }

  verifyWebhook(rawBody: string, headers: Headers): VerifiedPaymentEvent {
    const header = headers.get(MOCK_SIGNATURE_HEADER);
    if (!header) throw new WebhookVerificationError("missing signature");
    const parts = Object.fromEntries(
      header.split(",").map((part) => {
        const [k, ...v] = part.split("=");
        return [k.trim(), v.join("=").trim()];
      }),
    );
    const timestamp = Number(parts.t);
    const provided = parts.v1;
    if (!Number.isSafeInteger(timestamp) || !provided || !/^[0-9a-f]{64}$/.test(provided)) {
      throw new WebhookVerificationError("malformed signature");
    }
    const age = Math.abs(this.now().getTime() / 1000 - timestamp);
    if (age > TOLERANCE_SECONDS) throw new WebhookVerificationError("signature timestamp outside tolerance");

    const expected = createHmac("sha256", this.options.webhookSecret).update(`${timestamp}.${rawBody}`).digest();
    const actual = Buffer.from(provided, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new WebhookVerificationError("signature mismatch");
    }

    let payload: MockEventPayload;
    try {
      payload = JSON.parse(rawBody) as MockEventPayload;
    } catch {
      throw new WebhookVerificationError("body is not valid JSON");
    }
    const d = payload?.data;
    if (
      typeof payload?.id !== "string" ||
      !["payment.succeeded", "payment.failed", "refund.succeeded", "refund.failed"].includes(payload.type) ||
      typeof d?.transaction_id !== "string" ||
      typeof d.payment_request_id !== "string" ||
      !Number.isSafeInteger(d.amount_fils) ||
      d.amount_fils <= 0 ||
      typeof d.currency !== "string" ||
      !Number.isSafeInteger(payload.created)
    ) {
      throw new WebhookVerificationError("unexpected payload shape");
    }

    return {
      provider: this.name,
      eventId: payload.id,
      type: payload.type,
      providerReference: d.transaction_id,
      paymentRequestId: d.payment_request_id,
      amountFils: d.amount_fils,
      currency: d.currency,
      occurredAt: new Date(payload.created * 1000),
      isTest: true,
      failureReason: d.failure_reason,
      refundReference: d.refund_id,
      metadata: { mode: "test" },
    };
  }

  async refund(input: { providerReference: string; amountFils: number; reason: string }) {
    if (!input.providerReference) throw new Error("providerReference is required");
    return { refundReference: `mock_re_${randomUUID()}`, status: "pending" as const };
  }
}
