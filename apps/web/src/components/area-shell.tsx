import { SkeletonText } from "@noor/ui";
import { Outlet, useNavigation } from "react-router";
import { type Area } from "@/lib/session/area-access";
import { ChildModeBar } from "./child-mode-bar";

/**
 * Page frame for one area of the app. Each area in `router.tsx` renders it once; the area's
 * loader has already checked the session. While the next page loads, a skeleton takes its place.
 */
export function AreaShell({ area }: { area: Area }) {
  const isLoading = useNavigation().state === "loading";

  return (
    <div data-area={area} className="flex flex-1 flex-col">
      {area === "child" && <ChildModeBar />}
      <main
        aria-busy={isLoading}
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6"
      >
        {isLoading ? <SkeletonText lines={4} /> : <Outlet />}
      </main>
    </div>
  );
}
