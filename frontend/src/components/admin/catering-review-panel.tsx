"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { requestPaymentAction, reviewCateringAction, type StaffActionResult } from "@/app/[lang]/admin/actions";
import type { Locale } from "@/i18n/config";
import { interpolate, type Dictionary } from "@/i18n/dictionary";
import { buildPaymentRequest, type DepositChoice } from "@/lib/domain/deposit";
import { formatAed, parseAed } from "@/lib/domain/money";
import type { CateringStatus, PaymentStatus } from "@/lib/domain/status";
import { inputClass } from "../catering/field";
import { buttonClass } from "../ui/button-link";

type Props = {
  locale: Locale;
  t: Dictionary["staff"];
  requestId: string;
  status: CateringStatus;
  paymentStatus: PaymentStatus;
  quotedTotalFils: number | null;
  depositType: DepositChoice["type"] | null;
  depositPercentage: number | null;
  depositFixedFils: number | null;
  adminNotes: string | null;
  canEdit: boolean;
  openLink: { url: string | null; amountFils: number; expiresAt: string | null } | null;
  testMode: boolean;
};

const CLOSED: CateringStatus[] = ["completed", "rejected", "cancelled"];
const LOCKED: CateringStatus[] = ["confirmed", "preparing", ...CLOSED];

