import { redirect, useRouteLoaderData, type LoaderFunctionArgs } from "react-router";
import { hasLocale, type Locale } from "./config";
import type en from "./dictionaries/en.json";
import { localizedPath } from "./paths";
import { preferredLocale } from "./preferred-locale";

export type Dictionary = typeof en;

export type LocaleData = { locale: Locale; dict: Dictionary };

export const LOCALE_ROUTE_ID = "locale";

// Each loader must return the full Dictionary shape, so a key missing
// from ar.json fails the type check instead of reaching users (VAL-009).
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

/**
 * Loader of the `/:locale` route. Loading the language before the route renders means a language
 * switch never shows an empty page. A first segment that is not a language gets one added.
 */
export async function loadLocale({
  params,
  request,
}: Pick<LoaderFunctionArgs, "params" | "request">): Promise<LocaleData | Response> {
  const locale = params.locale ?? "";
  if (!hasLocale(locale)) {
    const { pathname, search } = new URL(request.url);
    return redirect(localizedPath(pathname, preferredLocale()) + search);
  }
  return { locale, dict: await loaders[locale]() };
}

/** The current language and its text, for any component under the `/:locale` route. */
export function useI18n(): LocaleData {
  const data = useRouteLoaderData<LocaleData>(LOCALE_ROUTE_ID);
  if (!data) throw new Error("useI18n must be used under the /:locale route");
  return data;
}
