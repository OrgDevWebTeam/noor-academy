# Authorization Matrix

Last updated: 2026-11-09

## Purpose

This file defines who may create, read, update and delete each kind of data.
Routes and middleware must follow it. Models are reviewed against it.

Sources: CRS section 8.1 (CRUD matrix), section 3.1 (RBAC baseline), SEC-002, VAL-007, FR-ADM-001, FR-AUTH-003.
Rows marked (derived) are not in the CRS CRUD matrix. They are inferred from the sources above and need PM confirmation.

## How to read it

- **Ownership field:** the field that ties a record to its owner. Access is checked by comparing it with the user's family or assignment.
- **Limited:** a reduced view of the record. The exact fields are still to be decided (see Open questions).
- **Default deny:** anything not listed here is forbidden.

## Matrix

| Entity                                          | Ownership field                    | Create                                                          | Read                                                                                                    | Update                                                                      | Delete                                     |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| User (derived)                                  | the user's own id                  | Public registration (parent only); Platform Admin creates staff | Self; Platform Admin. `passwordHash` is never returned                                                  | Self (profile); Platform Admin (role, status)                               | Platform Admin, by policy                  |
| Family (derived)                                | `parentId`                         | System, at registration                                         | Parent (own); Platform Admin                                                                            | Parent (name, locale); Platform Admin (status)                              | Platform Admin, by policy                  |
| Child                                           | `familyId`                         | Parent; Platform Admin                                          | Parent (own family); Child (own profile); assigned Teacher (limited); Platform Admin (support, derived) | Parent; Platform Admin                                                      | Parent or Platform Admin, with conditions  |
| ConsentRecord                                   | `familyId`, `childId`              | Parent; System                                                  | Parent; Platform Admin (restricted)                                                                     | Nobody. A new record is appended instead                                    | Policy-controlled                          |
| Assessment (derived)                            | `familyId`, `childId`              | System (when the child takes it)                                | Parent; assigned Teacher (limited); Child (own)                                                         | System                                                                      | Not allowed through the app                |
| Progress (derived, by analogy with GrowthState) | `familyId`, `childId`              | System                                                          | Parent; Child (own); assigned Teacher (limited)                                                         | System only                                                                 | System only                                |
| Content                                         | none (global)                      | Content Admin                                                   | Published and age-eligible: all users. Draft and in review: staff only                                  | Content Admin. Publishing requires a Reviewer when `reviewRequired` is true | Content Admin (prefer archiving)           |
| Competency (derived)                            | none (reference data)              | Content Admin                                                   | Any signed-in user                                                                                      | Content Admin                                                               | Content Admin (prefer `active: false`)     |
| TeacherAssignment (derived)                     | `teacherId`, `childId`, `familyId` | Platform Admin                                                  | Teacher (own); Parent (their children's); Platform Admin                                                | Platform Admin (end an assignment)                                          | Not allowed. Set status to `ended` instead |
| AuditEvent                                      | none                               | System                                                          | Platform Admin only                                                                                     | Nobody (append-only)                                                        | By retention policy only                   |

## Rules

1. Default deny. Anything not listed in the matrix is forbidden.
2. A client may never set `role`, `status`, `familyId`, `parentId`, `reviewedBy` or `approvedAt` through a request. Controllers must pick allowed fields explicitly and never pass `req.body` straight into a model.
3. A parent can access only children whose `familyId` belongs to their own family (SEC-002).
4. A teacher can access only children with an active `TeacherAssignment` (SEC-002, VAL-007).
5. Suspended users and suspended families have no access.
6. Every denied action must be written to the audit log with result `denied` (FR-AUTH-003).
7. Responses must never include `passwordHash` or fields outside the allowed view for that role.
8. The analytics_support role has no access to Child, Assessment, Progress, ConsentRecord or other child content by default.

## Open questions for the PM

1. What exactly can a teacher see when reading a Child ("limited")? For example, is `dateOfBirth` hidden?
2. Can a Child read their own Assessment results, or only the Parent?
3. Who may delete a Child, and under what conditions? The CRS marks Child deletion with an asterisk.
4. Is there an explicitly authorized support or escalation path for teachers outside their assignments (VAL-007)?

## Not yet modeled

These rows from CRS section 8.1 will be added when their models exist: FamilyMission, ParentObservation, QuranAttempt, TeacherReview, GrowthState.
