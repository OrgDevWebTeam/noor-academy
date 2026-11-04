import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import type { Locale } from "@/i18n/config";

// Open-licensed (OFL) placeholders until the design system picks the final fonts.
// next/font downloads them at build time and serves them from our own domain,
// so visitors' browsers never contact Google.
//
// No preload: both languages share one root layout, so preloading would send both fonts to
// every page and the browser would warn about the unused files. Without it, a page downloads
// only the files its text needs, and "swap" shows a size-matched system font until they arrive.

// Also has Latin letters, so English words and digits inside Arabic text match.
// Two weights cover body text (400) and headings (600), keeping mobile downloads small.
const arabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "600"],
  variable: "--font-ui",
  display: "swap",
  preload: false,
});

const latin = IBM_Plex_Sans({
  variable: "--font-ui",
  display: "swap",
  preload: false,
});

/** The UI font for a page language. */
export function uiFont(locale: Locale) {
  return locale === "ar" ? arabic : latin;
}
