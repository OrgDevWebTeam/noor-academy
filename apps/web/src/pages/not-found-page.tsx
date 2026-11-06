import { EmptyState, buttonClasses } from "@noor/ui";
import { Link } from "react-router";
import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";

// X06 — localized 404. Static hosting answers every path with the app, so the app decides this.
export function NotFoundPage() {
  const { dict, locale } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <PageTitle title={dict.notFound.title} />
      <EmptyState
        headingLevel={1}
        title={dict.notFound.title}
        description={dict.notFound.body}
        action={
          <Link to={`/${locale}`} className={buttonClasses("secondary")}>
            {dict.notFound.home}
          </Link>
        }
      />
    </main>
  );
}
