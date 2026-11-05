import { AlertBanner } from "@noor/ui";
import { useSyncExternalStore } from "react";
import { type Locale } from "@/i18n/config";
import { shellTextFor } from "@/i18n/shell-text";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * X06 — tells the user when the connection drops. The app does not keep pages or child data
 * for offline use (privacy rule: devices are often shared), so this is a notice, not a mode.
 */
export function OfflineBanner({ locale }: { locale: Locale }) {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const text = shellTextFor(locale);

  if (online) return null;
  return (
    <AlertBanner tone="warning" title={text.offline.title}>
      {text.offline.body}
    </AlertBanner>
  );
}
