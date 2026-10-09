import type { Metadata } from "next";
import { CateringForm } from "@/components/catering/catering-form";
import { cateringPackages, packageStartingFils } from "@/data/catalog";
import { interpolate } from "@/i18n/dictionary";
import { pageMetadata } from "@/i18n/seo";
import { formatAed } from "@/lib/domain/money";
import { resolveLocale } from "../locale";

export async function generateMetadata({ params }: PageProps<"/[lang]/catering">): Promise<Metadata> {
  const { locale, dict } = await resolveLocale(params);
  return pageMetadata({
    locale,
    path: "/catering",
    title: dict.meta.cateringTitle,
    description: dict.meta.cateringDescription,
    siteName: dict.meta.siteName,
  });
}

export default async function CateringPage({ params }: PageProps<"/[lang]/catering">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.catering;
  const ar = locale === "ar";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] text-indigo">{t.title}</h1>
      <p className="mt-3 max-w-[58ch] text-lg text-date">{t.lead}</p>

      <section aria-labelledby="packages-title" className="mt-14">
        <h2 id="packages-title" className="font-display text-3xl text-madder">
          {t.packagesTitle}
        </h2>
        <ul className="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          {cateringPackages.map((pkg) => (
            <li key={pkg.id} id={pkg.id} className="flex scroll-mt-8 flex-col bg-white">
              <div className="sadu-band sadu-band--thin" aria-hidden="true" />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl text-indigo">{ar ? pkg.nameAr : pkg.nameEn}</h3>
                <p className="mt-1 font-semibold text-madder">
                  {pkg.maximumGuests
                    ? interpolate(t.guestRange, { min: pkg.minimumGuests, max: pkg.maximumGuests })
                    : interpolate(t.guestMin, { min: pkg.minimumGuests })}
                </p>
                <p className="mt-4">{ar ? pkg.descriptionAr : pkg.descriptionEn}</p>
                <h4 className="mt-5 font-semibold text-indigo">{t.includes}</h4>
                <ul className="mt-2 list-disc ps-5 text-date marker:text-saffron">
                  {(ar ? pkg.includedAr : pkg.includedEn).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="mt-auto pt-6 text-sm text-date">
                  <span className="tabular">
                    {interpolate(t.startingFrom, { price: formatAed(packageStartingFils(pkg), locale), min: pkg.minimumGuests })}
                  </span>
                  <br />
                  {ar ? pkg.termsAr : pkg.termsEn}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-20 grid gap-14 md:grid-cols-[0.8fr_1.2fr]">
        <section aria-labelledby="how-title">
          <h2 id="how-title" className="font-display text-3xl text-madder">
            {t.howTitle}
          </h2>
          <p className="mt-4 font-semibold">{t.howLead}</p>
          {/* A real sequence, so it is a numbered list. */}
          <ol className="mt-8 flex flex-col gap-6">
            {t.steps.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span
                  aria-hidden="true"
                  className={`tabular flex size-10 items-center justify-center rounded-full font-display text-lg ${
                    i === t.steps.length - 1 ? "bg-palm text-plaster" : "border-2 border-indigo text-indigo"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-indigo">{step.title}</h3>
                  <p className="mt-1 text-date">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="form-title" className="bg-plaster-deep p-6 sm:p-8">
          <h2 id="form-title" className="font-display text-3xl text-indigo">
            {t.formTitle}
          </h2>
          <p id="catering-form-lead" className="mt-3 text-date">
            {t.formLead}
          </p>
          <div className="mt-8">
            <CateringForm locale={locale} packages={cateringPackages} t={t} errors={dict.errors} />
          </div>
        </section>
      </div>
    </div>
  );
}
