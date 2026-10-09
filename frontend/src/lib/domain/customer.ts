/**
 * Guest customers (owner instructions §3).
 *
 * - Name, phone and email are required for orders and catering requests.
 * - Returning customers are matched by normalised email and linked to their
 *   existing record — no duplicate customer is created.
 * - A submission never overwrites an existing profile: the email is not
 *   verified, so whoever types it must not be able to change someone else's
 *   details. What was submitted is kept on the order/request as a snapshot.
 * - No login account is created, and nothing about previous orders is ever
 *   returned to the submitter.
 * - Marketing consent is separate: only an explicit opt-in records consent;
 *   ordering never implies it and never withdraws it.
 */
import { z } from "zod";
import type { Locale } from "./status";

/** Trim + lowercase. Deliberately no provider-specific tricks (e.g. Gmail dots). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalises a phone number to E.164. Local UAE formats are accepted:
 * 050 123 4567, 0501234567, 501234567, 00971501234567, +971 50 123 4567,
 * and landlines such as 06 123 4567 (Ajman/Sharjah). International numbers
 * must start with + or 00. Returns null if the result is not plausible.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim().replace(/[\s\-().]/g, "");
  let e164: string;
  if (/^\+\d+$/.test(raw)) e164 = raw;
  else if (/^00\d+$/.test(raw)) e164 = `+${raw.slice(2)}`;
  else if (/^0[2-9]\d{7,8}$/.test(raw)) e164 = `+971${raw.slice(1)}`;
  else if (/^5\d{8}$/.test(raw)) e164 = `+971${raw}`;
  else return null;

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  // UAE numbers: mobile +9715XXXXXXXX, landline +971[2-9]XXXXXXX
  if (e164.startsWith("+971") && !/^\+971(5\d{8}|[2-9]\d{7})$/.test(e164)) return null;
  return e164;
}

export const nameSchema = z
  .string({ error: "errors.required" })
  .trim()
  .min(2, { error: "errors.required" })
  .max(120, { error: "errors.tooLong" });

export const emailSchema = z
  .string({ error: "errors.required" })
  .trim()
  .min(1, { error: "errors.required" })
  .max(254, { error: "errors.tooLong" })
  .pipe(z.email({ error: "errors.email" }));

export const phoneSchema = z
  .string({ error: "errors.required" })
  .trim()
  .min(1, { error: "errors.required" })
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "errors.phone" });
      return z.NEVER;
    }
    return phone;
  });

export const localeSchema = z.enum(["ar", "en"]);

export const contactSchema = z.object({
  fullName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  locale: localeSchema.default("ar"),
  /** Optional, unchecked by default; separate from the transactional confirmation. */
  marketingConsent: z.boolean().default(false),
});

export type ContactInput = z.input<typeof contactSchema>;
export type Contact = z.output<typeof contactSchema>;

export type ExistingCustomer = {
  id: string;
  marketingConsent: boolean;
};

export type CustomerResolution = {
  /** Reuse an existing record, or create one from the submitted details. */
  customer:
    | { action: "reuse"; id: string }
    | {
        action: "create";
        fullName: string;
        phone: string;
        email: string;
        emailNormalized: string;
        preferredLanguage: Locale;
      };
  /** Consent event to append, if the customer explicitly opted in now. */
  consentEvent: { consentType: "marketing_email"; granted: true; source: string; locale: Locale } | null;
};

/**
 * Decides how to attach a submission to a customer record.
 * `existing` is the customer found by normalised email (or null).
 */
export function resolveCustomer(
  existing: ExistingCustomer | null,
  contact: Contact,
  consentSource: "checkout" | "catering_form",
): CustomerResolution {
  const wantsMarketing = contact.marketingConsent === true;
  if (existing) {
    return {
      customer: { action: "reuse", id: existing.id },
      consentEvent:
        wantsMarketing && !existing.marketingConsent
          ? { consentType: "marketing_email", granted: true, source: consentSource, locale: contact.locale }
          : null,
    };
  }
  return {
    customer: {
      action: "create",
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email.trim(),
      emailNormalized: normalizeEmail(contact.email),
      preferredLanguage: contact.locale,
    },
    consentEvent: wantsMarketing
      ? { consentType: "marketing_email", granted: true, source: consentSource, locale: contact.locale }
      : null,
  };
}
