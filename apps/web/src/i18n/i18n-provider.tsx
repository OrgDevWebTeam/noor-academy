import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { hasLocale, textDirection, type Locale } from "./config";
import { dictionaryLoaders, type Dictionary } from "./dictionary";
import { preferredLocale } from "./preferred-locale";
import { localizedPath } from "./paths";

type I18n = { locale: Locale; dir: "ltr" | "rtl"; dict: Dictionary };

const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <LocaleLayout>");
  return value;
}

function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [loaded, setLoaded] = useState<{ locale: Locale; dict: Dictionary } | null>(null);
  const dir = textDirection(locale);

  useEffect(() => {
    let cancelled = false;
    void dictionaryLoaders[locale]().then((dict) => {
      if (!cancelled) setLoaded({ locale, dict });
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  // Don't render with a stale dictionary while the new language loads.
  if (!loaded || loaded.locale !== locale) return null;

  return <I18nContext value={{ locale, dir, dict: loaded.dict }}>{children}</I18nContext>;
}

/** Route element for `/:locale`. Unknown first segments get redirected to a real locale. */
export function LocaleLayout() {
  const { locale } = useParams<{ locale: string }>();
  const { pathname, search, hash } = useLocation();

  if (!locale || !hasLocale(locale)) {
    // "/foo" -> "/en/foo", keeping the rest of the URL.
    return <Navigate to={localizedPath(pathname, preferredLocale()) + search + hash} replace />;
  }

  return (
    <I18nProvider locale={locale}>
      <Outlet />
    </I18nProvider>
  );
}

/** Route element for "/". */
export function RootRedirect() {
  return <Navigate to={`/${preferredLocale()}`} replace />;
}
