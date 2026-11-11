import { type Session } from "./session-store";

/** The app's route areas so far. The sign-in, parent, teacher and staff areas come with their tasks. */
export type Area = "family" | "child";

/**
 * Where a visitor goes instead of an area's pages, or null to stay. This only shapes the page:
 * the API checks every permission itself (ADR-0006).
 */
export function areaRedirect(area: Area, session: Session): "landing" | "profiles" | null {
  // Real sign-in (G06) waits for the identity provider decision (OD-03). Until then, a visitor
  // without a session goes to the landing page.
  if (session.status !== "signed-in") return "landing";
  // The child area opens only after a correct PIN on the profile picker (G08).
  if (area === "child" && !session.activeChild) return "profiles";
  return null;
}
