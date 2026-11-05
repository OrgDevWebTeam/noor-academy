# Quran audio input/output and evaluation dataset requirements

- Owners: Qussai (AI 1) + Ismail (AI 2). Jira: KAN-9.
- Version: v1.0, 2026-11-05.
- Based on: CRS v3.0 (FR-QUR-002..004, VAL-014, VAL-016, SEC-006, SEC-011, SEC-017, SEC-018),
  Architecture v3.0 (§7.3, §8.1–8.7), Roadmap v3.0 (weeks 2–7).
- Related: `docs/contracts/ai-result.md` (the result), `docs/ai/teacher_annotation_guide.md`
  (how teachers label), `docs/ai/tajweed_taxonomy_and_feedback.md` (error codes).

> 🔶 = proposal waiting for a decision. Everything else follows the CRS and Architecture.

---

## Part A. Audio input and output

### A.1 Path of one recording

1. The browser records one ayah with `MediaRecorder` (Osama).
2. The API receives it on `POST /api/v1/attempts`, checks type and size, saves it in the private
   folder with a random name, and sends it to the AI service (Ahmad).
3. The AI service converts it, runs the quality gate, runs the models, and returns one result in
   the contract format (Qussai).
4. The API saves the result inside the attempt and returns it to the browser in the same request.

### A.2 What the API accepts (VAL-016)

| Rule              | Value                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types             | Audio only. Expected from browsers: `audio/webm` (Chrome, Edge, Android), `audio/mp4` (Safari, iOS). Also allowed: `audio/ogg`, `audio/wav`, `audio/mpeg` |
| Size              | Max 5 MB                                                                                                                                                  |
| File name         | Random (`crypto.randomUUID()`), never the child's name                                                                                                    |
| One ayah per file | Yes. The form also sends `surah`, `ayah`, `level`, `attemptId`                                                                                            |

### A.3 What the AI service does with the audio

| Step         | Rule                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convert      | ffmpeg → 16 kHz, mono, 16-bit PCM WAV. Temporary file only, deleted after the analysis                                                                  |
| Quality gate | Silero VAD + simple loudness and clipping checks. Result: `quality` = `ok`, `silent`, `too_short` or `too_noisy`                                        |
| Reference    | The AI service loads the expected ayah (text and word timings) from the licensed reference files by `surah` + `ayah`. It never searches the whole Quran |
| Models       | quran-muaalem (pronunciation and tajweed) and whisper-quran (word comparison). Disagreement → `ERR_TECH_MODELS_DISAGREE` → `uncertain`                  |
| Output       | One result in the contract format. Model text is never returned to the API                                                                              |

**Quality gate starting values** 🔶 (tuned in weeks 2–3 against the `poor_audio` labels):

| Reason      | Starting rule                                              |
| ----------- | ---------------------------------------------------------- |
| `silent`    | VAD finds less than 0.3 s of speech                        |
| `too_short` | Speech shorter than 40% of the reference ayah length       |
| `too_noisy` | Speech ratio below 0.3, or more than 1% of samples clipped |

**Maximum length** 🔶 (taxonomy item 5.8): proposal 30 s per ayah. The longest reference ayah is
12.8 s, and children often read at half the reciter's speed. Until decided, only the 5 MB limit
applies.

### A.4 Output

The result format is `docs/contracts/ai-result.md`. Debug detail stays inside the AI service:

| Logged per request (no audio, no names)                                               | Why                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------ |
| `attemptId`, `surah`, `ayah`, `level`                                                 | Join with the attempt in the API           |
| Audio seconds, quality reason, speech ratio                                           | Architecture §8.7 and quality-gate tuning  |
| Per model: name, version, status (`ok`, `timeout`, `error`, `disabled`), inference ms | Latency target (NFR-PERF-003), kill switch |
| Raw model codes and phoneme diagnostics                                               | Error analysis in the evaluation reports   |

Logs never contain audio, transcripts shown to anyone, child names or parent data (NFR-OBS-001).

---

## Part B. Evaluation dataset requirements

### B.1 What the dataset is for

| Week               | Use                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------- |
| 4                  | Benchmark the models, choose the main model and the first threshold (OD-02)         |
| 6                  | Decide whether to fine-tune; measure the new model or rules                         |
| 7                  | Regression run before the release candidate; final threshold with teacher decisions |
| Every model change | One run on the untouched test set (Roadmap §7)                                      |

### B.2 Size and coverage

| Requirement          | Value                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Children             | 30 non-native Arabic speakers aged 6–14, about 10 per age band (6–8, 9–11, 12–14)                                                                                                 |
| Ayahs                | All 25 ayahs of the 5 surahs, from every child                                                                                                                                    |
| Recordings           | 750 child recordings (30 × 25)                                                                                                                                                    |
| Labels               | Every word labeled by 2 teachers independently (annotation guide §5)                                                                                                              |
| Extra error examples | Recordings from consenting adults with deliberate errors (`source: seeded_adult`), mainly for rare tajweed errors. **Reported separately, never mixed into the decision numbers** |
| Conditions           | Recorded with the same browser recording path as the app, at home, on the family's own device. Natural noise is kept; the quality gate is part of what we test                    |

### B.3 Consent and privacy (must be true before a recording is opened)

1. A **separate written parental consent** for using the recording to test or train models
   (SEC-017). Each recording carries a `consentId`.
2. Recordings and labels stay on our machines in a **restricted folder on the GPU machine**, never
   in git, cloud drives, spreadsheets or AI tools (SEC-011, SEC-018).
