"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, otherLocale, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/negotiate";

/** Links to the same page in the other language and remembers the choice. */
export function LanguageSwitcher({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const target = otherLocale(locale);

  return (
    <Link
      href={switchLocalePath(pathname, target)}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex min-h-11 items-center rounded-full border-2 border-indigo/15 px-4 text-sm font-semibold text-indigo transition-colors hover:border-madder hover:text-madder"
    >
      {label}
    </Link>
  );
}
