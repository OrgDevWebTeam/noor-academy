import { Link } from "react-router";
import { useI18n } from "@/i18n/locale-data";
import { LanguageSwitcher } from "./language-switcher";

/** Top bar on every page: the product name as a home link, and the language switcher (X01). */
export function SiteHeader() {
  const { dict, locale } = useI18n();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to={`/${locale}`} className="font-semibold">
          {dict.meta.title}
        </Link>
        <LanguageSwitcher current={locale} label={dict.languageSwitcher.label} />
      </div>
    </header>
  );
}
