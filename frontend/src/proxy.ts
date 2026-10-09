/**
 * Language routing (Next.js 16 Proxy, formerly Middleware).
 * Every page lives under /ar or /en. Visitors who arrive without a language in
 * the URL are redirected to their chosen or preferred language (Arabic by default).
 *
 * For the staff area it also refreshes the Supabase session cookie. That is
 * a convenience only: access is verified on the server for every staff page
 * and action in the Data Access Layer.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";
import { negotiateLocale, splitLocalePath } from "@/i18n/negotiate";

async function refreshStaffSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        for (const { name, value } of cookies) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, rest } = splitLocalePath(pathname);
  if (locale) {
    return rest === "/admin" || rest.startsWith("/admin/") ? refreshStaffSession(request) : NextResponse.next();
  }

  const preferred = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Skip Next internals, API routes, metadata files and anything with a file extension.
  matcher: ["/((?!_next/|api/|sitemap\\.xml|robots\\.txt|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
