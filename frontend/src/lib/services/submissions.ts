/**
 * Guest checkout and guest catering submissions (owner instructions §3–§4).
 *
 * Both flows: validate (shared schemas) → server-side pricing/availability →
 * idempotency (a retried submission returns the original reference, never a
 * duplicate) → link to the existing customer by normalised email or create
 * one (never overwriting an existing profile) → record marketing consent only
 * on explicit opt-in → store + queue a localised confirmation email.
 *
 * The result contains ONLY the new reference and status — never any other
 * customer data, so entering someone's email reveals nothing.
 */
import { priceCart, type CartIssue } from "@/lib/domain/cart";
import { cateringRequestSchema, todayInDubai } from "@/lib/domain/catering";
import { checkoutSchema } from "@/lib/domain/checkout";
import { normalizeEmail, resolveCustomer } from "@/lib/domain/customer";
import type { Fils } from "@/lib/domain/money";
import { generateReference } from "@/lib/domain/reference";
import type { CateringStatus, OrderStatus, PaymentStatus } from "@/lib/domain/status";
import { fieldErrors, type ValidationMessageKey } from "@/lib/domain/validation";
import { type Brand, renderEmail } from "@/lib/notifications/templates";
import {
  SubmissionRejected,
  type CatalogPort,
  type Clock,
  type CustomerPort,
  type SubmissionPort,
  type SubmittedCateringRequest,
  type SubmittedOrder,
} from "./ports";

export type SubmissionDeps = {
  catalog: CatalogPort;
  customers: CustomerPort;
  submissions: SubmissionPort;
  clock: Clock;
  brand: Brand;
  /** Delivery fee policy is an owner decision; 0 until agreed. */
  deliveryFeeFils?: Fils;
  newReference?: (kind: "order" | "catering") => string;
};

export type ValidationFailure = { ok: false; kind: "validation"; errors: Record<string, ValidationMessageKey> };
export type RateLimited = { ok: false; kind: "rate_limited" };

export type OrderSubmissionResult =
  | { ok: true; duplicate: boolean; reference: string; orderStatus: OrderStatus; paymentStatus: PaymentStatus; totalFils: Fils }
  | ValidationFailure
  | RateLimited
  | { ok: false; kind: "cart"; issues: CartIssue[] }
  | { ok: false; kind: "price_changed" };

export type CateringSubmissionResult =
  | { ok: true; duplicate: boolean; reference: string; status: CateringStatus }
  | ValidationFailure
  | RateLimited;

export async function submitGuestOrder(deps: SubmissionDeps, rawInput: unknown): Promise<OrderSubmissionResult> {
  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, kind: "validation", errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const existingOrder = await deps.submissions.findOrderByIdempotencyKey(input.idempotencyKey);
  if (existingOrder) return { ok: true, duplicate: true, ...existingOrder };

  const catalog = await deps.catalog.menuItems(input.items.map((i) => i.menuItemId));
  const cart = priceCart(input.items, catalog, {
    deliveryFeeFils: input.orderType === "delivery" ? (deps.deliveryFeeFils ?? 0) : 0,
  });
  if (!cart.ok) return { ok: false, kind: "cart", issues: cart.issues };

  const existingCustomer = await deps.customers.findByNormalizedEmail(normalizeEmail(input.email));
  const resolution = resolveCustomer(existingCustomer, input, "checkout");
  const reference = (deps.newReference ?? generateReference)("order");

  const { subject } = renderEmail(
    {
      template: "order_received",
      data: {
        reference,
        customerName: input.fullName,
        orderType: input.orderType,
        items: cart.lines,
        subtotalFils: cart.subtotalFils,
        discountFils: cart.discountFils,
        deliveryFeeFils: cart.deliveryFeeFils,
        totalFils: cart.totalFils,
        orderStatus: "new",
        paymentStatus: "unpaid",
      },
    },
    input.locale,
    deps.brand,
  );

  let created: SubmittedOrder;
  try {
    created = await deps.submissions.createOrder({
    reference,
    idempotencyKey: input.idempotencyKey,
    customer: resolution.customer,
    consentEvent: resolution.consentEvent,
    contact: { name: input.fullName, phone: input.phone, email: input.email.trim() },
    locale: input.locale,
    orderType: input.orderType,
    deliveryAddress: input.orderType === "delivery" ? input.deliveryAddress : null,
    notes: input.notes,
    lines: cart.lines,
    subtotalFils: cart.subtotalFils,
    discountFils: cart.discountFils,
    deliveryFeeFils: cart.deliveryFeeFils,
    totalFils: cart.totalFils,
    email: { template: "order_received", locale: input.locale, toEmail: input.email.trim(), subject },
    });
  } catch (error) {
    if (!(error instanceof SubmissionRejected)) throw error;
    if (error.code === "rate_limited") return { ok: false, kind: "rate_limited" };
    if (error.code === "price_changed") return { ok: false, kind: "price_changed" };
    // item_unavailable: the catalog changed between pricing and saving.
    return { ok: false, kind: "cart", issues: input.items.map((i) => ({ menuItemId: i.menuItemId, code: "unavailable" as const })) };
  }

  return { ok: true, duplicate: false, ...created };
}

