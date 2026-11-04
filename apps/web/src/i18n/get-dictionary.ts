import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, type Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

// Each loader must return the full Dictionary shape, so a key missing
// from ar.json fails the type check instead of reaching users (VAL-009).
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

/** The locale of the current request, read from the `[locale]` URL segment. */
export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  if (!hasLocale(value)) notFound();
  return value;
}

/** All UI text for the current request's locale. Server Components only. */
export async function getDictionary(): Promise<Dictionary> {
  return loaders[await getLocale()]();
}
