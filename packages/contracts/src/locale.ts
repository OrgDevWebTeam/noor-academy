/** Supported locales (FR-I18N-001). Arabic is RTL, English is LTR. */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const textDirection = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");
