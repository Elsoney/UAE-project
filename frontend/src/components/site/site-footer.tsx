import Link from "next/link";
import { business, formatAddress, formatPhone, isPlaceholderBusinessInfo, telLink } from "@/config/business";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { navItems } from "./site-header";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-24 bg-indigo text-plaster">
      <div className="sadu-band sadu-band--thin" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl text-saffron">{business.name[locale]}</p>
          <p className="mt-3 max-w-sm text-plaster/80">{formatAddress(locale)}</p>
          <p className="mt-2">
            <a href={telLink()} className="tabular underline decoration-saffron/60 underline-offset-4 hover:decoration-saffron" dir="ltr">
              {formatPhone(business.phone)}
            </a>
          </p>
        </div>
        <nav aria-label={dict.nav.mainNavigation}>
          <ul className="flex flex-col gap-2">
            {navItems(locale, dict.nav).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-saffron">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${locale}/privacy`} className="hover:text-saffron">
                {dict.footer.privacy}
              </Link>
            </li>
          </ul>
        </nav>
        {isPlaceholderBusinessInfo && <p className="text-sm text-plaster/70">{dict.footer.placeholderNotice}</p>}
      </div>
      <p className="border-t border-plaster/10 px-4 py-5 text-center text-sm text-plaster/60">
        © {business.name[locale]}
      </p>
    </footer>
  );
}
