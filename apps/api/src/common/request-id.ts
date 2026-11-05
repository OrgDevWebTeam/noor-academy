import { randomUUID } from "node:crypto";

// Conservative charset: safe to echo in headers and logs (no log injection).
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/** Reuses a well-formed incoming x-request-id, otherwise generates a new one. */
export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === "string" && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
