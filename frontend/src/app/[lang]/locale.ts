import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

/** Validates the [lang] segment (unknown languages are a 404) and loads its dictionary. */
export async function resolveLocale(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const locale: Locale = lang;
  return { locale, dict: await getDictionary(locale) };
}
