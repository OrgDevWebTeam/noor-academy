# @noor/web

The Noor Academy web app: a React single-page PWA built with Vite, in Arabic (RTL) and English (LTR).

Sources: ADR-0005 (stack); Architecture v1.0 section 5.2; UI Screens Spec v0.1; CRS FR-I18N-001 and NFR-I18N-001.

## Run

From the repository root (Node 22 and pnpm 9.15, see the [root README](../../README.md)):

```bash
pnpm install
pnpm --filter @noor/web dev    # http://localhost:3000, redirects to /ar or /en
pnpm check                     # format, lint, typecheck, test, build: what CI runs
```

The app does not call the API yet. When it does, the dev server forwards `/v1` to
`http://127.0.0.1:4000`, so no CORS setup is needed locally.

Inside `apps/web`, the same scripts run for this app only:

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Development server with hot reload               |
| `pnpm build`     | Type check, then production build into `dist/`   |
| `pnpm preview`   | Serves the production build                      |
| `pnpm lint`      | ESLint with this app's rules                     |
| `pnpm typecheck` | `tsc --noEmit`                                   |
| `pnpm test`      | Unit tests (Vitest): routing, i18n, dictionaries |

Code style, naming and comment rules are in [CONVENTIONS.md](CONVENTIONS.md).

## Structure

```
index.html                Page shell: icons, manifest, and a skeleton shown until the app starts
src/
  main.tsx                Entry point: sets the language, starts the router and the service worker
  router.tsx              Every route, grouped by area
  styles.css              Tailwind, design tokens and fonts
  pages/                  One file per screen, plus the X06 states (404, error, loading, maintenance)
    dev/                  /dev/ui and /dev/rtl: visual checks, development only
  components/             App-wide pieces: page frame, header, language switcher, offline banner
  i18n/                   Languages, dictionaries, localized paths, number/date/plural formatting
public/
  manifest.webmanifest    PWA manifest
  sw.js                   Service worker: caches build files and the offline page only
  offline.html            Shown when a page is opened without a connection
  icons/                  PWA icons (placeholders until the brand assets arrive)
```

Screen IDs (G01, C01…) come from the UI Screens Spec. Each area has one placeholder page today; product
features arrive in later milestones as `src/features/<name>/` folders.

Shared code lives in packages:

- `@noor/contracts`: the locale list, default locale and text direction. Import them from
  `@noor/contracts/locale`, which keeps the API's schema library out of the browser bundle.
- `@noor/ui`: design tokens, UI primitives and shared lint rules. Vite compiles its TypeScript source
  with the app.

## How languages work

1. `main.tsx` sets `<html lang dir>` before the first render, so the whole page follows the URL's
   language from the start. Components use logical classes (`ms-*`, `ps-*`, `text-start`), so they
   need no RTL code.
2. A path without a language (`/`, `/today`) gets one: the saved choice, then the browser's languages,
   then the default from `@noor/contracts`.
3. The loader of the `/:locale` route downloads that language's dictionary before the page renders.
   Components read the language and its text with `useI18n()`.
4. The few strings that must work when a dictionary cannot download (error pages, offline notice) are
   in `i18n/shell-dictionaries/`, inside the main bundle.
5. The language switcher opens the same page in the other language and saves the choice in the
   browser's `localStorage`.

## Development pages

`/ar/dev/ui` shows every `@noor/ui` primitive. `/ar/dev/rtl` checks mixed text, numbers, dates,
plurals and mirroring. Open them with `/en/...` for the LTR version. They exist in development only:
production bundles do not contain them, and those paths show the 404 page.

## PWA

- The app can be installed from the browser (`public/manifest.webmanifest` and `public/icons`).
- `public/sw.js` registers in production builds only. It never caches pages or child data, because
  family devices are often shared (UI spec, privacy rules). Without a connection, opening a page shows
  `offline.html`, and an open page shows an offline banner.
- To test it: run `pnpm build`, then `pnpm preview`, then reload once so the service worker takes
  control.

## Hosting

`pnpm build` writes static files to `dist/` (ADR-0005). The host must:

- Answer every path that is not a file with `index.html`. Otherwise a direct link such as `/ar/today`
  gets the host's own 404. Unknown paths then reach the app, which shows the localized 404 page.
- Cache files under `/assets/` for a long time (their names contain a content hash), and not cache
  `index.html` or `sw.js`, so visitors get new versions.

## Rules

1. **Imports flow one way:** `router` → `pages` → `features` → `components`, `i18n`, `lib`.
   - A feature never imports from another feature; pages compose features.
   - Shared folders never import from `features` or `pages`.
2. **The API is the real gate.** Hiding a page in the browser is not security: the API enforces every
   permission (ADR-0006). Browser variables use the `VITE_` prefix and are public; never put a secret
   in one.
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
