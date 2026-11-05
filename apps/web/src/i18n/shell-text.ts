import { useParams } from "react-router";
import { DEFAULT_LOCALE, hasLocale, type Locale } from "./config";
import ar from "./shell-dictionaries/ar.json";
import en from "./shell-dictionaries/en.json";

/**
 * The few strings the app must show even when a language file cannot download: the error pages
 * and the offline notice. They stay in the main bundle; all other text loads per language.
 */
export type ShellText = typeof en;

// ar.json must match the shape of en.json, or this line fails the type check (VAL-009).
const SHELL_TEXT: Record<Locale, ShellText> = { ar, en };

/** Shell text for a known locale. */
export function shellTextFor(locale: Locale): ShellText {
  return SHELL_TEXT[locale];
}

/** Shell text for the `:locale` in the URL. Falls back to the default outside locale routes. */
export function useShellText(): ShellText {
  const { locale } = useParams<{ locale?: string }>();
  return shellTextFor(locale && hasLocale(locale) ? locale : DEFAULT_LOCALE);
}

/** Both languages, for the page shown when the current language itself failed to load. */
export const ALL_SHELL_TEXT = SHELL_TEXT;
