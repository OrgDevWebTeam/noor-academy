import { LOCALES, type Locale } from "@noor/contracts";

// Locales, the default and text direction are shared with the API (FR-I18N-001).
export { DEFAULT_LOCALE, LOCALES, textDirection, type Locale } from "@noor/contracts";

/** Remembers the language the user picked last (X01). */
export const LOCALE_COOKIE = "NOOR_LOCALE";

/** Each language's own name, shown in the language switcher whatever the page language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

/** Narrows any string, such as a URL segment, to a supported locale. */
export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
