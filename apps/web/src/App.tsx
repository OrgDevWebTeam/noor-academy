import { DEFAULT_LOCALE, LOCALES, textDirection, type Locale } from "@noor/contracts";
import { useEffect, useState } from "react";

/**
 * Placeholder shell proving the toolchain and shared contracts work end to end.
 * Replace with the real shell (router, i18n, PWA, UI primitives) - owners: Qussai / Ismail.
 */
export function App() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = textDirection(locale);
  }, [locale]);

  return (
    <main style={{ paddingInline: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Noor Academy</h1>
      <p>{locale === "ar" ? "مرحباً بكم" : "Welcome"}</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            disabled={code === locale}
            onClick={() => setLocale(code)}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </main>
  );
}
