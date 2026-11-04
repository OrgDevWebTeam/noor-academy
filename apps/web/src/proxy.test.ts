import { DEFAULT_LOCALE } from "@noor/contracts";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

function requestTo(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

function redirectPath(path: string, headers?: Record<string, string>) {
  const response = proxy(requestTo(path, headers));
  const location = response?.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : undefined;
}

describe("proxy locale redirect", () => {
  it("leaves paths that already have a locale untouched", () => {
    expect(proxy(requestTo("/ar"))).toBeUndefined();
    expect(proxy(requestTo("/en/parent"))).toBeUndefined();
  });

  it("uses the saved locale cookie first", () => {
    const headers = { cookie: "NOOR_LOCALE=en", "accept-language": "ar-JO,ar;q=0.9" };
    expect(redirectPath("/", headers)).toBe("/en");
  });

  it("falls back to the browser's first supported language", () => {
    expect(redirectPath("/", { "accept-language": "en-US,en;q=0.9" })).toBe("/en");
    expect(redirectPath("/", { "accept-language": "fr-FR,ar;q=0.8,en;q=0.5" })).toBe("/ar");
  });

  it("uses the shared default locale when nothing matches", () => {
    expect(redirectPath("/")).toBe(`/${DEFAULT_LOCALE}`);
    expect(redirectPath("/", { "accept-language": "fr-FR,de;q=0.8" })).toBe(`/${DEFAULT_LOCALE}`);
  });

  it("ignores an unsupported value in the cookie", () => {
    const headers = { cookie: "NOOR_LOCALE=fr", "accept-language": "en-GB" };
    expect(redirectPath("/", headers)).toBe("/en");
  });

  it("keeps the rest of the path and the query string", () => {
    expect(redirectPath("/stories/42?campaign=yt", { "accept-language": "ar" })).toBe(
      "/ar/stories/42?campaign=yt",
    );
  });

  it("does not treat a look-alike prefix as a locale", () => {
    expect(redirectPath("/arabic", { "accept-language": "en" })).toBe("/en/arabic");
  });
});
