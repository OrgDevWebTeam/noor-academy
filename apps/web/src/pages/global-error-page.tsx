import { Button } from "@noor/ui";
import { LOCALES, textDirection } from "@/i18n/config";
import { ALL_SHELL_TEXT } from "@/i18n/shell-text";

// X06 — the page frame or the language file failed, so the header and the page language may be
// unavailable: show the message in both languages.
export function GlobalErrorPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      {LOCALES.map((locale) => (
        <section
          key={locale}
          lang={locale}
          dir={textDirection(locale)}
          className="flex max-w-md flex-col gap-3"
        >
          <h1 className="text-2xl font-semibold">{ALL_SHELL_TEXT[locale].error.title}</h1>
          <p className="text-ink-muted">{ALL_SHELL_TEXT[locale].error.body}</p>
          <div>
            <Button onClick={() => window.location.reload()}>
              {ALL_SHELL_TEXT[locale].error.retry}
            </Button>
          </div>
        </section>
      ))}
    </main>
  );
}
