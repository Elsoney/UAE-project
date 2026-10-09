import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderActions } from "@/components/admin/order-actions";
import { StaffGate, StaffLoading } from "@/components/admin/staff-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatPhone } from "@/config/business";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { formatAed } from "@/lib/domain/money";
import { listOrders } from "@/lib/services/staff-data";
import { resolveLocale } from "../../locale";

export const metadata: Metadata = { title: "Umodai staff", robots: { index: false, follow: false } };

export default async function StaffOrdersPage({ params }: PageProps<"/[lang]/admin/orders">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <Suspense fallback={<StaffLoading label={dict.staff.loading} />}>
      <Orders locale={locale} t={dict.staff} />
    </Suspense>
  );
}

async function Orders({ locale, t }: { locale: Locale; t: Dictionary["staff"] }) {
  return (
    <StaffGate locale={locale} t={t} current="orders">
      {async (session) => {
        const rows = await listOrders();
        return (
          <section aria-labelledby="orders-heading">
            <h1 id="orders-heading" className="font-display text-3xl text-indigo">
              {t.navOrders}
            </h1>
            {rows.length === 0 ? (
              <p className="mt-10 text-date">{t.empty}</p>
            ) : (
              <div className="mt-6 overflow-x-auto bg-white">
                <table className="min-w-full text-start">
                  <thead className="border-b-2 border-rule text-sm text-date">
                    <tr>
                      {[t.col.reference, t.col.customer, t.col.items, t.col.total, t.col.status, ""].map((h, i) => (
                        <th key={i} scope="col" className="px-4 py-3 text-start font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id} className="border-b border-rule/60 align-top last:border-0">
                        <td className="px-4 py-3">
                          <span className="tabular whitespace-nowrap font-semibold" dir="ltr">
                            {o.reference}
                          </span>
                          <span className="block text-sm text-date">{o.order_type === "pickup" ? t.pickup : t.delivery}</span>
                        </td>
                        <td className="px-4 py-3">
                          {o.contact_name}
                          <a href={`tel:${o.contact_phone}`} dir="ltr" className="tabular block text-sm underline underline-offset-4">
                            {formatPhone(o.contact_phone)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <ul>
                            {o.order_items.map((i, idx) => (
                              <li key={idx}>
                                <span className="tabular">{i.quantity}</span> × {locale === "ar" ? i.name_ar : i.name_en}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="tabular px-4 py-3">{formatAed(o.total_fils, locale)}</td>
                        <td className="flex flex-col gap-1 px-4 py-3">
                          <StatusBadge locale={locale} order={o.order_status} />
                          <StatusBadge locale={locale} payment={o.payment_status} />
                        </td>
                        <td className="px-4 py-3">{session.role === "admin" && <OrderActions orderId={o.id} status={o.order_status} t={t} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      }}
    </StaffGate>
  );
}
