import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MockPayButtons } from "@/components/checkout/mock-pay-buttons";
import type { Locale } from "@/i18n/config";
import { interpolate, type Dictionary } from "@/i18n/dictionary";
import { formatAed } from "@/lib/domain/money";
import { isDatabaseConfigured } from "@/lib/services/brand";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveRootLocale } from "../../locale";

export const metadata: Metadata = { title: "Umodai — test payment", robots: { index: false, follow: false } };

/** TEST-ONLY stand-in for the payment provider's hosted checkout page. */
export default async function MockCheckoutPage({ params }: PageProps<"/[lang]/mock-checkout/[id]">) {
  const { locale, dict } = await resolveRootLocale();
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p role="note" className="border-s-4 border-saffron bg-plaster-deep p-4 text-sm font-semibold">
        {dict.checkout.testBanner}
      </p>
      <h1 className="mt-8 font-display text-3xl text-indigo">{dict.checkout.title}</h1>
      <Suspense fallback={null}>
        <Checkout locale={locale} t={dict.checkout} params={params} />
      </Suspense>
    </div>
  );
}

async function Checkout({ locale, t, params }: { locale: Locale; t: Dictionary["checkout"]; params: Promise<{ id: string }> }) {
  await connection();
  if (!isDatabaseConfigured() || (process.env.PAYMENT_PROVIDER ?? "mock") !== "mock" || process.env.APP_ENV === "production") notFound();
  const { id } = await params;
  const { data } = await createSupabaseServiceClient()
    .from("payment_requests")
    .select("status, requested_amount_fils, expires_at, catering_requests(reference)")
    .eq("provider_checkout_id", id)
    .maybeSingle();
  if (!data) return <p className="mt-6">{t.notFound}</p>;
  const expired = data.expires_at !== null && new Date(data.expires_at) < new Date();
  const amount = formatAed(data.requested_amount_fils, locale);
  return (
    <div className="mt-6 flex flex-col gap-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 bg-white p-5">
        <dt className="text-date">{t.reference}</dt>
        <dd className="tabular font-semibold" dir="ltr">
          {data.catering_requests?.reference}
        </dd>
        <dt className="text-date">{t.amountDue}</dt>
        <dd className="tabular text-xl font-semibold text-madder">{amount}</dd>
      </dl>
      {data.status === "paid" ? (
        <div role="status" className="border-s-4 border-palm bg-white p-5">
          <h2 className="font-display text-2xl text-indigo">{t.paidTitle}</h2>
          <p className="mt-2">{t.paidBody}</p>
        </div>
      ) : data.status !== "pending" || expired ? (
        <p role="alert" className="border-s-4 border-madder bg-white p-4 font-semibold text-madder">
          {t.closed}
        </p>
      ) : (
        <MockPayButtons checkoutId={id} payLabel={interpolate(t.pay, { amount })} t={t} />
      )}
    </div>
  );
}
