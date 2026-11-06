import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// C01 — Today's journey (FR-JRN-002). The active child comes from the session, never the URL.
export function Component() {
  const { dict } = useI18n();
  return <ScreenPlaceholder screenId="C01" title={dict.screens.today} note={dict.placeholder} />;
}
