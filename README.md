# Noor Academy

MERN monorepo for the Noor Academy prototype: MongoDB, Express, React, Node.js (TypeScript).

## Layout

| Path                 | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `apps/web`           | React (Vite) PWA, bilingual, RTL/LTR                     |
| `apps/api`           | Express API                                              |
| `packages/contracts` | Shared types and schemas (locales, AI result, telemetry) |
| `packages/ui`        | Bilingual/RTL UI primitives and design tokens            |
| `packages/config`    | Shared TypeScript presets                                |
| `infra`              | Infrastructure as code                                   |
| `docs`               | ADRs, environments, AI and data specs                    |

## Prerequisites

- Node 22 (`nvm use` reads `.nvmrc`)
- pnpm 9.15+ (`npm install -g pnpm@9.15.0`)
- Docker Desktop (local MongoDB)

## First-time setup

```bash
pnpm install
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
pnpm check                      # format, lint, typecheck, test, build
```

## Run locally

```bash
pnpm --filter @noor/api services:up    # MongoDB + mock AI service (Docker)
pnpm --filter @noor/api migrate        # create collections
pnpm --filter @noor/api start:local    # API on http://127.0.0.1:4000
pnpm --filter @noor/web dev            # web on http://localhost:3000
```

## Commands

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `pnpm build`     | Build all packages (Turborepo, cached) |
| `pnpm typecheck` | Type-check all packages                |
| `pnpm test`      | Run unit tests (Vitest)                |
| `pnpm lint`      | ESLint across the repo                 |
| `pnpm format`    | Prettier write                         |
| `pnpm check`     | Everything CI will run                 |

## Conventions

- **Trunk-based:** `main` is always deployable; short-lived branches merged by PR (squash).
- **Conventional Commits** are enforced by commitlint, and the PR title is checked in CI.
- **Secrets** never enter the repo. Only `VITE_*` variables reach the browser.
- **The repo is public.** Never commit audio, datasets, real child data or `.env` files.
- See `docs/ENVIRONMENTS.md` for environment rules.
