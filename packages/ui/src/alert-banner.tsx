import { type ReactNode } from "react";
import { cx } from "./cx";

export type BannerTone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BannerTone, string> = {
  info: "border-info",
  success: "border-success",
  warning: "border-warning",
  danger: "border-danger",
};

export type AlertBannerProps = {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
};

/**
 * A message across the page, such as "you are offline" (X06).
 * Warnings and errors interrupt screen readers (role="alert"); other tones wait (role="status").
 */
export function AlertBanner({ tone = "info", title, children, action }: AlertBannerProps) {
  const urgent = tone === "danger" || tone === "warning";

  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cx(
        "flex flex-wrap items-center gap-3 border-s-4 bg-surface-muted px-4 py-3 text-ink",
        TONE_CLASSES[tone],
      )}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
