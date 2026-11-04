# Personalization and GenAI boundaries

Owners: Qussai / Ismail. Status: DRAFT. **Proposed guardrails below are a starting point to
confirm against the architecture document and legal/child-safety review.**

## Proposed guardrails

1. **No open-ended conversation with a child.** Children never type free text to a model.
2. **No generated text shown to a child without review.** Output is chosen from reviewed content
   or templates (feedback keys, mission catalog).
3. **No personal data to AI providers.** No names, family or child ids, contact details or location.
4. **Personalization picks from an approved set.** Recommendations select among reviewed missions;
   they do not invent content.
5. **A teacher can see and override** any automated recommendation.
6. **Parental consent** is required before any child audio is processed or kept.
7. **No training on child data** unless separately consented and approved.
8. **Kill switch.** Any AI feature can be disabled per environment without a deploy.
9. **Everything is measured:** each AI call emits privacy-safe telemetry.

## To decide

1. Exactly which features may use personalization, and which may use GenAI at all.
2. What signals personalization may use (progress, level) and which are off-limits (for example emotion).
3. Review process for new missions and recommendation rules.
4. Incident process if the AI produces something inappropriate.
