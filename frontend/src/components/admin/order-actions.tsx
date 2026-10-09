"use client";

import { useState, useTransition } from "react";
import { updateOrderAction, type StaffActionResult } from "@/app/[lang]/admin/actions";
import type { Dictionary } from "@/i18n/dictionary";
import type { OrderStatus } from "@/lib/domain/status";
import { nextOrderStep } from "@/lib/services/review";
import { buttonClass } from "../ui/button-link";

export function OrderActions({ orderId, status, t }: { orderId: string; status: OrderStatus; t: Dictionary["staff"] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const next = nextOrderStep(status);
  const run = (action: object) =>
    startTransition(async () => {
      setResult(await updateOrderAction(orderId, action));
      setCancelling(false);
    });

  return (
    <div className="flex flex-col items-start gap-2">
      {next && (
        <button type="button" disabled={pending} onClick={() => run({ type: "advance", to: next })} className={`${buttonClass("primary")} min-h-10 px-4 text-sm`}>
          {t.orderSteps[next]}
        </button>
      )}
      {status !== "completed" && status !== "cancelled" && !cancelling && (
        <button type="button" onClick={() => setCancelling(true)} className="text-sm font-semibold text-madder underline underline-offset-4">
          {t.cancelOrder}
        </button>
      )}
      {cancelling && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run({ type: "cancel", reason: String(new FormData(e.currentTarget).get("reason") ?? "") });
          }}
        >
          <label htmlFor={`reason-${orderId}`} className="text-sm font-semibold">
            {t.reason}
          </label>
          <input id={`reason-${orderId}`} name="reason" required maxLength={500} className="min-h-10 rounded-lg border-2 border-rule px-2" />
          <button type="submit" disabled={pending} className="text-sm font-semibold text-madder underline underline-offset-4">
            {t.cancelOrder}
          </button>
        </form>
      )}
      {result && !result.ok && (
        <p role="alert" className="text-sm font-semibold text-madder">
          {t.errors[result.code]}
        </p>
      )}
    </div>
  );
}
