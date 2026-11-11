# Mission selection contract (draft 0.1)

Owner: Qussai. Status: **DRAFT prototype.** The catalog holds placeholders only, so nothing here is
shown to families until real missions are reviewed and approved.

The API asks the AI service which Family Loop mission to give, after the child answers an Asia &
Sham question about a value wrongly (FR-AGT-004). The answer is **always an id from the reviewed
mission catalog**. Nothing is generated: the wording lives in the app's messages under the
mission's `textKey` (safety doc section 2.3, ADR-0007).

| File                                                       | What it is                             |
| ---------------------------------------------------------- | -------------------------------------- |
| `packages/contracts/schemas/mission_selection.schema.json` | Request and response (source of truth) |
| `packages/contracts/schemas/mission_catalog.schema.json`   | The mission catalog format             |
| `services/ai/app/missions/catalog.placeholder.json`        | Placeholder catalog (not reviewed)     |
| `services/ai/app/missions/prompts/mission_select_v0.txt`   | Prompt template for a selector model   |

## `POST /v1/missions/select` (internal only)

JSON body. Every field is a uuid, a level or an UPPER_CASE id, and unknown fields are rejected
with `400 VALIDATION_ERROR`, so a name, family id or free-text note cannot be sent at all.

```json
{
  "requestId": "0b6e2c1a-1d2e-4f00-9a1b-2c3d4e5f6a7b",
  "level": "beginner",
  "value": "VALUE_HONESTY",
  "recentMissionIds": ["MISSION_HONESTY_KEEP_PROMISE"]
}
```

| Field              | Rule                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `requestId`        | uuid made for this request only. Never a child, family or session id        |
| `level`            | `beginner`, `intermediate` or `advanced`                                    |
| `value`            | `VALUE_*` id from the catalog                                               |
| `recentMissionIds` | Optional, up to 20 `MISSION_*` ids given recently, so they are not repeated |

Response (`200`):

```json
{
  "requestId": "0b6e2c1a-1d2e-4f00-9a1b-2c3d4e5f6a7b",
  "missionId": "MISSION_HONESTY_TELL_TRUTH",
  "reasonRule": "RULE_VALUE_MATCH",
  "selector": "rules",
  "catalogVersion": "0.1-placeholder",
  "promptVersion": null
}
```

`reasonRule` says why the mission was chosen, so teachers and parents can see the reason (safety
doc 2.1). The API should store it with the plan item.

| `reasonRule`               | Meaning                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `RULE_VALUE_MATCH`         | First reviewed mission for the value and level, not done recently |
| `RULE_VALUE_MATCH_REPEAT`  | Every matching mission was done recently, so one repeats          |
| `RULE_NO_MISSION`          | No reviewed mission fits. `missionId` is `null`                   |
| `AI_SELECTED`              | The selector model chose one of the allowed missions              |
| `RULE_FALLBACK_AI_INVALID` | The model's reply broke a guardrail, so the rules chose           |
| `RULE_FALLBACK_AI_ERROR`   | The model failed, so the rules chose                              |

## How a mission is chosen

1. **Candidates:** missions for the value and level whose `reviewState` is `approved`
   (`placeholder` too, but only in `MOCK_MODE`; `draft` never). Missions in `recentMissionIds` are
   left out unless nothing else fits. Sorted by id.
2. **Rules:** the first candidate. This is always ready, so the family loop never stops.
3. **Selector model (optional):** only when `MISSIONS_AI_ENABLED=true` (off by default). Today
   that is a deterministic mock. No real model is planned without a new decision (ADR-0007).

## Guardrails

| Where  | Guardrail                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------- |
| Input  | Strict schema: ids and levels only, no free text, unknown fields rejected                          |
| Prompt | Only the value, level and candidate ids go in, each a plain token (no injection, no personal data) |
| Output | The reply must be exactly `{"missionId": "<candidate>"}`, at most 500 characters                   |
| Output | An invented, draft, other-value or other-level id is rejected (`MISSION_NOT_ALLOWED`)              |
| Output | Model text is never passed on, logged or shown                                                     |
| Switch | `MISSIONS_AI_ENABLED` turns the model off without a deploy                                         |
| Audit  | One telemetry event per selection: ids, codes and timings only                                     |

## Telemetry event

Logged by `noor.ai.missions`, one per request:

```json
{
  "event": "mission_selection",
  "requestId": "0b6e2c1a-1d2e-4f00-9a1b-2c3d4e5f6a7b",
  "selector": "rules",
  "reasonRule": "RULE_FALLBACK_AI_INVALID",
  "guardrail": "MISSION_NOT_ALLOWED",
  "candidateCount": 2,
  "catalogVersion": "0.1-placeholder",
  "promptVersion": "mission_select_v0",
  "latencyMs": 1
}
```

`guardrail` is `null`, `OUTPUT_FORMAT`, `OUTPUT_TOO_LONG`, `MISSION_NOT_ALLOWED` or `MODEL_ERROR`.

## Open

1. Real values and missions, with wording reviewed by the content and child-safety reviewers.
2. Where the catalog lives for good (the `content` collection, `docs/data/core-schema.md`).
3. Whether a selector model adds anything over the rules at all (ADR-0007).
