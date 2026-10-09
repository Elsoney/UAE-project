/**
 * Follow-up after a verified payment event: queue the "payment received"
 * email for the customer (once per provider transaction).
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderEmail } from "@/lib/notifications/templates";
import { emailBrand } from "@/lib/services/brand";
import type { Database } from "@/types/database";
import type { WebhookResult } from "./webhook";

export async function afterPaymentEvent(client: SupabaseClient<Database>, result: WebhookResult): Promise<void> {
  if (result.outcome !== "processed" || result.event.type !== "payment.succeeded" || result.parent.kind !== "catering_request") return;
  const { data: c } = await client
    .from("catering_requests")
    .select("id, reference, customer_id, contact_name, contact_email, locale, quoted_total_fils")
    .eq("id", result.parent.id)
    .maybeSingle();
  if (!c) return;
  const { data: summary } = await client.rpc("payment_summary", { p_kind: "catering_request", p_id: c.id, p_is_test: result.event.isTest });
  const paid = summary?.[0]?.paid_fils ?? result.event.amountFils;
  const { subject } = renderEmail(
    {
      template: "payment_received",
      data: {
        reference: c.reference,
        customerName: c.contact_name,
        amountFils: result.event.amountFils,
        remainingFils: Math.max((c.quoted_total_fils ?? 0) - paid, 0),
        paymentStatus: result.paymentStatus,
      },
    },
    c.locale,
    emailBrand(),
  );
  await client
    .from("email_outbox")
    .upsert(
      {
        customer_id: c.customer_id,
        entity_type: "catering_request",
        entity_id: c.id,
        template: "payment_received",
        locale: c.locale,
        to_email: c.contact_email,
        subject,
        dedupe_key: `payment_received:${result.event.provider}:${result.event.providerReference}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
}
