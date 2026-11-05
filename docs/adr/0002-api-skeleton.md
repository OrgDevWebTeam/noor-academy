# ADR-0002: API skeleton decisions

- Status: Accepted
- Context: Express API (ADR-0005) needing schema validation, request IDs, rate limiting, security
  headers and an append-oriented audit store.
- Decisions:
  - **App factory:** `createApp({ env, database })` builds the Express app without listening, so
    tests drive it with supertest. `server.ts` wires real dependencies and handles shutdown.
  - **Environment validation (zod)** at startup. Staging and production must run with
    `NODE_ENV=production`, must not use a local database, must use TLS for the database, and
    production may not log at debug/trace. Error messages never echo values.
  - **Database:** the official `mongodb` driver (ADR-0003). Migrations are versioned `.mjs` files
    applied by `scripts/migrate.mjs`, tracked in a `_migrations` collection.
  - **Security headers:** helmet. **CORS:** explicit allow-list. **Body limit:** 100kb.
  - **Logging:** pino / pino-http. Request logs contain id, method, path (no query string) and
    status only.
  - **Request IDs:** a well-formed incoming `x-request-id` is reused, otherwise generated, and
    returned in the response.
  - **Rate limiting:** global default via express-rate-limit; stricter limits on auth, audio and
    assessment routes later. Health probes are mounted before the limiter.
  - **Errors:** the error handler never returns messages or stacks to clients.
  - **Validation:** `validateBody(schema)` with strict zod schemas rejects unknown fields.
  - **Module convention:** `src/modules/<name>/{router,service,repository}.ts`. Repositories for
    child-owned data require `familyId` (ADR-0003).
