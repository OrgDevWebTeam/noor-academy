import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// T02 — review queue. Teachers land here after sign-in (G06).
export function Component() {
  const { dict } = useI18n();
  return (
    <ScreenPlaceholder screenId="T02" title={dict.screens.reviewQueue} note={dict.placeholder} />
  );
}
