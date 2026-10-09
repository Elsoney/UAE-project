import { describe, expect, it } from "vitest";
import { REFERENCE_ALPHABET, generateReference, isValidReference, parseReference } from "./reference";

describe("public references", () => {
  it("generates references in the database format", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReference("order")).toMatch(/^UMD-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
      expect(generateReference("catering")).toMatch(/^UMC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    }
  });

  it("is deterministic with an injected random source", () => {
    expect(generateReference("order", () => new Uint8Array(8))).toBe(`UMD-${REFERENCE_ALPHABET[0].repeat(8)}`);
  });

  it("never uses ambiguous characters", () => {
    expect(REFERENCE_ALPHABET).not.toMatch(/[01ILO]/);
  });

  it("parses typed references leniently", () => {
    expect(parseReference(" umd 7k4q2xrm ")).toEqual({ kind: "order", reference: "UMD-7K4Q2XRM" });
    expect(parseReference("UMC-7K4Q2XRM")).toEqual({ kind: "catering", reference: "UMC-7K4Q2XRM" });
    expect(parseReference("umc7k4q2xrm")).toEqual({ kind: "catering", reference: "UMC-7K4Q2XRM" });
  });

  it("rejects invalid references", () => {
    expect(isValidReference("UMD-0000OOOO")).toBe(false);
    expect(isValidReference("ABC-7K4Q2XRM")).toBe(false);
    expect(isValidReference("UMD-7K4Q2XR")).toBe(false);
    expect(isValidReference("UMD-7K4Q2XRM")).toBe(true);
  });
});
