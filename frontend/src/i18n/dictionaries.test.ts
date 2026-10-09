/**
 * Arabic and English must be complete and equivalent (owner §8): same keys,
 * no empty strings, real Arabic text, and every validation message defined.
 */
import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGE_KEYS } from "@/lib/domain/validation";
import ar from "./dictionaries/ar.json";
import en from "./dictionaries/en.json";
import { errorMessage, interpolate } from "./dictionary";

type Tree = { [key: string]: unknown };

function paths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => paths(v, `${prefix}[${i}]`))];
  if (value && typeof value === "object") {
    return Object.entries(value as Tree).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(leaves);
  if (value && typeof value === "object") return Object.values(value).flatMap(leaves);
  return [];
}

describe("dictionaries", () => {
  it("have exactly the same structure in Arabic and English", () => {
    expect(paths(ar).sort()).toEqual(paths(en).sort());
  });

  it("have no empty strings", () => {
    expect(leaves(ar).filter((s) => !s.trim())).toEqual([]);
    expect(leaves(en).filter((s) => !s.trim())).toEqual([]);
  });

  it("are written in Arabic for the Arabic site (not copied English)", () => {
    const arabicLetters = /[؀-ۿ]/;
    const englishOnly = leaves(ar).filter((s) => !arabicLetters.test(s));
    // Only the language switcher legitimately points to English.
    expect(englishOnly).toEqual(["English", "Read this page in English"]);
  });

  it("keep the same placeholders in both languages", () => {
    const placeholders = (d: unknown) => leaves(d).flatMap((s) => s.match(/\{\w+\}/g) ?? []).sort();
    expect(placeholders(ar)).toEqual(placeholders(en));
  });

  it("define every validation message the business rules can produce", () => {
    for (const key of VALIDATION_MESSAGE_KEYS) {
      const name = key.replace("errors.", "") as keyof typeof en.errors;
      expect(en.errors[name], key).toBeTruthy();
      expect(ar.errors[name], key).toBeTruthy();
      expect(errorMessage(ar.errors, key)).toBe(ar.errors[name]);
    }
  });

  it("interpolate values", () => {
    expect(interpolate(en.catering.guestRange, { min: 15, max: 40 })).toBe("15–40 guests");
    expect(interpolate(ar.catering.guestRange, { min: 15, max: 40 })).toBe("من 15 إلى 40 ضيفاً");
    expect(interpolate("{a} {b}", { a: 1 })).toBe("1 {b}");
  });

  it("never describe a catering request as booked on submission", () => {
    expect(en.catering.howLead).toMatch(/does not book/);
    expect(ar.catering.howLead).toMatch(/لا يثبّت/);
    expect(en.catering.submit).not.toMatch(/book|confirm/i);
  });
});
