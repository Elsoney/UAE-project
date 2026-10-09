/**
 * Umodai business details — the single source of truth for contact
 * information shown on the site, in structured data and in emails.
 *
 * ⚠️ PLACEHOLDERS: every value marked TODO(owner) must be replaced with the
 * real, verified details before launch (PRD P0-F011: phone, hours and
 * location must match the Google Business Profile exactly).
 */
import type { Locale } from "@/i18n/config";

export const business = {
  name: { ar: "أمودي", en: "Umodai" },
  tagline: { ar: "مطعم وضيافة", en: "Restaurant & Catering" },
  // TODO(owner): real street address as registered on Google Business Profile.
  address: {
    ar: { street: "الشارع الرئيسي (عنوان مؤقت)", area: "النعيمية", city: "عجمان", country: "الإمارات العربية المتحدة" },
    en: { street: "Main Street (placeholder)", area: "Al Nuaimiya", city: "Ajman", country: "United Arab Emirates" },
  },
  postalCountry: "AE",
  region: "Ajman",
  // TODO(owner): exact map pin of the restaurant.
  geo: { latitude: 25.4052, longitude: 55.5136 },
  // TODO(owner): real numbers. Stored in E.164 for tel: and WhatsApp links.
  phone: "+97160000000",
  whatsapp: "+971500000000",
  // TODO(owner): real address.
  email: "hello@umodai.example",
  // TODO(owner): real opening hours (24h, Asia/Dubai).
  hours: [
    { days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "11:00", closes: "23:00" },
    { days: ["Friday"], opens: "13:00", closes: "23:30" },
  ],
  priceRange: "AED 20–80",
  cuisines: ["Emirati", "Middle Eastern"],
  // TODO(owner): official profile links.
  social: { instagram: null as string | null },
} as const;

export const isPlaceholderBusinessInfo = true;

export function formatPhone(e164: string): string {
  // +97160000000 -> +971 6 000 0000 ; +971500000000 -> +971 50 000 0000
  const m = /^\+971(5\d)(\d{3})(\d{4})$/.exec(e164) ?? /^\+971(\d)(\d{3})(\d{4})$/.exec(e164);
  return m ? `+971 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function telLink(e164: string = business.phone): string {
  return `tel:${e164}`;
}

export function whatsappLink(locale: Locale, message?: string): string {
  const greeting =
    message ?? (locale === "ar" ? "مرحباً أمودي، أود الاستفسار عن" : "Hello Umodai, I'd like to ask about");
  return `https://wa.me/${business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(greeting)}`;
}

export function mapsDirectionsLink(): string {
  const { latitude, longitude } = business.geo;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function mapsPlaceLink(): string {
  const { latitude, longitude } = business.geo;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function formatAddress(locale: Locale): string {
  const a = business.address[locale];
  return [a.street, a.area, a.city, a.country].join(locale === "ar" ? "، " : ", ");
}
