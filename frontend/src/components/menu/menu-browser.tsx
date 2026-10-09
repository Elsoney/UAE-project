"use client";

import { useId, useMemo, useState } from "react";
import type { Category, MenuItem } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { interpolate } from "@/i18n/dictionary";
import { MenuRow } from "./menu-row";

type Labels = {
  searchLabel: string;
  searchPlaceholder: string;
  filterLabel: string;
  allCategories: string;
  unavailable: string;
  noResults: string;
  showEverything: string;
};

/** Arabic-insensitive matching: ignores diacritics, tatweel and alef/yaa/taa-marbuta variants. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function MenuBrowser({ locale, categories, items, labels }: { locale: Locale; categories: Category[]; items: MenuItem[]; labels: Labels }) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visible = useMemo(() => {
    const q = normalize(query);
    return items.filter(
      (item) =>
        item.isActive &&
        (category === null || item.categoryId === category) &&
        (!q || normalize(`${item.nameAr} ${item.nameEn} ${item.descriptionAr} ${item.descriptionEn}`).includes(q)),
    );
  }, [items, category, query]);

  const groups = categories
    .map((c) => ({ category: c, items: visible.filter((i) => i.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border-2 px-4 font-semibold transition-colors ${
      active ? "border-madder bg-madder text-plaster" : "border-rule bg-plaster text-indigo hover:border-madder"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-5 border-b-2 border-rule pb-6 md:flex-row md:items-end md:justify-between">
        <div role="group" aria-label={labels.filterLabel} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chip(category === null)}>
            {labels.allCategories}
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={chip(category === c.id)}>
              {locale === "ar" ? c.nameAr : c.nameEn}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 md:w-72">
          <label htmlFor={searchId} className="font-semibold">
            {labels.searchLabel}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="min-h-11 rounded-lg border-2 border-rule bg-white px-3 text-indigo placeholder:text-date/60 focus:border-indigo"
          />
        </div>
      </div>

      <div aria-live="polite">
        {groups.length === 0 ? (
          <div className="py-12">
            <p className="text-lg">{interpolate(labels.noResults, { query })}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="mt-4 font-semibold text-madder underline underline-offset-4"
            >
              {labels.showEverything}
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.category.id} aria-labelledby={`cat-${g.category.id}`} className="pt-10">
              <h2 id={`cat-${g.category.id}`} className="font-display text-2xl text-madder">
                {locale === "ar" ? g.category.nameAr : g.category.nameEn}
              </h2>
              <ul className="mt-5 grid gap-x-14 gap-y-6 md:grid-cols-2">
                {g.items.map((item) => (
                  <MenuRow key={item.id} item={item} locale={locale} unavailableLabel={labels.unavailable} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
