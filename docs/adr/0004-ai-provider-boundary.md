# ADR-0004: AI provider boundary

- Status: Proposed (owners: Qussai, Ismail)
- Context: AI evaluates children's Quran recitation. The repo is public and the data is sensitive.
- Decisions (proposed):
  - All model access goes through the `AiProvider` interface; providers are swappable.
  - **No child identity** (id, family id, name) crosses the boundary. Evaluations use an opaque
    `evaluationId`. Enforced by strict schemas and tests.
  - Audio is passed by opaque reference, never inline or as a public URL.
  - Results are **machine-readable keys** (rule id, feedback key), not generated free text. Wording
    comes from a reviewed feedback catalog, so nothing unreviewed reaches a child.
  - A response that does not match the request's `evaluationId` is rejected.
  - Telemetry is one privacy-safe event per evaluation: no audio, transcript or identity.
  - Audio and datasets are never committed to this repository.
- Open questions: provider selection, data-processing agreement and retention, parental consent
  wording, region of processing.
