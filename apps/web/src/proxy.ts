import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, hasLocale, type Locale } from "@/i18n/config";

// Saved choice first, then the browser's languages, then the shared default.
function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;

  const accepted = request.headers.get("accept-language") ?? "";
  for (const entry of accepted.split(",")) {
    const language = entry.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (language && hasLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and any path with a file extension (icons, manifest, sw.js).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
