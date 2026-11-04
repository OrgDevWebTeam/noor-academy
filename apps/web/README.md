# @noor/web

The Noor Academy web app: a Next.js PWA with Arabic (RTL) and English (LTR).

Sources: Architecture v1.0 sections 5.2 and 8; UI Screens Spec v0.1; CRS FR-I18N-001 and NFR-I18N-001.

## Run

From the repository root (Node 22 and pnpm 9.15, see the [root README](../../README.md)):

```bash
pnpm install
pnpm --filter @noor/web dev    # http://localhost:3000, redirects to /ar or /en
pnpm check                     # format, lint, typecheck, test, build: what CI runs
```

The app imports `@noor/contracts` from its compiled `dist` folder, which git does not track. `dev`
builds it first, and the root commands (`pnpm check`, `pnpm build`...) build it through Turborepo.

The first run downloads the fonts from Google, so it needs a network that can reach
`fonts.gstatic.com`. If it cannot, every page and `next build` fail with `Can't resolve
'@vercel/turbopack-next/internal/font/google/font'`. Try again later or on another network.

Inside `apps/web`, the same scripts run for this app only. On a fresh clone, `build`, `typecheck` and
`test` fail until that folder exists, so run `pnpm --filter @noor/contracts build` once before them:

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Builds `@noor/contracts`, then starts the server with hot reload |
| `pnpm build`     | Production build                                                 |
| `pnpm start`     | Serves the production build                                      |
| `pnpm lint`      | ESLint with this app's rules                                     |
| `pnpm typecheck` | `next typegen && tsc --noEmit`                                   |
| `pnpm test`      | Unit tests (Vitest): routing, i18n, dictionaries                 |

Code style, naming and comment rules are in [CONVENTIONS.md](CONVENTIONS.md).

## Structure

The app is a thin routing layer over shared components and the `@noor/ui` package.

```
src/
  app/
    [locale]/             Root layout. Every route lives under /ar or /en.
      (public)/           G01 landing, X06 maintenance
      (auth)/             G03–G07  sign-up, sign-in, recovery
      (family)/           G08, O01–O04  profile picker and onboarding
      (child)/            C01–C10  child area
      (parent)/           P01–P09  parent area
      (teacher)/          T01–T05  teacher area
      (admin)/            A01–A10  staff area
      (dev)/              /dev/ui and /dev/rtl: visual checks, 404 in production builds
      [...rest]/          Sends unknown paths to the localized 404
      error.tsx           X06  error inside a page, with retry
      loading.tsx         X06  skeleton while a page streams in
      not-found.tsx       X06  localized 404
    global-error.tsx      Last-resort error page, in both languages
    manifest.ts           PWA manifest
    fonts.ts              UI font per language, self-hosted by next/font
  components/             App-wide pieces: header, language switcher, area shell, offline banner.
  i18n/                   Locales, dictionaries, localized paths, number/date/plural formatting.
  proxy.ts                Adds the locale prefix to paths that have none.
public/
  sw.js                   Service worker: caches build files and the offline page only
  offline.html            Shown when a page is opened without a connection
  icons/                  PWA icons (placeholders until the brand assets arrive)
```

Screen IDs (G01, C01…) come from the UI Screens Spec. Each area has one placeholder page today; product
features arrive in later milestones as `src/features/<name>/` folders.

Shared code lives in packages:

- `@noor/contracts`: the locale list, default locale and text direction.
- `@noor/ui`: design tokens, UI primitives and the RTL lint rule. The app imports its TypeScript
  source directly (`transpilePackages`, ADR-0001).

## How languages work

1. `proxy.ts` sends `/` and any path without a locale to `/ar/...` or `/en/...`. It picks the language
   from the `NOOR_LOCALE` cookie, then the browser's `Accept-Language`, then English.
2. `[locale]/layout.tsx` sets `<html lang dir>` from the locale, so the whole page flips between RTL
   and LTR. Components use logical classes (`ms-*`, `ps-*`, `text-start`), so they need no RTL code.
3. Pages read their text with `getDictionary()`. Client components that need text use
   `client-dictionaries/` (kept small, so the browser downloads only what it shows).
4. The language switcher opens the same page in the other language and saves the choice in the
   cookie for one year.

## Development pages

`/ar/dev/ui` shows every `@noor/ui` primitive. `/ar/dev/rtl` checks mixed text, numbers, dates,
plurals and mirroring. Open them with `/en/...` for the LTR version. They return 404 in production
builds.

## PWA

- The app can be installed from the browser (manifest and icons in `src/app` and `public/icons`).
- `public/sw.js` registers in production builds only. It never caches pages or child data, because
  family devices are often shared (UI spec, privacy rules). Without a connection, pages show
  `offline.html` and an offline banner.
- To test it: `pnpm build && pnpm start`, then reload once so the service worker takes control.

## Rules

1. **Imports flow one way:** `app` → `features` → `components`, `i18n`, `lib`.
   - A feature never imports from another feature; pages compose features.
   - Shared folders never import from `features` or `app`.
2. **Server Components by default.** Add `"use client"` only to the small interactive leaf that needs it.
3. **No hard-coded UI text.** Every string comes from `src/i18n/dictionaries`.
   - `ar.json` must match the shape of `en.json`. A missing key fails `pnpm typecheck` (VAL-009).
4. **Layout direction comes from `dir` on `<html>`.**
   - Use logical CSS only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`.
   - Never use `ml-*`, `mr-*`, `left-*`, `right-*` or `text-left`.
   - Media controls, logos, number pads and Quran text are never mirrored.
5. **No child data in URLs.** Child routes take the active child from the session, not from the path (UI spec, privacy rules).
6. **No third-party scripts, trackers or session replay** in the child area (SEC-009, SEC-011).
7. **No child data cached offline.** The service worker caches public static assets only.
8. **Synthetic data only** in mocks, fixtures and screenshots.
