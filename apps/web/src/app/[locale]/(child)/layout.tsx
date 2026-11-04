import { AreaShell } from "@/components/area-shell";

// C01–C10: child area. Private: the session check goes here (Architecture 6).
// No third-party scripts, trackers or session replay in this area (SEC-009, SEC-011).
export default function ChildLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="child">{children}</AreaShell>;
}
