# Code Conventions

How we write code in `@noor/web`. Most rules are enforced by tooling, so a reviewer only needs to check what tools cannot.

**Scope:** these conventions and their tooling (`prettier.config.mjs`, `eslint.config.mjs`, `tsconfig.json`) apply to `apps/web`. The UI primitives in `packages/ui` follow the same code rules; their `eslint.config.mjs` enforces the RTL and TypeScript ones. Other apps and packages are not affected.

Run the checks from the repository root:

| Check      | Command                                          | Enforces                                                                  |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Formatting | `pnpm format:check` (fix: `pnpm format`)         | Prettier, 100 columns, sorted Tailwind classes                            |
| Lint       | `pnpm --filter @noor/web --filter @noor/ui lint` | Next.js rules, import boundaries, RTL-safe classes, no hard-coded UI text |
| Types      | `pnpm typecheck`                                 | Strict TypeScript, complete dictionaries                                  |
| Tests      | `pnpm test`                                      | Locale routing, dictionaries, formatting, primitives, colour contrast     |

CI runs `pnpm check` (formatting, the repo-wide lint, types, tests and the build). The app lint above holds the rules specific to this app, so run it too before opening a pull request.

## 1. Principles

1. **Readable first.** Code is read far more often than it is written. Prefer the obvious version over the clever one.
2. **One job per unit.** A function does one thing; a component renders one idea; a module owns one concern.
3. **Names carry meaning.** If a name needs a comment to explain it, rename it.
4. **Make wrong code look wrong.** Types, lint rules and small APIs should make mistakes hard to write.
5. **Leave it cleaner.** Remove dead code, unused exports and stale comments when you touch a file.

## 2. Naming

| Thing                         | Style                                    | Example                                 |
| ----------------------------- | ---------------------------------------- | --------------------------------------- |
| Files and folders             | `kebab-case`                             | `mission-card.tsx`, `get-dictionary.ts` |
| Components and types          | `PascalCase`                             | `MissionCard`, `Dictionary`             |
| Functions and variables       | `camelCase`, verb for functions          | `getLocale()`, `activeChild`            |
| Booleans                      | `is` / `has` / `can` / `should`          | `isLocked`, `hasConsent`                |
| Constants shared across files | `UPPER_SNAKE_CASE`, from a config module | `DEFAULT_LOCALE`, `LOCALE_COOKIE`       |

- Constant names match `@noor/contracts` (`LOCALES`, `DEFAULT_LOCALE`), so shared and app constants read the same.
- Use full words: `observation`, not `obs`; `teacherAssignment`, not `ta`.
- Use the domain's words from the CRS: _evidence_, _mission_, _observation_, _reflection_, _growth domain_. Do not invent synonyms.
- Name event handlers `handleX` inside a component and props `onX`.

## 3. Functions and components

- Keep functions short enough to read without scrolling. If a block needs a heading comment, it is probably its own function.
- Return early instead of nesting `if` blocks.
- Prefer pure functions: same input, same output, no hidden state.
- No magic values. Put strings and numbers that carry meaning in a named constant (`LOCALE_COOKIE`, not `"NOOR_LOCALE"` inline).
- Components:
  - Server Components by default. Add `"use client"` only to the smallest interactive leaf.
  - Props are a named `type` (`type MissionCardProps = { ... }`), not inline object types.
  - No business logic in components. Data shaping lives in the feature's `lib/` or in the API.

## 4. TypeScript

- `strict` plus `noUncheckedIndexedAccess`: array and record lookups may be `undefined`, so handle it.
- No `any`. Use `unknown` and narrow it.
- Import types with `type` (`import { type Locale } from ...`); lint fixes this automatically.
- Model states explicitly. For example, a growth domain is `"not-assessed" | "needs-support" | ...`, never a nullable number (FR-GRW-001).

## 5. Styling and direction

