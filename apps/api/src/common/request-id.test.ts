import { describe, expect, it } from "vitest";
import { resolveRequestId } from "./request-id.js";

describe("resolveRequestId", () => {
  it("reuses a well-formed id", () => {
    expect(resolveRequestId("abc-12345_xyz.9")).toBe("abc-12345_xyz.9");
  });

  it("generates a uuid when missing", () => {
    expect(resolveRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("replaces ids with unsafe characters", () => {
    const id = resolveRequestId("bad id\nwith newline");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("ignores array-valued headers", () => {
    expect(resolveRequestId(["abc-12345", "def-67890"])).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects ids that are too short or too long", () => {
    expect(resolveRequestId("short")).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId("x".repeat(129))).toMatch(/^[0-9a-f-]{36}$/);
  });
});
