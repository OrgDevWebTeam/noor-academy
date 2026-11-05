import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// P01 — parent home (FR-PAR-001).
export function Component() {
  const { dict } = useI18n();
  return (
    <ScreenPlaceholder screenId="P01" title={dict.screens.parentHome} note={dict.placeholder} />
  );
}
