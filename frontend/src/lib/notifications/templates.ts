/**
 * Transactional email templates in Arabic and English (owner instructions §3, §8).
 *
 * Each email includes the public reference, the submitted details and the
 * current status. The catering "request received" email states clearly that
 * the booking is NOT yet confirmed (owner §3.8, §4). All customer-supplied
 * text is HTML-escaped. Marketing content never goes in these emails.
 */
import { formatAed, type Fils } from "@/lib/domain/money";
import {
  cateringStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  type CateringStatus,
  type Locale,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/domain/status";

export type Brand = {
  nameEn: string;
  nameAr: string;
  phone: string;
  siteUrl: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

type Line = { label: string; value: string };

export type OrderReceivedData = {
  reference: string;
  customerName: string;
  orderType: "pickup" | "delivery";
  items: { nameEn: string; nameAr: string; quantity: number; totalPriceFils: Fils }[];
  subtotalFils: Fils;
  discountFils: Fils;
  deliveryFeeFils: Fils;
  totalFils: Fils;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
};

export type CateringReceivedData = {
  reference: string;
  customerName: string;
  eventDate: string; // YYYY-MM-DD (Asia/Dubai)
  eventTime: string; // HH:MM
  guestCount: number;
  eventLocation: string;
  packageName: string | null;
  customRequest: string | null;
  status: CateringStatus;
};

export type PaymentRequestedData = {
  reference: string;
  customerName: string;
  amountFils: Fils;
  totalFils: Fils;
  payUrl: string;
  expiresAt: Date | null;
  paymentStatus: PaymentStatus;
};

export type PaymentReceivedData = {
  reference: string;
  customerName: string;
  amountFils: Fils;
  remainingFils: Fils;
  paymentStatus: PaymentStatus;
};

export type CateringConfirmedData = {
  reference: string;
  customerName: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  eventLocation: string;
  totalFils: Fils;
  paidFils: Fils;
  remainingFils: Fils;
  status: CateringStatus;
  paymentStatus: PaymentStatus;
};

export type EmailTemplate =
  | { template: "order_received"; data: OrderReceivedData }
  | { template: "catering_request_received"; data: CateringReceivedData }
  | { template: "payment_requested"; data: PaymentRequestedData }
  | { template: "payment_received"; data: PaymentReceivedData }
  | { template: "catering_confirmed"; data: CateringConfirmedData };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEventDate(date: string, locale: Locale): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(date);
}

const t = {
  en: {
    hello: (name: string) => `Hello ${name},`,
    reference: "Reference",
    status: "Status",
    paymentStatus: "Payment status",
    thanks: "Thank you for choosing",
    questions: "Questions? Call us on",
    orderSubject: (ref: string) => `We received your order ${ref}`,
    orderIntro: "Thank you — we have received your order. The restaurant will confirm it shortly.",
    orderType: "Order type",
    pickup: "Pickup",
    delivery: "Delivery",
    items: "Items",
    subtotal: "Subtotal",
    discount: "Discount",
    deliveryFee: "Delivery fee",
    total: "Total",
    cateringSubject: (ref: string) => `We received your catering request ${ref}`,
    cateringIntro: "Thank you — we have received your catering request.",
    cateringNotConfirmed:
      "Please note: your booking is not yet confirmed. Our team will review your request, contact you to confirm availability and details, and agree the final price with you.",
    eventDate: "Event date",
    eventTime: "Event time",
    guests: "Guests",
    location: "Location",
    package: "Package",
    customRequest: "Your request",
    payRequestedSubject: (ref: string) => `Payment requested for ${ref}`,
    payRequestedIntro: "To continue with your booking, please complete the payment below using our secure payment page.",
    amountDue: "Amount due now",
    confirmedTotal: "Confirmed total",
    payNow: "Pay securely",
    linkExpires: "This payment link expires on",
    payReceivedSubject: (ref: string) => `Payment received for ${ref}`,
    payReceivedIntro: "We have received your payment. Thank you.",
    amountReceived: "Amount received",
    remaining: "Remaining balance",
    confirmedSubject: (ref: string) => `Your catering booking ${ref} is confirmed`,
    confirmedIntro: "Good news — the restaurant has confirmed your catering booking.",
    paid: "Paid so far",
  },
  ar: {
    hello: (name: string) => `مرحباً ${name}،`,
    reference: "الرقم المرجعي",
    status: "الحالة",
    paymentStatus: "حالة الدفع",
    thanks: "شكراً لاختيارك",
    questions: "لأي استفسار اتصل بنا على",
    orderSubject: (ref: string) => `استلمنا طلبك ${ref}`,
    orderIntro: "شكراً لك — لقد استلمنا طلبك، وسيقوم المطعم بتأكيده قريباً.",
    orderType: "نوع الطلب",
    pickup: "استلام من المطعم",
    delivery: "توصيل",
    items: "الأصناف",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    deliveryFee: "رسوم التوصيل",
    total: "الإجمالي",
    cateringSubject: (ref: string) => `استلمنا طلب الضيافة ${ref}`,
    cateringIntro: "شكراً لك — لقد استلمنا طلب الضيافة الخاص بك.",
    cateringNotConfirmed:
      "يرجى الملاحظة: لم يتم تأكيد الحجز بعد. سيراجع فريقنا طلبك ويتواصل معك للتحقق من التوفر والتفاصيل والاتفاق على السعر النهائي.",
    eventDate: "تاريخ المناسبة",
    eventTime: "وقت المناسبة",
    guests: "عدد الضيوف",
    location: "الموقع",
    package: "الباقة",
    customRequest: "طلبك",
    payRequestedSubject: (ref: string) => `طلب دفع للحجز ${ref}`,
    payRequestedIntro: "لمتابعة حجزك، يرجى إتمام الدفع عبر صفحة الدفع الآمنة أدناه.",
    amountDue: "المبلغ المطلوب الآن",
    confirmedTotal: "الإجمالي المؤكد",
    payNow: "ادفع بأمان",
    linkExpires: "ينتهي رابط الدفع في",
    payReceivedSubject: (ref: string) => `تم استلام الدفعة للحجز ${ref}`,
    payReceivedIntro: "لقد استلمنا دفعتك. شكراً لك.",
    amountReceived: "المبلغ المستلم",
    remaining: "الرصيد المتبقي",
    confirmedSubject: (ref: string) => `تم تأكيد حجز الضيافة ${ref}`,
    confirmedIntro: "يسعدنا إبلاغك بأن المطعم قد أكّد حجز الضيافة الخاص بك.",
    paid: "المدفوع حتى الآن",
  },
} as const;

function layout(locale: Locale, brand: Brand, greeting: string, paragraphs: string[], lines: Line[], cta?: { label: string; url: string }) {
  const s = t[locale];
  const brandName = locale === "ar" ? brand.nameAr : brand.nameEn;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";

  const text = [
    greeting,
    "",
    ...paragraphs,
    "",
    ...lines.map((l) => `${l.label}: ${l.value}`),
    ...(cta ? ["", `${cta.label}: ${cta.url}`] : []),
    "",
    `${s.questions} ${brand.phone}`,
    `${s.thanks} ${brandName}.`,
  ].join("\n");

  const rows = lines
    .map(
      (l) =>
        `<tr><th style="text-align:${align};padding:6px 12px;color:#555;font-weight:600;vertical-align:top">${escapeHtml(l.label)}</th>` +
        `<td style="padding:6px 12px;vertical-align:top">${escapeHtml(l.value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(brandName)}</title></head>
<body style="margin:0;padding:24px;background:#f8f5f0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;direction:${dir};text-align:${align}">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(brandName)}</h1>
<p>${escapeHtml(greeting)}</p>
${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
${cta ? `<p><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#92400e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(cta.label)}</a></p>` : ""}
<p style="color:#555;font-size:14px">${escapeHtml(s.questions)} ${escapeHtml(brand.phone)}</p>
<p style="color:#555;font-size:14px">${escapeHtml(s.thanks)} ${escapeHtml(brandName)}.</p>
</div>
</body>
</html>`;
  return { text, html };
}

export function renderEmail(email: EmailTemplate, locale: Locale, brand: Brand): RenderedEmail {
  const s = t[locale];
  const money = (fils: Fils) => formatAed(fils, locale);

  switch (email.template) {
    case "order_received": {
      const d = email.data;
      const lines: Line[] = [
        { label: s.reference, value: d.reference },
        { label: s.orderType, value: d.orderType === "pickup" ? s.pickup : s.delivery },
        ...d.items.map((i) => ({
          label: `${i.quantity} × ${locale === "ar" ? i.nameAr : i.nameEn}`,
          value: money(i.totalPriceFils),
        })),
        { label: s.subtotal, value: money(d.subtotalFils) },
        ...(d.discountFils > 0 ? [{ label: s.discount, value: `-${money(d.discountFils)}` }] : []),
        ...(d.deliveryFeeFils > 0 ? [{ label: s.deliveryFee, value: money(d.deliveryFeeFils) }] : []),
        { label: s.total, value: money(d.totalFils) },
        { label: s.status, value: orderStatusLabel(d.orderStatus, locale) },
        { label: s.paymentStatus, value: paymentStatusLabel(d.paymentStatus, locale) },
      ];
      return { subject: s.orderSubject(d.reference), ...layout(locale, brand, s.hello(d.customerName), [s.orderIntro], lines) };
    }
    case "catering_request_received": {
      const d = email.data;
      const lines: Line[] = [
        { label: s.reference, value: d.reference },
        { label: s.eventDate, value: formatEventDate(d.eventDate, locale) },
        { label: s.eventTime, value: d.eventTime },
        { label: s.guests, value: String(d.guestCount) },
        { label: s.location, value: d.eventLocation },
        ...(d.packageName ? [{ label: s.package, value: d.packageName }] : []),
        ...(d.customRequest ? [{ label: s.customRequest, value: d.customRequest }] : []),
        { label: s.status, value: cateringStatusLabel(d.status, locale) },
      ];
      return {
        subject: s.cateringSubject(d.reference),
        ...layout(locale, brand, s.hello(d.customerName), [s.cateringIntro, s.cateringNotConfirmed], lines),
      };
    }
    case "payment_requested": {
      const d = email.data;
      const lines: Line[] = [
        { label: s.reference, value: d.reference },
        { label: s.amountDue, value: money(d.amountFils) },
        { label: s.confirmedTotal, value: money(d.totalFils) },
        ...(d.expiresAt ? [{ label: s.linkExpires, value: formatDateTime(d.expiresAt, locale) }] : []),
        { label: s.paymentStatus, value: paymentStatusLabel(d.paymentStatus, locale) },
      ];
      return {
        subject: s.payRequestedSubject(d.reference),
        ...layout(locale, brand, s.hello(d.customerName), [s.payRequestedIntro], lines, { label: s.payNow, url: d.payUrl }),
      };
    }
    case "payment_received": {
      const d = email.data;
      const lines: Line[] = [
        { label: s.reference, value: d.reference },
        { label: s.amountReceived, value: money(d.amountFils) },
        { label: s.remaining, value: money(d.remainingFils) },
        { label: s.paymentStatus, value: paymentStatusLabel(d.paymentStatus, locale) },
      ];
      return { subject: s.payReceivedSubject(d.reference), ...layout(locale, brand, s.hello(d.customerName), [s.payReceivedIntro], lines) };
    }
    case "catering_confirmed": {
      const d = email.data;
      const lines: Line[] = [
        { label: s.reference, value: d.reference },
        { label: s.eventDate, value: formatEventDate(d.eventDate, locale) },
        { label: s.eventTime, value: d.eventTime },
        { label: s.guests, value: String(d.guestCount) },
        { label: s.location, value: d.eventLocation },
        { label: s.confirmedTotal, value: money(d.totalFils) },
        { label: s.paid, value: money(d.paidFils) },
        { label: s.remaining, value: money(d.remainingFils) },
        { label: s.status, value: cateringStatusLabel(d.status, locale) },
        { label: s.paymentStatus, value: paymentStatusLabel(d.paymentStatus, locale) },
      ];
      return { subject: s.confirmedSubject(d.reference), ...layout(locale, brand, s.hello(d.customerName), [s.confirmedIntro], lines) };
    }
  }
}
