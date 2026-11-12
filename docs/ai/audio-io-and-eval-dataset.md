# Quran audio input/output and evaluation dataset requirements

- Owners: Qussai (AI 1) + Ismail (AI 2). Jira: KAN-9, KAN-27.
- Version: v1.2, 2026-11-12 (v1.1 was 2026-11-10, v1.0 was 2026-11-05).
- Based on: CRS v3.0 (FR-QUR-002..004, VAL-014, VAL-016, SEC-006, SEC-011, SEC-017, SEC-018),
  Architecture v3.0 (§7.3, §8.1–8.7), Roadmap v3.0 (weeks 2–7).
- Related: `docs/contracts/ai-result.md` (the result), `docs/ai/teacher_annotation_guide.md`
  (how teachers label), `docs/ai/tajweed_taxonomy_and_feedback.md` (error codes),
  `services/ai/app/audio.py` (the gate described in A.3).

> 🔶 = proposal waiting for a decision. Everything else follows the CRS and Architecture.

## What changed in v1.2

| Section | Change                                                                                     |
| ------- | ------------------------------------------------------------------------------------------ |
| A.3     | The gate now decodes any upload with ffmpeg and uses Silero VAD instead of an energy level |
| A.3     | `too_long` (over 30 s) is a quality value in the contract, not an error                    |
| A.3     | The "too short for the reference ayah" check is removed until the new word timings exist   |
| Part C  | Gate tests removed. Only the contract test is kept                                         |

## Status in week 2

| Piece                       | State                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| Decode (ffmpeg) and gate    | Written (`app/audio.py`). Run from `scripts/run_real_audio.py` only        |
| Endpoints                   | Mock only. The gate and the models are connected in week 3                 |
| Quality values the contract | `ok`, `silent`, `too_short`, `too_noisy`, `too_long`                       |
| Word timings                | None. The reference reciter and its timings are decided in a later session |

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

The 5 MB limit is a size limit, not a duration limit. A small compressed file can hold a long
recording, so duration is checked after decoding (A.3).

### A.3 What the AI service does with the audio

| Step         | Rule                                                                                                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read         | The upload is read up to the 5 MB limit plus one byte, so an oversized file is rejected without loading it fully                                                                                                                                            |
| Convert      | ffmpeg → 16 kHz, mono samples. The upload is written to a temporary folder that is deleted right after. ffmpeg runs without a shell, with a 15 s timeout, and decodes at most 31 s, so a small file that holds a very long recording is never decoded fully |
| Quality gate | Silero VAD and clipping checks (`audio.py`). Result: `quality` = `ok`, `silent`, `too_short`, `too_noisy` or `too_long`                                                                                                                                     |
| Reference    | The AI service loads the expected ayah text from `reference_quran_text.json` by `surah` + `ayah` (`app/reference.py`). It never searches the whole Quran                                                                                                    |
| Models       | quran-muaalem (pronunciation and tajweed) and whisper-quran (word comparison). Merging the two is week 3. No generative language model is used in this path: the decision is deterministic and rule-based (`policy.py`)                                     |
| Output       | One result in the contract format. Model text is never returned to the API                                                                                                                                                                                  |

#### Gate measurements

| Measure        | Definition                                                              |
| -------------- | ----------------------------------------------------------------------- |
| Duration       | Decoded samples ÷ 16000                                                 |
| Speech seconds | Total length of the speech parts Silero VAD finds                       |
| Speech ratio   | Speech seconds ÷ duration, over the whole clip                          |
| Clipped ratio  | Samples with an absolute value of at least 32000 (16-bit) ÷ all samples |
| RMS            | RMS of the whole clip (logged only)                                     |

#### Order of checks

The first match wins.

1. The file cannot be decoded → **error** (table below).
2. Duration above 30 s → `too_long`.
3. Duration below 30 ms (or empty) → `too_short`.
4. Clipped ratio above 1% → `too_noisy`.
5. Speech seconds below 0.3 → `silent`.
6. Speech ratio below 0.30 → `too_noisy`.
7. Otherwise → `ok`.

All values are starting values, named constants at the top of `services/ai/app/audio.py`, tuned
later against real recordings.

#### Why 30 s

The longest prototype ayah takes about 13 s to recite, children often read at half the reciter's
speed (about 26 s), and Whisper's model input is a 30 s window, so longer audio would be cut and
create false omissions. A `too_long` recording is never reported as `too_noisy`: the child would be
told to move closer to the microphone. The child hears `FEEDBACK_AUDIO_TOO_LONG` (text by Ismail).

#### Audio errors

These are not quality results: the audio could not be read at all. All are `AudioError` with a code.

| Code             | Meaning                           |
| ---------------- | --------------------------------- |
| `EMPTY_AUDIO`    | The file has no bytes             |
| `DECODE_FAILED`  | ffmpeg cannot read it (not audio) |
| `DECODE_TIMEOUT` | ffmpeg took longer than 15 s      |

