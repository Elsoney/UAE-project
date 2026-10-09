import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StaffGate, StaffLoading } from "@/components/admin/staff-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { formatAed } from "@/lib/domain/money";
import { listCateringRequests, type CateringFilter } from "@/lib/services/staff-data";
import { resolveLocale } from "../locale";

export const metadata: Metadata = { title: "Umodai staff", robots: { index: false, follow: false } };

export default async function StaffCateringPage({ params, searchParams }: PageProps<"/[lang]/admin">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <Suspense fallback={<StaffLoading label={dict.staff.loading} />}>
      <CateringList locale={locale} t={dict.staff} searchParams={searchParams} />
    </Suspense>
  );
}

async function CateringList({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: Dictionary["staff"];
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter: CateringFilter = (await searchParams).show === "all" ? "all" : "open";
  return (
    <StaffGate locale={locale} t={t} current="catering">
      {async () => {
        const rows = await listCateringRequests(filter);
        const chip = (value: CateringFilter, label: string) => (
          <Link
            href={value === "open" ? `/${locale}/admin` : `/${locale}/admin?show=all`}
            aria-current={filter === value ? "page" : undefined}
            className={`min-h-11 rounded-full border-2 px-4 py-2 font-semibold ${filter === value ? "border-madder bg-madder text-plaster" : "border-rule"}`}
          >
            {label}
          </Link>
        );
        return (
          <section aria-labelledby="catering-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 id="catering-heading" className="font-display text-3xl text-indigo">
                {t.navCatering}
              </h1>
              <div role="group" aria-label={t.filterLabel} className="flex gap-2">
                {chip("open", t.filterOpen)}
                {chip("all", t.filterAll)}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="mt-10 text-date">{t.empty}</p>
            ) : (
              <div className="mt-6 overflow-x-auto bg-white">
                <table className="min-w-full text-start">
                  <thead className="border-b-2 border-rule text-sm text-date">
                    <tr>
                      {[t.col.reference, t.col.customer, t.col.event, t.col.guests, t.col.total, t.col.status, t.col.payment].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-rule/60 last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/${locale}/admin/catering/${r.id}`} className="tabular whitespace-nowrap font-semibold text-madder underline underline-offset-4" dir="ltr">
                            {r.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{r.contact_name}</td>
                        <td className="tabular px-4 py-3">
                          <span dir="ltr" className="whitespace-nowrap">
                            {r.event_date} {r.event_time.slice(0, 5)}
                          </span>
                          <span className="block text-sm text-date">
                            {r.catering_packages ? (locale === "ar" ? r.catering_packages.name_ar : r.catering_packages.name_en) : t.customPackage}
                          </span>
                        </td>
                        <td className="tabular px-4 py-3">{r.guest_count}</td>
                        <td className="tabular px-4 py-3">{r.quoted_total_fils ? formatAed(r.quoted_total_fils, locale) : "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge locale={locale} catering={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge locale={locale} payment={r.payment_status} />
                        </td>
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
