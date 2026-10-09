import Link from "next/link";
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
          <NavLinks items={items} className="flex items-center gap-7" />
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.nav.switchLanguage} ariaLabel={dict.nav.switchLanguageLabel} />
          <MobileNav items={items} openLabel={dict.nav.openMenu} closeLabel={dict.nav.closeMenu} navLabel={dict.nav.mainNavigation} />
        </div>
      </div>
      <div className="sadu-band" aria-hidden="true" />
    </header>
  );
}