3. Only anonymous ids (`recordingId`, `speakerId`). The list linking ids to families is kept by
   Mohammad, outside the dataset folder.
4. Withdrawn consent → the recording, its labels and any derived files are deleted (VAL-008).
5. Retention follows OD-04 (week 3).

### B.4 Folder layout (on the GPU machine only)

```text
noor-eval/                      restricted, access logged
├── audio/<recordingId>.<ext>   original upload, never edited
├── recordings.jsonl            one line per recording (B.5)
├── labels.jsonl                one line per word per teacher (B.6)
├── splits.json                 frozen speaker lists for train / dev / test (B.7)
└── runs/<date>-<model>.json    one file per evaluation run (B.9)
```

### B.5 One recording (`recordings.jsonl`)

| Field           | Example      | Meaning                                                                       |
| --------------- | ------------ | ----------------------------------------------------------------------------- |
| `recordingId`   | `REC_0001`   | Anonymous id                                                                  |
| `speakerId`     | `SPK_017`    | Anonymous speaker, used for the split                                         |
| `consentId`     | `CON_017`    | The separate model-use consent                                                |
| `source`        | `child`      | `child` or `seeded_adult`                                                     |
| `ageBand`       | `9-11`       | `6-8`, `9-11`, `12-14`                                                        |
| `surah`, `ayah` | `1`, `4`     | Which ayah                                                                    |
| `device`        | `phone`      | `phone`, `tablet`, `laptop`                                                   |
| `mimeType`      | `audio/webm` | As uploaded                                                                   |
| `recordedAt`    | `2026-11-12` | Date only                                                                     |
| `audioQuality`  | `ok`         | `ok` or `poor_audio`, from the gold labels                                    |
| `split`         | `test`       | `train`, `dev` or `test`, copied from `splits.json` after the split is frozen |

### B.6 One word label (`labels.jsonl`)

Same fields as the annotation guide §4, in camelCase:

| Field             | Example                   | Meaning                                                  |
| ----------------- | ------------------------- | -------------------------------------------------------- |
| `recordingId`     | `REC_0001`                |                                                          |
| `wordIndex`       | `3`                       | **1 = first word**, same as the contract                 |
| `annotatorId`     | `TCH_02`                  |                                                          |
| `round`           | `1`                       | `1` = independent label, `2` = reviewer's final decision |
| `teacherDecision` | `needs_practice`          | `correct`, `needs_practice`, `poor_audio`                |
| `errorCodes`      | `["ERR_PRON_LETTER_SUB"]` | Codes from the contract; empty when correct              |
| `notes`           |                           | Short, never names                                       |

**Gold label for a word:** the two round-1 labels when they agree, otherwise the reviewer's round-2
label. A recording where the gold label is `poor_audio` is a quality-gate test case only.

### B.7 Split

- Split **by speaker**, never by recording, so one child is never in two parts.
- 🔶 Test: 10 children (about 250 recordings, balanced by age band). Dev: 5 children. Train: the
  rest.
- **The threshold is tuned on dev and confirmed on test.** Tuning on the test set would make its
  numbers look better than reality.
- The test set is frozen at the end of week 3. `splits.json` stores the speaker lists and a SHA-256
  of `recordings.jsonl` and `labels.jsonl`. Nothing in the test set is used for tuning or training.

### B.8 What we measure

Each analysed recording gets the model decision at **all three levels**, compared with the gold
labels and the stopping rules of that level (CRS §5.4).

| Metric                 | Definition                                                              | Why it matters                                             |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| False reject rate      | Gold: no stopping error. Model: `error`                                 | A child is stopped for a correct reading                   |
| False accept rate      | Gold: a stopping error. Model: `accepted`                               | A real mistake passes                                      |
| Word location accuracy | When both say error, the model points to the same `wordIndex`           | Wrong word replayed = confusing                            |
| Uncertain rate         | Share of analysed recordings that come back `uncertain`                 | Teacher workload                                           |
| Quality gate           | Precision and recall of rejections against gold `poor_audio`            | Children asked to re-record for nothing, or noise analysed |
| Latency                | p50 and p95 seconds per ayah on the GPU machine, per model and combined | NFR-PERF-003 target (week 4)                               |

Every number is reported overall, per error category, per age band and per level. Seeded adult
recordings get their own table.

🔶 Starting targets for discussion in week 4 (not approved): false reject ≤ 5%, false accept ≤ 15%
for memorization errors, uncertain rate ≤ 30%. False rejects matter more than false accepts,
because the teacher still checks a sample of accepted ayahs (FR-LIVE-005).

### B.9 One evaluation run (`runs/*.json`)

Stores: model names and exact versions, the decision-policy version, threshold, dataset hash from
`splits.json`, which split was used, every metric from B.8, and the date. Runs are kept for the AI
pilot report (week 8).

---

## Open items

| #   | Item                                                       | Who decides                   | Needed by                       |
| --- | ---------------------------------------------------------- | ----------------------------- | ------------------------------- |
| 1   | Maximum recording length (A.3, taxonomy 5.8)               | Qussai + Ismail               | Week 2                          |
| 2   | Quality gate values (A.3)                                  | Qussai, from labels           | Week 3                          |
| 3   | Split sizes (B.7)                                          | Qussai + Ismail               | Week 3                          |
| 4   | Target numbers (B.8)                                       | Mohammad, from week 4 numbers | Week 4                          |
| 5   | Who keeps the id-to-family list (B.3)                      | Mohammad                      | Week 2, before recordings start |
| 6   | Retention of evaluation recordings after the pilot (OD-04) | Mohammad                      | Week 3                          |