export async function submitCateringRequest(
  deps: SubmissionDeps,
  rawInput: unknown,
  options: { leadTimeHours?: number } = {},
): Promise<CateringSubmissionResult> {
  const now = deps.clock.now();
  const today = todayInDubai(now);
  const horizon = todayInDubai(new Date(now.getTime() + 400 * 86_400_000));
  const [packages, blockedDates] = await Promise.all([
    deps.catalog.activePackages(),
    deps.catalog.blockedDates(today, horizon),
  ]);

  const parsed = cateringRequestSchema({ now, blockedDates, packages, leadTimeHours: options.leadTimeHours }).safeParse(
    rawInput,
  );
  if (!parsed.success) return { ok: false, kind: "validation", errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  if (input.idempotencyKey) {
    const existing = await deps.submissions.findCateringByIdempotencyKey(input.idempotencyKey);
    if (existing) return { ok: true, duplicate: true, ...existing };
  }

  const existingCustomer = await deps.customers.findByNormalizedEmail(normalizeEmail(input.email));
  const resolution = resolveCustomer(existingCustomer, input, "catering_form");
  const reference = (deps.newReference ?? generateReference)("catering");
  const pkg = input.packageId ? packages.get(input.packageId) : undefined;

  const { subject } = renderEmail(
    {
      template: "catering_request_received",
      data: {
        reference,
        customerName: input.fullName,
        eventDate: input.eventDate,
        eventTime: input.eventTime,
        guestCount: input.guestCount,
        eventLocation: input.eventLocation,
        packageName: pkg ? (input.locale === "ar" ? pkg.nameAr : pkg.nameEn) : null,
        customRequest: input.customRequest,
        status: "pending_review",
      },
    },
    input.locale,
    deps.brand,
  );

  let created: SubmittedCateringRequest;
  try {
    created = await deps.submissions.createCateringRequest({
    reference,
    idempotencyKey: input.idempotencyKey ?? null,
    customer: resolution.customer,
    consentEvent: resolution.consentEvent,
    contact: { name: input.fullName, phone: input.phone, email: input.email.trim() },
    locale: input.locale,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    guestCount: input.guestCount,
    eventLocation: input.eventLocation,
    packageId: input.packageId,
    customRequest: input.customRequest,
    notes: input.notes,
    email: { template: "catering_request_received", locale: input.locale, toEmail: input.email.trim(), subject },
    });
  } catch (error) {
    if (!(error instanceof SubmissionRejected)) throw error;
    switch (error.code) {
      case "rate_limited":
        return { ok: false, kind: "rate_limited" };
      case "date_blocked":
        return { ok: false, kind: "validation", errors: { eventDate: "errors.dateBlocked" } };
      case "date_past":
        return { ok: false, kind: "validation", errors: { eventDate: "errors.datePast" } };
      default:
        return { ok: false, kind: "validation", errors: { packageId: "errors.packageUnavailable" } };
    }
  }

  return { ok: true, duplicate: false, ...created };
}
