import { type Role } from "@noor/contracts/roles";
import { useSyncExternalStore } from "react";

/** The signed-in account, as GET /v1/me returns it. */
export type Account = { userId: string; roles: Role[]; familyId: string | null };

/** The child using the app after a correct PIN on G08. Only what the screens show. */
export type ActiveChild = { id: string; displayName: string };

/** A parent is signed in. `activeChild` is set only in child mode. */
export type SignedInSession = {
  status: "signed-in";
  token: string;
  account: Account;
  activeChild?: ActiveChild;
};

/** Who is using the app right now. */
export type Session = { status: "signed-out" } | SignedInSession;

const SIGNED_OUT: Session = { status: "signed-out" };

// Memory only. Family devices are shared, so the token and the active child never go to
// localStorage, cookies or the URL; a reload signs out (UI spec, privacy rules).
let current: Session = SIGNED_OUT;
const listeners = new Set<() => void>();

function update(next: Session) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current session, for route loaders and event handlers. Components use `useSession`. */
export function getSession(): Session {
  return current;
}

/** Starts a session after sign-in. It replaces any previous session, active child included. */
export function signIn(token: string, account: Account) {
  update({ status: "signed-in", token, account });
}

/** Ends the session and forgets the token and the active child. */
export function signOut() {
  update(SIGNED_OUT);
}

/** Starts child mode. Replacing the child drops everything held for the previous one. */
export function setActiveChild(child: ActiveChild) {
  if (current.status !== "signed-in") return;
  update({ ...current, activeChild: child });
}

/** Leaves child mode (X05). */
export function clearActiveChild() {
  if (current.status !== "signed-in" || !current.activeChild) return;
  update({ status: "signed-in", token: current.token, account: current.account });
}

/** The current session; the component re-renders when it changes. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession, getSession);
}
