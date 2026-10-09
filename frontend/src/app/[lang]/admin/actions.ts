"use server";

/**
 * Staff actions. Every action verifies the session and role on the server
 * (owner §2) — hiding buttons is never relied on — and writes as the signed-in
 * user, so Row Level Security and the database workflow rules apply too.
 * Only restaurant admins can change operations; the operations owner reads.
 */
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasLocale } from "@/i18n/config";
import { requireStaff } from "@/lib/auth/dal";
import { AuthorizationError } from "@/lib/auth/staff";
import { renderEmail } from "@/lib/notifications/templates";
import { getPaymentProvider } from "@/lib/payments/factory";
import { emailBrand, isDatabaseConfigured } from "@/lib/services/brand";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { siteUrl } from "@/lib/env.public";
import { planCateringReview, planOrderUpdate, type ReviewErrorCode } from "@/lib/services/review";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffActionResult =
  | { ok: true }
  | { ok: false; code: ReviewErrorCode | "forbidden" | "not_found" | "failed" | "date_unavailable" | "no_payment_required" | "already_paid" };
export type SignInState = { error: "invalid" | "unavailable" | null };

const id = z.uuid();

function databaseErrorCode(message: string | undefined): StaffActionResult {
  const m = message ?? "";
  if (m.includes("cannot move")) return { ok: false, code: "invalid_transition" };
  if (m.includes("required payment")) return { ok: false, code: "payment_not_received" };
  if (m.includes("in the past") || m.includes("is not available")) return { ok: false, code: "date_unavailable" };
  if (m.includes("not_above_total")) return { ok: false, code: "deposit_exceeds_total" };
  if (m.includes("deposit")) return { ok: false, code: "deposit_invalid" };
  return { ok: false, code: "failed" };
}

async function adminOnly(): Promise<StaffActionResult | null> {
  try {
    await requireStaff(["admin"]);
    return null;
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, code: "forbidden" };
    throw error;
  }
}

export async function signInAction(locale: string, _prev: SignInState, form: FormData): Promise<SignInState> {
  if (!isDatabaseConfigured()) return { error: "unavailable" };
  const parsed = z.object({ email: z.email(), password: z.string().min(1).max(200) }).safeParse({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "invalid" };
  redirect(`/${hasLocale(locale) ? locale : "ar"}/admin`);
}

export async function signOutAction(locale: string) {
  if (isDatabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect(`/${hasLocale(locale) ? locale : "ar"}/admin/sign-in`);
}

export async function reviewCateringAction(requestId: string, action: unknown): Promise<StaffActionResult> {
  if (!id.safeParse(requestId).success) return { ok: false, code: "not_found" };
  const denied = await adminOnly();
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase
    .from("catering_requests")
    .select("status, quoted_total_fils, deposit_type, payment_status")
    .eq("id", requestId)
    .maybeSingle();
  if (!current) return { ok: false, code: "not_found" };

  const plan = planCateringReview(
    { status: current.status, quotedTotalFils: current.quoted_total_fils, depositType: current.deposit_type, paymentStatus: current.payment_status },
    action,
  );
  if (!plan.ok) return plan;

  const { error } = await supabase.from("catering_requests").update(plan.update).eq("id", requestId).select("id").single();
  if (error) return databaseErrorCode(error.message);
  refresh();
  return { ok: true };
}

export async function updateOrderAction(orderId: string, action: unknown): Promise<StaffActionResult> {
  if (!id.safeParse(orderId).success) return { ok: false, code: "not_found" };
  const denied = await adminOnly();
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("orders").select("order_status").eq("id", orderId).maybeSingle();
  if (!current) return { ok: false, code: "not_found" };

  const plan = planOrderUpdate({ status: current.order_status }, action);
  if (!plan.ok) return plan;

  const { error } = await supabase.from("orders").update(plan.update).eq("id", orderId).select("id").single();
  if (error) return databaseErrorCode(error.message);
  refresh();
  return { ok: true };
}

/** Payment links stay valid for 72 hours (assumption pending owner confirmation). */
const PAYMENT_LINK_HOURS = 72;

/**
 * Sends the customer a payment link for the required deposit or full payment.
 * The amount is computed by the database from the agreed price and the
 * deposit choice; any open link is superseded.
 */
export async function requestPaymentAction(requestId: string): Promise<StaffActionResult> {
  if (!id.safeParse(requestId).success) return { ok: false, code: "not_found" };
  let staffId: string;
  try {
    staffId = (await requireStaff(["admin"])).userId;
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, code: "forbidden" };
    throw error;
  }

  const provider = getPaymentProvider();
  const service = createSupabaseServiceClient();
  const expiresAt = new Date(Date.now() + PAYMENT_LINK_HOURS * 3_600_000);
  const { data, error } = await service.rpc("request_catering_payment", {
    p_request: requestId,
    p_staff: staffId,
    p_provider: provider.name,
    p_is_test: provider.isTest,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) {
    for (const code of ["forbidden", "not_found", "invalid_transition", "no_payment_required", "already_paid"] as const) {
      if (error.message.includes(code)) return { ok: false, code };
    }
    return { ok: false, code: "failed" };
  }
  const row = data?.[0];
  if (!row) return { ok: false, code: "failed" };

  try {
    const base = siteUrl();
    const checkout = await provider.createCheckout({
      paymentRequestId: row.payment_request_id,
      amountFils: row.requested_amount_fils,
      currency: "AED",
      reference: row.reference,
      customerEmail: row.contact_email,
      locale: row.locale,
      successUrl: `${base}/${row.locale}/catering`,
      cancelUrl: `${base}/${row.locale}/catering`,
      expiresAt,
    });
    const { subject } = renderEmail(
      {
        template: "payment_requested",
        data: {
          reference: row.reference,
          customerName: row.contact_name,
          amountFils: row.requested_amount_fils,
          totalFils: row.total_fils,
          payUrl: checkout.redirectUrl,
          expiresAt,
          paymentStatus: "payment_requested",
        },
      },
      row.locale,
      emailBrand(),
    );
    const { error: attachError } = await service.rpc("attach_checkout", {
      p_payment_request: row.payment_request_id,
      p_checkout_id: checkout.providerCheckoutId,
      p_checkout_url: checkout.redirectUrl,
      p_email_subject: subject,
    });
    if (attachError) return { ok: false, code: "failed" };
  } catch (error) {
    console.error("payment link creation failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, code: "failed" };
  }
  refresh();
  return { ok: true };
}
