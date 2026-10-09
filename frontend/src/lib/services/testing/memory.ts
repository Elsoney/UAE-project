/**
 * In-memory implementations of the service ports, for unit tests.
 * They mimic the database guarantees the services rely on (unique
 * normalised email, unique idempotency keys, atomic writes).
 */
import type { CatalogItem } from "@/lib/domain/cart";
import type { ExistingCustomer } from "@/lib/domain/customer";
import {
  SubmissionRejected,
  type RejectionCode,
  type CatalogPort,
  type CateringPackageInfo,
  type CustomerPort,
  type NewCateringRequest,
  type NewOrder,
  type SubmissionPort,
  type SubmittedCateringRequest,
  type SubmittedOrder,
} from "../ports";

export type MemoryCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  emailNormalized: string;
  preferredLanguage: "ar" | "en";
  marketingConsent: boolean;
};

export class MemoryDatabase implements CatalogPort, CustomerPort, SubmissionPort {
  menu = new Map<string, CatalogItem>();
  packages = new Map<string, CateringPackageInfo>();
  blocked = new Set<string>();
  customers: MemoryCustomer[] = [];
  consentEvents: { customerId: string; granted: boolean; source: string }[] = [];
  orders: (NewOrder & { customerId: string })[] = [];
  catering: (NewCateringRequest & { customerId: string })[] = [];
  outbox: { template: string; toEmail: string; subject: string; locale: string; customerId: string }[] = [];
  /** Fail the next write (to prove atomicity). */
  failNextWrite = false;
  /** Make the next write rejected by a database business rule. */
  rejectNext: RejectionCode | null = null;

  async menuItems(ids: readonly string[]) {
    return new Map(ids.filter((id) => this.menu.has(id)).map((id) => [id, this.menu.get(id)!]));
  }
  async activePackages() {
    return new Map(this.packages);
  }
  async blockedDates(from: string, to: string) {
    return new Set([...this.blocked].filter((d) => d >= from && d <= to));
  }
  async findByNormalizedEmail(emailNormalized: string): Promise<ExistingCustomer | null> {
    const c = this.customers.find((x) => x.emailNormalized === emailNormalized);
    return c ? { id: c.id, marketingConsent: c.marketingConsent } : null;
  }
  async findOrderByIdempotencyKey(key: string): Promise<SubmittedOrder | null> {
    const o = this.orders.find((x) => x.idempotencyKey === key);
    return o ? { reference: o.reference, orderStatus: "new", paymentStatus: "unpaid", totalFils: o.totalFils } : null;
  }
  async findCateringByIdempotencyKey(key: string): Promise<SubmittedCateringRequest | null> {
    const c = this.catering.find((x) => x.idempotencyKey === key);
    return c ? { reference: c.reference, status: "pending_review" } : null;
  }

  private upsertCustomer(input: NewOrder["customer"]): string {
    if (input.action === "reuse") return input.id;
    const existing = this.customers.find((c) => c.emailNormalized === input.emailNormalized);
    if (existing) return existing.id; // concurrent first orders: unique email wins
    const id = `cust-${this.customers.length + 1}`;
    this.customers.push({ id, ...input, marketingConsent: false });
    return id;
  }

  private applyConsent(customerId: string, event: NewOrder["consentEvent"]) {
    if (!event) return;
    this.consentEvents.push({ customerId, granted: event.granted, source: event.source });
    const c = this.customers.find((x) => x.id === customerId);
    if (c) c.marketingConsent = event.granted;
  }

  private guardWrite() {
    if (this.rejectNext) {
      const code = this.rejectNext;
      this.rejectNext = null;
      throw new SubmissionRejected(code);
    }
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("simulated database failure");
    }
  }

  async createOrder(order: NewOrder): Promise<SubmittedOrder> {
    this.guardWrite();
    const customerId = this.upsertCustomer(order.customer);
    this.applyConsent(customerId, order.consentEvent);
    this.orders.push({ ...order, customerId });
    this.outbox.push({ ...order.email, customerId });
    return { reference: order.reference, orderStatus: "new", paymentStatus: "unpaid", totalFils: order.totalFils };
  }

  async createCateringRequest(request: NewCateringRequest): Promise<SubmittedCateringRequest> {
    this.guardWrite();
    const customerId = this.upsertCustomer(request.customer);
    this.applyConsent(customerId, request.consentEvent);
    this.catering.push({ ...request, customerId });
    this.outbox.push({ ...request.email, customerId });
    return { reference: request.reference, status: "pending_review" };
  }
}
