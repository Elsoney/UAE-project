import { describe, expect, it } from "vitest";
import { MAX_LINES, MAX_QUANTITY_PER_LINE, mergeLines, priceCart, type CatalogItem } from "./cart";

const item = (id: string, priceFils: number, extra: Partial<CatalogItem> = {}): CatalogItem => ({
  id,
  nameEn: `Item ${id}`,
  nameAr: `صنف ${id}`,
  priceFils,
  isActive: true,
  isAvailable: true,
  ...extra,
});

const catalog = new Map<string, CatalogItem>([
  ["a", item("a", 4200)],
  ["b", item("b", 1800)],
  ["off", item("off", 1000, { isActive: false })],
  ["soldout", item("soldout", 1000, { isAvailable: false })],
]);

describe("server-side cart pricing", () => {
  it("prices lines from the catalog, ignoring anything the browser claims", () => {
    const cart = priceCart([{ menuItemId: "a", quantity: 2 }, { menuItemId: "b", quantity: 1 }], catalog);
    expect(cart).toEqual({
      ok: true,
      lines: [
        { menuItemId: "a", nameEn: "Item a", nameAr: "صنف a", quantity: 2, unitPriceFils: 4200, totalPriceFils: 8400 },
        { menuItemId: "b", nameEn: "Item b", nameAr: "صنف b", quantity: 1, unitPriceFils: 1800, totalPriceFils: 1800 },
      ],
      subtotalFils: 10200,
      discountFils: 0,
      deliveryFeeFils: 0,
      totalFils: 10200,
    });
  });

  it("applies discount and delivery fee: total = subtotal - discount + fee", () => {
    const cart = priceCart([{ menuItemId: "a", quantity: 1 }], catalog, { discountFils: 200, deliveryFeeFils: 1000 });
    expect(cart).toMatchObject({ ok: true, subtotalFils: 4200, totalFils: 5000 });
  });

  it("merges repeated items into one line", () => {
    expect(mergeLines([{ menuItemId: "a", quantity: 1 }, { menuItemId: "b", quantity: 1 }, { menuItemId: "a", quantity: 2 }])).toEqual([
      { menuItemId: "a", quantity: 3 },
      { menuItemId: "b", quantity: 1 },
    ]);
  });

  it("reports every inactive, unavailable, unknown or invalid line so the customer can fix the cart", () => {
    const cart = priceCart(
      [
        { menuItemId: "off", quantity: 1 },
        { menuItemId: "soldout", quantity: 1 },
        { menuItemId: "ghost", quantity: 1 },
        { menuItemId: "a", quantity: 0 },
      ],
      catalog,
    );
    expect(cart).toEqual({
      ok: false,
      issues: [
        { menuItemId: "off", code: "inactive" },
        { menuItemId: "soldout", code: "unavailable" },
        { menuItemId: "ghost", code: "not_found" },
        { menuItemId: "a", code: "invalid_quantity" },
      ],
    });
  });

  it("enforces the per-line quantity limit after merging", () => {
    const cart = priceCart([{ menuItemId: "a", quantity: MAX_QUANTITY_PER_LINE }, { menuItemId: "a", quantity: 1 }], catalog);
    expect(cart).toEqual({ ok: false, issues: [{ menuItemId: "a", code: "invalid_quantity" }] });
    expect(priceCart([{ menuItemId: "a", quantity: 1.5 }], catalog)).toMatchObject({ ok: false });
  });

  it("rejects an empty cart or too many lines", () => {
    expect(priceCart([], catalog)).toMatchObject({ ok: false });
    const many = Array.from({ length: MAX_LINES + 1 }, (_, i) => ({ menuItemId: `x${i}`, quantity: 1 }));
    expect(priceCart(many, catalog)).toMatchObject({ ok: false });
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(() => priceCart([{ menuItemId: "b", quantity: 1 }], catalog, { discountFils: 5000 })).toThrow(RangeError);
  });
});
