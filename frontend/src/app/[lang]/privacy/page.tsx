import type { Metadata } from "next";
import { pageMetadata } from "@/i18n/seo";
import { resolveLocale } from "../locale";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { locale, dict } = await resolveLocale(params);
  return pageMetadata({ locale, path: "/privacy", title: dict.meta.privacyTitle, description: dict.meta.privacyDescription, siteName: dict.meta.siteName });
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { dict } = await resolveLocale(params);
  const t = dict.privacy;
  return (
    <article className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 md:pt-16">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.25rem)] text-indigo">{t.title}</h1>
      <p className="mt-4 border-s-4 border-saffron bg-plaster-deep p-4 font-semibold">{t.draft}</p>
      {t.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="font-display text-2xl text-madder">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 max-w-[68ch]">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
