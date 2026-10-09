/**
 * Money in AED, represented as integer fils (1 AED = 100 fils).
 *
 * Floating-point amounts are never stored or used in calculations. The only
 * division by 100 happens when formatting for display.
 *
 * Rounding rule (shared with the database CHECK on payment_requests):
 * percentages are applied with ROUND HALF UP to the nearest fil.
 */

export type Fils = number;

export const FILS_PER_AED = 100;
export const CURRENCY = "AED" as const;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Throws unless `value` is a non-negative safe integer number of fils. */
export function assertFils(value: number, label = "amount"): asserts value is Fils {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative whole number of fils`);
  }
}

/** Parses an AED amount typed by a person ("12", "12.5", "12.50") into fils, exactly. */
export function parseAed(input: string): Fils {
  const value = input.trim().replace(/,/g, "");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new MoneyError(`"${input}" is not a valid AED amount`);
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * FILS_PER_AED + fraction;
}

/** Plain decimal string, e.g. 1250 -> "12.50". */
export function filsToAedString(fils: Fils): string {
  assertFils(fils);
  const whole = Math.floor(fils / FILS_PER_AED);
  const fraction = String(fils % FILS_PER_AED).padStart(2, "0");
  return `${whole}.${fraction}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Localised currency string, e.g. "AED 12.50" (en) / "١٢٫٥٠ د.إ.‏" (ar). */
export function formatAed(fils: Fils, locale: "ar" | "en"): string {
  assertFils(fils);
  const tag = locale === "ar" ? "ar-AE" : "en-AE";
  let formatter = formatters.get(tag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(tag, formatter);
  }
  return formatter.format(fils / FILS_PER_AED);
}

export function addFils(...amounts: Fils[]): Fils {
  let total = 0;
  for (const amount of amounts) {
    assertFils(amount);
    total += amount;
  }
  assertFils(total, "total");
  return total;
}

/** a - b; throws if the result would be negative. */
export function subtractFils(a: Fils, b: Fils): Fils {
  assertFils(a);
  assertFils(b);
  if (b > a) throw new MoneyError("result would be negative");
  return a - b;
}

export function multiplyFils(unit: Fils, quantity: number): Fils {
  assertFils(unit, "unit price");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new MoneyError("quantity must be a non-negative whole number");
  }
  const result = unit * quantity;
  assertFils(result, "line total");
  return result;
}

/**
 * Converts a percentage with at most two decimals (e.g. 12.5) to basis points
 * (1250). Throws for anything finer, so 12.345% is rejected rather than rounded.
 */
export function percentToBasisPoints(percent: number): number {
  if (!Number.isFinite(percent)) throw new MoneyError("percentage must be a number");
  const bp = Math.round(percent * 100);
  if (Math.abs(percent * 100 - bp) > 1e-6) {
    throw new MoneyError("percentage may have at most two decimal places");
  }
  return bp;
}

/** `percent`% of `amount`, rounded half up to the fil. 0 <= percent <= 100. */
export function percentOf(amount: Fils, percent: number): Fils {
  assertFils(amount);
  const bp = percentToBasisPoints(percent);
  if (bp < 0 || bp > 10_000) throw new MoneyError("percentage must be between 0 and 100");
  // BigInt keeps the intermediate product exact for any realistic amount.
  return Number((BigInt(amount) * BigInt(bp) + BigInt(5_000)) / BigInt(10_000));
}
