import type { Metadata, Viewport } from "next";
import { OfflineBanner } from "@/components/offline-banner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteHeader } from "@/components/site-header";
import { LOCALES, textDirection } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { uiFont } from "../fonts";
import "../globals.css";

// Required with Cache Components: every root parameter needs its values.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Colours the browser bar and the installed app's title bar (PWA).
export const viewport: Viewport = {
  themeColor: "#1b6b5a",
};

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    // Each page sets its own title; the template adds the product name (WCAG 2.4.2).
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={textDirection(locale)}
      className={`${uiFont(locale).variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <OfflineBanner locale={locale} />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
