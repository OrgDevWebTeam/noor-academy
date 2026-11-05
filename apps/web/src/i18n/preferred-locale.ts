import { DEFAULT_LOCALE, LOCALE_COOKIE, hasLocale, type Locale } from "./config";

/** The language the user picked last (X01), or the default. */
export function preferredLocale(): Locale {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return match && hasLocale(match) ? match : DEFAULT_LOCALE;
}
