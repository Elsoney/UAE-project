/**
 * Language routing (Next.js 16 Proxy, formerly Middleware).
 * Every page lives under /ar or /en. Visitors who arrive without a language in
 * the URL are redirected to their chosen or preferred language (Arabic by default).
 * No authentication happens here: staff access is verified on the server for
 * every request in the Data Access Layer.
 */
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";
import { negotiateLocale, splitLocalePath } from "@/i18n/negotiate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (splitLocalePath(pathname).locale) return NextResponse.next();

  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Skip Next internals, API routes, metadata files and anything with a file extension.
  matcher: ["/((?!_next/|api/|sitemap\\.xml|robots\\.txt|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
