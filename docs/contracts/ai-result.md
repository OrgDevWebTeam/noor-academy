# AI result contract (v3.0)

- Owners: Qussai (AI service side) + Ahmad (API side). Error codes and message keys: Ismail.
- Status: agreed by the AI team on 2026-11-05. Jira: KAN-9.
- Based on: Architecture v3.0 §8.1–8.5, CRS v3.0 §5.3–5.4, FR-QUR-003..008, VAL-006, VAL-014.

This is the agreement between the API and the AI service. Every model, real or mock, returns
**this one format** (NFR-AI-002).

| Where                                                      | What checks it                                            |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| `packages/contracts/schemas/recitation_result.schema.json` | **The source of truth** (JSON Schema). Change this first. |
| `services/ai/app/schemas.py`                               | Pydantic models in the AI service                         |
| `packages/contracts/src/ai.ts`                             | TypeScript types for the API and web app                  |

If you change the contract, change all three in the same pull request. Tests on both sides fail
when they drift apart.

## Decisions

1. **Field names are camelCase** (Architecture §8.3).
2. **Words are numbered from 1.** `wordIndex: 1` is the first word of the ayah. This matches
   `position` in the reference text and word-timing files.
3. **The contract is small on purpose.** It holds only what the API and the child's session need.
   Debug detail (phoneme-level diagnostics, raw model codes, GPU memory, timings per model) is
   written to the AI service logs and the evaluation output, not into this result.

## Endpoints (internal only, never called by browsers)

All requests are `multipart/form-data`. The API waits at most `AI_TIMEOUT_MS` (20 000 ms). If the
AI service is down, slow, returns a non-200 status or an invalid result, the API does **not** fail:
it saves the fallback result below (`model: "none"`, `decision: "uncertain"`) and the teacher sees
the ayah (Architecture §8.5).

### `GET /health`

```json
{ "status": "ok", "mockMode": true, "models": [{ "name": "mock", "version": "0.2" }] }
```

### `POST /v1/recitation/analyze`

Checks one recorded ayah.

| Form field  | Type    | Meaning                                                                                            |
| ----------- | ------- | -------------------------------------------------------------------------------------------------- |
| `audio`     | file    | The child's recording. Audio only, max 5 MB. Input rules in `docs/ai/audio-io-and-eval-dataset.md` |
| `attemptId` | text    | Noor attempt id (a UUID made by the API)                                                           |
| `surah`     | integer | Surah number (1–114)                                                                               |
| `ayah`      | integer | Ayah number (from 1)                                                                               |
| `level`     | text    | `beginner`, `intermediate` or `advanced`. Decides what stops the child (CRS §5.4)                  |

The Arabic word check (`POST /v1/arabic/word`, FR-ARB-002) is added in week 5.

### Errors from the AI service

Same shape as the API:

```json
{ "error": { "code": "MODELS_NOT_READY", "message": "Real models are not installed yet" } }
```

