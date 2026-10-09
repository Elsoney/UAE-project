"use server";

/**
 * TEST-ONLY: simulates the payment provider's hosted page. Pressing "Pay"
 * produces a webhook signed exactly like a real provider's and runs it
 * through the same verification and processing as /api/webhooks/payments.
 * Unavailable unless the mock provider is configured (never in production).
 */
import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { serverEnv } from "@/lib/env";
import { afterPaymentEvent } from "@/lib/payments/after-payment";
import { getPaymentProvider } from "@/lib/payments/factory";
import { MOCK_SIGNATURE_HEADER, signMockPayload, type MockEventPayload } from "@/lib/payments/mock-provider";
import { createSupabasePaymentStore } from "@/lib/payments/supabase-store";
import { handlePaymentWebhook } from "@/lib/payments/webhook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type MockPaymentResult = { status: "paid" | "failed" | "closed" | "unavailable" };

export async function completeMockPayment(checkoutId: string, outcome: "success" | "fail"): Promise<MockPaymentResult> {
  const env = serverEnv();
  const provider = getPaymentProvider();
  if (provider.name !== "mock" || env.APP_ENV === "production") return { status: "unavailable" };
  if (!/^mock_cs_[0-9a-f-]{36}$/.test(checkoutId)) return { status: "closed" };

  const client = createSupabaseServiceClient();
  const { data: request } = await client
    .from("payment_requests")
    .select("id, status, requested_amount_fils")
    .eq("provider_checkout_id", checkoutId)
    .maybeSingle();
  if (!request || request.status !== "pending") return { status: "closed" };

  const ok = outcome === "success";
  const payload: MockEventPayload = {
    id: ok ? `evt_${checkoutId}_paid` : `evt_${randomUUID()}`,
    type: ok ? "payment.succeeded" : "payment.failed",
    created: Math.floor(Date.now() / 1000),
    data: {
      // One transaction per checkout, so a double click cannot pay twice.
      transaction_id: ok ? `mock_txn_${checkoutId}` : `mock_txn_${checkoutId}_declined_${randomUUID()}`,
      payment_request_id: request.id,
      amount_fils: request.requested_amount_fils,
      currency: "AED",
      ...(ok ? {} : { failure_reason: "card_declined (test)" }),
    },
  };
  const rawBody = JSON.stringify(payload);
  const headers = new Headers({ [MOCK_SIGNATURE_HEADER]: signMockPayload(env.PAYMENT_WEBHOOK_SECRET, rawBody, payload.created) });
  const result = await handlePaymentWebhook({ provider, store: createSupabasePaymentStore(client), rawBody, headers });
  await afterPaymentEvent(client, result);
  refresh();
  if (result.outcome === "processed" || result.outcome === "duplicate") return { status: ok ? "paid" : "failed" };
  return { status: "closed" };
}
