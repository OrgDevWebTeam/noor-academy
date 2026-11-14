# Secrets Handling (SEC-004)

Last updated: 2026-11-11

## Purpose

This file explains where secrets live, how they are kept out of source control, and what to do if one is exposed.

## Where secrets live

- Secrets live only in `server/.env` on each developer's or server's machine.
- `.env` and `.env.*` are listed in `.gitignore`, so they are never committed.
- `server/.env.example` shows the variable names with placeholder values only. It is the only env file that is committed.

## Current secrets

| Name                | What it is                                                                             | Where it is used    |
| ------------------- | -------------------------------------------------------------------------------------- | ------------------- |
| `DATABASE_PASSWORD` | Password of the MongoDB Atlas database user                                            | `src/config/env.js` |
| `JWT_SECRET`        | Key used to sign login tokens. Anyone who has it can create a valid token for any user | `src/config/env.js` |

Non-secret settings are kept in the same file for convenience: `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `JWT_EXPIRES_IN`, and the `DATABASE` connection string with the `<PASSWORD>` placeholder.

Future secrets (for example the key of an email service) must be added to `.env.example` as names only, and listed in the table above.

## JWT_SECRET rules

- It must be at least 32 characters. The server refuses to start otherwise.
- Generate it randomly, for example: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- Use a different value in development, staging and production.
- The placeholder in `.env.example` is deliberately too short, so a copied example file cannot start the server with a known secret.

## Separate environments (OPS-001)

- Development, staging and production each use their own values and their own database.
- `NODE_ENV` selects the environment. It must be `development`, `staging` or `production`.
- `src/config/env.js` checks the configuration when the server starts. If a variable is missing or invalid, the server prints what is wrong and exits. It never starts with a bad configuration.
- The password is URL-encoded before it is placed in the connection string, so special characters do not break the connection.

## Rotation

If a secret is shared by mistake (chat, screenshot, commit, log):

1. Replace it: for the database password, change it in MongoDB Atlas (Database Access, edit the user's password). For `JWT_SECRET`, generate a new random value.
2. Update `server/.env` on every machine that uses it.
3. Tell the team.
4. If it was committed to git, treat it as exposed even after the file is deleted, because it stays in the git history.

Rotating `JWT_SECRET` logs everyone out, because old tokens stop being valid.

Owner of rotation: Mohammad (Team Leader)

Secrets should also be rotated when a team member who knew them leaves the project.

## Logs

- Never log secrets, tokens, passwords or full request bodies.
- Audit entries only accept `meta` keys from `ALLOWED_META_KEYS`, and only short text values, for this reason (see `docs/authorization-review.md`).

## Checks before every commit

- Run `git status` and confirm `.env` is not listed.
- Never paste real values into code, tests, docs or pull requests.
