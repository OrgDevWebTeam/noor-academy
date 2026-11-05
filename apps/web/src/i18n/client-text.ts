import { useParams } from "react-router-dom";
import ar from "./client-dictionaries/ar.json";
import en from "./client-dictionaries/en.json";
import { DEFAULT_LOCALE, hasLocale, type Locale } from "./config";

/**
 * The few strings Client Components need (error boundary, offline banner). Kept apart from the
 * server dictionaries so the browser never downloads every page's text.
 */
export type ClientText = typeof en;

// ar.json must match the shape of en.json, or this line fails the type check (VAL-009).
const CLIENT_TEXT: Record<Locale, ClientText> = { ar, en };

/** Client text for a known locale. Prefer this: pass the locale down from a Server Component. */
export function clientTextFor(locale: Locale): ClientText {
  return CLIENT_TEXT[locale];
}

/**
 * Client text for the page's `[locale]`, for components that cannot receive it as a prop
 * (error boundaries). Falls back to the default outside locale routes.
 */
export function useClientText(): ClientText {
  const { locale } = useParams<{ locale?: string }>();
  return clientTextFor(locale && hasLocale(locale) ? locale : DEFAULT_LOCALE);
}

/** Both languages, for pages that cannot know the locale (the global error page). */
export const ALL_CLIENT_TEXT = CLIENT_TEXT;
