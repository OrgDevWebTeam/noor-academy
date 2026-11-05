import { createApp } from "./app.js";
import { createOidcVerifier, createRemoteKeys } from "./auth/oidc.js";
import type { TokenVerifier } from "./auth/types.js";
import { type Env, loadEnv } from "./config/env.js";
import { createDatabase } from "./database/database.js";
import { createLogger } from "./middleware/logging.js";

function createVerifier(env: Env, logger: ReturnType<typeof createLogger>): TokenVerifier {
  if (env.OIDC_ISSUER_URL && env.OIDC_AUDIENCE && env.OIDC_JWKS_URL) {
    return createOidcVerifier({
      issuer: env.OIDC_ISSUER_URL,
      audience: env.OIDC_AUDIENCE,
      keys: createRemoteKeys(env.OIDC_JWKS_URL),
    });
  }
  // No bypass: without an identity provider every authenticated route simply returns 401.
  logger.warn("OIDC is not configured: all authenticated routes will return 401");
  return () => Promise.reject(new Error("OIDC not configured"));
}

function main(): void {
  // Fail fast on bad configuration, before anything else starts.
  const env = loadEnv();
  const logger = createLogger(env);
  const database = createDatabase(env);
  const app = createApp({ env, database, verifier: createVerifier(env, logger) });

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT }, "API listening");
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "shutting down");
    // Force exit if connections do not drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(() => {
      database.close().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
