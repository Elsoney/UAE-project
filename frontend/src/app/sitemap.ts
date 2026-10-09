import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { absoluteUrl, localeAlternates, publicPaths } from "@/i18n/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${path}`),
      changeFrequency: path === "/privacy" ? ("yearly" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path === "/privacy" ? 0.2 : 0.8,
      alternates: { languages: localeAlternates(path) },
    })),
  );
}
