import type { Metadata } from "next";
import { resolveLocale } from "../locale";

/*
 * Staff area PREVIEW with sample data only. Real sign-in (Supabase Auth +
 * server-side role checks) and live data replace this in the admin release.
 * Not linked publicly and excluded from search engines.
 */

export const metadata: Metadata = {
  title: "Umodai staff",
  robots: { index: false, follow: false },
};

const metrics = [
  { label: "Open orders", value: "12" },
  { label: "Pending catering", value: "4" },
  { label: "Payments cleared", value: "96%" },
  { label: "Commission pending", value: "AED 1,420" },
];

const recentOrders = [
  { id: "ORD-1042", customer: "Sample A.", total: "AED 168", status: "Confirmed" },
  { id: "ORD-1047", customer: "Sample B.", total: "AED 96", status: "Preparing" },
  { id: "CET-330", customer: "Sample event", total: "AED 850", status: "Deposit pending" },
];

export default async function AdminPreviewPage({ params }: PageProps<"/[lang]/admin">) {
  const { dict } = await resolveLocale(params);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" dir="ltr" lang="en">
      <p role="note" className="mb-8 border-s-4 border-saffron bg-plaster-deep p-4 font-semibold" dir="auto">
        {dict.admin.previewBanner}
      </p>
      <h1 className="font-display text-3xl">Umodai operations</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="border-2 border-rule bg-white p-5">
            <p className="text-sm text-date">{item.label}</p>
            <p className="mt-3 text-3xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 border-2 border-rule bg-white p-6">
        <h2 className="text-xl font-semibold">Recent activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-start text-sm">
            <thead>
              <tr className="border-b border-rule text-date">
                <th className="pb-3 pe-4 text-start font-medium">Reference</th>
                <th className="pb-3 pe-4 text-start font-medium">Customer</th>
                <th className="pb-3 pe-4 text-start font-medium">Total</th>
                <th className="pb-3 pe-4 text-start font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-rule/50 last:border-0">
                  <td className="py-3 pe-4 font-medium">{order.id}</td>
                  <td className="py-3 pe-4">{order.customer}</td>
                  <td className="py-3 pe-4">{order.total}</td>
                  <td className="py-3 pe-4">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
