# ADR-0002: API skeleton decisions

- Status: Accepted
- Context: Architecture v1.0 requires a NestJS modular monolith, PostgreSQL, schema validation,
  request IDs, rate limiting, security headers and an append-oriented audit store.
- Decisions:
  - **Environment validation (zod)** at startup. Deployed environments are guarded: staging and
    production must run with `NODE_ENV=production`, must not use a local database, and production
    may not log at debug/trace. Error messages never echo values.
  - **Database access:** `pg` pool plus SQL migrations through `node-pg-migrate`. Plain SQL keeps
    constraints, indexes and triggers explicit and reviewable. A typed query layer can be added
    later without changing migrations.
  - **Logging:** pino via nestjs-pino. Request logs contain id, method, path (no query string)
    and status only.
  - **Request IDs:** a well-formed incoming `x-request-id` is reused, otherwise generated, and
    returned in the response.
  - **Rate limiting:** global default through `@nestjs/throttler`; stricter limits on auth, audio
    and assessment routes when those exist. Health probes are exempt.
  - **Audit:** `audit_events` is append-only, enforced by database triggers (update, delete and
    truncate raise). Metadata holds ids, never personal content.
  - **Tests:** unit tests cover pure modules. HTTP/DI tests arrive with an SWC-based Vitest setup
    because esbuild does not emit decorator metadata.
- Consequences: local development uses Docker Compose PostgreSQL on port 5433 with synthetic data.
