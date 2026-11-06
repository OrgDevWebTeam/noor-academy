import { LOCALES, textDirection, type Locale } from "@noor/contracts/locale";

// Locales, the default and text direction are shared with the API (FR-I18N-001). This entry point
// keeps the browser bundle free of the API's schema library.
export { DEFAULT_LOCALE, LOCALES, textDirection, type Locale } from "@noor/contracts/locale";

/** Remembers the language the user picked last (X01). */
export const LOCALE_STORAGE_KEY = "noor.locale";

/** Each language's own name, shown in the language switcher whatever the page language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

/** Narrows any string, such as a URL segment, to a supported locale. */
export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Sets the page language and direction. All layout direction follows from `dir` on <html>. */
export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = textDirection(locale);
}
