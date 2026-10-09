/**
 * Supported languages. Arabic is the default and the fallback (owner §8).
 * Arabic pages are right-to-left by construction, not a mirrored English page.
 */
export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** Cookie set by the language switcher; it takes priority over the browser language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function direction(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** BCP-47 tags for Intl formatting and Open Graph. */
export const intlLocale: Record<Locale, string> = { ar: "ar-AE", en: "en-AE" };
export const ogLocale: Record<Locale, string> = { ar: "ar_AE", en: "en_AE" };

export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}
