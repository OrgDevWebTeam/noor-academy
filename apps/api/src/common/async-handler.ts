import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Forwards rejected promises to the error handler (works on every Express version). */
export function wrap(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
