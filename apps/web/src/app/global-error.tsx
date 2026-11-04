"use client";

import { Button } from "@noor/ui";
import { ALL_CLIENT_TEXT } from "@/i18n/client-text";
import { LOCALES, textDirection } from "@/i18n/config";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// X06 — the main layout itself failed, so the page language is unknown: show both languages.
// This page replaces the whole document, so it brings its own <html>, <body> and styles.
export default function GlobalError({ retry }: GlobalErrorProps) {
  return (
    <html lang="ar">
      <body className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 font-sans">
        {LOCALES.map((locale) => (
          <section
            key={locale}
            lang={locale}
            dir={textDirection(locale)}
            className="flex max-w-md flex-col gap-3"
          >
            <h1 className="text-2xl font-semibold">{ALL_CLIENT_TEXT[locale].error.title}</h1>
            <p className="text-ink-muted">{ALL_CLIENT_TEXT[locale].error.body}</p>
            <div>
              <Button onClick={() => retry()}>{ALL_CLIENT_TEXT[locale].error.retry}</Button>
            </div>
          </section>
        ))}
      </body>
    </html>
  );
}
