import { describe, expect, it } from "vitest";
import { textDirection } from "./index";

describe("textDirection", () => {
  it("returns rtl for Arabic and ltr for English", () => {
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("en")).toBe("ltr");
  });
});
