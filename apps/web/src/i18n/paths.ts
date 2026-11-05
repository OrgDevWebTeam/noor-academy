import { hasLocale, type Locale } from "./config";

/** The language in the first path segment, if there is one. */
export function localeInPath(pathname: string): Locale | undefined {
  const first = pathname.split("/")[1];
  return first !== undefined && hasLocale(first) ? first : undefined;
}

/** The same page in another language: swaps the first path segment when it is a locale. */
export function localizedPath(pathname: string, locale: Locale): string {
  if (localeInPath(pathname)) {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
