import { business, formatPhone } from "@/config/business";
import { siteUrl } from "@/lib/env.public";
import type { Brand } from "@/lib/notifications/templates";

/** Business identity used in emails. */
export function emailBrand(): Brand {
  return { nameEn: business.name.en, nameAr: business.name.ar, phone: formatPhone(business.phone), siteUrl: siteUrl() };
}

/** True when the database connection is configured (otherwise forms fall back to WhatsApp). */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
