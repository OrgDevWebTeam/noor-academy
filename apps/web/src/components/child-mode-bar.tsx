import { Button } from "@noor/ui";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/locale-data";
import { clearActiveChild, useSession } from "@/lib/session/session-store";

/** X05 — the way out of child mode, on every page of the child area. It returns to G08. */
export function ChildModeBar() {
  const { dict, locale } = useI18n();
  const session = useSession();
  const navigate = useNavigate();
  const child = session.status === "signed-in" ? session.activeChild : undefined;

  function handleExit() {
    clearActiveChild();
    void navigate(`/${locale}/profiles`);
  }

  return (
    <div className="border-b border-line bg-surface-muted">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-2 sm:px-6">
        {child && (
          <p className="font-semibold">
            <bdi>{child.displayName}</bdi>
          </p>
        )}
        <Button variant="secondary" className="ms-auto" onClick={handleExit}>
          {dict.childMode.exit}
        </Button>
      </div>
    </div>
  );
}
