# ADR-0001: pnpm + Turborepo monorepo

- Status: Accepted
- Context: One repository for the API, web app, shared packages and infrastructure.
- Decision:
  - pnpm workspaces + Turborepo; shared dependency versions through the pnpm `catalog`.
  - `packages/contracts` compiles to CommonJS so the Express API (CommonJS) can import it. The
    Vite web app imports its TypeScript source directly through an alias.
  - Domain logic lives in backend modules, never in React components.
  - Trunk-based development; `main` is protected and always deployable.
- Consequences: one install, one CI pipeline, shared types; split services only on measured need.
