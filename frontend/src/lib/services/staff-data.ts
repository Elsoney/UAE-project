/**
 * Staff reads, made AS THE SIGNED-IN USER (cookie session), so Row Level
 * Security decides what is visible: staff see operations data; nobody else
 * sees anything. Callers must also check requireStaff()/getStaffAccess().
 */
import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type CateringFilter = "open" | "all";
const CLOSED: Enums<"catering_status">[] = ["completed", "rejected", "cancelled"];

export async function listCateringRequests(filter: CateringFilter) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("catering_requests")
    .select(
      "id, reference, contact_name, event_date, event_time, guest_count, status, payment_status, quoted_total_fils, created_at, custom_request, catering_packages(name_en, name_ar)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "open") query = query.not("status", "in", `(${CLOSED.join(",")})`);
  const { data, error } = await query;
  if (error) throw new Error(`catering list failed (${error.code})`);
  return data ?? [];
}

export async function getCateringRequest(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catering_requests")
    .select("*, catering_packages(name_en, name_ar, minimum_guests, maximum_guests)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`catering detail failed (${error.code})`);
  if (!data) return null;
  const { data: history } = await supabase
    .from("status_history")
    .select("field, old_value, new_value, changed_at")
    .eq("entity_type", "catering_request")
    .eq("entity_id", id)
    .order("changed_at", { ascending: true })
    .order("id", { ascending: true });
  return { request: data, history: history ?? [] };
}

export async function listOrders() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, reference, contact_name, contact_phone, order_type, total_fils, order_status, payment_status, created_at, admin_notes, order_items(name_en, name_ar, quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`order list failed (${error.code})`);
  return data ?? [];
}
