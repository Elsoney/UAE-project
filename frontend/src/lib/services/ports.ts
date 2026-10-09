/**
 * Storage and infrastructure interfaces used by the application services.
 * The Supabase implementations live in lib/services/supabase-*.ts; tests use
 * in-memory fakes. Writes that must succeed or fail together (customer +
 * order + items + consent + confirmation email) are a single port call so the
 * implementation can run them in one database transaction.
 */
import type { CatalogItem, PricedLine } from "@/lib/domain/cart";
import type { CateringPackageRule } from "@/lib/domain/catering";
import type { CustomerResolution, ExistingCustomer } from "@/lib/domain/customer";
import type { Fils } from "@/lib/domain/money";
import type { CateringStatus, Locale, OrderStatus, PaymentStatus } from "@/lib/domain/status";

export interface Clock {
  now(): Date;
}

export type CateringPackageInfo = CateringPackageRule & { id: string; nameEn: string; nameAr: string };

export interface CatalogPort {
  /** Current catalog rows for the given ids (missing ids are simply absent). */
  menuItems(ids: readonly string[]): Promise<Map<string, CatalogItem>>;
  /** Active catering packages by id. */
  activePackages(): Promise<Map<string, CateringPackageInfo>>;
  /** Blocked dates (YYYY-MM-DD) between two dates inclusive. */
  blockedDates(from: string, to: string): Promise<Set<string>>;
}

export interface CustomerPort {
  findByNormalizedEmail(emailNormalized: string): Promise<ExistingCustomer | null>;
}

export type QueuedEmail = {
  template: "order_received" | "catering_request_received";
  locale: Locale;
  toEmail: string;
  subject: string;
};

export type NewOrder = {
  reference: string;
  idempotencyKey: string;
  customer: CustomerResolution["customer"];
  consentEvent: CustomerResolution["consentEvent"];
  contact: { name: string; phone: string; email: string };
  locale: Locale;
  orderType: "pickup" | "delivery";
  deliveryAddress: string | null;
  notes: string | null;
  lines: PricedLine[];
  subtotalFils: Fils;
  discountFils: Fils;
  deliveryFeeFils: Fils;
  totalFils: Fils;
  email: QueuedEmail;
};

export type NewCateringRequest = {
  reference: string;
  idempotencyKey: string | null;
  customer: CustomerResolution["customer"];
  consentEvent: CustomerResolution["consentEvent"];
  contact: { name: string; phone: string; email: string };
  locale: Locale;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  eventLocation: string;
  packageId: string | null;
  customRequest: string | null;
  notes: string | null;
  email: QueuedEmail;
};

export type SubmittedOrder = {
  reference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalFils: Fils;
};

export type SubmittedCateringRequest = {
  reference: string;
  status: CateringStatus;
};

export interface SubmissionPort {
  findOrderByIdempotencyKey(key: string): Promise<SubmittedOrder | null>;
  /** Atomically: create/reuse customer, append consent, insert order + items, queue email. */
  createOrder(order: NewOrder): Promise<SubmittedOrder>;
  findCateringByIdempotencyKey(key: string): Promise<SubmittedCateringRequest | null>;
  /** Atomically: create/reuse customer, append consent, insert request, queue email. */
  createCateringRequest(request: NewCateringRequest): Promise<SubmittedCateringRequest>;
}
