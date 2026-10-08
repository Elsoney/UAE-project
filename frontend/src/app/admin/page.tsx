const metrics = [
  { label: "Open orders", value: "12" },
  { label: "Pending catering", value: "4" },
  { label: "Payments cleared", value: "96%" },
  { label: "Commission pending", value: "AED 1,420" },
];

const recentOrders = [
  { id: "ORD-1042", customer: "Sara A.", total: "AED 168", status: "Confirmed" },
  { id: "ORD-1047", customer: "Nabil R.", total: "AED 96", status: "Preparing" },
  { id: "CET-330", customer: "Family Event", total: "AED 850", status: "Deposit pending" },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold">Umodai operations</h1>
          </div>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            + New order
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent activity</h2>
            <span className="text-sm text-slate-500">Last 7 days</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">{order.id}</td>
                    <td className="py-3 pr-4">{order.customer}</td>
                    <td className="py-3 pr-4">{order.total}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
