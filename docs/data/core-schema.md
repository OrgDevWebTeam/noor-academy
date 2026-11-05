# MongoDB core schema

Owners: Mohammad / Osama. Status: DRAFT. Decision record: `docs/adr/0003-mongodb.md`.

## Rules (from ADR-0003)

- Domain ids are random UUID strings (not ObjectIds).
- Every child-owned document carries `familyId`, and **every query includes it** (repository layer).
- Teachers see a child only through an active teacher assignment.
- Multi-document changes use transactions (replica set).
- Collections get `$jsonSchema` validators once their shape is stable. See
  `apps/api/migrations/1793700000000_audit-events.mjs` for the pattern.

## Collections to define

| Collection           | Purpose                    | Key fields to decide                                   | Indexes to decide    |
| -------------------- | -------------------------- | ------------------------------------------------------ | -------------------- |
| `families`           | Household account          | owner user id, locale, consent status                  |                      |
| `users`              | Parents, teachers, admins  | internal id (separate from identity-provider id), role |                      |
| `children`           | Child profiles (no login)  | `familyId`, display name, birth year, PIN hash         | `familyId`           |
| `content`            | Surahs, lessons, missions  | version, locale variants, review state                 |                      |
| `progress`           | Per-child learning state   | `familyId`, `childId`, content ref                     | `familyId + childId` |
| `teacherAssignments` | Teacher-to-child access    | teacher id, `childId`, `familyId`, status, dates       | `teacherId + status` |
| `audit_events`       | Append-only audit (exists) | see migration                                          | exists               |

## Questions to answer

1. Which fields are personal data, and what is the retention for each?
2. How is a child deleted or exported on a parent's request?
3. Which documents embed and which reference?
