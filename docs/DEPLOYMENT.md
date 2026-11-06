# Deployment

## How it works

| Event                    | What happens                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pull request             | `Container build` builds the image, starts it, checks `/v1/health`, checks protected routes return 401, and checks production refuses an unsafe configuration. Nothing is published. |
| Merge to `main`          | The image is built and pushed to GitHub Container Registry as `ghcr.io/<owner>/noor-api:<commit sha>`, then the staging job runs.                                                    |
| Manual run, `production` | Run **Deploy** from the Actions tab, choose `production` and a commit SHA. A required reviewer must approve before the job runs.                                                     |
| Rollback                 | Run **Deploy** again with an older commit SHA. The image already exists, so nothing is rebuilt.                                                                                      |

Pull requests never deploy and never see secrets, so forks of this public repo cannot reach them.

## Current state

The pipeline publishes images but has **no deploy target yet**, because the host is not chosen. The
deploy steps report this clearly instead of pretending to deploy.

When a host is chosen:

1. Add the deploy commands to the `Deploy` steps in `.github/workflows/deploy.yml`.
2. Set a repository variable `DEPLOY_TARGET` (for example `fly`, `render`, `aws`).
3. Add that host's credentials as **environment secrets** in each GitHub Environment
   (`staging`, `production`), never as repository secrets, so staging cannot see production's.
4. Set each environment's variables (see `.env.example`): `APP_ENV`, `MONGODB_URI`, `MONGODB_DB`
   and the `OIDC_*` values. The API refuses to start in staging/production if they are unsafe.
5. Run migrations before the new version starts: `node scripts/migrate.mjs up` (included in the image).

## Environments

| Environment | Database                                                               | Deploys                      |
| ----------- | ---------------------------------------------------------------------- | ---------------------------- |
| staging     | Its own MongoDB project and user, synthetic data only                  | Automatic on merge to `main` |
| production  | Its own MongoDB project and user, the only place with real family data | Manual, approved             |

## Free-budget notes (MongoDB Atlas)

- The free tier allows **one free cluster per Atlas project**, so staging and production each need
  their own project.
- It is shared hardware with no uptime SLA, and **Atlas automated backups are not available on it**
  (use `mongodump` / `mongorestore` instead). That is acceptable for staging with synthetic data.
- **Do not put real children's data on it.** Before production holds real data, move to a paid tier
  with backups, and run the backup restore test (a release gate).
