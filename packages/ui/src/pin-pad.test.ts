import { describe, expect, it } from "vitest";
import { pressPinKey } from "./pin-pad";

describe("pressPinKey", () => {
  it("adds digits until the PIN is complete", () => {
    expect(pressPinKey("", "1", 4)).toEqual({ digits: "1" });
    expect(pressPinKey("12", "3", 4)).toEqual({ digits: "123" });
  });

  it("hands over the full PIN and clears the entered digits", () => {
    expect(pressPinKey("123", "4", 4)).toEqual({ digits: "", completed: "1234" });
  });

  it("deletes the last digit", () => {
    expect(pressPinKey("12", "back", 4)).toEqual({ digits: "1" });
    expect(pressPinKey("", "back", 4)).toEqual({ digits: "" });
  });

  it("respects a different length", () => {
    expect(pressPinKey("12345", "6", 6)).toEqual({ digits: "", completed: "123456" });
  });
});
