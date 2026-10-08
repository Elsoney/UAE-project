import type { MenuItem } from "@/data/site";

export function MenuCard({ item }: { item: MenuItem }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
          {item.badge}
        </span>
        <span className="text-lg font-bold text-slate-900">{item.price}</span>
      </div>
      <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
    </article>
  );
}
