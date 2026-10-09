import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/i18n/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/ar/admin", "/en/admin", "/ar/mock-checkout", "/en/mock-checkout", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
