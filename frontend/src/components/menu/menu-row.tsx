import type { MenuItem } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { formatAed } from "@/lib/domain/money";

/** One line of the printed menu: name … dotted leader … price, description below. */
export function MenuRow({
  item,
  locale,
  unavailableLabel,
  tone = "light",
}: {
  item: MenuItem;
  locale: Locale;
  unavailableLabel: string;
  tone?: "light" | "dark";
}) {
  const name = locale === "ar" ? item.nameAr : item.nameEn;
  const description = locale === "ar" ? item.descriptionAr : item.descriptionEn;
  const dark = tone === "dark";
  return (
    <li className={item.isAvailable ? "" : "opacity-60"}>
      <div className="flex items-baseline">
        <h3 className={`font-display text-xl ${dark ? "text-plaster" : "text-indigo"}`}>{name}</h3>
        <span className="menu-leader" aria-hidden="true" />
        <span className={`tabular shrink-0 font-semibold ${dark ? "text-saffron" : "text-madder"}`}>
          {formatAed(item.priceFils, locale)}
        </span>
      </div>
      <p className={`mt-1 max-w-[60ch] text-[0.95rem] ${dark ? "text-plaster/75" : "text-date"}`}>{description}</p>
      {!item.isAvailable && (
        <p className={`mt-1 text-sm font-semibold ${dark ? "text-saffron" : "text-madder"}`}>{unavailableLabel}</p>
      )}
    </li>
  );
}
