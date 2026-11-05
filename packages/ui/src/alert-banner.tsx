import type { ReactNode } from "react";

export type AlertTone = "info" | "warning" | "error" | "success";

const tones: Record<AlertTone, string> = {
  info: "border-blue-300 bg-blue-50 text-blue-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  error: "border-red-300 bg-red-50 text-red-950",
  success: "border-green-300 bg-green-50 text-green-950",
};

type AlertBannerProps = { tone: AlertTone; title: string; children?: ReactNode };

export function AlertBanner({ tone, title, children }: AlertBannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border-b px-4 py-3 text-sm ${tones[tone]}`}
    >
      <p className="font-semibold">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
