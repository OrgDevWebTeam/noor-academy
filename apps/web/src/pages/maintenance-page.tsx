import { EmptyState } from "@noor/ui";
import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";

// X06 — announced maintenance. Operations can send visitors here during a planned outage.
export function Component() {
  const { dict } = useI18n();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <PageTitle title={dict.maintenance.title} />
      <EmptyState
        headingLevel={1}
        title={dict.maintenance.title}
        description={dict.maintenance.body}
      />
    </main>
  );
}
