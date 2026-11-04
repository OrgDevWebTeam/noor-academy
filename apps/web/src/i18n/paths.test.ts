import { describe, expect, it } from "vitest";
import { localizedPath } from "./paths";

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
