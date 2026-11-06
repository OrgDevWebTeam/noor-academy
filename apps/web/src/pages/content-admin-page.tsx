import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// A01 — content management (FR-CMS-001). Content admins land here after sign-in (G06).
export function Component() {
  const { dict } = useI18n();
  return (
    <ScreenPlaceholder screenId="A01" title={dict.screens.contentAdmin} note={dict.placeholder} />
  );
}
