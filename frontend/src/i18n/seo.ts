/**
 * Local SEO helpers (PRD P0-F012, owner §9): localised titles and
 * descriptions, canonical URLs, hreflang alternates (ar, en, x-default → ar)
 * and Restaurant structured data. Arabic and English pages point at each
 * other, so they are never treated as duplicate content.
 */
import type { Metadata } from "next";
import { business } from "@/config/business";
import { siteUrl } from "@/lib/env.public";
import { defaultLocale, locales, ogLocale, otherLocale, type Locale } from "./config";

/** Public pages, used by the sitemap and navigation. "" is the home page. */
export const publicPaths = ["", "/menu", "/catering", "/contact", "/privacy"] as const;
export type PublicPath = (typeof publicPaths)[number];

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path}`;
}

export function localeAlternates(path: PublicPath | string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = absoluteUrl(`/${l}${path}`);
  languages["x-default"] = absoluteUrl(`/${defaultLocale}${path}`);
  return languages;
}

export function pageMetadata(input: { locale: Locale; path: PublicPath | string; title: string; description: string; siteName: string }): Metadata {
  const url = absoluteUrl(`/${input.locale}${input.path}`);
  return {
    metadataBase: new URL(siteUrl()),
    title: input.title,
    description: input.description,
    alternates: { canonical: url, languages: localeAlternates(input.path) },
    openGraph: {
      type: "website",
      url,
      title: input.title,
      description: input.description,
      siteName: input.siteName,
      locale: ogLocale[input.locale],
      alternateLocale: [ogLocale[otherLocale(input.locale)]],
    },
    twitter: { card: "summary", title: input.title, description: input.description },
  };
}

const dayNames = {
  Saturday: "https://schema.org/Saturday",
  Sunday: "https://schema.org/Sunday",
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
} as const;

/** schema.org Restaurant for the home and contact pages. */
export function restaurantJsonLd(locale: Locale, description: string) {
  const address = business.address[locale];
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": absoluteUrl("/#restaurant"),
    name: business.name[locale],
    alternateName: business.name[otherLocale(locale)],
    url: absoluteUrl(`/${locale}`),
    telephone: business.phone,
    email: business.email,
    servesCuisine: [...business.cuisines],
    priceRange: business.priceRange,
    hasMenu: absoluteUrl(`/${locale}/menu`),
    acceptsReservations: false,
    inLanguage: locale,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.street}, ${address.area}`,
      addressLocality: address.city,
      addressRegion: business.region,
      addressCountry: business.postalCountry,
    },
    geo: { "@type": "GeoCoordinates", latitude: business.geo.latitude, longitude: business.geo.longitude },
    openingHoursSpecification: business.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => dayNames[d]),
      opens: h.opens,
      closes: h.closes,
    })),
    description,
  };
}
