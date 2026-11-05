import { useLayoutEffect } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { applyLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/locale-data";
import { OfflineBanner } from "./offline-banner";
import { RouteAnnouncer } from "./route-announcer";
import { SiteHeader } from "./site-header";

/** Frame of every localized page: language and direction, header, offline notice, then the page. */
export function LocaleLayout() {
  const { locale, dict } = useI18n();

  // Runs before the browser paints, so a language switch never shows the old direction.
  useLayoutEffect(() => applyLocale(locale), [locale]);

  return (
    <>
      <meta name="description" content={dict.meta.description} />
      <SiteHeader />
      <OfflineBanner locale={locale} />
      <Outlet />
      <RouteAnnouncer />
      <ScrollRestoration />
    </>
  );
}
