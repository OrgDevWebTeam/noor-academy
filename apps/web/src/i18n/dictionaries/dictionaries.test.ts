import { describe, expect, it } from "vitest";
import clientAr from "../client-dictionaries/ar.json";
import clientEn from "../client-dictionaries/en.json";
import ar from "./ar.json";
import en from "./en.json";

/** Every leaf key as a dotted path, e.g. "notFound.home". */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leafValues(value: unknown): unknown[] {
  if (typeof value !== "object" || value === null) return [value];
  return Object.values(value).flatMap(leafValues);
}

describe.each([
  ["page dictionaries", ar, en],
  ["client dictionaries", clientAr, clientEn],
])("%s", (_, arabic, english) => {
  it("have exactly the same keys in Arabic and English (VAL-009)", () => {
    expect(keyPaths(arabic).sort()).toEqual(keyPaths(english).sort());
  });

  it("contain only non-empty strings", () => {
    for (const value of [...leafValues(arabic), ...leafValues(english)]) {
      expect(typeof value).toBe("string");
      expect((value as string).trim()).not.toBe("");
    }
  });
});
