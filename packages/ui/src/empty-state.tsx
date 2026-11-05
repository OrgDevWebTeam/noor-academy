import type { ReactNode } from "react";

type EmptyStateProps = {
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

/** Centered message for empty, missing or forbidden content. Logical CSS only (LTR/RTL safe). */
export function EmptyState({ headingLevel, title, description, action }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <Heading className="text-xl font-semibold">{title}</Heading>
      {description ? <p className="text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  );
}
