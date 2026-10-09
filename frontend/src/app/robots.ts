import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/i18n/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/ar/admin", "/en/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
