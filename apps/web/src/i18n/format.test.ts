import { describe, expect, it } from "vitest";
import {
  ARABIC_NUMBERING,
  formatDate,
  formatNumber,
  formatTemplate,
  plural,
  type PluralForms,
} from "./format";

const ARABIC_INDIC_DIGITS = /[٠-٩]/;

describe("formatNumber", () => {
  it("uses the configured digits in Arabic", () => {
    const text = formatNumber("ar", 1234);
    if (ARABIC_NUMBERING === "latn") {
      expect(text).toMatch(/1.?234/);
      expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
    } else {
      expect(text).toMatch(ARABIC_INDIC_DIGITS);
    }
  });

  it("groups thousands in English", () => {
    expect(formatNumber("en", 1234)).toBe("1,234");
  });
});

describe("formatDate", () => {
  const date = new Date(Date.UTC(2026, 10, 4));

  it("writes Arabic month names in Arabic", () => {
    const text = formatDate("ar", date, { dateStyle: "long", timeZone: "UTC" });
    expect(text).toMatch(/[؀-ۿ]/);
    if (ARABIC_NUMBERING === "latn") expect(text).toContain("2026");
  });

  it("writes English dates in English", () => {
    expect(formatDate("en", date, { dateStyle: "long", timeZone: "UTC" })).toBe("November 4, 2026");
  });
});

describe("formatTemplate", () => {
  it("fills each slot with a number in the page language", () => {
    expect(formatTemplate("en", "{done} of {total}", { done: 2, total: 1200 })).toBe("2 of 1,200");
    expect(formatTemplate("ar", "{done} من {total}", { done: 2, total: 5 })).toBe(
      `${formatNumber("ar", 2)} من ${formatNumber("ar", 5)}`,
    );
  });

  it("leaves a slot without a value as it is", () => {
    expect(formatTemplate("en", "{done} of {total}", { done: 1 })).toBe("1 of {total}");
  });
});

describe("plural", () => {
  const missionsAr: PluralForms = {
    zero: "لا مهمات",
    one: "مهمة واحدة",
    two: "مهمتان",
    few: "{count} مهمات",
    many: "{count} مهمة",
    other: "{count} مهمة",
  };

  it("uses all six Arabic forms", () => {
    expect(plural("ar", 0, missionsAr)).toBe("لا مهمات");
    expect(plural("ar", 1, missionsAr)).toBe("مهمة واحدة");
    expect(plural("ar", 2, missionsAr)).toBe("مهمتان");
    expect(plural("ar", 3, missionsAr)).toBe(`${formatNumber("ar", 3)} مهمات`);
    expect(plural("ar", 11, missionsAr)).toBe(`${formatNumber("ar", 11)} مهمة`);
    expect(plural("ar", 100, missionsAr)).toBe(`${formatNumber("ar", 100)} مهمة`);
  });

  it("uses one and other in English", () => {
    const missionsEn: PluralForms = { one: "1 mission", other: "{count} missions" };
    expect(plural("en", 1, missionsEn)).toBe("1 mission");
    expect(plural("en", 2, missionsEn)).toBe("2 missions");
  });
});
