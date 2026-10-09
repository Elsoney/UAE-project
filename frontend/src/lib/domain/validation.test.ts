import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors } from "./validation";

describe("fieldErrors", () => {
  it("reports form-level issues under _form and keeps the first message per field", () => {
    const schema = z.object({ a: z.string() }).superRefine((_v, ctx) => {
      ctx.addIssue({ code: "custom", message: "errors.generic" });
      ctx.addIssue({ code: "custom", path: ["a"], message: "errors.required" });
      ctx.addIssue({ code: "custom", path: ["a"], message: "errors.email" });
    });
    const result = schema.safeParse({ a: "x" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toEqual({ _form: "errors.generic", a: "errors.required" });
  });

  it("never leaks raw library messages to the UI", () => {
    const result = z.object({ n: z.number() }).safeParse({ n: "x" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toEqual({ n: "errors.generic" });
  });
});
