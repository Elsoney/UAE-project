"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { submitCateringAction } from "@/app/[lang]/catering/actions";
import { telLink, whatsappLink } from "@/config/business";
import type { CateringPackage } from "@/data/catalog";
import type { Locale } from "@/i18n/config";
import { errorMessage, interpolate, type Dictionary } from "@/i18n/dictionary";
import { cateringRequestSchema, type CateringRequest } from "@/lib/domain/catering";
import { fieldErrors, type ValidationMessageKey } from "@/lib/domain/validation";
import { buttonClass } from "../ui/button-link";
import { ChatIcon, PhoneIcon } from "../site/contact-bar";
import { Field, describedBy, inputClass } from "./field";

const CUSTOM = "custom";

type Props = {
  locale: Locale;
  packages: CateringPackage[];
  t: Dictionary["catering"];
  errors: Dictionary["errors"];
  actions: Dictionary["actions"];
  preselectedPackage?: string;
};

type Outcome = { kind: "received"; reference: string; email: string } | { kind: "offline"; request: CateringRequest } | null;

/**
 * Guest catering request form. Validation uses the same rules as the server
 * (lib/domain/catering), with messages in the visitor's language; the server
 * validates again and stores the request as "pending review". Submitting never
 * implies a confirmed booking (owner §4). The form stays mounted so the
 * visitor's entries survive server-side errors.
 */
