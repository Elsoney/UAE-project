/**
 * Supabase implementation of the submission ports. Server-only: it uses the
 * service-role client, so callers must have validated input already (the
 * submission services do). Public ids for menu items and packages are their
 * slugs; the database functions resolve them to internal ids.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogItem } from "@/lib/domain/cart";
import type { Database, Json } from "@/types/database";
import {
  SubmissionRejected,
  type CatalogPort,
  type CateringPackageInfo,
  type CustomerPort,
  type NewCateringRequest,
  type NewOrder,
  type RejectionCode,
  type SubmissionPort,
} from "./ports";

type Client = SupabaseClient<Database>;

/** Translates a database error into a business rejection, or null if it is not one. */
export function rejectionFromDatabaseError(error: { code?: string; message?: string } | null): RejectionCode | null {
  const message = error?.message ?? "";
  const codes: RejectionCode[] = ["rate_limited", "package_unavailable", "item_unavailable", "price_changed"];
  for (const code of codes) if (message.includes(code)) return code;
  if (error?.code === "23514" && message.includes("is not available")) return "date_blocked";
  if (error?.code === "23514" && message.includes("in the past")) return "date_past";
  return null;
}

/** Throws SubmissionRejected for business rules, or a generic error that never echoes database detail. */
function raise(error: { code?: string; message?: string }, operation: string): never {
  const rejection = rejectionFromDatabaseError(error);
  if (rejection) throw new SubmissionRejected(rejection);
  throw new Error(`database error during ${operation} (${error.code ?? "unknown"})`);
}

export function toOrderPayload(order: NewOrder): Json {
  return {
    reference: order.reference,
    idempotency_key: order.idempotencyKey,
    locale: order.locale,
    contact: order.contact,
    marketing_consent: order.consentEvent !== null,
    order_type: order.orderType,
    delivery_address: order.deliveryAddress,
    notes: order.notes,
    items: order.lines.map((l) => ({ slug: l.menuItemId, quantity: l.quantity })),
    expected_subtotal_fils: order.subtotalFils,
    delivery_fee_fils: order.deliveryFeeFils,
    email: { locale: order.email.locale, subject: order.email.subject },
  };
}

export function toCateringPayload(request: NewCateringRequest): Json {
  return {
    reference: request.reference,
    idempotency_key: request.idempotencyKey,
    locale: request.locale,
    contact: request.contact,
    marketing_consent: request.consentEvent !== null,
    package_slug: request.packageId,
    custom_request: request.customRequest,
    event_date: request.eventDate,
    event_time: request.eventTime,
    guest_count: request.guestCount,
    event_location: request.eventLocation,
    notes: request.notes,
    email: { locale: request.email.locale, subject: request.email.subject },
  };
}

export function createSupabasePorts(client: Client): CatalogPort & CustomerPort & SubmissionPort {
  return {
    async menuItems(ids) {
      if (ids.length === 0) return new Map();
      const { data, error } = await client
        .from("menu_items")
        .select("slug, name_en, name_ar, price_fils, is_active, is_available, categories!inner(is_active)")
        .in("slug", [...ids]);
      if (error) raise(error, "menu lookup");
      return new Map<string, CatalogItem>(
        (data ?? []).map((row) => [
          row.slug,
          {
            id: row.slug,
            nameEn: row.name_en,
            nameAr: row.name_ar,
            priceFils: row.price_fils,
            isActive: row.is_active && row.categories.is_active,
            isAvailable: row.is_available,
          },
        ]),
      );
    },

    async activePackages() {
      const { data, error } = await client
        .from("catering_packages")
        .select("slug, name_en, name_ar, minimum_guests, maximum_guests")
        .eq("is_active", true);
      if (error) raise(error, "package lookup");
      return new Map<string, CateringPackageInfo>(
        (data ?? []).map((p) => [
          p.slug,
          { id: p.slug, nameEn: p.name_en, nameAr: p.name_ar, minimumGuests: p.minimum_guests, maximumGuests: p.maximum_guests },
        ]),
      );
    },

    async blockedDates(from, to) {
      const { data, error } = await client.from("blocked_dates").select("blocked_on").gte("blocked_on", from).lte("blocked_on", to);
      if (error) raise(error, "blocked dates lookup");
      return new Set((data ?? []).map((d) => d.blocked_on));
    },

    async findByNormalizedEmail(emailNormalized) {
      const { data, error } = await client
        .from("customers")
        .select("id, marketing_consent")
        .eq("email_normalized", emailNormalized)
        .maybeSingle();
      if (error) raise(error, "customer lookup");
      return data ? { id: data.id, marketingConsent: data.marketing_consent } : null;
    },

    async findOrderByIdempotencyKey(key) {
      const { data, error } = await client
        .from("orders")
        .select("reference, order_status, payment_status, total_fils")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) raise(error, "order lookup");
      return data
        ? { reference: data.reference, orderStatus: data.order_status, paymentStatus: data.payment_status, totalFils: data.total_fils }
        : null;
    },

    async createOrder(order) {
      const { data, error } = await client.rpc("submit_guest_order", { p: toOrderPayload(order) });
      if (error) raise(error, "order submission");
      const row = data?.[0];
      if (!row) throw new Error("order submission returned no row");
      return { reference: row.reference, orderStatus: row.order_status, paymentStatus: row.payment_status, totalFils: row.total_fils };
    },

    async findCateringByIdempotencyKey(key) {
      const { data, error } = await client
        .from("catering_requests")
        .select("reference, status")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) raise(error, "catering lookup");
      return data ? { reference: data.reference, status: data.status } : null;
    },

    async createCateringRequest(request) {
      const { data, error } = await client.rpc("submit_catering_request", { p: toCateringPayload(request) });
      if (error) raise(error, "catering submission");
      const row = data?.[0];
      if (!row) throw new Error("catering submission returned no row");
      return { reference: row.reference, status: row.status };
    },
  };
}
