"use client";

import { useState, useTransition } from "react";
import { completeMockPayment, type MockPaymentResult } from "@/app/[lang]/mock-checkout/[id]/actions";
import type { Dictionary } from "@/i18n/dictionary";
import { buttonClass } from "../ui/button-link";

export function MockPayButtons({ checkoutId, payLabel, t }: { checkoutId: string; payLabel: string; t: Dictionary["checkout"] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MockPaymentResult | null>(null);
  const run = (outcome: "success" | "fail") => startTransition(async () => setResult(await completeMockPayment(checkoutId, outcome)));

  if (result?.status === "paid") {
    return (
      <div role="status" className="border-s-4 border-palm bg-white p-5">
        <h2 className="font-display text-2xl text-indigo">{t.paidTitle}</h2>
        <p className="mt-2">{t.paidBody}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {result?.status === "failed" && (
        <p role="alert" className="border-s-4 border-madder bg-white p-4 font-semibold text-madder">
          {t.failedBody}
        </p>
      )}
      {(result?.status === "closed" || result?.status === "unavailable") && (
        <p role="alert" className="border-s-4 border-madder bg-white p-4 font-semibold text-madder">
          {t.closed}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => run("success")} className={`${buttonClass("primary")} disabled:opacity-70`}>
          {payLabel}
        </button>
        <button type="button" disabled={pending} onClick={() => run("fail")} className={buttonClass("secondary")}>
          {t.fail}
        </button>
      </div>
    </div>
  );
}
