import { AlertBanner, Button } from "@noor/ui";
import { useRevalidator } from "react-router";
import { useI18n } from "@/i18n/locale-data";

/** Error state of a screen whose data did not load: a calm message and a retry (X06). */
export function LoadFailed() {
  const { dict } = useI18n();
  const revalidator = useRevalidator();

  return (
    <AlertBanner
      tone="danger"
      action={
        <Button
          variant="secondary"
          loading={revalidator.state === "loading"}
          onClick={() => void revalidator.revalidate()}
        >
          {dict.common.retry}
        </Button>
      }
    >
      {dict.common.loadFailed}
    </AlertBanner>
  );
}
