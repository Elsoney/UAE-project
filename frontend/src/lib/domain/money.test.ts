import { describe, expect, it } from "vitest";
import {
  MoneyError,
  addFils,
  assertFils,
  filsToAedString,
  formatAed,
  multiplyFils,
  parseAed,
  percentOf,
  percentToBasisPoints,
  subtractFils,
} from "./money";

describe("money (AED fils)", () => {
  it("parses typed AED amounts exactly", () => {
    expect(parseAed("12")).toBe(1200);
    expect(parseAed("12.5")).toBe(1250);
    expect(parseAed("12.05")).toBe(1205);
    expect(parseAed(" 1,250.00 ")).toBe(125000);
    expect(parseAed("0.01")).toBe(1);
  });

  it.each(["", "abc", "-1", "1.234", "1e3", "12.", ".5"])("rejects invalid amount %j", (input) => {
    expect(() => parseAed(input)).toThrow(MoneyError);
  });

  it("formats fils as a plain decimal string", () => {
    expect(filsToAedString(0)).toBe("0.00");
    expect(filsToAedString(5)).toBe("0.05");
    expect(filsToAedString(123456)).toBe("1234.56");
  });

  it("formats localised currency for Arabic and English", () => {
    const en = formatAed(4200, "en");
    expect(en).toContain("42.00");
    expect(en).toContain("AED");
    const ar = formatAed(4200, "ar");
    expect(ar).not.toBe(en);
    expect(ar).toMatch(/د\.إ|AED/);
    // cached formatter returns the same result
    expect(formatAed(4200, "ar")).toBe(ar);
  });

  it("only accepts non-negative whole fils", () => {
    expect(() => assertFils(-1)).toThrow(MoneyError);
    expect(() => assertFils(1.5)).toThrow(MoneyError);
    expect(() => assertFils(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyError);
    expect(() => assertFils(0)).not.toThrow();
  });

  it("adds, subtracts and multiplies without floats", () => {
    expect(addFils(10, 20, 30)).toBe(60);
    expect(addFils()).toBe(0);
    expect(subtractFils(100, 40)).toBe(60);
    expect(() => subtractFils(40, 100)).toThrow(/negative/);
    expect(multiplyFils(1250, 3)).toBe(3750);
    expect(() => multiplyFils(1250, -1)).toThrow(MoneyError);
    expect(() => multiplyFils(1250, 1.5)).toThrow(MoneyError);
    expect(() => addFils(Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyError);
  });

  it("rounds percentages half up to the fil (same rule as the database)", () => {
    expect(percentOf(33333, 12.5)).toBe(4167); // 4166.625 -> 4167
    expect(percentOf(1000, 33.33)).toBe(333); // 333.3 -> 333
    expect(percentOf(1, 50)).toBe(1); // 0.5 -> 1 (half up)
    expect(percentOf(3, 50)).toBe(2); // 1.5 -> 2
    expect(percentOf(300000, 100)).toBe(300000);
    expect(percentOf(300000, 0)).toBe(0);
    // no floating-point drift on awkward values
    expect(percentOf(10, 0.1)).toBe(0);
    expect(percentOf(999_999_999, 99.99)).toBe(999_899_999);
  });

  it("rejects percentages outside 0..100 or finer than two decimals", () => {
    expect(() => percentOf(100, 101)).toThrow(/between 0 and 100/);
    expect(() => percentOf(100, -1)).toThrow(/between 0 and 100/);
    expect(() => percentToBasisPoints(12.345)).toThrow(/two decimal/);
    expect(() => percentToBasisPoints(Number.NaN)).toThrow(/number/);
    expect(percentToBasisPoints(12.5)).toBe(1250);
    expect(percentToBasisPoints(0.07)).toBe(7);
  });
});
