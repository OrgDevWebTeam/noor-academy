import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALE_NAMES, LOCALES, hasLocale } from "./config";

describe("locale config", () => {
  it("accepts only supported locales", () => {
    expect(hasLocale("ar")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("fr")).toBe(false);
    expect(hasLocale("AR")).toBe(false);
    expect(hasLocale("")).toBe(false);
  });

  it("uses a default that is one of the supported locales", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("has a native name for every locale", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale].trim()).not.toBe("");
    }
  });
});
