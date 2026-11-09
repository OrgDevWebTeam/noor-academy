import { describe, expect, it } from "vitest";
import { type ApiError } from "@/lib/api/client";
import { toPinCheck } from "./children-api";

const failure = (error: ApiError) => ({ ok: false as const, error });

describe("toPinCheck", () => {
  it("accepts a correct PIN", () => {
    expect(toPinCheck({ ok: true, data: { ok: true } })).toBe("accepted");
  });

  it("tells a wrong PIN apart from an expired session", () => {
    expect(toPinCheck(failure({ kind: "unauthorized", status: 401, code: "invalid_pin" }))).toBe(
      "wrong-pin",
    );
    expect(toPinCheck(failure({ kind: "unauthorized", status: 401 }))).toBe("failed");
  });

  it("reports a locked profile", () => {
    expect(toPinCheck(failure({ kind: "locked", status: 423, code: "pin_locked" }))).toBe("locked");
  });

  it("reports a profile without a PIN", () => {
    expect(toPinCheck(failure({ kind: "conflict", status: 409, code: "pin_not_set" }))).toBe(
      "no-pin",
    );
  });

  it("treats anything else as a failure to retry", () => {
    expect(toPinCheck(failure({ kind: "network" }))).toBe("failed");
    expect(toPinCheck(failure({ kind: "not-found", status: 404 }))).toBe("failed");
  });
});
