import { EmptyState } from "@noor/ui";
import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";

// C01 — child home skeleton (FR-JRN-002). The child area opens it only after a correct PIN on G08.
// Today's activities and their progress come with KAN-31, once the mission APIs exist (KAN-30,
// KAN-40).
export function Component() {
  const { dict } = useI18n();

  return (
    <>
      <PageTitle title={dict.screens.today} />
      <h1 className="text-2xl font-bold">{dict.screens.today}</h1>
      <EmptyState title={dict.today.emptyTitle} description={dict.today.emptyBody} />
    </>
  );
}
