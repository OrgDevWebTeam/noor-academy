import { EmptyState } from "@noor/ui";
import { PageTitle } from "./page-title";

type ScreenPlaceholderProps = {
  /** Screen ID from the UI Screens Spec, e.g. "C01". */
  screenId: string;
  title: string;
  note: string;
};

/** Stand-in for a screen that is routed but not built yet. */
export function ScreenPlaceholder({ screenId, title, note }: ScreenPlaceholderProps) {
  return (
    <>
      <PageTitle title={title} />
      <EmptyState
        headingLevel={1}
        title={title}
        description={note}
        action={
          // The ID stays LTR inside the line; the line itself follows the page direction.
          <p className="text-sm text-ink-muted">
            <bdi dir="ltr">{screenId}</bdi>
          </p>
        }
      />
    </>
  );
}
