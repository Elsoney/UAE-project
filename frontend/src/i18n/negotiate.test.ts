import { describe, expect, it } from "vitest";
import { direction, hasLocale, otherLocale } from "./config";
import { negotiateLocale, parseAcceptLanguage, splitLocalePath, switchLocalePath } from "./negotiate";

describe("language negotiation", () => {
  it("defaults to Arabic", () => {
    expect(negotiateLocale({})).toBe("ar");
    expect(negotiateLocale({ acceptLanguage: "fr-FR,de;q=0.8" })).toBe("ar");
  });

  it("follows the browser language", () => {
    expect(negotiateLocale({ acceptLanguage: "en-GB,en;q=0.9" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "ar-AE,ar;q=0.9,en;q=0.8" })).toBe("ar");
    expect(negotiateLocale({ acceptLanguage: "fr;q=0.9, en;q=0.5" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "en;q=0.4, ar;q=0.6" })).toBe("ar");
  });

  it("prefers the visitor's earlier choice over the browser", () => {
    expect(negotiateLocale({ cookie: "en", acceptLanguage: "ar" })).toBe("en");
    expect(negotiateLocale({ cookie: "xx", acceptLanguage: "en" })).toBe("en");
  });

  it("parses Accept-Language robustly", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,ar;q=0.8,*;q=0.1")).toEqual(["en", "en", "ar"]);
    expect(parseAcceptLanguage("en;q=0, ar")).toEqual(["ar"]);
    expect(parseAcceptLanguage("en;q=abc")).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("localised paths", () => {
  it("splits and switches the language segment", () => {
    expect(splitLocalePath("/en/menu")).toEqual({ locale: "en", rest: "/menu" });
    expect(splitLocalePath("/ar")).toEqual({ locale: "ar", rest: "" });
    expect(splitLocalePath("/ar/")).toEqual({ locale: "ar", rest: "" });
    expect(splitLocalePath("/menu")).toEqual({ locale: null, rest: "/menu" });
    expect(splitLocalePath("/")).toEqual({ locale: null, rest: "" });
    expect(switchLocalePath("/en/catering", "ar")).toBe("/ar/catering");
    expect(switchLocalePath("/ar", "en")).toBe("/en");
  });

  it("knows each language's direction", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
    expect(otherLocale("ar")).toBe("en");
    expect(otherLocale("en")).toBe("ar");
    expect(hasLocale("fr")).toBe(false);
  });
});
