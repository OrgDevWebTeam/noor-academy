"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, textDirection, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/paths";

type LanguageLinksProps = {
  current: Locale;
  /** Accessible name for the control, in the current page language. */
  label: string;
  /** The page to open in the other language. */
  pathname: string;
};

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function rememberLocale(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax${secure}`;
}

/** Links to the other language(s); clicking one also remembers the choice (X01). */
export function LanguageLinks({ current, label, pathname }: LanguageLinksProps) {
  const others = LOCALES.filter((locale) => locale !== current);

  return (
    <nav aria-label={label}>
      <ul className="flex gap-3">
        {others.map((locale) => (
          <li key={locale}>
            <Link
              href={localizedPath(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              dir={textDirection(locale)}
              onClick={() => rememberLocale(locale)}
              className="rounded-md px-2 py-1 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {LOCALE_NAMES[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * X01 — opens the same page in the other language. Reads the current path in the browser,
 * so render it inside <Suspense> with a LanguageLinks fallback (the other language's home).
 */
export function LanguageSwitcher({ current, label }: Omit<LanguageLinksProps, "pathname">) {
  const pathname = usePathname();
  return <LanguageLinks current={current} label={label} pathname={pathname} />;
}
