import { hasLocale, type Locale } from "./config";

/** The same page in another language: swaps the first path segment when it is a locale. */
export function localizedPath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  const first = segments[1];

  if (first !== undefined && hasLocale(first)) {
    segments[1] = locale;
    return segments.join("/");
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
