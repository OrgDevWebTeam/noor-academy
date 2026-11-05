# ADR-0003: MongoDB as the primary transactional store

- Status: Accepted
- Supersedes: Architecture v1.0 ADR-004 (PostgreSQL as primary transactional store).
- Context: The project team decided to use MongoDB instead of PostgreSQL.
- Decision: MongoDB (managed MongoDB Atlas for staging/production), accessed with the official
  Node.js driver. Local development uses a single-node replica set in Docker Compose.
- Consequences and required safeguards:
  - **Tenant isolation moves into application code.** There are no foreign keys and no row-level
    security. All access to child-owned collections goes through repositories that REQUIRE
    `familyId` in every filter, with cross-family and unassigned-teacher negative tests
    (architecture 6.2, 13.3).
  - **Opaque ids.** Domain ids are random UUID strings, not ObjectIds, to resist enumeration.
  - **Referential integrity** (child belongs to family, teacher assignment) is enforced in services
    and covered by tests. Use transactions (replica set required) for multi-document changes.
  - **Audit immutability.** MongoDB has no triggers. The application only inserts audit events, and
    deployed environments use a dedicated database user with insert/find only on `audit_events`.
    A strict JSON-schema validator constrains the document shape.
  - **Schema validation.** Collections carry `$jsonSchema` validators where the shape is stable;
    request payloads are validated with zod.
  - **Cloud.** Use MongoDB Atlas (TLS, private networking/peering, encryption at rest, point-in-time
    backups). Amazon DocumentDB is not fully MongoDB-compatible and is not assumed.
  - **Architecture document amendments needed:** sections 1, 4.2, 4.3, 7 (data architecture),
    15.2, 18 (backups), 20 (vendor exit), the ERD figure and ADR-004. "JSONB" and "RDS-class"
    wording no longer apply.
