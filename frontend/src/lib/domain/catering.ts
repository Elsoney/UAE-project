/**
 * Guest catering request validation, shared by the form (client) and the
 * server action (owner instructions §4, PRD P0-F003).
 *
 * Rules: contact details incl. email; a package or a custom request; event
 * date/time not in the past (Asia/Dubai), not a blocked date, and at least
 * the lead time ahead; guest count within the package range; event location.
 * Submitting creates a request in "pending_review" — never a confirmed booking.
 */
import { z } from "zod";
import { contactSchema } from "./customer";

/** Assumption pending owner confirmation: requests need 48 hours' notice. */
export const DEFAULT_LEAD_TIME_HOURS = 48;
export const MAX_GUESTS = 5000;

/** The UAE does not observe daylight saving: Asia/Dubai is always UTC+4. */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Today's date in Asia/Dubai as YYYY-MM-DD. */
export function todayInDubai(now: Date): string {
  return new Date(now.getTime() + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Converts a Dubai-local date + time to an absolute instant, or null if invalid. */
export function dubaiDateTimeToUtc(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!d || !t) return null;
  const [y, m, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const utc = Date.UTC(y, m - 1, day, Number(t[1]), Number(t[2])) - DUBAI_OFFSET_MS;
  const check = new Date(utc + DUBAI_OFFSET_MS);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== day) return null;
  return new Date(utc);
}

export type CateringPackageRule = { minimumGuests: number; maximumGuests: number | null };

export type CateringValidationContext = {
  now: Date;
  /** YYYY-MM-DD dates that are not available. */
  blockedDates: ReadonlySet<string>;
  /** Active packages by id. */
  packages: ReadonlyMap<string, CateringPackageRule>;
  leadTimeHours?: number;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "errors.tooLong" })
    .optional()
    .transform((v) => (v ? v : null));

export function cateringRequestSchema(ctx: CateringValidationContext) {
  const leadTimeMs = (ctx.leadTimeHours ?? DEFAULT_LEAD_TIME_HOURS) * 60 * 60 * 1000;
  return contactSchema
    .extend({
      packageId: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v ? v : null)),
      customRequest: optionalText(2000),
      eventDate: z.string({ error: "errors.required" }).trim().min(1, { error: "errors.required" }),
      eventTime: z.string({ error: "errors.required" }).trim().min(1, { error: "errors.required" }),
      guestCount: z.coerce
        .number({ error: "errors.guestCount" })
        .int({ error: "errors.guestCount" })
        .min(1, { error: "errors.guestCount" })
        .max(MAX_GUESTS, { error: "errors.guestCount" }),
      eventLocation: z
        .string({ error: "errors.required" })
        .trim()
        .min(3, { error: "errors.required" })
        .max(500, { error: "errors.tooLong" }),
      notes: optionalText(2000),
      idempotencyKey: z.string().min(8).max(100).optional(),
    })
    .superRefine((value, issue) => {
      if (!value.packageId && !value.customRequest) {
        issue.addIssue({ code: "custom", path: ["packageId"], message: "errors.packageOrCustom" });
      }
      const pkg = value.packageId ? ctx.packages.get(value.packageId) : undefined;
      if (value.packageId && !pkg) {
        issue.addIssue({ code: "custom", path: ["packageId"], message: "errors.packageUnavailable" });
      }
      if (pkg && (value.guestCount < pkg.minimumGuests || (pkg.maximumGuests !== null && value.guestCount > pkg.maximumGuests))) {
        issue.addIssue({ code: "custom", path: ["guestCount"], message: "errors.guestCount" });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate)) {
        issue.addIssue({ code: "custom", path: ["eventDate"], message: "errors.date" });
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.eventTime)) {
        issue.addIssue({ code: "custom", path: ["eventTime"], message: "errors.time" });
        return;
      }
      const at = dubaiDateTimeToUtc(value.eventDate, value.eventTime);
      if (!at) {
        issue.addIssue({ code: "custom", path: ["eventDate"], message: "errors.date" });
        return;
      }
      if (value.eventDate < todayInDubai(ctx.now) || at.getTime() <= ctx.now.getTime()) {
        issue.addIssue({ code: "custom", path: ["eventDate"], message: "errors.datePast" });
        return;
      }
      if (ctx.blockedDates.has(value.eventDate)) {
        issue.addIssue({ code: "custom", path: ["eventDate"], message: "errors.dateBlocked" });
        return;
      }
      if (at.getTime() - ctx.now.getTime() < leadTimeMs) {
        issue.addIssue({ code: "custom", path: ["eventDate"], message: "errors.leadTime" });
      }
    });
}

export type CateringRequestInput = z.input<ReturnType<typeof cateringRequestSchema>>;
export type CateringRequest = z.output<ReturnType<typeof cateringRequestSchema>>;
