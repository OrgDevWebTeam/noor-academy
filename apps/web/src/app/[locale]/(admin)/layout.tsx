import { AreaShell } from "@/components/area-shell";

// A01–A10: staff area. Private: the session and role checks go here (Architecture 6).
export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="admin">{children}</AreaShell>;
}
