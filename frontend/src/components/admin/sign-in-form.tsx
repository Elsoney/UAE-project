"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/[lang]/admin/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { inputClass } from "../catering/field";
import { buttonClass } from "../ui/button-link";

export function SignInForm({ locale, t }: { locale: Locale; t: Dictionary["staff"] }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction.bind(null, locale), { error: null });
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="border-s-4 border-madder bg-white p-3 font-semibold text-madder">
          {state.error === "unavailable" ? t.signInUnavailable : t.signInError}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-semibold">
          {t.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="username" dir="ltr" required className={`${inputClass} text-start`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-semibold">
          {t.password}
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required className={`${inputClass} text-start`} />
      </div>
      <div>
        <button type="submit" disabled={pending} className={`${buttonClass("primary")} disabled:opacity-70`}>
          {pending ? t.signingIn : t.signIn}
        </button>
      </div>
    </form>
  );
}
