import { describe, expect, it } from "vitest";
import { satisfiesMfa } from "./mfa.js";

describe("satisfiesMfa", () => {
  it("accepts amr containing mfa", () => {
    expect(satisfiesMfa({ amr: ["pwd", "mfa"] })).toBe(true);
  });

  it("rejects missing, empty or password-only amr", () => {
    expect(satisfiesMfa({})).toBe(false);
    expect(satisfiesMfa({ amr: [] })).toBe(false);
    expect(satisfiesMfa({ amr: ["pwd"] })).toBe(false);
    expect(satisfiesMfa({ amr: "mfa" })).toBe(false);
  });
});
