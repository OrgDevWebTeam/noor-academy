import { describe, expect, it } from "vitest";
import { ROLES, hasPermission, isStaffRole } from "./roles";

describe("permissions", () => {
  it("lets parents manage their children but not users", () => {
    expect(hasPermission(["parent"], "child:create")).toBe(true);
    expect(hasPermission(["parent"], "user:manage")).toBe(false);
  });

  it("lets teachers read but not create children", () => {
    expect(hasPermission(["teacher"], "child:read")).toBe(true);
    expect(hasPermission(["teacher"], "child:create")).toBe(false);
  });

  it("lets only parents create recitation attempts", () => {
    expect(hasPermission(["parent"], "attempt:create")).toBe(true);
    expect(hasPermission(["teacher"], "attempt:create")).toBe(false);
    expect(hasPermission(["platform_admin"], "attempt:create")).toBe(false);
  });

  it("keeps admins away from child data by default", () => {
    expect(hasPermission(["platform_admin"], "child:read")).toBe(false);
    expect(hasPermission(["content_admin"], "child:read")).toBe(false);
  });

  it("grants nothing without roles", () => {
    expect(hasPermission([], "child:read")).toBe(false);
  });

  it("treats every role except parent as staff", () => {
    expect(ROLES.filter(isStaffRole)).toEqual(["teacher", "content_admin", "platform_admin"]);
  });
});
