import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLocale, type LocaleData } from "./locale-data";

function load(url: string) {
  const { pathname } = new URL(url);
  const first = pathname.split("/")[1];
  return loadLocale({ params: { locale: first }, request: new Request(url) });
}

describe("loadLocale", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { languages: ["ar-JO"] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the text of a language in the URL", async () => {
    const data = (await load("http://localhost/ar/today")) as LocaleData;
    expect(data.locale).toBe("ar");
    expect(data.dict.meta.title).toBe("نور أكاديمي");
  });

  it("adds a language to a path that has none, keeping the rest of the URL", async () => {
    const response = (await load("http://localhost/stories/42?campaign=yt")) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/ar/stories/42?campaign=yt");
  });

  it("does not treat a look-alike segment as a language", async () => {
    const response = (await load("http://localhost/arabic")) as Response;
    expect(response.headers.get("Location")).toBe("/ar/arabic");
  });
});
