import type { RequestHandler } from "express";
import { resolveRequestId } from "../common/request-id.js";

/** One id per request: returned to the client and attached to every log line. */
export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const id = resolveRequestId(req.headers["x-request-id"]);
  res.locals.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
