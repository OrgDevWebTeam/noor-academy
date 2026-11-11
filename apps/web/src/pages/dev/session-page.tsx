import { AlertBanner, Button, TextField } from "@noor/ui";
import { useState } from "react";
import { useNavigate } from "react-router";
import { PageTitle } from "@/components/page-title";
import { useI18n } from "@/i18n/locale-data";
import { fetchAccount } from "@/lib/session/account";
import { signIn, signOut, useSession } from "@/lib/session/session-store";

// Development only: starts a parent session with a token from the local test identity provider
// (apps/api/scripts/dev-idp.mjs, proxied at /dev-idp by the Vite dev server). Real sign-in (G06)
// waits for the identity provider decision. Production bundles do not contain this page.

const DEV_IDP_TOKEN_URL = "/dev-idp/token";

async function requestTestToken(subject: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${DEV_IDP_TOKEN_URL}?sub=${encodeURIComponent(subject)}`);
    return response.ok ? (await response.text()).trim() : undefined;
  } catch {
    return undefined;
  }
}

export function Component() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const session = useSession();
  const [subject, setSubject] = useState("dev-parent-1");
  const [problem, setProblem] = useState<string>();
  const [isWorking, setIsWorking] = useState(false);

  async function handleStart() {
    setIsWorking(true);
    setProblem(undefined);
    const token = await requestTestToken(subject);
    const account = token ? await fetchAccount(token) : undefined;
    setIsWorking(false);
    if (!token) {
      setProblem("No token. Is dev-idp running? (pnpm --filter @noor/api dev:idp)");
      return;
    }
    if (!account?.ok) {
      setProblem(
        "The API refused the token. Is the API running with the dev-idp settings in .env?",
      );
      return;
    }
    signIn(token, account.data);
    void navigate(`/${locale}/profiles`);
  }

  return (
    <>
      <PageTitle title="Dev session" />
      <h1 className="text-2xl font-bold">Test parent session</h1>
      <p className="max-w-xl text-ink-muted">
        Gets a signed test token from the local dev-idp and keeps it in memory only. A reload signs
        out. Use a different parent ID to test a second family.
      </p>
      {problem && <AlertBanner tone="danger">{problem}</AlertBanner>}
      {session.status === "signed-in" ? (
        <div className="flex flex-col items-start gap-3">
          <p>
            Signed in as <bdi dir="ltr">{session.account.userId}</bdi> (
            {session.account.roles.join(", ")}).
          </p>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </div>
      ) : (
        <form
          className="flex max-w-md flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleStart();
          }}
        >
          <TextField
            id="dev-subject"
            label="Test parent ID"
            hint="Any text. The same ID always opens the same family."
            dir="ltr"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <Button type="submit" loading={isWorking} className="self-start">
            Start session
          </Button>
        </form>
      )}
    </>
  );
}
