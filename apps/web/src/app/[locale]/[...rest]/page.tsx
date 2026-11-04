import { notFound } from "next/navigation";

// This page only ever throws notFound(), so it has no UI to validate.
export const instant = false;

// Unknown paths under /ar or /en render the localized 404 above.
export default function UnknownRoute() {
  notFound();
}
