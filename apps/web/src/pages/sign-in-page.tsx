import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// G06 — sign-in. May become the identity provider's hosted page (OD-03).
export function Component() {
  const { dict } = useI18n();
  return <ScreenPlaceholder screenId="G06" title={dict.screens.signIn} note={dict.placeholder} />;
}
