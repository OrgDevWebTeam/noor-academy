# Environments

Four environments. **Only production holds real family data.** Everything else uses synthetic data.

| Component                                | Local                                 | Development                 | Staging                     | Production                              |
| ---------------------------------------- | ------------------------------------- | --------------------------- | --------------------------- | --------------------------------------- |
| **Frontend** (`apps/web`, React/Next.js) | `pnpm dev`, API at localhost          | Own URL, dev API            | Own URL, staging API        | Own URL, prod API                       |
| **Backend** (`apps/api`)                 | `pnpm --filter @noor/api start:local` | Container, own secrets      | Container, own secrets      | Container, own secrets, manual approval |
| **MongoDB**                              | Docker Compose, replica set, no auth  | Separate Atlas cluster/user | Separate Atlas cluster/user | Separate Atlas cluster/user, backups    |
| **AI** (`services/ai`)                   | Docker Compose, `MOCK_MODE=true`      | Mock mode                   | Real local models           | Real local models, monitored            |

## Rules

- Each environment has its own database, users, secrets and AI keys. Nothing is shared.
- Secrets live in the managed secret store, never in the repo or in `NEXT_PUBLIC_*` variables.
- The API refuses to start in staging/production with a local database, without TLS, or in dev mode
  (see `apps/api/src/config/env.ts`).
- The browser never calls the AI service. Only the API does (`AI_SERVICE_URL`), and it checks
  every reply against the AI result contract (`docs/contracts/ai-result.md`).
- No child identity crosses the AI boundary (see ADR-0004).
