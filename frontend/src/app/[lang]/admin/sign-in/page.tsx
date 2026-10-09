import type { Metadata } from "next";
import { SignInForm } from "@/components/admin/sign-in-form";
import { resolveLocale } from "../../locale";

export const metadata: Metadata = { title: "Umodai staff", robots: { index: false, follow: false } };

export default async function StaffSignInPage({ params }: PageProps<"/[lang]/admin/sign-in">) {
  const { locale, dict } = await resolveLocale(params);
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl text-indigo">{dict.staff.signInTitle}</h1>
      <p className="mt-3 text-date">{dict.staff.signInLead}</p>
      <div className="mt-8">
        <SignInForm locale={locale} t={dict.staff} />
      </div>
    </div>
  );
}
