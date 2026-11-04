import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { LanguageLinks, LanguageSwitcher } from "./language-switcher";

/** Top bar on every page: the product name as a home link, and the language switcher (X01). */
export async function SiteHeader() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const label = dict.languageSwitcher.label;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="font-semibold">
          {dict.meta.title}
        </Link>
        {/* Until the browser knows the exact page, the link opens the other language's home. */}
        <Suspense
          fallback={<LanguageLinks current={locale} label={label} pathname={`/${locale}`} />}
        >
          <LanguageSwitcher current={locale} label={label} />
        </Suspense>
      </div>
    </header>
  );
}
