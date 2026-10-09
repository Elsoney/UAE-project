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
import { isDatabaseConfigured } from "@/lib/services/brand";
import { planCateringReview, planOrderUpdate, type ReviewErrorCode } from "@/lib/services/review";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffActionResult = { ok: true } | { ok: false; code: ReviewErrorCode | "forbidden" | "not_found" | "failed" | "date_unavailable" };
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
