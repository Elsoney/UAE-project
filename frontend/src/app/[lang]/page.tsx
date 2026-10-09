import type { Metadata } from "next";
import Link from "next/link";
import { HoursList } from "@/components/contact/hours-list";
import { JsonLd } from "@/components/json-ld";
import { MenuRow } from "@/components/menu/menu-row";
import { ChatIcon } from "@/components/site/contact-bar";
import { ButtonLink } from "@/components/ui/button-link";
import { formatAddress, mapsDirectionsLink, whatsappLink } from "@/config/business";
import { cateringPackages, menuItems } from "@/data/catalog";
import { interpolate } from "@/i18n/dictionary";
import { pageMetadata, restaurantJsonLd } from "@/i18n/seo";
import { resolveLocale } from "./locale";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { locale, dict } = await resolveLocale(params);
  return pageMetadata({ locale, path: "", title: dict.meta.homeTitle, description: dict.meta.homeDescription, siteName: dict.meta.siteName });
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { locale, dict } = await resolveLocale(params);
  const signature = menuItems.filter((i) => i.isSignature && i.isActive);

  return (
    <>
      <JsonLd data={restaurantJsonLd(locale, dict.meta.homeDescription)} />

      {/* Hero: the house menu board is the most characteristic thing in this world. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.15] text-indigo">{dict.home.heroTitle}</h1>
          <p className="mt-6 max-w-[46ch] text-lg text-date">{dict.home.heroLead}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`/${locale}/catering`}>{dict.actions.requestCatering}</ButtonLink>
            <ButtonLink href={`/${locale}/menu`} variant="secondary">
              {dict.actions.seeMenu}
            </ButtonLink>
          </div>
        </div>

        <aside aria-labelledby="signature-title" className="relative bg-indigo text-plaster shadow-[12px_12px_0_var(--madder)] rtl:shadow-[-12px_12px_0_var(--madder)]">
          <div className="sadu-band sadu-band--thin sadu-band--flush" aria-hidden="true" />
          <div className="px-6 pb-8 pt-6 sm:px-8">
            <h2 id="signature-title" className="font-display text-2xl text-saffron">
              {dict.home.signatureTitle}
            </h2>
            <ul className="mt-6 flex flex-col gap-5">
              {signature.map((item) => (
                <MenuRow key={item.id} item={item} locale={locale} unavailableLabel={dict.menu.unavailable} tone="dark" />
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section aria-labelledby="catering-title" className="bg-plaster-deep">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <h2 id="catering-title" className="font-display text-3xl text-madder sm:text-4xl">
              {dict.home.cateringTitle}
            </h2>
            <p className="mt-5 max-w-[52ch] text-lg">{dict.home.cateringLead}</p>
            <ButtonLink href={`/${locale}/catering`} className="mt-8">
              {dict.actions.requestCatering}
            </ButtonLink>
          </div>
          <ul className="flex flex-col divide-y-2 divide-rule border-y-2 border-rule">
            {cateringPackages.map((pkg) => (
              <li key={pkg.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5">
                <Link href={`/${locale}/catering#${pkg.id}`} className="font-display text-2xl text-indigo hover:text-madder">
                  {locale === "ar" ? pkg.nameAr : pkg.nameEn}
                </Link>
                <span className="text-date">
                  {pkg.maximumGuests
                    ? interpolate(dict.catering.guestRange, { min: pkg.minimumGuests, max: pkg.maximumGuests })
                    : interpolate(dict.catering.guestMin, { min: pkg.minimumGuests })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="visit-title" className="mx-auto grid max-w-6xl gap-10 px-4 pt-16 sm:px-6 md:grid-cols-2 md:pt-20">
        <div>
          <h2 id="visit-title" className="font-display text-3xl text-indigo sm:text-4xl">
            {dict.home.visitTitle}
          </h2>
          <p className="mt-5 text-lg">{formatAddress(locale)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={mapsDirectionsLink()} external variant="secondary">
              {dict.actions.directions}
            </ButtonLink>
            <ButtonLink href={whatsappLink(locale)} external variant="whatsapp">
              <ChatIcon />
              {dict.actions.whatsapp}
            </ButtonLink>
          </div>
        </div>
        <div>
          <h3 className="font-display text-xl text-madder">{dict.contact.hours}</h3>
          <div className="mt-4">
            <HoursList days={dict.contact.days} />
          </div>
        </div>
      </section>
    </>
  );
}
