# ADR-0001: pnpm + Turborepo monorepo

- Status: Accepted
- Context: Architecture v1.0 (ADR-001, section 5.2) prescribes a modular monolith in one
  monorepo with web, api, worker and shared packages.
- Decision:
  - pnpm workspaces + Turborepo; versions shared through the pnpm `catalog`.
  - `packages/contracts` compiles to CommonJS so NestJS and Next.js can both consume it.
  - `packages/ui` is consumed as TypeScript source by the Next.js app (`transpilePackages`).
  - Domain logic lives in backend modules, never in React components.
  - Trunk-based development; `main` is protected and always deployable.
- Consequences: one install, one CI pipeline, shared types; split services only on measured need.
