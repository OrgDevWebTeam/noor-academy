import { AlertBanner, Button, PinPad, buttonClasses } from "@noor/ui";
import { useState } from "react";
import { Link, redirect, useLoaderData, useNavigate, type LoaderFunctionArgs } from "react-router";
import { LoadFailed } from "@/components/load-failed";
import { PageTitle } from "@/components/page-title";
import { CHILD_PIN_LENGTH } from "@/features/children/child-form";
import {
  listChildren,
  verifyChildPin,
  type ChildProfile,
  type PinCheck,
} from "@/features/children/children-api";
import { formatTemplate } from "@/i18n/format";
import { useI18n } from "@/i18n/locale-data";
import { type ApiResult } from "@/lib/api/client";
import { clearActiveChild, getSession, setActiveChild } from "@/lib/session/session-store";

// G08 — profile picker and child PIN (FR-AUTH-002). Parents land here after sign-in, and leaving
// child mode (X05) returns here.

type ProfilesData = { children: ApiResult<ChildProfile[]> } | null;

const PIN_MESSAGES = {
  "wrong-pin": "wrongPin",
  locked: "locked",
  "no-pin": "noPin",
  failed: "checkFailed",
} as const;

export async function loader({ params }: LoaderFunctionArgs): Promise<ProfilesData | Response> {
  const session = getSession();
  // Signed out: the area loader sends the visitor away.
  if (session.status !== "signed-in") return null;
  // Opening the picker ends child mode, so nothing of the previous child stays in memory.
  clearActiveChild();
  const children = await listChildren(session.token);
  // A family with no children starts onboarding (J-01).
  if (children.ok && children.data.length === 0) {
    return redirect(`/${params.locale}/onboarding/child`);
  }
  return { children };
}

export function Component() {
  const data = useLoaderData<ProfilesData>();
  const { dict } = useI18n();
  const [selected, setSelected] = useState<ChildProfile>();

  return (
    <>
      <PageTitle title={dict.screens.profiles} />
      <h1 className="text-2xl font-bold">{dict.profiles.title}</h1>
      {data && !data.children.ok && <LoadFailed />}
      {data?.children.ok &&
        (selected ? (
          <PinStep child={selected} onCancel={() => setSelected(undefined)} />
        ) : (
          <ProfileGrid profiles={data.children.data} onSelect={setSelected} />
        ))}
    </>
  );
}

const CARD_CLASSES =
  "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-control border border-line bg-surface p-4 text-center hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type ProfileGridProps = {
  profiles: ChildProfile[];
  onSelect: (child: ChildProfile) => void;
};

// The parent card (the way into P01) comes with the parent area (KAN-60).
function ProfileGrid({ profiles, onSelect }: ProfileGridProps) {
  const { dict, locale } = useI18n();

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {profiles.map((child) => (
          <li key={child.id}>
            <button type="button" className={CARD_CLASSES} onClick={() => onSelect(child)}>
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-2xl font-bold"
              >
                {child.displayName.trim().charAt(0)}
              </span>
              <bdi className="text-lg font-semibold">{child.displayName}</bdi>
            </button>
          </li>
        ))}
      </ul>
      <div>
        <Link to={`/${locale}/onboarding/child`} className={buttonClasses("secondary")}>
          {dict.profiles.addChild}
        </Link>
      </div>
    </>
  );
}

type PinStepProps = { child: ChildProfile; onCancel: () => void };

function PinStep({ child, onCancel }: PinStepProps) {
  const { dict, locale } = useI18n();
  const navigate = useNavigate();
  // A profile without a PIN cannot be opened, so say so before any digit is typed.
  const [check, setCheck] = useState<PinCheck | "checking" | undefined>(
    child.hasPin ? undefined : "no-pin",
  );

  async function handleComplete(pin: string) {
    const session = getSession();
    if (session.status !== "signed-in") return;
    setCheck("checking");
    const result = await verifyChildPin(session.token, child.id, pin);
    if (result === "accepted") {
      setActiveChild({ id: child.id, displayName: child.displayName });
      void navigate(`/${locale}/today`);
      return;
    }
    setCheck(result);
  }

  const message = check && check !== "checking" && check !== "accepted" && PIN_MESSAGES[check];
  const isBlocked = check === "checking" || check === "locked" || check === "no-pin";

  return (
    <section aria-labelledby="pin-heading" className="flex flex-col items-center gap-4">
      <h2 id="pin-heading" className="text-xl font-semibold">
        <bdi>{child.displayName}</bdi>
      </h2>
      <p>{dict.profiles.enterPin}</p>
      {message && <AlertBanner tone="warning">{dict.profiles[message]}</AlertBanner>}
      <PinPad
        length={CHILD_PIN_LENGTH}
        disabled={isBlocked}
        labels={{
          pad: dict.profiles.enterPin,
          back: dict.profiles.pinBack,
          progress: (entered, total) =>
            formatTemplate(locale, dict.profiles.pinProgress, { entered, total }),
        }}
        onComplete={(pin) => void handleComplete(pin)}
      />
      {check === "checking" && <p role="status">{dict.profiles.checking}</p>}
      <Button variant="ghost" onClick={onCancel}>
        {dict.profiles.chooseAnother}
      </Button>
    </section>
  );
}
