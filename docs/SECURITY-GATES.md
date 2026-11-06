# Security release gates

Every row must be **Done** before production holds real family data. Compare this list with
Section 13.3 of the architecture document and add any gate that is missing.

Status: **Done** = enforced automatically. **Manual** = a person checks and signs below.
**Open** = blocked on a decision or a service that does not exist yet. **N/A** = nothing to protect yet.

| #   | Gate                                                                                                  | How it is verified                                                                                                  | Status                                    |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | One family can never read, list or change another family's child                                      | `children.repository.int.test.ts`, `api.int.test.ts` (required check: API integration tests)                        | Done                                      |
| 2   | An unassigned or revoked teacher sees nothing                                                         | Same integration tests                                                                                              | Done                                      |
| 3   | Anonymous requests get 401, a wrong role gets 403                                                     | `app.test.ts`, `middleware.test.ts`, `api.int.test.ts`                                                              | Done                                      |
| 4   | Staff cannot use the API without MFA                                                                  | Tests prove the check. The chosen identity provider must emit the MFA claim (`amr`), see `apps/api/src/auth/mfa.ts` | Open until an identity provider is chosen |
| 5   | No known high or critical dependency vulnerabilities                                                  | `Dependency audit` (required check)                                                                                 | Done                                      |
| 6   | No secrets in the repository                                                                          | `Secret scan`, GitHub push protection                                                                               | Done                                      |
| 7   | Code scanning shows no high-severity findings                                                         | `CodeQL analysis`                                                                                                   | Done                                      |
| 8   | Production refuses an unsafe configuration (local database, no TLS, no identity provider, debug logs) | `env.test.ts`, `Container build` check                                                                              | Done                                      |
| 9   | The container runs as non-root and contains no `.env` file                                            | `apps/api/Dockerfile`, `.dockerignore`                                                                              | Done                                      |
| 10  | Sensitive actions create audit events                                                                 | Child creation is tested. PIN events are checked in the manual drill                                                | Manual                                    |
| 11  | No child personal data in logs or URLs                                                                | Manual check A below                                                                                                | Manual                                    |
| 12  | A backup can be restored                                                                              | Manual drill B below, then repeat on the real production database                                                   | Manual                                    |
| 13  | No publicly readable storage                                                                          | Nothing is stored yet. Becomes a gate when audio storage is added                                                   | N/A                                       |

## Manual check A: no child data in logs

1. Start the API: `pnpm --filter @noor/api start:local *> api.log`
2. In another window, create a child with the display name `Zzqx-Test`, then stop the API (Ctrl+C).
3. Run `Select-String -Path api.log -Pattern "Zzqx-Test"`. It must find nothing.
4. Delete `api.log`. Do not commit it.

## Manual drill B: backup and restore

With local test data present:

```powershell
docker exec noor-mongo mongosh --quiet --eval "db.getSiblingDB('noor_local').audit_events.countDocuments()"
docker exec noor-mongo mongodump --db noor_local --archive=/tmp/noor.archive
docker exec noor-mongo mongosh --quiet --eval "db.getSiblingDB('noor_local').dropDatabase()"
docker exec noor-mongo mongorestore --archive=/tmp/noor.archive --nsInclude="noor_local.*"
docker exec noor-mongo mongosh --quiet --eval "db.getSiblingDB('noor_local').audit_events.countDocuments()"
```

The first and last counts must match.

**Production note:** MongoDB Atlas free clusters have no automated backups and run on shared
hardware. Real family data needs a paid tier with backups. Repeat this drill against a restored
production snapshot before launch.

## Sign-off

| Gate | Checked by | Date | Notes |
| ---- | ---------- | ---- | ----- |
| 4    |            |      |       |
| 10   |            |      |       |
| 11   |            |      |       |
| 12   |            |      |       |
