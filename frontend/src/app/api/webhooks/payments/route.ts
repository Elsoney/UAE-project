/**
 * Payment provider webhook. The ONLY way a payment becomes "paid": the
 * provider's signature is verified on the raw body, then the event is applied
 * idempotently (see lib/payments/webhook.ts). Never trusts browser redirects.
 */
import { afterPaymentEvent } from "@/lib/payments/after-payment";
import { createSupabasePaymentStore } from "@/lib/payments/supabase-store";
import { getPaymentProvider } from "@/lib/payments/factory";
import { handlePaymentWebhook } from "@/lib/payments/webhook";
import { isDatabaseConfigured } from "@/lib/services/brand";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured()) return new Response(null, { status: 503 });
  const rawBody = await request.text();
  if (rawBody.length > 64_000) return new Response(null, { status: 413 });
  try {
    const client = createSupabaseServiceClient();
    const result = await handlePaymentWebhook({
      provider: getPaymentProvider(),
      store: createSupabasePaymentStore(client),
      rawBody,
      headers: request.headers,
    });
    await afterPaymentEvent(client, result);
    return Response.json({ outcome: result.outcome }, { status: result.httpStatus });
  } catch (error) {
    console.error("payment webhook failed", error instanceof Error ? error.message : "unknown error");
    // 500 makes the provider retry; the event stays unprocessed.
    return new Response(null, { status: 500 });
  }
}
