"use client";

import { Button, EmptyState } from "@noor/ui";
import { useClientText } from "@/i18n/client-text";

type ErrorPageProps = {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed part of the page. */
  retry: () => void;
};

// X06 — an error inside a page: a calm message and a retry button.
// Details never reach the screen; the server logs keep them under error.digest.
export default function ErrorPage({ retry }: ErrorPageProps) {
  const text = useClientText();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <EmptyState
        headingLevel={1}
        title={text.error.title}
        description={text.error.body}
        action={<Button onClick={() => retry()}>{text.error.retry}</Button>}
      />
    </main>
  );
}
