import pino from "pino";
import { pinoHttp } from "pino-http";
import type { Env } from "../config/env.js";

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: "noor-api", env: env.APP_ENV },
    redact: { paths: ["req.headers.authorization", "req.headers.cookie"], remove: true },
  });
}

/**
 * HTTP request logging. Logs only what is needed: id, method, path (no query string, which may
 * hold tokens or child data) and status. No headers, no bodies.
 */
export function httpLogger(env: Env) {
  return pinoHttp({
    level: env.LOG_LEVEL,
    base: { service: "noor-api", env: env.APP_ENV },
    genReqId: (_req, res) => String(res.getHeader("x-request-id")),
    serializers: {
      req: (req: { id?: unknown; method?: string; url?: string; originalUrl?: string }) => ({
        id: req.id,
        method: req.method,
        path: (req.originalUrl ?? req.url)?.split("?")[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    autoLogging: { ignore: (req) => (req.url ?? "").startsWith("/v1/health") },
  });
}
