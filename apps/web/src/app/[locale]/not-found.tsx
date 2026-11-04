import { EmptyState, buttonClasses } from "@noor/ui";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

// X06 — localized 404.
export default async function NotFound() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <EmptyState
        headingLevel={1}
        title={dict.notFound.title}
        description={dict.notFound.body}
        action={
          <Link href={`/${locale}`} className={buttonClasses("secondary")}>
            {dict.notFound.home}
          </Link>
        }
      />
    </main>
  );
}
