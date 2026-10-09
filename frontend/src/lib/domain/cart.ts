/**
 * Server-side cart pricing (PRD P0-F004).
 *
 * Prices always come from the catalog lookup passed in by the server — never
 * from the browser. Inactive or unavailable items cannot be ordered; the
 * customer is told which ones and the total is recalculated (PRD §11).
 * Totals satisfy the database rule: total = subtotal - discount + delivery fee.
 */
import { type Fils, addFils, assertFils, multiplyFils, subtractFils } from "./money";

export const MAX_QUANTITY_PER_LINE = 50;
export const MAX_LINES = 30;

export type CatalogItem = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceFils: Fils;
  isActive: boolean;
  isAvailable: boolean;
};

export type CartLineInput = { menuItemId: string; quantity: number };

export type PricedLine = {
  menuItemId: string;
  nameEn: string;
  nameAr: string;
  quantity: number;
  unitPriceFils: Fils;
  totalPriceFils: Fils;
};

export type CartIssue = {
  menuItemId: string;
  code: "not_found" | "inactive" | "unavailable" | "invalid_quantity";
};

export type PricedCart =
  | {
      ok: true;
      lines: PricedLine[];
      subtotalFils: Fils;
      discountFils: Fils;
      deliveryFeeFils: Fils;
      totalFils: Fils;
    }
  | { ok: false; issues: CartIssue[] };

/** Combines repeated items into one line each, keeping first-seen order. */
export function mergeLines(lines: readonly CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.menuItemId, (merged.get(line.menuItemId) ?? 0) + line.quantity);
  return [...merged].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

export function priceCart(
  input: readonly CartLineInput[],
  catalog: ReadonlyMap<string, CatalogItem>,
  options: { discountFils?: Fils; deliveryFeeFils?: Fils } = {},
): PricedCart {
  const discountFils = options.discountFils ?? 0;
  const deliveryFeeFils = options.deliveryFeeFils ?? 0;
  assertFils(discountFils, "discount");
  assertFils(deliveryFeeFils, "delivery fee");

  const issues: CartIssue[] = [];
  const lines: PricedLine[] = [];
  const merged = mergeLines(input);
  if (merged.length === 0 || merged.length > MAX_LINES) {
    return { ok: false, issues: [{ menuItemId: "", code: "invalid_quantity" }] };
  }

  for (const { menuItemId, quantity } of merged) {
    const item = catalog.get(menuItemId);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      issues.push({ menuItemId, code: "invalid_quantity" });
      continue;
    }
    if (!item) {
      issues.push({ menuItemId, code: "not_found" });
      continue;
    }
    if (!item.isActive) {
      issues.push({ menuItemId, code: "inactive" });
      continue;
    }
    if (!item.isAvailable) {
      issues.push({ menuItemId, code: "unavailable" });
      continue;
    }
    lines.push({
      menuItemId,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      quantity,
      unitPriceFils: item.priceFils,
      totalPriceFils: multiplyFils(item.priceFils, quantity),
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const subtotalFils = addFils(...lines.map((l) => l.totalPriceFils));
  if (discountFils > subtotalFils) {
    throw new RangeError("discount cannot exceed the subtotal");
  }
  const totalFils = addFils(subtractFils(subtotalFils, discountFils), deliveryFeeFils);
  return { ok: true, lines, subtotalFils, discountFils, deliveryFeeFils, totalFils };
}