export function CateringForm({ locale, packages, t, errors, actions, preselectedPackage }: Props) {
  const [fieldErrs, setFieldErrs] = useState<Record<string, ValidationMessageKey>>({});
  const [packageId, setPackageId] = useState(preselectedPackage ?? packages[0]?.id ?? CUSTOM);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [notice, setNotice] = useState<"rate_limited" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const f = t.fields;

  const err = (name: string) => (fieldErrs[name] ? errorMessage(errors, fieldErrs[name]) : undefined);

  function showErrors(next: Record<string, ValidationMessageKey>) {
    setFieldErrs(next);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const schema = cateringRequestSchema({
      now: new Date(),
      // Blocked dates are checked by the server.
      blockedDates: new Set(),
      packages: new Map(packages.map((p) => [p.id, { minimumGuests: p.minimumGuests, maximumGuests: p.maximumGuests }])),
    });
    const input = {
      ...data,
      packageId: data.packageId === CUSTOM ? "" : data.packageId,
      marketingConsent: data.marketingConsent === "on",
      locale,
    };
    const result = schema.safeParse(input);
    if (!result.success) {
      showErrors(fieldErrors(result.error));
      return;
    }
    setFieldErrs({});
    setNotice(null);
    // One key per attempt: retries after a network error never create a second request.
    idempotencyKey.current ??= crypto.randomUUID();
    const request = result.data;
    startTransition(async () => {
      let response;
      try {
        response = await submitCateringAction({ ...input, idempotencyKey: idempotencyKey.current });
      } catch {
        setNotice("error");
        return;
      }
      switch (response.status) {
        case "received":
          idempotencyKey.current = null;
          setOutcome({ kind: "received", reference: response.reference, email: request.email });
          requestAnimationFrame(() => outcomeRef.current?.focus());
          break;
        case "offline":
          setOutcome({ kind: "offline", request });
          requestAnimationFrame(() => outcomeRef.current?.focus());
          break;
        case "invalid":
          showErrors(response.errors);
          break;
        default:
          setNotice(response.status);
      }
    });
  }

  const selected = packages.find((p) => p.id === packageId);
  const name = (p: CateringPackage) => (locale === "ar" ? p.nameAr : p.nameEn);

  function whatsappDetails(ready: CateringRequest) {
    const pkg = packages.find((p) => p.id === ready.packageId);
    return [
      t.whatsappIntro,
      `${f.package}: ${pkg ? name(pkg) : f.packageCustom}`,
      ready.customRequest ? `${f.customRequest}: ${ready.customRequest}` : null,
      `${f.eventDate}: ${ready.eventDate}`,
      `${f.eventTime}: ${ready.eventTime}`,
      `${f.guestCount}: ${ready.guestCount}`,
      `${f.eventLocation}: ${ready.eventLocation}`,
      ready.notes ? `${f.notes}: ${ready.notes}` : null,
      `${f.fullName}: ${ready.fullName}`,
      `${f.phone}: ${ready.phone}`,
      `${f.email}: ${ready.email}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const outcomePanel =
    outcome?.kind === "received" ? (
      <div ref={outcomeRef} tabIndex={-1} role="status" className="border-s-4 border-palm bg-white p-6">
        <h3 className="font-display text-2xl text-indigo">{t.receivedTitle}</h3>
        <p className="mt-3 text-lg font-semibold">{interpolate(t.receivedReference, { reference: outcome.reference })}</p>
        <p className="mt-3 max-w-[60ch]">{t.receivedBody}</p>
        <p className="mt-3 max-w-[60ch] text-date">{interpolate(t.receivedEmail, { email: outcome.email })}</p>
        <button
          type="button"
          onClick={() => {
            formRef.current?.reset();
            setOutcome(null);
          }}
          className={`${buttonClass("secondary")} mt-6`}
        >
          {t.newRequest}
        </button>
      </div>
    ) : outcome?.kind === "offline" ? (
      <div ref={outcomeRef} tabIndex={-1} role="status" className="border-s-4 border-palm bg-white p-6">
        <h3 className="font-display text-2xl text-indigo">{t.onlineSoonTitle}</h3>
        <p className="mt-3 max-w-[60ch]">{t.onlineSoonBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={whatsappLink(locale, whatsappDetails(outcome.request))} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp")}>
            <ChatIcon />
            {t.sendOnWhatsapp}
          </a>
          <button type="button" onClick={() => setOutcome(null)} className={buttonClass("secondary")}>
            {t.editDetails}
          </button>
        </div>
      </div>
    ) : null;

  const hasErrors = Object.keys(fieldErrs).length > 0;

  return (
    <>
    {outcomePanel}
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      hidden={outcome !== null}
      aria-busy={pending}
      className="flex flex-col gap-6"
      aria-describedby="catering-form-lead"
    >
      {notice && (
        <div role="alert" className="border-s-4 border-madder bg-white p-4">
          <p className="font-semibold text-madder">{notice === "rate_limited" ? t.rateLimited : t.submitError}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
            <a href={telLink()} className="inline-flex items-center gap-2 underline underline-offset-4">
              <PhoneIcon />
              {actions.callUs}
            </a>
            <a href={whatsappLink(locale)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4">
              <ChatIcon />
              {actions.whatsapp}
            </a>
          </div>
        </div>
      )}
      {hasErrors && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="border-s-4 border-madder bg-white p-4 font-semibold text-madder">
          {t.errorSummary}
        </div>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <Field id="packageId" label={f.package} required requiredLabel={f.required} optionalLabel={f.optional} error={err("packageId")} className="sm:col-span-2">
          <select
            id="packageId"
            name="packageId"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            aria-invalid={!!err("packageId")}
            aria-describedby={describedBy("packageId", undefined, err("packageId"))}
            className={inputClass}
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {name(p)}
              </option>
            ))}
            <option value={CUSTOM}>{f.packageCustom}</option>
          </select>
        </Field>

        <Field
          id="customRequest"
          label={f.customRequest}
          required={packageId === CUSTOM}
          requiredLabel={f.required}
          optionalLabel={f.optional}
          hint={f.customRequestHint}
          error={err("customRequest")}
          className="sm:col-span-2"
        >
          <textarea
            id="customRequest"
            name="customRequest"
            rows={3}
            maxLength={2000}
            aria-invalid={!!err("customRequest")}
            aria-describedby={describedBy("customRequest", f.customRequestHint, err("customRequest"))}
            className={`${inputClass} py-2`}
          />
        </Field>

        <Field id="eventDate" label={f.eventDate} required requiredLabel={f.required} optionalLabel={f.optional} error={err("eventDate")}>
          <input id="eventDate" name="eventDate" type="date" required aria-invalid={!!err("eventDate")} aria-describedby={describedBy("eventDate", undefined, err("eventDate"))} className={inputClass} />
        </Field>

        <Field id="eventTime" label={f.eventTime} required requiredLabel={f.required} optionalLabel={f.optional} error={err("eventTime")}>
          <input id="eventTime" name="eventTime" type="time" required aria-invalid={!!err("eventTime")} aria-describedby={describedBy("eventTime", undefined, err("eventTime"))} className={inputClass} />
        </Field>

        <Field
          id="guestCount"
          label={f.guestCount}
          required
          requiredLabel={f.required}
          optionalLabel={f.optional}
          hint={
            selected
              ? selected.maximumGuests
                ? interpolate(t.guestRange, { min: selected.minimumGuests, max: selected.maximumGuests })
                : interpolate(t.guestMin, { min: selected.minimumGuests })
              : undefined
          }
          error={err("guestCount")}
        >
          <input
            id="guestCount"
            name="guestCount"
            type="number"
            inputMode="numeric"
            min={selected?.minimumGuests ?? 1}
            max={selected?.maximumGuests ?? 5000}
            required
            aria-invalid={!!err("guestCount")}
            aria-describedby={describedBy("guestCount", selected ? "hint" : undefined, err("guestCount"))}
            className={inputClass}
          />
        </Field>

        <Field id="eventLocation" label={f.eventLocation} required requiredLabel={f.required} optionalLabel={f.optional} hint={f.eventLocationHint} error={err("eventLocation")}>
          <input
            id="eventLocation"
            name="eventLocation"
            type="text"
            autoComplete="street-address"
            maxLength={500}
            required
            aria-invalid={!!err("eventLocation")}
            aria-describedby={describedBy("eventLocation", f.eventLocationHint, err("eventLocation"))}
            className={inputClass}
          />
        </Field>

        <Field id="notes" label={f.notes} requiredLabel={f.required} optionalLabel={f.optional} error={err("notes")} className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} maxLength={2000} aria-invalid={!!err("notes")} aria-describedby={describedBy("notes", undefined, err("notes"))} className={`${inputClass} py-2`} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 border-t-2 border-rule pt-6 sm:grid-cols-2">
        <Field id="fullName" label={f.fullName} required requiredLabel={f.required} optionalLabel={f.optional} error={err("fullName")} className="sm:col-span-2">
          <input id="fullName" name="fullName" type="text" autoComplete="name" maxLength={120} required aria-invalid={!!err("fullName")} aria-describedby={describedBy("fullName", undefined, err("fullName"))} className={inputClass} />
        </Field>

        <Field id="phone" label={f.phone} required requiredLabel={f.required} optionalLabel={f.optional} hint={f.phoneHint} error={err("phone")}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            required
            aria-invalid={!!err("phone")}
            aria-describedby={describedBy("phone", f.phoneHint, err("phone"))}
            className={`${inputClass} text-start`}
          />
        </Field>

        <Field id="email" label={f.email} required requiredLabel={f.required} optionalLabel={f.optional} hint={f.emailHint} error={err("email")}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            maxLength={254}
            required
            aria-invalid={!!err("email")}
            aria-describedby={describedBy("email", f.emailHint, err("email"))}
            className={`${inputClass} text-start`}
          />
        </Field>

        <div className="flex items-start gap-3 sm:col-span-2">
          <input id="marketingConsent" name="marketingConsent" type="checkbox" className="mt-1.5 size-5 shrink-0 accent-madder" />
          <label htmlFor="marketingConsent" className="text-[0.95rem]">
            {f.marketingConsent}
          </label>
        </div>
      </fieldset>

      <p className="text-sm text-date">
        {t.privacyNotice}{" "}
        <Link href={`/${locale}/privacy`} className="font-semibold text-indigo underline underline-offset-4">
          {t.privacyLink}
        </Link>
      </p>

      {/* Bot trap: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -start-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">{t.honeypot}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <button type="submit" disabled={pending} className={`${buttonClass("primary")} disabled:opacity-70`}>
          {pending ? t.sending : t.submit}
        </button>
      </div>
    </form>
    </>
  );
}