| Status | Code               | When                                                    |
| ------ | ------------------ | ------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` | A form field is missing or wrong                        |
| 400    | `FILE_TOO_LARGE`   | Audio over 5 MB                                         |
| 503    | `MODELS_NOT_READY` | `MOCK_MODE=false` (real models are connected in week 3) |

## The result

| Field          | Type    | Meaning                                                                                                                           |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `attemptId`    | text    | The same `attemptId` that was sent                                                                                                |
| `model`        | text    | Which model produced the result: `mock`, `quran-muaalem`, `whisper-quran`, `faster-whisper`, `combined`, or `none` (API fallback) |
| `modelVersion` | text    | Exact model revision (not just the package name). OPS-008                                                                         |
| `decision`     | text    | `accepted`, `error` or `uncertain` (from the decision policy below)                                                               |
| `quality`      | text    | `ok`, or a reject reason: `silent`, `too_short`, `too_noisy`, `too_long` (over 30 s)                                              |
| `findings`     | list    | Problems found, at most one per word (can be empty)                                                                               |
| `processingMs` | integer | How long the analysis took                                                                                                        |

### A finding

| Field         | Type    | Meaning                                                                          |
| ------------- | ------- | -------------------------------------------------------------------------------- |
| `wordIndex`   | integer | Which word of the ayah. **1 = first word**                                       |
| `category`    | text    | `memorization`, `pronunciation`, `tajweed` or `technical`                        |
| `code`        | text    | Noor error code from the table below. Raw model codes go to the logs only        |
| `confidence`  | number  | 0 to 1                                                                           |
| `wordStartMs` | integer | Start of this word in the **reference** recitation (to replay it)                |
| `wordEndMs`   | integer | End of this word in the reference recitation (not before `wordStartMs`)          |
| `messageKey`  | text    | Child-safe message key from `packages/contracts/schemas/safe_messages_v1_1.json` |

### Error codes

From Ismail's taxonomy (`docs/ai/tajweed_taxonomy_and_feedback.md`). The prefix must match the
category. Codes marked 🔶 are allowed by the contract but stay switched off until their open
decision is approved.

| Category      | Code                          | Meaning                                                        | Message key                       |
| ------------- | ----------------------------- | -------------------------------------------------------------- | --------------------------------- |
| memorization  | `ERR_MEM_OMISSION`            | A word was skipped                                             | `FEEDBACK_WORD_MISSED`            |
| memorization  | `ERR_MEM_SUBSTITUTION`        | A different word was read                                      | `FEEDBACK_WORD_DIFFERENT`         |
| memorization  | `ERR_MEM_INSERTION` 🔶        | An extra word was added                                        | `FEEDBACK_WORD_DIFFERENT`         |
| pronunciation | `ERR_PRON_LETTER_SUB`         | One letter read as another                                     | `FEEDBACK_LISTEN_AND_REPEAT_WORD` |
| pronunciation | `ERR_PRON_HARAKA`             | Clear vowel (haraka) error                                     | `FEEDBACK_CHECK_HARAKA`           |
| pronunciation | `ERR_PRON_MADD_ASLI_SHORT` 🔶 | A short madd that changes the word                             | `FEEDBACK_LISTEN_AND_REPEAT_WORD` |
| tajweed       | `ERR_TAJ_MADD_SHORT`          | Madd too short                                                 | `FEEDBACK_MADD_REMINDER`          |
| tajweed       | `ERR_TAJ_GHONNA_OMIT` 🔶      | Ghunna left out                                                | `FEEDBACK_GHUNNA_REMINDER`        |
| tajweed       | `ERR_TAJ_QALQALA_OMIT`        | Qalqala left out                                               | `FEEDBACK_QALQALA_REMINDER`       |
| tajweed       | `ERR_TAJ_UNMAPPED`            | The model reported a tajweed rule we do not map. Never guessed | `FEEDBACK_TEACHER_REVIEW`         |
| technical     | `ERR_TECH_MODELS_DISAGREE`    | The two recitation models disagree on this word                | `FEEDBACK_TEACHER_REVIEW`         |

For `ERR_MEM_INSERTION`, `wordIndex` and the replay segment point to the reference word just
before the extra word.

### Rules

- **Text from a model is never shown to a child.** The app only shows the reviewed text for a
  `messageKey`. Whisper transcripts never leave the AI service.
- **Quality rejections are not attempts** (FR-QUR-003, VAL-014). When `quality` is not `ok`,
  `decision` is `uncertain` and `findings` is empty. The API marks the attempt `rejected`, and the
  child hears `FEEDBACK_AUDIO_UNCLEAR` and records again. For `too_long` the child hears
  `FEEDBACK_AUDIO_TOO_LONG` instead (text to be written by Ismail).
- **Decision policy** (Architecture §8.4):
  1. Any finding with `confidence` below `CONFIDENCE_THRESHOLD` → `uncertain`.
  2. Any `ERR_TAJ_UNMAPPED` or `ERR_TECH_MODELS_DISAGREE` finding → `uncertain`.
  3. Otherwise, a finding whose category stops the child's level → `error`.
  4. Otherwise → `accepted`. Findings that do not stop the level are kept as notes.
- **What stops each level** (CRS §5.4): beginner = memorization; intermediate = memorization +
  pronunciation; advanced = memorization + pronunciation + the tajweed rules targeted in the
  lesson. 🔶 codes never stop a child until approved.
- `uncertain` always means the ayah goes to the teacher's notes and the child moves on
  (FR-QUR-006). There is no separate "needs teacher" flag.
- Every result stores `model` and `modelVersion` (OPS-008).

## Examples

### 1. Accepted

```json
{
  "attemptId": "6650f0c2a1b2c3d4e5f60001",
  "model": "mock",
  "modelVersion": "0.2",
  "decision": "accepted",
  "quality": "ok",
  "findings": [],
  "processingMs": 12
}
```

### 2. Error (the child listens to word 1 and reads the ayah again)

```json
{
  "attemptId": "6650f0c2a1b2c3d4e5f60002",
  "model": "mock",
  "modelVersion": "0.2",
  "decision": "error",
  "quality": "ok",
  "findings": [
    {
      "wordIndex": 1,
      "category": "memorization",
      "code": "ERR_MEM_SUBSTITUTION",
      "confidence": 0.92,
      "wordStartMs": 0,
      "wordEndMs": 600,
      "messageKey": "FEEDBACK_WORD_DIFFERENT"
    }
  ],
  "processingMs": 15
}
```

### 3. Uncertain (goes to the teacher, the child moves on)

```json
{
  "attemptId": "6650f0c2a1b2c3d4e5f60003",
  "model": "mock",
  "modelVersion": "0.2",
  "decision": "uncertain",
  "quality": "ok",
  "findings": [
    {
      "wordIndex": 1,
      "category": "memorization",
      "code": "ERR_MEM_OMISSION",
      "confidence": 0.4,
      "wordStartMs": 0,
      "wordEndMs": 600,
      "messageKey": "FEEDBACK_TEACHER_REVIEW"
    }
  ],
  "processingMs": 14
}
```

### 4. Quality rejection (not an attempt, record again)

```json
{
  "attemptId": "6650f0c2a1b2c3d4e5f60004",
  "model": "mock",
  "modelVersion": "0.2",
  "decision": "uncertain",
  "quality": "too_short",
  "findings": [],
  "processingMs": 3
}
```

### 5. API fallback (AI down, slow or invalid; made by the API, not the AI service)

```json
{
  "attemptId": "6650f0c2a1b2c3d4e5f60005",
  "model": "none",
  "modelVersion": "none",
  "decision": "uncertain",
  "quality": "ok",
  "findings": [],
  "processingMs": 20004
}
```

## What changed from Ismail's schema 2.0 (PR #12)

| Schema 2.0                                                                        | v3.0                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| snake_case fields                                                                 | camelCase                                                                          |
| `status` + `ayah_decision`                                                        | `decision` + `quality`                                                             |
| `quality_gate.reason`: `no_speech`, `high_noise`, `clipped`                       | `quality`: `silent`, `too_noisy` (clipped audio counts as `too_noisy`)             |
| `quality_gate.reason`: `too_long`                                                 | `quality`: `too_long` (recording over 30 s)                                        |
| `requires_teacher_review`                                                         | Implied by `decision: "uncertain"`                                                 |
| `word_results`, `policy`, `models[]`, `telemetry`, `diagnostics`, `provider_code` | AI service logs + evaluation output                                                |
| `word_retry_count`                                                                | Counted by the API's session engine, if the retry-limit change request is approved |
