import type { Locale } from "@/i18n/config";
import {
  cateringStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  type CateringStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/domain/status";

const tone: Record<string, string> = {
  pending_review: "bg-saffron/25 text-date",
  new: "bg-saffron/25 text-date",
  customer_contacted: "bg-indigo/10 text-indigo",
  quoted: "bg-indigo/10 text-indigo",
  awaiting_payment: "bg-indigo/10 text-indigo",
  confirmed: "bg-palm/15 text-palm",
  preparing: "bg-palm/15 text-palm",
  ready: "bg-palm/15 text-palm",
  completed: "bg-palm text-plaster",
  rejected: "bg-madder/10 text-madder",
  cancelled: "bg-madder/10 text-madder",
};

export function StatusBadge(props: { locale: Locale } & ({ catering: CateringStatus } | { order: OrderStatus } | { payment: PaymentStatus })) {
  let label: string;
  let key: string;
  if ("catering" in props) {
    label = cateringStatusLabel(props.catering, props.locale);
    key = props.catering;
  } else if ("order" in props) {
    label = orderStatusLabel(props.order, props.locale);
    key = props.order;
  } else {
    label = paymentStatusLabel(props.payment, props.locale);
    key = props.payment === "unpaid" ? "" : "quoted";
  }
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${tone[key] ?? "bg-plaster-deep text-date"}`}>{label}</span>;
}
