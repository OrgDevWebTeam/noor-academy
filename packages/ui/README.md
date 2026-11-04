# @noor/ui

Design tokens and UI primitives shared by the Noor Academy apps. Every primitive works in Arabic
(RTL) and English (LTR) without changes.

Sources: Architecture v1.0 section 5.2; UI Screens Spec v0.1; CRS NFR-A11Y-001 and NFR-I18N-001.

## Use

The package is consumed as TypeScript source (ADR-0001). In a Next.js app:

```ts
// next.config.ts
transpilePackages: ["@noor/ui"],
```

```css
/* globals.css: the tokens, plus the classes the primitives use */
@import "tailwindcss";
@import "@noor/ui/styles.css";
@source "../../../../packages/ui/src";
```

```tsx
import { Button, TextField } from "@noor/ui";
```

## Contents

| Export                       | What it is                                                                 |
| ---------------------------- | -------------------------------------------------------------------------- |
| `styles.css`                 | Tokens: colours, radius, text size and control height                      |
| `Button`, `buttonClasses`    | Button, and the same look for links (`<Link className={buttonClasses()}>`) |
| `TextField`, `SelectField`   | Labelled inputs with hint and error, linked for screen readers             |
| `Card`                       | Content container                                                          |
| `StatusBadge`                | Status with an icon and text, never colour alone                           |
| `AlertBanner`                | Page message; warnings and errors are announced at once, others politely   |
| `EmptyState`                 | Calm message when there is nothing to show                                 |
| `Skeleton`, `SkeletonText`   | Loading placeholders; the pulse stops when the user prefers less motion    |
| `Dialog`                     | Modal on the native `<dialog>`: focus stays inside, Escape closes          |
| `PinPad`, `pressPinKey`      | Number pad for the child PIN; always left to right, keyboard friendly      |
| `eslint/no-physical-classes` | Lint rule that rejects `ml-*`, `pr-*`, `left-*`, `text-left`…              |

Primitives take all their text as props, so the app passes it from its dictionaries.

## Rules

1. Logical CSS only (`ms-*`, `ps-*`, `start-*`, `text-start`); the lint rule enforces it.
2. Colours come from the tokens, never raw hex values. `tokens.test.ts` checks every text and
   control colour pair against WCAG AA (4.5:1 text, 3:1 controls and focus).
3. Meaning is never carried by colour alone (NFR-A11Y-001).
4. Number pads, media controls, logos and Quran text are never mirrored.

## Commands

```bash
pnpm --filter @noor/ui lint
pnpm --filter @noor/ui typecheck
pnpm --filter @noor/ui test
```
