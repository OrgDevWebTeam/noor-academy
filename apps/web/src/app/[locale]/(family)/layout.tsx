import { AreaShell } from "@/components/area-shell";

// G08 and O01–O04: profile picker and onboarding.
// Private: the session check goes here (Architecture 6).
export default function FamilyLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="family">{children}</AreaShell>;
}
