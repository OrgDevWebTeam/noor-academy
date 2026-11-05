import { type Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

// Each loader must return the full Dictionary shape, so a key missing
// from ar.json fails the type check instead of reaching users (VAL-009).
export const dictionaryLoaders: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};
