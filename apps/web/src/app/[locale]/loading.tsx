import { Skeleton, SkeletonText } from "@noor/ui";

// X06 — shown at once while a page streams in, instead of a blank screen.
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-8 w-1/3" />
      <SkeletonText lines={4} />
    </main>
  );
}
