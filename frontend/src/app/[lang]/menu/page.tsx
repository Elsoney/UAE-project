import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { ChatIcon, PhoneIcon } from "@/components/site/contact-bar";
import { ButtonLink } from "@/components/ui/button-link";
import { telLink, whatsappLink } from "@/config/business";
import { categories, menuItems } from "@/data/catalog";
import { pageMetadata } from "@/i18n/seo";
import { resolveLocale } from "../locale";

export async function generateMetadata({ params }: PageProps<"/[lang]/menu">): Promise<Metadata> {
  const { locale, dict } = await resolveLocale(params);
  return pageMetadata({ locale, path: "/menu", title: dict.meta.menuTitle, description: dict.meta.menuDescription, siteName: dict.meta.siteName });
}

export default async function MenuPage({ params }: PageProps<"/[lang]/menu">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] text-indigo">{dict.menu.title}</h1>
      <p className="mt-3 text-lg text-date">{dict.menu.lead}</p>

      <div className="mt-6 flex flex-col gap-4 border-s-4 border-saffron bg-plaster-deep p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[55ch]">{dict.menu.orderingNote}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ButtonLink href={telLink()} external variant="secondary" className="min-h-11 px-5">
            <PhoneIcon />
            {dict.actions.callUs}
          </ButtonLink>
          <ButtonLink href={whatsappLink(locale)} external variant="whatsapp" className="min-h-11 px-5">
            <ChatIcon />
            {dict.actions.whatsapp}
          </ButtonLink>
        </div>
      </div>

      <div className="mt-10">
        <MenuBrowser
          locale={locale}
          categories={categories}
          items={menuItems}
          labels={{
            searchLabel: dict.menu.searchLabel,
            searchPlaceholder: dict.menu.searchPlaceholder,
            filterLabel: dict.menu.filterLabel,
            allCategories: dict.menu.allCategories,
            unavailable: dict.menu.unavailable,
            noResults: dict.menu.noResults,
            showEverything: dict.menu.showEverything,
          }}
        />
      </div>
    </div>
  );
}
