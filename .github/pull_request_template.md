## What and why

<!-- What does this change, and why? Link the CRS requirement (e.g. FR-AUTH-001) or issue. -->

## How to test

## Checklist

- [ ] Conventional Commit title (`feat:`, `fix:`, `chore:` ...)
- [ ] Lint, type-check, tests and build pass locally (`pnpm check`)
- [ ] No secrets, real child data or `.env` files committed

### Child safety and security (tick or mark N/A)

- [ ] New child-owned data carries `family_id` / `child_id` and is queried through family-scoped guards
- [ ] Authorization is enforced server-side; negative tests cover cross-family and unassigned-teacher access
- [ ] No child PII in logs, analytics events or URLs
- [ ] No new third-party SDK that profiles or tracks children
- [ ] Sensitive access creates an audit event
- [ ] UI works in both `/en` (LTR) and `/ar` (RTL)
