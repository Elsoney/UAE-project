/**
 * Supabase implementation of PaymentStore for the webhook (service role,
 * server-only). Each method is one statement or one database function; the
 * database guarantees the critical invariants regardless of ordering:
 * unique (provider, provider_reference) payments, succeeded payments are
 * final, refunds never exceed payments, and claim_payment_event() serialises
 * deliveries of the same event.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { PaymentParent, PaymentStore, StoredPaymentRequest } from "./webhook";

type Client = SupabaseClient<Database>;

function fail(operation: string, error: { code?: string } | null): never {
  throw new Error(`payment store: ${operation} failed (${error?.code ?? "unknown"})`);
}

export function createSupabasePaymentStore(client: Client): PaymentStore {
  return {
    async recordEvent(event) {
      const { data, error } = await client.rpc("claim_payment_event", {
        p_provider: event.provider,
        p_event_id: event.eventId,
        p_event_type: event.type,
        p_payload: {
          provider_reference: event.providerReference,
          payment_request_id: event.paymentRequestId,
          amount_fils: event.amountFils,
          currency: event.currency,
          occurred_at: event.occurredAt.toISOString(),
          is_test: event.isTest,
          refund_reference: event.refundReference ?? null,
          failure_reason: event.failureReason ?? null,
          metadata: event.metadata,
        } as Json,
      });
      if (error) fail("claim event", error);
      return data === "duplicate" || data === "busy" ? data : "new";
    },

    async markEventProcessed(provider, eventId, processingError) {
      const { error } = await client
        .from("payment_events")
        .update({ processed_at: new Date().toISOString(), processing_error: processingError })
        .eq("provider", provider)
        .eq("provider_event_id", eventId);
      if (error) fail("mark event processed", error);
    },

    async findPaymentRequest(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data, error } = await client
        .from("payment_requests")
        .select("id, order_id, catering_request_id, provider, is_test, status, requested_amount_fils, currency")
        .eq("id", id)
        .maybeSingle();
      if (error) fail("find payment request", error);
      if (!data) return null;
      const parent: PaymentParent = data.order_id
        ? { kind: "order", id: data.order_id }
        : { kind: "catering_request", id: data.catering_request_id! };
      return {
        id: data.id,
        parent,
        provider: data.provider,
        isTest: data.is_test,
        status: data.status,
        requestedAmountFils: data.requested_amount_fils,
        currency: "AED",
      } satisfies StoredPaymentRequest;
    },

    async findPayment(provider, providerReference) {
      const { data, error } = await client
        .from("payments")
        .select("id, payment_request_id, status, amount_fils")
        .eq("provider", provider)
        .eq("provider_reference", providerReference)
        .maybeSingle();
      if (error) fail("find payment", error);
      return data && data.payment_request_id
        ? { id: data.id, paymentRequestId: data.payment_request_id, status: data.status, amountFils: data.amount_fils }
        : null;
    },

    async savePayment(input) {
      const parent = input.request.parent;
      const { error } = await client.from("payments").upsert(
        {
          order_id: parent.kind === "order" ? parent.id : null,
          catering_request_id: parent.kind === "catering_request" ? parent.id : null,
          payment_request_id: input.request.id,
          provider: input.request.provider,
          provider_reference: input.providerReference,
          amount_fils: input.amountFils,
          currency: "AED",
          status: input.status,
          is_test: input.isTest,
          paid_at: input.paidAt?.toISOString() ?? null,
          failure_reason: input.failureReason,
          raw_event: input.metadata as Json,
        },
        { onConflict: "provider,provider_reference" },
      );
      if (error) fail("save payment", error);
    },

    async markRequestPaid(requestId) {
      const { error } = await client.from("payment_requests").update({ status: "paid" }).eq("id", requestId).eq("status", "pending");
      if (error) fail("mark request paid", error);
    },

    async updateRefundStatus(providerReference, refundReference, status) {
      const { data: payment } = await client.from("payments").select("id").eq("provider_reference", providerReference).maybeSingle();
      if (!payment) return false;
      const { data, error } = await client
        .from("refunds")
        .update({ status })
        .eq("payment_id", payment.id)
        .eq("provider_reference", refundReference)
        .select("id");
      if (error) fail("update refund", error);
      return (data?.length ?? 0) > 0;
    },

    async paymentSummary(parent, isTest) {
      const { data, error } = await client.rpc("payment_summary", { p_kind: parent.kind, p_id: parent.id, p_is_test: isTest });
      if (error || !data?.[0]) fail("payment summary", error);
      const s = data[0];
      return {
        totalFils: s.total_fils,
        paidFils: s.paid_fils,
        refundedFils: s.refunded_fils,
        requiredDepositFils: s.required_deposit_fils,
        hasOpenRequest: s.has_open_request,
        lastAttemptFailed: s.last_attempt_failed,
      };
    },

    async setPaymentStatus(parent, status) {
      const table = parent.kind === "order" ? "orders" : "catering_requests";
      const { error } = await client.from(table).update({ payment_status: status }).eq("id", parent.id);
      if (error) fail("set payment status", error);
    },
  };
}
