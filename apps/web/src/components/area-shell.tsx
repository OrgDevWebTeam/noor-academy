import { Outlet } from "react-router";

export type Area = "auth" | "family" | "child" | "parent" | "teacher" | "admin";

/**
 * Page frame for one area of the app. Each area in `router.tsx` renders it once.
 *
 * Private areas will read the session here to decide what to show. That check only shapes the
 * page: the API enforces every permission itself (ADR-0006).
 */
export function AreaShell({ area }: { area: Area }) {
  return (
    <div data-area={area} className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
