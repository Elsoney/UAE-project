"use client";

import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/button-link";
import ar from "@/i18n/dictionaries/ar.json";
import en from "@/i18n/dictionaries/en.json";
import { splitLocalePath } from "@/i18n/negotiate";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = splitLocalePath(usePathname() ?? "").locale ?? "ar";
  const t = (locale === "en" ? en : ar).error;
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl text-indigo">{t.title}</h1>
      <p className="mt-4 text-lg text-date">{t.body}</p>
      <button type="button" onClick={reset} className={`${buttonClass("primary")} mt-8`}>
        {t.retry}
      </button>
    </div>
  );
}
