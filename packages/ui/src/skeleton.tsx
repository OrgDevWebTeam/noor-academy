import { cx } from "./cx";

/**
 * A grey placeholder shape while content loads, instead of a blank screen (X06).
 * Hidden from screen readers; the page announces loading itself. Stops pulsing for
 * people who ask the system for reduced motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("rounded-control bg-surface-muted motion-safe:animate-pulse", className)}
    />
  );
}

/** A few text-like lines; the last one is shorter, like a real paragraph. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cx(
            "h-4 rounded bg-surface-muted motion-safe:animate-pulse",
            index === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}
