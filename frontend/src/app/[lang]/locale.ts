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

/**
 * Locale from the root [lang] segment only. Safe to read outside <Suspense>
 * on pages whose other parameters (e.g. a record id) are known only at request time.
 */
export async function resolveRootLocale() {
  const { lang } = await import("next/root-params");
  return resolveLocale(Promise.resolve({ lang: (await lang()) ?? "" }));
}
