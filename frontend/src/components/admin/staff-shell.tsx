import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/[lang]/admin/actions";
import type { Locale } from "@/i18n/config";
import { interpolate, type Dictionary } from "@/i18n/dictionary";
import { getStaffAccess } from "@/lib/auth/dal";
import type { StaffSession } from "@/lib/auth/staff";
import { isDatabaseConfigured } from "@/lib/services/brand";

/**
 * Server-side staff gate for every staff page: unauthenticated visitors go to
 * sign-in; signed-in non-staff see "no access". Must render inside <Suspense>
 * because it reads the session cookie.
 */
export async function StaffGate({
  locale,
  t,
  current,
  children,
}: {
  locale: Locale;
  t: Dictionary["staff"];
  current: "catering" | "orders";
  children: (session: StaffSession) => ReactNode | Promise<ReactNode>;
}) {
  // Always decided per request, never at build time.
  await connection();
  if (!isDatabaseConfigured()) redirect(`/${locale}/admin/sign-in`);
  const access = await getStaffAccess();
  if (!access.allowed) {
    if (access.reason === "unauthenticated") redirect(`/${locale}/admin/sign-in`);
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl text-indigo">{t.notStaffTitle}</h1>
        <p className="mt-4 text-date">{t.notStaffBody}</p>
        <form action={signOutAction.bind(null, locale)} className="mt-8">
          <button type="submit" className="font-semibold text-madder underline underline-offset-4">
            {t.signOut}
          </button>
        </form>
      </div>
    );
  }
  const session = access.session;
  const tab = (key: "catering" | "orders", href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-4 px-1 font-semibold ${
        current === key ? "border-madder text-madder" : "border-transparent text-indigo hover:text-madder"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="staff-area mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-rule">
        <nav aria-label={t.navCatering} className="flex gap-6">
          {tab("catering", `/${locale}/admin`, t.navCatering)}
          {tab("orders", `/${locale}/admin/orders`, t.navOrders)}
        </nav>
        <div className="flex items-center gap-4 pb-2 text-sm">
          <span className="text-date">
            {interpolate(t.signedInAs, { name: session.fullName })} · {t.roles[session.role]}
          </span>
          <form action={signOutAction.bind(null, locale)}>
            <button type="submit" className="font-semibold text-madder underline underline-offset-4">
              {t.signOut}
            </button>
          </form>
        </div>
      </div>
      {session.role !== "admin" && (
        <p role="note" className="mt-4 border-s-4 border-saffron bg-plaster-deep p-3 text-sm font-semibold">
          {t.readOnly}
        </p>
      )}
      <div className="mt-8">{await children(session)}</div>
    </div>
  );
}

export function StaffLoading({ label }: { label: string }) {
  return (
    <p className="mx-auto max-w-6xl px-4 py-16 text-date sm:px-6" role="status">
      {label}
    </p>
  );
}
