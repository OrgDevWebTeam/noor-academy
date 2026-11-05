import { type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  /** Heading level for the title, so the page outline stays correct. */
  headingLevel?: 2 | 3 | 4;
  actions?: ReactNode;
};

/** A bordered block that groups related content, with an optional title and actions. */
export function Card({
  title,
  headingLevel = 2,
  actions,
  className,
  children,
  ...rest
}: CardProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-control border border-line bg-surface p-4 text-ink",
        className,
      )}
      {...rest}
    >
      {title && <Heading className="text-lg font-semibold">{title}</Heading>}
      {children}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
