/**
 * Shared validation helpers. Messages are dictionary KEYS (e.g. "errors.email"),
 * never English text, so the UI shows them in Arabic or English.
 */
import type { z } from "zod";

/** Every message key the domain schemas can produce. The UI dictionaries must define all of them. */
export const VALIDATION_MESSAGE_KEYS = [
  "errors.required",
  "errors.email",
  "errors.phone",
  "errors.tooLong",
  "errors.date",
  "errors.time",
  "errors.datePast",
  "errors.dateBlocked",
  "errors.leadTime",
  "errors.guestCount",
  "errors.packageOrCustom",
  "errors.packageUnavailable",
  "errors.deliveryAddress",
  "errors.cartEmpty",
  "errors.quantity",
  "errors.generic",
] as const;

export type ValidationMessageKey = (typeof VALIDATION_MESSAGE_KEYS)[number];

/** Flattens a ZodError into { "field.path": "errors.key" } (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, ValidationMessageKey> {
  const out: Record<string, ValidationMessageKey> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "_form";
    if (out[path]) continue;
    out[path] = (VALIDATION_MESSAGE_KEYS as readonly string[]).includes(issue.message)
      ? (issue.message as ValidationMessageKey)
      : "errors.generic";
  }
  return out;
}
