# ADR-0006: Identity and authorization

- Status: Proposed (owners: Mohammad / Osama)
- Context: Parents sign in, children do not have accounts, staff need MFA, and children's data
  must never cross family boundaries. MongoDB offers no row-level security (ADR-0003).
- Decisions:
  - **Provider-agnostic OIDC.** The API verifies bearer tokens (signature, issuer, audience,
    expiry; RS256/ES256 only) against the provider's JWKS. Cognito, Auth0 or Keycloak differ only
    in `OIDC_ISSUER_URL`, `OIDC_AUDIENCE` and `OIDC_JWKS_URL`. With none configured, every
    authenticated route returns 401. There is no development bypass.
  - **Own user records.** Roles and family membership live in our `users` collection, keyed by an
    internal UUID. The provider's `sub` is only a lookup key, so providers can be swapped.
  - **Provisioning.** Only parents self-provision (a user plus a family on first login). Staff
    accounts are created by an administrator.
  - **Permissions, not roles.** Routes call `requirePermission(...)`. The role-to-permission map
    is in `@noor/contracts`. Platform and content admins have no child-data permission by default.
  - **MFA for staff** is checked from the standard `amr` claim and fails closed. Confirm how the
    chosen provider reports MFA and adapt `auth/mfa.ts`.
  - **Family isolation.** All child data goes through a repository whose methods require an
    `AccessScope`: `family` (parent) or `teacher` (active assignments only). Cross-family and
    unassigned access return 404, the same answer as "missing". Isolation is tested against a real
    MongoDB in CI.
  - **Child PIN.** Hashed with scrypt, limited by a lockout (5 failures, 15 minutes). It is a
    convenience gate inside the parent's session, not a security boundary.
  - **Audit.** Child creation, PIN changes and lockouts write insert-only audit events (ids only).
    Writes are best-effort for now; make them transactional with the change (TODO).
- Open questions: teacher assignment workflow and admin tooling, account deletion and export,
  a user who is both parent and teacher, session lifetime and revocation.
