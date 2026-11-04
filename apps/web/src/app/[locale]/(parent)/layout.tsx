import { AreaShell } from "@/components/area-shell";

// P01–P09: parent area. Private: the session check goes here (Architecture 6).
export default function ParentLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="parent">{children}</AreaShell>;
}
