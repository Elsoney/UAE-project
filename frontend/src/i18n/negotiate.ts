/**
 * Chooses the language for a visitor who arrives without one in the URL:
 *   1. the language they picked before (NEXT_LOCALE cookie),
 *   2. otherwise the best match from the browser's Accept-Language,
 *   3. otherwise Arabic.
 */
import { defaultLocale, hasLocale, type Locale } from "./config";

/** Parses an Accept-Language header into primary language subtags, best first. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((x) => x.lang && x.lang !== "*" && x.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((x) => x.lang);
}

export function negotiateLocale(input: { cookie?: string | null; acceptLanguage?: string | null }): Locale {
  if (input.cookie && hasLocale(input.cookie)) return input.cookie;
  for (const lang of parseAcceptLanguage(input.acceptLanguage)) {
    if (hasLocale(lang)) return lang;
  }
  return defaultLocale;
}

/** Splits "/en/menu" into { locale: "en", rest: "/menu" }; locale is null when absent. */
export function splitLocalePath(pathname: string): { locale: Locale | null; rest: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (hasLocale(first)) return { locale: first, rest: `/${rest.join("/")}`.replace(/\/$/, "") || "" };
  return { locale: null, rest: pathname === "/" ? "" : pathname };
}

/** The same page in another language. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const { rest } = splitLocalePath(pathname);
  return `/${target}${rest}`;
}
