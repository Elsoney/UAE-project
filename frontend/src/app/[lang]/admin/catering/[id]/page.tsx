import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CateringReviewPanel } from "@/components/admin/catering-review-panel";
import { StaffGate, StaffLoading } from "@/components/admin/staff-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatPhone } from "@/config/business";
import type { Locale } from "@/i18n/config";
import { interpolate, type Dictionary } from "@/i18n/dictionary";
import { formatAed } from "@/lib/domain/money";
import { cateringStatusLabel, paymentStatusLabel, type CateringStatus, type PaymentStatus } from "@/lib/domain/status";
import { getCateringRequest } from "@/lib/services/staff-data";
import { resolveRootLocale } from "../../../locale";

export const metadata: Metadata = { title: "Umodai staff", robots: { index: false, follow: false } };

export default async function StaffCateringDetailPage({ params }: PageProps<"/[lang]/admin/catering/[id]">) {
  const { locale, dict } = await resolveRootLocale();
  return (
    <Suspense fallback={<StaffLoading label={dict.staff.loading} />}>
      <Detail locale={locale} t={dict.staff} params={params} />
    </Suspense>
  );
}

async function Detail({ locale, t, params }: { locale: Locale; t: Dictionary["staff"]; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StaffGate locale={locale} t={t} current="catering">
      {async (session) => {
        const found = /^[0-9a-f-]{36}$/i.test(id) ? await getCateringRequest(id) : null;
        if (!found) return <p className="text-date">{t.errors.not_found}</p>;
        const { request: r, history, paymentRequests, payments } = found;
        const open = paymentRequests.find((p) => p.status === "pending") ?? null;
        const pkg = r.catering_packages;
        const label = (field: string, value: string | null) =>
          value === null ? "" : field === "status" ? cateringStatusLabel(value as CateringStatus, locale) : paymentStatusLabel(value as PaymentStatus, locale);
        return (
          <div>
            <Link href={`/${locale}/admin`} className="font-semibold text-indigo underline underline-offset-4">
              {t.back}
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="tabular font-display text-3xl text-indigo" dir="ltr">
                {r.reference}
              </h1>
              <StatusBadge locale={locale} catering={r.status} />
              <StatusBadge locale={locale} payment={r.payment_status} />
            </div>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
              <div className="flex flex-col gap-8">
                <section aria-labelledby="contact-h" className="bg-white p-5">
                  <h2 id="contact-h" className="font-display text-xl text-madder">
                    {t.contact}
                  </h2>
                  <p className="mt-2 font-semibold">{r.contact_name}</p>
                  <p>
                    <a href={`tel:${r.contact_phone}`} dir="ltr" className="tabular underline underline-offset-4">
                      {formatPhone(r.contact_phone)}
                    </a>
                  </p>
                  <p>
                    <a href={`mailto:${r.contact_email}`} dir="ltr" className="underline underline-offset-4">
                      {r.contact_email}
                    </a>
                  </p>
                </section>

                <section aria-labelledby="event-h" className="bg-white p-5">
                  <h2 id="event-h" className="font-display text-xl text-madder">
                    {t.eventDetails}
                  </h2>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                    <dt className="text-date">{t.col.event}</dt>
                    <dd className="tabular" dir="ltr">
                      {r.event_date} {r.event_time.slice(0, 5)}
                    </dd>
                    <dt className="text-date">{t.col.guests}</dt>
                    <dd className="tabular">{r.guest_count}</dd>
                    <dt className="text-date">{t.package}</dt>
                    <dd>{pkg ? (locale === "ar" ? pkg.name_ar : pkg.name_en) : t.customPackage}</dd>
                  </dl>
                  <p className="mt-3">{r.event_location}</p>
                  {r.custom_request && <p className="mt-3 whitespace-pre-line">{r.custom_request}</p>}
                  {r.customer_notes && (
                    <>
                      <h3 className="mt-4 font-semibold">{t.customerNotes}</h3>
                      <p className="whitespace-pre-line">{r.customer_notes}</p>
                    </>
                  )}
                  {r.cancellation_reason && <p className="mt-4 font-semibold text-madder">{r.cancellation_reason}</p>}
                </section>

                {payments.length > 0 && (
                  <section aria-labelledby="payments-h" className="bg-white p-5">
                    <h2 id="payments-h" className="font-display text-xl text-madder">
                      {t.paymentsReceived}
                    </h2>
                    <ul className="mt-2 flex flex-col gap-1">
                      {payments.map((p) => (
                        <li key={p.id} className="tabular">
                          {formatAed(p.amount_fils, locale)}{" "}
                          <span className="text-sm text-date" dir="ltr">
                            {p.paid_at?.slice(0, 16).replace("T", " ")}
                            {p.is_test ? " · TEST" : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section aria-labelledby="history-h">
                  <h2 id="history-h" className="font-display text-xl text-indigo">
                    {t.history}
                  </h2>
                  <ol className="mt-3 flex flex-col gap-2 border-s-2 border-rule ps-4 text-sm">
                    {history.map((h, i) => (
                      <li key={i}>
                        <time className="tabular text-date" dateTime={h.changed_at} dir="ltr">
                          {new Date(h.changed_at).toISOString().slice(0, 16).replace("T", " ")}
                        </time>{" "}
                        {h.old_value === null
                          ? interpolate(t.historyCreated, { to: label(h.field, h.new_value) })
                          : interpolate(h.field === "status" ? t.historyStatus : t.historyPayment, {
                              from: label(h.field, h.old_value),
                              to: label(h.field, h.new_value),
                            })}
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <CateringReviewPanel
                locale={locale}
                t={t}
                requestId={r.id}
                status={r.status}
                paymentStatus={r.payment_status}
                quotedTotalFils={r.quoted_total_fils}
                depositType={r.deposit_type}
                depositPercentage={r.deposit_percentage}
                depositFixedFils={r.deposit_fixed_fils}
                adminNotes={r.admin_notes}
                canEdit={session.role === "admin"}
                openLink={open ? { url: open.checkout_url, amountFils: open.requested_amount_fils, expiresAt: open.expires_at } : null}
                testMode={process.env.PAYMENT_PROVIDER === undefined || process.env.PAYMENT_PROVIDER === "mock"}
              />
            </div>
          </div>
        );
      }}
    </StaffGate>
  );
}
