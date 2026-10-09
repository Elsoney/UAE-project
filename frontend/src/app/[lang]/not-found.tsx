import Link from "next/link";
import { buttonClass } from "@/components/ui/button-link";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { lang } from "next/root-params";

export default async function NotFound() {
  const value = await lang();
  const locale = value && hasLocale(value) ? value : defaultLocale;
  const dict = await getDictionary(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl text-indigo">{dict.notFound.title}</h1>
      <p className="mt-4 text-lg text-date">{dict.notFound.body}</p>
      <Link href={`/${locale}`} className={`${buttonClass("primary")} mt-8`}>
        {dict.notFound.home}
      </Link>
    </div>
  );
}
