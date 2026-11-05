import { rateLimit } from "express-rate-limit";
import type { Env } from "../config/env.js";

/** Global default. Stricter limits are added on auth, audio and assessment routes later. */
export function createRateLimiter(env: Env) {
  return rateLimit({
    windowMs: 60_000,
    limit: env.RATE_LIMIT_PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "rate_limited" },
  });
}
