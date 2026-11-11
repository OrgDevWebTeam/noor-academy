import { afterEach, describe, expect, it } from "vitest";
import { clearActiveChild, getSession, setActiveChild, signIn, signOut } from "./session-store";

const account = { userId: "u1", roles: ["parent" as const], familyId: "f1" };

afterEach(() => signOut());

describe("session store", () => {
  it("starts signed out", () => {
    expect(getSession()).toEqual({ status: "signed-out" });
  });

  it("holds the token and account after sign-in", () => {
    signIn("token", account);
    expect(getSession()).toEqual({ status: "signed-in", token: "token", account });
  });

  it("replaces the active child when another child is chosen", () => {
    signIn("token", account);
    setActiveChild({ id: "c1", displayName: "Child One" });
    setActiveChild({ id: "c2", displayName: "Child Two" });
    expect(getSession()).toMatchObject({ activeChild: { id: "c2" } });
  });

  it("leaves child mode without signing out (X05)", () => {
    signIn("token", account);
    setActiveChild({ id: "c1", displayName: "Child One" });
    clearActiveChild();
    expect(getSession()).toEqual({ status: "signed-in", token: "token", account });
  });

  it("ignores a child while signed out", () => {
    setActiveChild({ id: "c1", displayName: "Child One" });
    expect(getSession()).toEqual({ status: "signed-out" });
  });

  it("forgets the child on sign-out", () => {
    signIn("token", account);
    setActiveChild({ id: "c1", displayName: "Child One" });
    signOut();
    expect(getSession()).toEqual({ status: "signed-out" });
  });
});
