import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pin.js";

describe("pin hashing", () => {
  it("verifies the right pin and rejects a wrong one", async () => {
    const stored = await hashPin("1234");
    expect(await verifyPin("1234", stored)).toBe(true);
    expect(await verifyPin("4321", stored)).toBe(false);
  });

  it("uses a fresh salt each time and never stores the pin", async () => {
    const [a, b] = await Promise.all([hashPin("1234"), hashPin("1234")]);
    expect(a).not.toBe(b);
    expect(a).not.toContain("1234");
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPin("1234", "")).toBe(false);
    expect(await verifyPin("1234", "plain$x$y")).toBe(false);
    expect(await verifyPin("1234", "scrypt$$")).toBe(false);
  });
});
