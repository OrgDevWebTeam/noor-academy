# Noor Academy

Modular monolith monorepo for the Noor Academy prototype (Target Architecture v1.0).

## Layout

| Path                 | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `apps/web`           | Next.js PWA (bilingual, RTL/LTR) - scaffolded in Milestone 1  |
| `apps/api`           | NestJS API + WebSocket gateway                                |
| `apps/worker`        | Async jobs and scheduled weekly reports                       |
| `packages/contracts` | Shared types and schemas (locales, API version, environments) |
| `packages/ui`        | Bilingual/RTL UI primitives and design tokens                 |
| `packages/config`    | Shared TypeScript presets                                     |
| `services/ai`        | Python AI service (FastAPI): recitation and Arabic word check |
| `infra`              | Infrastructure as code (Terraform/OpenTofu)                   |
| `docs/adr`           | Architecture decision records                                 |

The `apps/*` folders hold typed placeholders for now so the whole pipeline
(`lint`, `typecheck`, `test`, `build`) runs green from day one.

## Prerequisites

- Node 22 (`nvm use` reads `.nvmrc`)
- pnpm 9.15+ (`corepack enable` picks the version from `package.json`)

## First-time setup

```bash
pnpm install          # creates pnpm-lock.yaml - commit it
git init -b main      # if this is a fresh repo
pnpm check            # format, lint, typecheck, test, build
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

- **Trunk-based:** `main` is always deployable; short-lived branches merged by PR.
- **Conventional Commits** are enforced by commitlint (`feat:`, `fix:`, `chore:` ...).
- **Pre-commit** runs lint-staged (ESLint + Prettier on changed files).
- **Dependencies** are pinned in one place: the `catalog` in `pnpm-workspace.yaml`.
- **Secrets** never enter the repo. Copy `.env.example` to `.env` locally; only `NEXT_PUBLIC_*`
  variables reach the browser.
- **Child safety:** see the PR template checklist. Authorization is always enforced server-side.

## Branch protection (set in GitHub after first push)

Require a pull request, at least 1 approval, passing CI checks and Code Owner review on `main`;
block force-pushes and deletions.
