import { ScreenPlaceholder } from "@/components/screen-placeholder";
import { useI18n } from "@/i18n/locale-data";

// G08 — profile picker and child PIN. Parents land here after sign-in.
export function Component() {
  const { dict } = useI18n();
  return <ScreenPlaceholder screenId="G08" title={dict.screens.profiles} note={dict.placeholder} />;
}
