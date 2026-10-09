import { describe, expect, it } from "vitest";
import { MOCK_SIGNATURE_HEADER, MockPaymentProvider, signMockPayload, type MockEventPayload } from "./mock-provider";
import { WebhookVerificationError, type VerifiedPaymentEvent } from "./provider";
import { handlePaymentWebhook, type PaymentParent, type PaymentStore, type StoredPayment, type StoredPaymentRequest } from "./webhook";

const SECRET = "test-webhook-secret-0123456789";
const NOW = new Date("2026-10-09T08:00:00Z");
const provider = new MockPaymentProvider({ webhookSecret: SECRET, siteUrl: "https://umodai.example", now: () => NOW });

class MemoryStore implements PaymentStore {
  events = new Map<string, { processedAt: boolean; error: string | null }>();
  requests = new Map<string, StoredPaymentRequest>();
  payments = new Map<string, StoredPayment & { requestId: string; isTest: boolean }>();
  refunds = new Map<string, { paymentRef: string; amount: number; status: "pending" | "succeeded" | "failed" }>();
  statuses = new Map<string, string>();

  async recordEvent(e: VerifiedPaymentEvent) {
    const key = `${e.provider}:${e.eventId}`;
    if (this.events.has(key)) return "duplicate" as const;
    this.events.set(key, { processedAt: false, error: null });
    return "new" as const;
  }
  async markEventProcessed(p: string, id: string, error: string | null) {
    this.events.set(`${p}:${id}`, { processedAt: true, error });
  }
  async findPaymentRequest(id: string) {
    return this.requests.get(id) ?? null;
  }
  async findPayment(p: string, ref: string) {
    return this.payments.get(`${p}:${ref}`) ?? null;
  }
  async savePayment(input: Parameters<PaymentStore["savePayment"]>[0]) {
    const key = `${input.request.provider}:${input.providerReference}`;
    const existing = this.payments.get(key);
    this.payments.set(key, {
      id: existing?.id ?? `pay-${this.payments.size + 1}`,
      status: input.status,
      amountFils: input.amountFils,
      requestId: input.request.id,
      isTest: input.isTest,
    });
  }
  async markRequestPaid(id: string) {
    const r = this.requests.get(id)!;
    this.requests.set(id, { ...r, status: "paid" });
  }
  async updateRefundStatus(paymentRef: string, refundRef: string, status: "succeeded" | "failed") {
    const refund = this.refunds.get(refundRef);
    if (!refund || refund.paymentRef !== paymentRef) return false;
    refund.status = status;
    return true;
  }
  async paymentSummary(parent: PaymentParent) {
    const reqs = [...this.requests.values()].filter((r) => r.parent.id === parent.id);
    const ids = new Set(reqs.map((r) => r.id));
    const pays = [...this.payments.entries()].filter(([, p]) => ids.has(p.requestId));
    const paid = pays.filter(([, p]) => p.status === "succeeded").reduce((s, [, p]) => s + p.amountFils, 0);
    const refunded = [...this.refunds.values()].filter((r) => r.status === "succeeded").reduce((s, r) => s + r.amount, 0);
    const last = pays.at(-1)?.[1];
    return {
      totalFils: 300_000,
      paidFils: paid,
      refundedFils: refunded,
      requiredDepositFils: 75_000,
      hasOpenRequest: reqs.some((r) => r.status === "pending"),
      lastAttemptFailed: last?.status === "failed",
    };
  }
  async setPaymentStatus(parent: PaymentParent, status: string) {
    this.statuses.set(parent.id, status);
  }
}

function setup() {
  const store = new MemoryStore();
  store.requests.set("req-1", {
    id: "req-1",
    parent: { kind: "catering_request", id: "cat-1" },
    provider: "mock",
    isTest: true,
    status: "pending",
    requestedAmountFils: 75_000,
    currency: "AED",
  });
  return store;
}

function event(overrides: Omit<Partial<MockEventPayload>, "data"> & { data?: Partial<MockEventPayload["data"]> } = {}) {
  const payload: MockEventPayload = {
    id: overrides.id ?? "evt-1",
    type: overrides.type ?? "payment.succeeded",
    created: overrides.created ?? Math.floor(NOW.getTime() / 1000),
    data: {
      transaction_id: "txn-1",
      payment_request_id: "req-1",
      amount_fils: 75_000,
      currency: "AED",
      ...overrides.data,
    },
  };
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload(SECRET, rawBody, Math.floor(NOW.getTime() / 1000)) });
  return { rawBody, headers };
}

