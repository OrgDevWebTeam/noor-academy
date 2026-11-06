import { Button, EmptyState } from "@noor/ui";
import { useShellText } from "@/i18n/shell-text";

// X06 — an error inside a page: a calm message and a retry button, under the normal header.
// Details never reach the screen; the browser console keeps them for developers.
export function ErrorPage() {
  const text = useShellText();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <title>{text.error.title}</title>
      <EmptyState
        headingLevel={1}
        title={text.error.title}
        description={text.error.body}
        action={<Button onClick={() => window.location.reload()}>{text.error.retry}</Button>}
      />
    </main>
  );
}
