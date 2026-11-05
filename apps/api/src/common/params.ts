import type { Request } from "express";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a route parameter only if it is a well-formed UUID. */
export function uuidParam(req: Request, name: string): string | undefined {
  const value: unknown = req.params[name];
  return typeof value === "string" && UUID.test(value) ? value : undefined;
}
