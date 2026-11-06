# Workstreams

Who owns what, and where it lives. Interfaces in `packages/contracts` are shared: changing one
needs the owner's review (see `.github/CODEOWNERS`).

| Workstream                                                                     | Owner            | Lives in                                                                             | Stable interface others depend on                                            |
| ------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| MongoDB core schema: family, child, content, progress, teacher relationships   | Mohammad / Osama | `apps/api`, `apps/api/migrations`, `docs/data/core-schema.md`                        | Collections and repositories (always scoped by `familyId`)                   |
| Next.js / PWA shell, bilingual routing, RTL/LTR, shared UI primitives          | Qussai / Ismail  | `apps/web`, `packages/ui`                                                            | `packages/ui` components, locale helpers in `@noor/contracts`                |
| AI service, AI result contract and evaluation telemetry schema                 | Qussai           | `services/ai`, `packages/contracts/src/ai.ts`, `packages/contracts/src/telemetry.ts` | `docs/contracts/ai-result.md`, `aiResultSchema`, `evaluationTelemetrySchema` |
| Quran audio input and evaluation dataset requirements                          | Ismail           | `docs/ai/audio-io-and-eval-dataset.md`, `docs/ai/evaluation-dataset-requirements.md` | Audio limits and reference data in `packages/contracts/data`                 |
| Tajweed product taxonomy, feedback language, teacher-escalation rules          | Qussai / Ismail  | `docs/ai/tajweed-taxonomy.md`, `feedback-language.md`, `teacher-escalation-rules.md` | Rule ids and feedback keys used in results                                   |
| Personalization / GenAI boundaries for child-safe missions and recommendations | Qussai / Ismail  | `docs/ai/personalization-genai-boundaries.md`                                        | The guardrails every AI feature must satisfy                                 |

## Working rules

- One branch per piece of work, one pull request, Conventional Commit title, CI green.
- The repo is public. Never commit audio, datasets, real child data or `.env` files.
- Specs in `docs/ai/` are drafts until reviewed by qualified Quran teachers and signed off.