How each code becomes an API response is decided in week 3 (item 10). The AI service error shape
stays `{"error": {"code", "message"}}`.

### A.4 Output

The result format is `docs/contracts/ai-result.md`. Debug detail stays inside the AI service:

| Logged per request (no audio, no names)                                                          | Why                                                                           |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `attemptId`, `surah`, `ayah`, `level`                                                            | Join with the attempt in the API                                              |
| Gate report: `quality`, `durationSeconds`, `speechSeconds`, `speechRatio`, `clippedRatio`, `rms` | Architecture §8.7 and quality-gate tuning (the report from `check_quality()`) |
| The error `code` when the audio was rejected by an error                                         | Count guard and format rejections                                             |
| Per model: name, version, status (`ok`, `timeout`, `error`, `disabled`), inference ms            | Latency target (NFR-PERF-003), kill switch                                    |
| Per finding: `code`, `wordIndex`, `confidence` (the contract fields, no text)                    | Error analysis without any transcript                                         |
| Time per stage (decode, gate, each model) — week 3                                               | Find the slow step                                                            |

Logs never contain audio, transcripts, phoneme strings of what the child said, child names or
parent data (NFR-OBS-001, SEC-011). Contract v3.0 carries no phoneme or transcript text, and the
gate report holds numbers only.

**Phoneme diagnostics are not logged.** The predicted phonemes of a recitation are a phonetic
transcript of the child's speech, so they never go to request logs or app telemetry. For error
analysis (week 6), an offline evaluation run may keep per-recording model output, including phoneme
detail, only inside the restricted `noor-eval/` folder (B.4), only for recordings whose consent
covers model use (SEC-017).

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
   in git, cloud drives, spreadsheets or AI tools (SEC-011, SEC-018). This includes test fixtures:
   automated tests use synthetic audio only, never a child's recording.
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
├── outputs/<date>-<model>/     🔶 per-recording model output for error analysis (may hold phoneme
│                               text, so it stays here and never goes to logs, git or telemetry)
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
- **The train split is consent-gated and unused for now.** A recording can be used for training
  only if its consent covers model use (SEC-017) and a fine-tuning decision has been approved
  (B.1, week 6). Until then recordings are used for evaluation only, and no model is trained on them.
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

**How the quality gate is measured.** The `quality` value and the gate report come from the request
log (A.4), joined to the recording by `attemptId`, and are compared with the gold `poor_audio`
label. Recordings stopped by the duration guard or by a format error are not quality results, so
they are counted separately as "guard rejections" and are not part of precision and recall.

🔶 Starting targets for discussion in week 4 (not approved): false reject ≤ 5%, false accept ≤ 15%
for memorization errors, uncertain rate ≤ 30%. False rejects matter more than false accepts,
because the teacher still checks a sample of accepted ayahs (FR-LIVE-005).

### B.9 One evaluation run (`runs/*.json`)

Stores: model names and exact versions, the decision-policy version, threshold, dataset hash from
`splits.json`, which split was used, every metric from B.8, and the date. A run file holds metrics
and versions only, no audio, transcripts or phoneme text. Runs are kept for the AI pilot report
(week 8).

---

## Part C. Tests

The gate has no unit tests (decision of 2026-11-12). It is checked by running
`services/ai/scripts/run_real_audio.py` on real recordings. The only test in the AI service is
`tests/test_contract.py`, which keeps the result format in line with the JSON Schema.

---

## Open items

| #   | Item                                                                                                                            | Who decides                   | Needed by                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| 1   | ✅ Decided: 30 s, `quality: too_long` in the contract                                                                           | Qussai                        | Done                            |
| 2   | Quality gate values (A.3): starting values are in the code, to be tuned                                                         | Qussai, from labels           | Week 3                          |
| 3   | Split sizes (B.7)                                                                                                               | Qussai + Ismail               | Week 3                          |
| 4   | Target numbers (B.8)                                                                                                            | Mohammad, from week 4 numbers | Week 4                          |
| 5   | Who keeps the id-to-family list (B.3)                                                                                           | Mohammad                      | Week 2, before recordings start |
| 6   | Retention of evaluation recordings after the pilot (OD-04)                                                                      | Mohammad                      | Week 3                          |
| 7   | Noise detection: Silero VAD is in. An SNR estimate is still open                                                                | Qussai                        | Week 3                          |
| 8   | Speech ratio definition (whole clip or trimmed) and its floor, from real children                                               | Qussai + Ismail               | Week 3                          |
| 9   | Browser capture: format and constraints (echo cancellation, noise suppression, gain), from a capture test with adult volunteers | Osama + Ismail                | Week 3                          |
| 10  | API response for each audio error code. Text of `FEEDBACK_AUDIO_TOO_LONG`                                                       | Ahmad + Qussai + Ismail       | Week 3                          |
| 11  | Reject an unsupported surah/ayah pair before any processing                                                                     | Qussai                        | Week 3                          |
