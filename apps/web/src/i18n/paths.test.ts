import { describe, expect, it } from "vitest";
import { localeInPath, localizedPath } from "./paths";

describe("localeInPath", () => {
  it("reads the language from the first segment", () => {
    expect(localeInPath("/ar")).toBe("ar");
    expect(localeInPath("/en/teacher/review")).toBe("en");
  });

  it("finds nothing when the first segment is not a language", () => {
    expect(localeInPath("/")).toBeUndefined();
    expect(localeInPath("/arabic")).toBeUndefined();
    expect(localeInPath("/stories/ar")).toBeUndefined();
  });
});

describe("localizedPath", () => {
  it("swaps the locale and keeps the rest of the path", () => {
    expect(localizedPath("/ar/today", "en")).toBe("/en/today");
    expect(localizedPath("/en/teacher/review", "ar")).toBe("/ar/teacher/review");
  });

  it("handles the locale root", () => {
    expect(localizedPath("/ar", "en")).toBe("/en");
  });

  it("adds a locale to paths that have none", () => {
    expect(localizedPath("/", "ar")).toBe("/ar");
    expect(localizedPath("/stories/42", "en")).toBe("/en/stories/42");
  });

  it("does not mistake a look-alike segment for a locale", () => {
    expect(localizedPath("/arabic", "en")).toBe("/en/arabic");
  });
});
