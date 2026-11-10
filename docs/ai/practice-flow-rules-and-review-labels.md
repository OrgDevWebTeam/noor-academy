# Quran Practice Flow Content Rules & Teacher Review Labels

- Owners: Ismail (AI 2) + Qussai (AI 1). Jira: KAN-28.
- Version: v1.0, 2026-11-09.
- Based on: CRS v3.0 (§5.4, FR-QUR-002..006), Architecture v3.0 (§8.3–8.5), `services/ai/app/policy.py`.
- Related: `docs/contracts/ai-result.md`, `docs/ai/tajweed_taxonomy_and_feedback.md`, `apps/web/src/pages/review-queue-page.tsx`.

---

## 1. Practice Flow Content Rules (Tiered Stopping Rules)

To balance learning rigor with positive motivation for young learners, recitation analysis implements tiered stopping rules governed by learner proficiency levels (`beginner`, `intermediate`, `advanced`).

### 1.1 Category Stopping Matrix

| Level          | Stopping Error Categories                           | Target Lesson Scope Required?  | Behavior on Stopping Finding                                      |
| -------------- | --------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `beginner`     | `memorization`                                      | No                             | `decision: error` — Child pauses and replays the specific word    |
| `intermediate` | `memorization`, `pronunciation`                     | No                             | `decision: error` — Child pauses and corrects letter/haraka       |
| `advanced`     | `memorization`, `pronunciation`, `targeted tajweed` | Yes (`targeted_tajweed_codes`) | `decision: error` only if tajweed code is in current lesson focus |

### 1.2 Non-Blocking & Unmapped Findings Policy

1. **Unapproved Codes (`NOT_YET_APPROVED`):**
   - Codes marked experimental (e.g., `ERR_MEM_INSERTION`, `ERR_PRON_MADD_ASLI_SHORT`, `ERR_TAJ_GHONNA_OMIT`) are logged for diagnostic evaluation but **never** stop the learner (`stops_child = False`).
2. **Confidence Threshold & Escalation (`ALWAYS_UNCERTAIN`):**
   - Any finding with `confidence < CONFIDENCE_THRESHOLD` (default 0.70) or categorized under `ALWAYS_UNCERTAIN` (`ERR_TAJ_UNMAPPED`, `ERR_TECH_MODELS_DISAGREE`) converts the attempt decision to `uncertain`.
   - The learner proceeds forward seamlessly with `FEEDBACK_TEACHER_REVIEW`, avoiding disruption, while the recording is queued for asynchronous human review (FR-QUR-006).

---

## 2. Teacher Review Queue Labels & Taxonomy

When attempts return `decision: uncertain` or flag tajweed edge-cases, they populate the teacher interface (`apps/web/src/pages/review-queue-page.tsx`). Teachers evaluate attempts using standardized label conventions aligned with `docs/ai/teacher_annotation_guide.md`.

### 2.1 Standard Review Labels

| Label            | Trigger Condition                                             | Child Impact                                              |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `correct`        | False rejection by model; child's recitation was valid        | Marks ayah completed; awards progress credit              |
| `needs_practice` | Genuine omission, pronunciation slip, or target tajweed error | Assigns focused repetition exercise on next login session |
| `poor_audio`     | Background noise, clipping, or distant speech passed gate     | Prompts re-recording request without recording penalty    |

### 2.2 Teacher Annotation Contract Mapping

For word-level labeling during verification rounds:

- **Round 1:** Independent review by assigned teacher (`round: 1`).
- **Round 2 (Arbitration):** Triggered on teacher discrepancy; sets gold label (`round: 2`).
- **Field Contract:** Follows schema `recordingId`, `wordIndex` (1-based), `teacherDecision`, `errorCodes[]`, and sanitized non-PII `notes`.
