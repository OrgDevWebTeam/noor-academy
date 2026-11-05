import { Link, useLocation } from "react-router";
import { LOCALES, LOCALE_NAMES, textDirection, type Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/paths";
import { rememberLocale } from "@/i18n/preferred-locale";

type LanguageSwitcherProps = {
  current: Locale;
  /** Accessible name for the control, in the current page language. */
  label: string;
};

/** X01 — opens the same page in the other language and remembers the choice. */
export function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  const { pathname, search } = useLocation();
  const others = LOCALES.filter((locale) => locale !== current);

  return (
    <nav aria-label={label}>
      <ul className="flex gap-3">
        {others.map((locale) => (
          <li key={locale}>
            <Link
              to={localizedPath(pathname, locale) + search}
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
