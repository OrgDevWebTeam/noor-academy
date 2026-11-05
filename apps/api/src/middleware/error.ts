import type { ErrorRequestHandler, RequestHandler } from "express";

/** Client errors (4xx) raised by Express or body parsing carry a numeric status. */
function clientStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const candidate = status ?? statusCode;
  return typeof candidate === "number" && candidate >= 400 && candidate < 500
    ? candidate
    : undefined;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "not_found" });
};

/**
 * Last-resort handler. Never reveals error messages, stack traces or internals to the client;
 * they go to the server log only.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  req.log?.error({ err }, "request failed");
  const requestId = res.locals.requestId as string | undefined;
  const status = clientStatus(err);
  if (status === undefined) {
    res.status(500).json({ error: "internal_error", requestId });
    return;
  }
  const error =
    status === 400 ? "bad_request" : status === 413 ? "payload_too_large" : "request_error";
  res.status(status).json({ error, requestId });
};
