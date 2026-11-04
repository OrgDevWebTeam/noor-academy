import type { ReactNode } from "react";

export type Area = "auth" | "family" | "child" | "parent" | "teacher" | "admin";

type AreaShellProps = {
  area: Area;
  children: ReactNode;
};

/**
 * Page frame for one area of the app. Each route group's layout renders it once.
 *
 * Private areas must read the session in their layout (Architecture 6). That makes them
 * dynamic, so Next.js sends `Cache-Control: private, no-store` and no shared
 * cache ever holds child or family data.
 */
export function AreaShell({ area, children }: AreaShellProps) {
  return (
    <div data-area={area} className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
