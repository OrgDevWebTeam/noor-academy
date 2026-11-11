import { describe, expect, it } from "vitest";
import { type Area, areaRedirect } from "./area-access";
import { type Session } from "./session-store";

const signedOut: Session = { status: "signed-out" };
const parent: Session = {
  status: "signed-in",
  token: "t",
  account: { userId: "u1", roles: ["parent"], familyId: "f1" },
};
const childMode: Session = { ...parent, activeChild: { id: "c1", displayName: "Child One" } };

describe("areaRedirect", () => {
  it.each<Area>(["family", "child"])(
    "sends a signed-out visitor from %s to the landing page",
    (area) => {
      expect(areaRedirect(area, signedOut)).toBe("landing");
    },
  );

  it("opens the family area after sign-in", () => {
    expect(areaRedirect("family", parent)).toBeNull();
  });

  it("opens the child area only with an active child", () => {
    expect(areaRedirect("child", parent)).toBe("profiles");
    expect(areaRedirect("child", childMode)).toBeNull();
  });
});
