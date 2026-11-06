import { API_VERSION } from "@noor/contracts";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { adminRouter } from "./admin/admin.router.js";
import { type AiClient, createAiClient } from "./ai/ai-client.js";
import { createAttemptsRepository } from "./attempts/attempts.repository.js";
import { attemptsRouter } from "./attempts/attempts.router.js";
import { createAuditLog } from "./audit/audit.js";
import { authenticate } from "./auth/middleware.js";
import type { TokenVerifier } from "./auth/types.js";
import { createChildrenRepository } from "./children/children.repository.js";
import { childrenRouter } from "./children/children.router.js";
import type { Env } from "./config/env.js";
import type { Database } from "./database/database.js";
import { healthRouter } from "./health/health.router.js";
import { meRouter } from "./me/me.router.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { httpLogger } from "./middleware/logging.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { createUsersRepository } from "./users/users.repository.js";

export interface AppDeps {
  env: Env;
  database: Pick<Database, "ping" | "db">;
  verifier: TokenVerifier;
  /** Defaults to the HTTP client for AI_SERVICE_URL; tests pass a fake. */
  ai?: AiClient;
}

/** Builds the Express app without listening, so tests can drive it with supertest. */
export function createApp({ env, database, verifier, ai }: AppDeps): Express {
  const app = express();

  app.disable("x-powered-by");
  // Behind the load balancer (staging/production) the client IP comes from X-Forwarded-For,
  // which rate limiting needs.
  if (env.APP_ENV !== "local") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(requestIdMiddleware);
  app.use(httpLogger(env));
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));

  const v1 = `/${API_VERSION}`;
  app.use(`${v1}/health`, healthRouter(database));

  app.use(createRateLimiter(env));
  app.use(express.json({ limit: "100kb" }));

  const db = database.db;
  const auth = authenticate({ verifier, users: createUsersRepository(db) });
  const audit = createAuditLog(db);
  app.use(`${v1}/me`, auth, meRouter());
  const children = createChildrenRepository(db);
  app.use(`${v1}/children`, auth, childrenRouter({ children, audit }));
  app.use(
    `${v1}/attempts`,
    auth,
    attemptsRouter({
      attempts: createAttemptsRepository(db),
      children,
      ai: ai ?? createAiClient({ baseUrl: env.AI_SERVICE_URL, timeoutMs: env.AI_TIMEOUT_MS }),
    }),
  );
  app.use(`${v1}/admin`, auth, adminRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
