import { type ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Use 1 when the message is the whole page, such as a 404. */
  headingLevel?: 1 | 2 | 3;
};

/**
 * A calm message for "nothing here yet", errors and other states (X06).
 * The copy must stay supportive and never blame the child or parent (UI spec, language rules).
 */
export function EmptyState({ title, description, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className="flex flex-col items-start gap-3 py-8 text-ink">
      <Heading className={headingLevel === 1 ? "text-2xl font-semibold" : "text-xl font-semibold"}>
        {title}
      </Heading>
      {description && <p className="max-w-prose text-ink-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