describe("payment webhook", () => {
  it("records a verified successful payment and updates the payment status", async () => {
    const store = setup();
    const result = await handlePaymentWebhook({ provider, store, ...event() });
    expect(result).toMatchObject({ outcome: "processed", httpStatus: 200, paymentStatus: "deposit_paid" });
    expect(store.requests.get("req-1")?.status).toBe("paid");
    expect(store.payments.get("mock:txn-1")).toMatchObject({ status: "succeeded", amountFils: 75_000, isTest: true });
    expect(store.statuses.get("cat-1")).toBe("deposit_paid");
    expect(store.events.get("mock:evt-1")).toEqual({ processedAt: true, error: null });
  });

  it("rejects events with a missing or forged signature (nothing is recorded)", async () => {
    const store = setup();
    const { rawBody } = event();
    expect(await handlePaymentWebhook({ provider, store, rawBody, headers: new Headers() })).toMatchObject({
      outcome: "rejected",
      httpStatus: 401,
    });
    const forged = new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload("wrong-secret-0123456789", rawBody, Math.floor(NOW.getTime() / 1000)) });
    expect(await handlePaymentWebhook({ provider, store, rawBody, headers: forged })).toMatchObject({ outcome: "rejected" });
    // tampered body with the original signature
    const { headers } = event();
    expect(await handlePaymentWebhook({ provider, store, rawBody: rawBody.replace("75000", "1"), headers })).toMatchObject({
      outcome: "rejected",
    });
    expect(store.events.size).toBe(0);
    expect(store.payments.size).toBe(0);
  });

  it("ignores duplicate deliveries of the same event (no duplicate transaction)", async () => {
    const store = setup();
    await handlePaymentWebhook({ provider, store, ...event() });
    const again = await handlePaymentWebhook({ provider, store, ...event() });
    expect(again).toEqual({ outcome: "duplicate", httpStatus: 200 });
    expect(store.payments.size).toBe(1);
  });

  it("does not double-count a second event for the same transaction", async () => {
    const store = setup();
    await handlePaymentWebhook({ provider, store, ...event() });
    const second = await handlePaymentWebhook({ provider, store, ...event({ id: "evt-2" }) });
    expect(second).toMatchObject({ outcome: "processed", paymentStatus: "deposit_paid" });
    expect(store.payments.size).toBe(1);
  });

  it("never lets a late failure override a success (out-of-order delivery)", async () => {
    const store = setup();
    await handlePaymentWebhook({ provider, store, ...event() });
    const late = await handlePaymentWebhook({ provider, store, ...event({ id: "evt-0", type: "payment.failed" }) });
    expect(late).toMatchObject({ outcome: "ignored", reason: "late failure after success" });
    expect(store.payments.get("mock:txn-1")?.status).toBe("succeeded");
    expect(store.statuses.get("cat-1")).toBe("deposit_paid");
  });

  it("keeps a failed payment recoverable: the request stays open and a retry can succeed", async () => {
    const store = setup();
    const failed = await handlePaymentWebhook({
      provider,
      store,
      ...event({ type: "payment.failed", data: { failure_reason: "card_declined" } }),
    });
    expect(failed).toMatchObject({ outcome: "processed", paymentStatus: "payment_failed" });
    expect(store.requests.get("req-1")?.status).toBe("pending");
    const retry = await handlePaymentWebhook({ provider, store, ...event({ id: "evt-2", data: { transaction_id: "txn-2" } }) });
    expect(retry).toMatchObject({ outcome: "processed", paymentStatus: "deposit_paid" });
  });

  it("flags amount or currency mismatches for manual review instead of marking paid", async () => {
    const store = setup();
    const wrongAmount = await handlePaymentWebhook({ provider, store, ...event({ data: { amount_fils: 1 } }) });
    expect(wrongAmount).toMatchObject({ outcome: "needs_review" });
    const wrongCurrency = await handlePaymentWebhook({ provider, store, ...event({ id: "evt-2", data: { currency: "USD" } }) });
    expect(wrongCurrency).toMatchObject({ outcome: "needs_review" });
    expect(store.payments.size).toBe(0);
    expect(store.requests.get("req-1")?.status).toBe("pending");
    expect(store.events.get("mock:evt-1")?.error).toBe("amount mismatch");
  });

  it("refuses to mix test and live payments", async () => {
    const store = setup();
    store.requests.set("req-1", { ...store.requests.get("req-1")!, isTest: false });
    expect(await handlePaymentWebhook({ provider, store, ...event() })).toMatchObject({ outcome: "needs_review" });
    expect(store.payments.size).toBe(0);
  });

  it("ignores events for unknown payment requests", async () => {
    const store = setup();
    expect(await handlePaymentWebhook({ provider, store, ...event({ data: { payment_request_id: "nope" } }) })).toMatchObject({
      outcome: "ignored",
    });
  });

  it("tracks refund results", async () => {
    const store = setup();
    await handlePaymentWebhook({ provider, store, ...event() });
    store.refunds.set("re-1", { paymentRef: "txn-1", amount: 25_000, status: "pending" });
    const refunded = await handlePaymentWebhook({
      provider,
      store,
      ...event({ id: "evt-3", type: "refund.succeeded", data: { refund_id: "re-1", amount_fils: 25_000 } }),
    });
    expect(refunded).toMatchObject({ outcome: "processed", paymentStatus: "partially_refunded" });
    expect(store.refunds.get("re-1")?.status).toBe("succeeded");

    expect(
      await handlePaymentWebhook({ provider, store, ...event({ id: "evt-4", type: "refund.failed", data: { refund_id: "unknown" } }) }),
    ).toMatchObject({ outcome: "needs_review", reason: "unknown refund" });
    expect(
      await handlePaymentWebhook({ provider, store, ...event({ id: "evt-5", type: "refund.succeeded" }) }),
    ).toMatchObject({ outcome: "needs_review", reason: "refund event without refund id" });
    store.refunds.set("re-2", { paymentRef: "txn-1", amount: 1, status: "pending" });
    expect(
      await handlePaymentWebhook({
        provider,
        store,
        ...event({ id: "evt-6", type: "refund.succeeded", data: { refund_id: "re-2", payment_request_id: "gone" } }),
      }),
    ).toMatchObject({ outcome: "ignored" });
  });

  it("re-throws unexpected provider errors", async () => {
    const broken = { ...provider, name: "mock", verifyWebhook: () => { throw new Error("boom"); } } as unknown as MockPaymentProvider;
    await expect(handlePaymentWebhook({ provider: broken, store: setup(), ...event() })).rejects.toThrow("boom");
  });
});

