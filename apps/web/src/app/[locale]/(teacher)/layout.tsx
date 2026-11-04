import { AreaShell } from "@/components/area-shell";

// T01–T05: teacher area. Private: the session and assignment checks go here (Architecture 6).
export default function TeacherLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="teacher">{children}</AreaShell>;
}