- Tailwind utilities only, in the component's `className`.
- Colours, radius and sizes come from the `@noor/ui` tokens (`bg-surface`, `text-ink`, `bg-primary`, `rounded-control`, `min-h-control`…), never raw hex values. The tokens are tested for contrast.
- Use the `@noor/ui` primitives (`Button`, `TextField`, `Dialog`…) before writing a new control.
- Logical direction only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `rounded-s-*`, `border-s-*`. Lint rejects `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left` and similar (rule `noor/no-physical-classes`, shared from `@noor/ui`).
- Icons that point a direction (arrows, "next") flip with `rtl:-scale-x-100`. Never mirror media controls, logos, number pads or Quran text.
- Meaning is never carried by colour alone (NFR-A11Y-001).

## 6. Text and translation

- No hard-coded UI text in JSX. Lint rejects it (`react/jsx-no-literals`).
- Every string lives in `src/i18n/dictionaries/en.json` and `ar.json`. Both files have the same shape; a missing Arabic key fails the type check.
- Client components read the few strings they need from `src/i18n/client-dictionaries/`, so the browser never downloads the whole dictionary.
- Numbers, dates and plurals go through `src/i18n/format.ts` (`Intl`), never string concatenation. Arabic has six plural forms.
- Names and other user-typed text inside a sentence go in `<bdi>`; text inputs use `dir="auto"`.
- Pages under `(dev)` are exempt from the text rule: they hold sample text for design review only.
- Arabic copy is written for Arabic readers, not translated word by word. Child-facing copy avoids shame and labels (UI spec, language rules).

## 7. Comments

Write comments for the reader who has the code but not the context.

**Write a comment when it explains:**

- **Why** the code is this way, especially when the obvious alternative is wrong.
  ```ts
  // Required with Cache Components: every root parameter needs its values.
  export function generateStaticParams() { ... }
  ```
- **Where a rule comes from**, with the requirement or screen ID.
  ```ts
  // Unmapped activities must not change growth (FR-GRW-002).
  ```
- **A non-obvious constraint or trap.**
  ```ts
  // NEXT_PUBLIC_ values are inlined at build time; never put secrets here.
  ```

**Use TSDoc (`/** ... */`)** on exported functions, types and constants in shared code (`src/i18n`, `src/lib`, `src/components`, a feature's public `index.ts`). One sentence is usually enough. Say what it is for, not how it works.

```ts
/** Remembers the language the user picked last (X01). */
export const LOCALE_COOKIE = "NOOR_LOCALE";
```

**Do not write:**

| Avoid                                           | Why                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `// loop over the items`                        | Repeats what the code already says.                                        |
| Commented-out code                              | Git keeps history; delete it.                                              |
| `// TODO: fix later`                            | No owner or reference. Use `// TODO(name): what and why (task or ticket).` |
| Names, dates or change logs in comments         | Git blame and commit messages hold that.                                   |
| Long block comments explaining a whole function | Split the function and name the parts instead.                             |

**Language:** comments are in English, so the whole team can read them. Arabic belongs only in the dictionaries and in content.

**Keep them true:** when you change code, update or delete the comments next to it. A wrong comment is worse than none.

## 8. Errors and logging

- Handle errors where you can do something useful. Otherwise let them reach the nearest `error.tsx`.
- User-facing errors come from dictionary keys, never from raw error messages or provider text (UI spec, AI rules).
- `console.log` is not allowed. `console.warn` and `console.error` are allowed until the shared logger exists.
- Never log child data: names, notes, reflections, audio references or free text (NFR-OBS-001).

## 9. Commits

- Small commits that each leave the app working.
- Conventional Commits: `type(scope): summary`, for example `feat(web): add locale routing`. Commitlint checks the message.
- The body names the requirement IDs the change serves (`Refs: FR-I18N-001`).
- The pre-commit hook formats and lints the staged files. Before opening a pull request, run `pnpm check` and the app lint.