describe("mock payment provider", () => {
  it("always marks payments as test payments", async () => {
    expect(provider.isTest).toBe(true);
    const verified = provider.verifyWebhook(event().rawBody, event().headers);
    expect(verified.isTest).toBe(true);
    expect(verified.metadata).toEqual({ mode: "test" });
  });

  it("creates a hosted checkout link on the site", async () => {
    const session = await provider.createCheckout({
      paymentRequestId: "req-1",
      amountFils: 75_000,
      currency: "AED",
      reference: "UMC-1",
      customerEmail: "a@example.com",
      locale: "ar",
      successUrl: "https://x/s",
      cancelUrl: "https://x/c",
      expiresAt: NOW,
    });
    expect(session.redirectUrl).toMatch(/^https:\/\/umodai\.example\/ar\/mock-checkout\/mock_cs_.+\?request=req-1$/);
    expect(session.expiresAt).toBe(NOW);
  });

  it("rejects stale, malformed or unparseable webhooks", () => {
    const { rawBody } = event();
    const stale = new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload(SECRET, rawBody, Math.floor(NOW.getTime() / 1000) - 3600) });
    expect(() => provider.verifyWebhook(rawBody, stale)).toThrow(/tolerance/);
    expect(() => provider.verifyWebhook(rawBody, new Headers({ [MOCK_SIGNATURE_HEADER]: "garbage" }))).toThrow(WebhookVerificationError);
    const ts = Math.floor(NOW.getTime() / 1000);
    expect(() => provider.verifyWebhook("not json", new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload(SECRET, "not json", ts) }))).toThrow(
      /JSON/,
    );
    const odd = JSON.stringify({ id: "e", type: "something.else", created: ts, data: {} });
    expect(() => provider.verifyWebhook(odd, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload(SECRET, odd, ts) }))).toThrow(/shape/);
  });

  it("requires a strong secret and issues test refunds", async () => {
    expect(() => new MockPaymentProvider({ webhookSecret: "short", siteUrl: "https://x" })).toThrow();
    const refund = await provider.refund({ providerReference: "txn-1", amountFils: 100, reason: "test" });
    expect(refund.status).toBe("pending");
    await expect(provider.refund({ providerReference: "", amountFils: 1, reason: "x" })).rejects.toThrow();
    // default clock
    expect(new MockPaymentProvider({ webhookSecret: SECRET, siteUrl: "https://x" }).isTest).toBe(true);
  });
});
