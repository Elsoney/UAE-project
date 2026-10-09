import type { Metadata } from "next";
import { HoursList } from "@/components/contact/hours-list";
import { JsonLd } from "@/components/json-ld";
import { ChatIcon, PhoneIcon } from "@/components/site/contact-bar";
import { ButtonLink } from "@/components/ui/button-link";
import { business, formatAddress, formatPhone, mapsDirectionsLink, mapsPlaceLink, telLink, whatsappLink } from "@/config/business";
import { pageMetadata, restaurantJsonLd } from "@/i18n/seo";
import { resolveLocale } from "../locale";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { locale, dict } = await resolveLocale(params);
  return pageMetadata({ locale, path: "/contact", title: dict.meta.contactTitle, description: dict.meta.contactDescription, siteName: dict.meta.siteName });
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { locale, dict } = await resolveLocale(params);
  const t = dict.contact;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <JsonLd data={restaurantJsonLd(locale, dict.meta.contactDescription)} />
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] text-indigo">{t.title}</h1>
      <p className="mt-3 text-lg text-date">{t.lead}</p>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <dl className="flex flex-col gap-8">
          <div>
            <dt className="font-display text-xl text-madder">{t.address}</dt>
            <dd className="mt-2 text-lg">
              <address className="not-italic">{formatAddress(locale)}</address>
              <a href={mapsPlaceLink()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-indigo underline underline-offset-4">
                {t.openInMaps}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-display text-xl text-madder">{t.phone}</dt>
            <dd className="mt-2 text-lg">
              <a href={telLink()} dir="ltr" className="tabular underline underline-offset-4">
                {formatPhone(business.phone)}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-display text-xl text-madder">{dict.actions.whatsapp}</dt>
            <dd className="mt-2 text-lg">
              <a href={whatsappLink(locale)} target="_blank" rel="noopener noreferrer" dir="ltr" className="tabular underline underline-offset-4">
                {formatPhone(business.whatsapp)}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-display text-xl text-madder">{t.email}</dt>
            <dd className="mt-2 text-lg">
              <a href={`mailto:${business.email}`} dir="ltr" className="underline underline-offset-4">
                {business.email}
              </a>
            </dd>
          </div>
        </dl>

        <div>
          <h2 className="font-display text-xl text-madder">{t.hours}</h2>
          <div className="mt-3 text-lg">
            <HoursList days={t.days} />
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={mapsDirectionsLink()} external>
              {dict.actions.directions}
            </ButtonLink>
            <ButtonLink href={telLink()} external variant="secondary">
              <PhoneIcon />
              {dict.actions.callUs}
            </ButtonLink>
            <ButtonLink href={whatsappLink(locale)} external variant="whatsapp">
              <ChatIcon />
              {dict.actions.whatsapp}
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
