import Link from "next/link";
import { Suspense } from "react";
import { otherLocale } from "@/i18n/config";
import { business } from "@/config/business";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";

export function navItems(locale: Locale, nav: Dictionary["nav"]): NavItem[] {
  return [
    { href: `/${locale}/menu`, label: nav.menu },
    { href: `/${locale}/catering`, label: nav.catering },
    { href: `/${locale}/contact`, label: nav.contact },
  ];
}

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const items = navItems(locale, dict.nav);
  return (
    <header className="relative bg-plaster">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo focus:px-4 focus:py-2 focus:text-plaster"
      >
        {dict.nav.skipToContent}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={`/${locale}`} className="group flex items-baseline gap-3" aria-label={`${business.name[locale]} — ${dict.nav.home}`}>
          <span className="font-display text-3xl leading-none text-madder sm:text-4xl">{business.name[locale]}</span>
          <span className="hidden text-sm text-date sm:inline">{business.tagline[locale]}</span>
        </Link>
        <nav aria-label={dict.nav.mainNavigation} className="hidden md:block">
          {/* The current page is only known at request time on some routes. */}
          <Suspense fallback={<StaticNav items={items} />}>
            <NavLinks items={items} className="flex items-center gap-7" />
          </Suspense>
        </nav>
        <div className="flex items-center gap-2">
          <Suspense
            fallback={
              <Link href={`/${otherLocale(locale)}`} hrefLang={otherLocale(locale)} lang={otherLocale(locale)} className="inline-flex min-h-11 items-center rounded-full border-2 border-indigo/15 px-4 text-sm font-semibold">
                {dict.nav.switchLanguage}
              </Link>
            }
          >
            <LanguageSwitcher locale={locale} label={dict.nav.switchLanguage} ariaLabel={dict.nav.switchLanguageLabel} />
          </Suspense>
          <Suspense fallback={null}>
            <MobileNav items={items} openLabel={dict.nav.openMenu} closeLabel={dict.nav.closeMenu} navLabel={dict.nav.mainNavigation} />
          </Suspense>
        </div>
      </div>
      <div className="sadu-band" aria-hidden="true" />
    </header>
  );
}

function StaticNav({ items }: { items: NavItem[] }) {
  return (
    <ul className="flex items-center gap-7">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="inline-flex min-h-11 items-center px-1 font-semibold text-indigo hover:text-madder">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
