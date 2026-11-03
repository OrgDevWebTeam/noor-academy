/** Current public API version prefix (architecture section 8). */
export const API_VERSION = "v1" as const;

/** Supported locales (FR-I18N-001). Arabic is RTL, English is LTR. */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const textDirection = (locale: Locale): "ltr" | "rtl" => (locale === "ar" ? "rtl" : "ltr");

/** Deployment environments (architecture 15.1). Only production holds real family data. */
export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];
