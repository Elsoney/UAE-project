import type { Metadata, Viewport } from "next";
import { ContactBar } from "@/components/site/contact-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { direction, locales } from "@/i18n/config";
import { siteUrl } from "@/lib/env.public";
import { fontVariables } from "../fonts";
import "../globals.css";
import { resolveLocale } from "./locale";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { dict } = await resolveLocale(params);
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: dict.meta.siteName,
    title: { default: dict.meta.homeTitle, template: `%s` },
    description: dict.meta.homeDescription,
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#8e2424",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <html lang={locale} dir={direction(locale)} className={`${fontVariables} h-full antialiased`} data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col pb-14 md:pb-0">
        <SiteHeader locale={locale} dict={dict} />
        <main id="main" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter locale={locale} dict={dict} />
        <ContactBar locale={locale} actions={dict.actions} />
      </body>
    </html>
  );
}
