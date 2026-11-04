import { AreaShell } from "@/components/area-shell";

// G03–G07: sign-up, sign-in and recovery. Public, but no child data is shown here.
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return <AreaShell area="auth">{children}</AreaShell>;
}
