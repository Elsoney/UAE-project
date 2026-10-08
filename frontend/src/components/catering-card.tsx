import type { CateringPackage } from "@/data/site";

export function CateringCard({ item }: { item: CateringPackage }) {
  return (
    <article className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
          {item.guests}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
      <div className="mt-6 flex items-end justify-between border-t border-amber-200 pt-4">
        <span className="text-sm text-slate-500">From</span>
        <span className="text-2xl font-bold text-slate-900">{item.startingPrice}</span>
      </div>
    </article>
  );
}
