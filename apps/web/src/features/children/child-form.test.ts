import { describe, expect, it } from "vitest";
import { birthYearOptions, validateChildForm } from "./child-form";

const YEAR = 2026;
const valid = { displayName: "Test Child", birthYear: "2017", pin: "1234", pinConfirm: "1234" };

describe("birthYearOptions", () => {
  it("covers ages 6 to 14, newest first", () => {
    const years = birthYearOptions(YEAR);
    expect(years[0]).toBe(2020);
    expect(years.at(-1)).toBe(2012);
    expect(years).toHaveLength(9);
  });
});

describe("validateChildForm", () => {
  it("accepts a complete form", () => {
    expect(validateChildForm(valid, YEAR)).toEqual({});
  });

  it("needs a name of at most 50 characters", () => {
    expect(validateChildForm({ ...valid, displayName: "  " }, YEAR)).toEqual({
      displayName: "required",
    });
    expect(validateChildForm({ ...valid, displayName: "a".repeat(51) }, YEAR)).toEqual({
      displayName: "tooLong",
    });
  });

  it("needs a birth year in the served range", () => {
    expect(validateChildForm({ ...valid, birthYear: "" }, YEAR)).toEqual({ birthYear: "required" });
    expect(validateChildForm({ ...valid, birthYear: "2008" }, YEAR)).toEqual({
      birthYear: "required",
    });
  });

  it("needs a four-digit PIN typed twice", () => {
    expect(validateChildForm({ ...valid, pin: "12a4", pinConfirm: "12a4" }, YEAR)).toEqual({
      pin: "pinFormat",
    });
    expect(validateChildForm({ ...valid, pin: "123456", pinConfirm: "123456" }, YEAR)).toEqual({
      pin: "pinFormat",
    });
    expect(validateChildForm({ ...valid, pinConfirm: "4321" }, YEAR)).toEqual({
      pinConfirm: "pinMismatch",
    });
  });
});