/** Staff actions for one catering request. The server re-checks every rule. */
export function CateringReviewPanel(props: Props) {
  const { t, locale, status } = props;
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [depositType, setDepositType] = useState<DepositChoice["type"]>(props.depositType ?? "none");
  const [total, setTotal] = useState(props.quotedTotalFils ? String(props.quotedTotalFils / 100) : "");
  const [fixed, setFixed] = useState(props.depositFixedFils ? String(props.depositFixedFils / 100) : "");
  const [percent, setPercent] = useState(props.depositPercentage ? String(props.depositPercentage) : "");

  function run(action: object) {
    setResult(null);
    startTransition(async () => {
      setResult(await reviewCateringAction(props.requestId, action));
    });
  }

  function submit(type: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      run({ type, ...data });
    };
  }

  // Live preview of what the customer must pay before confirmation.
  let amounts: { upfront: number; remaining: number } | null = null;
  try {
    const totalFils = parseAed(total);
    const choice: DepositChoice =
      depositType === "fixed"
        ? { type: "fixed", amountFils: parseAed(fixed) }
        : depositType === "percentage"
          ? { type: "percentage", percent: Number(percent) }
          : { type: depositType };
    const upfront = buildPaymentRequest(totalFils, choice)?.requestedAmountFils ?? 0;
    amounts = { upfront, remaining: totalFils - upfront };
  } catch {
    // Incomplete or invalid amounts: no preview until the inputs make sense.
    amounts = null;
  }
  const preview: ReactNode = amounts && (
    <p className="tabular text-sm text-date" aria-live="polite">
      {interpolate(t.requiredNow, { amount: formatAed(amounts.upfront, locale) })} ·{" "}
      {interpolate(t.remaining, { amount: formatAed(amounts.remaining, locale) })}
    </p>
  );

  const message =
    result === null ? null : result.ok ? (
      <p role="status" className="border-s-4 border-palm bg-white p-3 font-semibold text-palm">
        {t.saved}
      </p>
    ) : (
      <p role="alert" className="border-s-4 border-madder bg-white p-3 font-semibold text-madder">
        {t.errors[result.code]}
      </p>
    );

  if (!props.canEdit) return null;

  const canConfirm =
    (status === "quoted" && props.depositType === "none") ||
    (status === "awaiting_payment" && (props.paymentStatus === "deposit_paid" || props.paymentStatus === "fully_paid"));
  const needsPayment =
    (status === "quoted" || status === "awaiting_payment") &&
    props.depositType !== null &&
    props.depositType !== "none" &&
    props.paymentStatus !== "deposit_paid" &&
    props.paymentStatus !== "fully_paid";

  return (
    <div className="flex flex-col gap-8" aria-busy={pending}>
      {message}

      {!LOCKED.includes(status) && (
        <section aria-labelledby="quote-title" className="bg-white p-5">
          <h3 id="quote-title" className="font-display text-xl text-indigo">
            {t.quoteTitle}
          </h3>
          <p className="mt-1 text-sm text-date">{t.quoteLead}</p>
          <form onSubmit={submit("quote")} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="totalAed" className="font-semibold">
                {t.quoteTotal}
              </label>
              <input id="totalAed" name="totalAed" inputMode="decimal" dir="ltr" value={total} onChange={(e) => setTotal(e.target.value)} required className={`${inputClass} text-start`} />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="font-semibold">{t.depositLabel}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["none", "fixed", "percentage", "full"] as const).map((type) => (
                  <label key={type} className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-rule px-3 has-[:checked]:border-madder">
                    <input type="radio" name="depositType" value={type} checked={depositType === type} onChange={() => setDepositType(type)} className="accent-madder" />
                    {t.deposit[type]}
                  </label>
                ))}
              </div>
            </fieldset>
            {depositType === "fixed" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="depositFixedAed" className="font-semibold">
                  {t.depositFixedAmount}
                </label>
                <input id="depositFixedAed" name="depositFixedAed" inputMode="decimal" dir="ltr" value={fixed} onChange={(e) => setFixed(e.target.value)} required className={`${inputClass} text-start`} />
              </div>
            )}
            {depositType === "percentage" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="depositPercent" className="font-semibold">
                  {t.depositPercent}
                </label>
                <input id="depositPercent" name="depositPercent" inputMode="decimal" dir="ltr" value={percent} onChange={(e) => setPercent(e.target.value)} required className={`${inputClass} text-start`} />
              </div>
            )}
            <div className="sm:col-span-2">{preview}</div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className={`${buttonClass("primary")} disabled:opacity-70`}>
                {t.saveQuote}
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="steps-title">
        <h3 id="steps-title" className="font-display text-xl text-indigo">
          {t.nextSteps}
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {status === "pending_review" && (
            <button type="button" disabled={pending} onClick={() => run({ type: "contacted" })} className={buttonClass("secondary")}>
              {t.markContacted}
            </button>
          )}
          {canConfirm && (
            <button type="button" disabled={pending} onClick={() => run({ type: "confirm" })} className={buttonClass("primary")}>
              {t.confirmBooking}
            </button>
          )}
          {status === "confirmed" && (
            <button type="button" disabled={pending} onClick={() => run({ type: "advance", to: "preparing" })} className={buttonClass("primary")}>
              {t.startPreparing}
            </button>
          )}
          {status === "preparing" && (
            <button type="button" disabled={pending} onClick={() => run({ type: "advance", to: "completed" })} className={buttonClass("primary")}>
              {t.markCompleted}
            </button>
          )}
        </div>
        {needsPayment && (
          <div className="mt-4 flex flex-col gap-3 bg-white p-5">
            {props.openLink && (
              <>
                <p className="tabular font-semibold">{interpolate(t.paymentLinkSent, { amount: formatAed(props.openLink.amountFils, locale) })}</p>
                {props.openLink.expiresAt && (
                  <p className="tabular text-sm text-date">
                    {interpolate(t.paymentLinkExpires, {
                      date: new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(props.openLink.expiresAt)),
                    })}
                  </p>
                )}
                {props.openLink.url && (
                  <a href={props.openLink.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-indigo underline underline-offset-4" dir="ltr">
                    {t.openPaymentLink}
                  </a>
                )}
              </>
            )}
            <div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setResult(null);
                  startTransition(async () => setResult(await requestPaymentAction(props.requestId)));
                }}
                className={buttonClass(props.openLink ? "secondary" : "primary")}
              >
                {props.openLink ? t.resendPaymentLink : t.sendPaymentLink}
              </button>
            </div>
            {props.testMode && <p className="text-sm text-date">{t.testMode}</p>}
          </div>
        )}
      </section>

      {!CLOSED.includes(status) && (
        <section aria-labelledby="close-title" className="border-t-2 border-rule pt-6">
          <h3 id="close-title" className="font-display text-xl text-madder">
            {LOCKED.includes(status) ? t.cancelTitle : t.rejectTitle}
          </h3>
          <form onSubmit={submit(LOCKED.includes(status) ? "cancel" : "reject")} className="mt-3 flex flex-col gap-3">
            <label htmlFor="reason" className="font-semibold">
              {t.reason}
            </label>
            <textarea id="reason" name="reason" rows={2} maxLength={500} required className={`${inputClass} py-2`} />
            <div>
              <button type="submit" disabled={pending} className={buttonClass("secondary")}>
                {LOCKED.includes(status) ? t.cancel : t.reject}
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="notes-title">
        <form onSubmit={submit("notes")} className="flex flex-col gap-3">
          <label id="notes-title" htmlFor="notes" className="font-display text-xl text-indigo">
            {t.adminNotes}
          </label>
          <textarea id="notes" name="notes" rows={4} maxLength={4000} defaultValue={props.adminNotes ?? ""} className={`${inputClass} py-2`} />
          <div>
            <button type="submit" disabled={pending} className={buttonClass("secondary")}>
              {t.saveNotes}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
