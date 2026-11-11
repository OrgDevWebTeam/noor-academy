# Quran audio input/output and evaluation dataset requirements

- Owners: Qussai (AI 1) + Ismail (AI 2). Jira: KAN-9, KAN-27.
- Version: v1.1, 2026-11-10 (v1.0 was 2026-11-05).
- Based on: CRS v3.0 (FR-QUR-002..004, VAL-014, VAL-016, SEC-006, SEC-011, SEC-017, SEC-018),
  Architecture v3.0 (§7.3, §8.1–8.7), Roadmap v3.0 (weeks 2–7).
- Related: `docs/contracts/ai-result.md` (the result), `docs/ai/teacher_annotation_guide.md`
  (how teachers label), `docs/ai/tajweed_taxonomy_and_feedback.md` (error codes),
  `services/ai/app/audio.py` (the gate described in A.3).

> 🔶 = proposal waiting for a decision. Everything else follows the CRS and Architecture.

## What changed in v1.1

| Section | Change                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------ |
| A.3     | Exact gate definitions, check order, known limits, and the 30 s duration guard (decided)         |
| A.3     | Table of audio errors and their codes                                                            |
| A.3     | No generative language model in this path; the decision is deterministic                         |
| A.4     | Gate report fields added to the log. Phoneme diagnostics removed from request logs (NFR-OBS-001) |
| B.4     | Restricted folder for per-recording model output used in offline error analysis 🔶               |
| B.7     | The train split is consent-gated (SEC-017) and unused until a fine-tuning decision               |
| B.8     | Guard rejections and gate evaluation explained                                                   |
| Part C  | New: tests (done now, and planned for week 3)                                                    |
| Open    | Items 1–2 updated, items 7–11 added                                                              |

## Status in week 2

| Piece                          | State                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Quality gate (`audio.py`)      | Implemented and tested. **Not wired into the endpoints yet**                                |
| Accepted input of the gate     | Only 16 kHz, mono, 16-bit PCM WAV. Browser files (WebM/Opus, MP4/AAC) are not read yet      |
| Decode step (ffmpeg)           | Week 3. The gate is wired in after it                                                       |
| Quality values in the contract | Unchanged: `ok`, `silent`, `too_short`, `too_noisy` (contract v3.0)                         |
| `too_long`                     | Not a quality value. The duration guard raises an error. Contract change in week 3 (item 1) |

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

| Step         | Rule                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read         | The upload is read up to the 5 MB limit plus one byte, so an oversized file is rejected without loading it fully                                                                                                                                      |
| Convert      | ffmpeg → 16 kHz, mono, 16-bit PCM WAV. Temporary file only, deleted after the analysis (week 3)                                                                                                                                                       |
| Quality gate | Frame energy + clipping checks today (`audio.py`). Silero VAD and an SNR estimate in week 3. Result: `quality` = `ok`, `silent`, `too_short` or `too_noisy`                                                                                           |
| Reference    | The AI service loads the expected ayah (text and word timings) from the licensed reference files by `surah` + `ayah`. It never searches the whole Quran                                                                                               |
| Models       | quran-muaalem (pronunciation and tajweed) and whisper-quran (word comparison). Disagreement → `ERR_TECH_MODELS_DISAGREE` → `uncertain`. No generative language model is used in this path: the decision is deterministic and rule-based (`policy.py`) |
| Output       | One result in the contract format. Model text is never returned to the API                                                                                                                                                                            |

**Decode safety** 🔶 (week 3): ffmpeg runs without a shell, with a timeout and a cap on the decoded
duration slightly above the guard, one temporary folder per request, removed in a `finally`. The
reason: a very small compressed file can decode into a very long clip.

#### Target format

16 kHz, mono, 16-bit PCM WAV. The hard requirements of the models are the 16 kHz rate and mono
(quran-muaalem documents 16000 Hz as mandatory); 16-bit WAV is our own convention for the temporary
file. The gate checks the header and raises a specific error for anything else (table below).

#### Gate measurements (exact definitions)

| Measure        | Definition                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Frame          | 30 ms window (480 samples at 16 kHz). A shorter tail at the end is ignored for speech counting      |
| Speech frame   | Frame whose RMS is at least 200 on the 16-bit scale (about −44 dBFS)                                |
| Speech seconds | Number of speech frames × 30 ms                                                                     |
| Speech ratio   | Speech frames ÷ all frames, over the **whole decoded clip** (leading and trailing silence included) |
| Clipped sample | A sample with an absolute value of at least 32000 (the 16-bit maximum is 32767)                     |
| Clipped ratio  | Clipped samples ÷ all samples                                                                       |
| RMS            | RMS of the whole clip, 16-bit scale (logged only)                                                   |

#### Order of checks

The first match wins.

1. Header or format problem → **error** (table below).
2. Duration above the guard (30 s) → **error** `AUDIO_TOO_LONG`. Checked from the header, before any
   sample is read.
3. Clipped ratio above 1% → `too_noisy`.
4. Less than one frame of audio (or an empty file) → `too_short`.
5. Speech seconds below 0.3 → `silent`.
6. Speech seconds below 40% of the reference ayah length → `too_short`. Skipped when no reference
   duration is available.
7. Speech ratio below 0.30 → `too_noisy`.
8. Otherwise → `ok`.

#### Quality gate values 🔶

All are starting values, implemented as named constants in `services/ai/app/audio.py` and tuned in
weeks 2–3 against the `poor_audio` labels.

| Reason      | Rule                                                     | Constant                                                              |
| ----------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `silent`    | Less than 0.3 s of speech                                | `MIN_SPEECH_SECONDS`, `MIN_RMS_ENERGY`                                |
| `too_short` | Speech shorter than 40% of the reference ayah length     | `MIN_SPEECH_VS_REFERENCE`                                             |
| `too_noisy` | More than 1% clipped samples, or speech ratio below 0.30 | `MAX_CLIPPING_RATIO`, `CLIPPING_SAMPLE_THRESHOLD`, `MIN_SPEECH_RATIO` |

#### Known limits of the week 2 gate

- Speech detection is an absolute energy threshold. **Steady background noise counts as speech**, so
  noise alone can come back `ok`.
- `too_noisy` from the speech ratio really means "mostly silence or very quiet". It does not measure
  noise. An SNR estimate (speech level against non-speech level) is planned for week 3 (item 7).
- A child who pauses a lot has a low ratio. The 0.30 floor is therefore tuned on real children
  (item 8), never on synthetic audio.
- The reference check needs the reference duration of the ayah. Where it is missing the check is
  skipped, and the log says so (`referenceAvailable: false`).

#### Maximum length: decision

The 30 s limit (taxonomy item 5.8) is kept as an **early guard**, not as a quality value.

- It raises `AudioTooLongError` (`AUDIO_TOO_LONG`) before any sample is read.
- It is **never reported as `too_noisy`**: the child would be told to move closer to the microphone.
- Why 30 s: the longest reference ayah is 12.8 s, children often read at half the reciter's speed
  (about 26 s), and Whisper's model input is a 30 s window, so longer audio has to be chunked or is
  cut, and a cut would create false omissions.
- The formal `too_long` quality in the contract, and the child message for it, are a week 3 change
  made together with Qussai and the API team (items 1 and 10). Contract v3.0 stays as it is until then.

#### Audio errors

These are not quality results. The audio could not be checked, or the guard stopped it.

| Error class                   | Code                       | Meaning                                        |
| ----------------------------- | -------------------------- | ---------------------------------------------- |
| `InvalidWavError`             | `INVALID_WAV`              | Not a readable WAV (for example, WebM bytes)   |
| `UnsupportedSampleRateError`  | `UNSUPPORTED_SAMPLE_RATE`  | Not 16 kHz                                     |
| `UnsupportedChannelsError`    | `UNSUPPORTED_CHANNELS`     | Not mono                                       |
| `UnsupportedSampleWidthError` | `UNSUPPORTED_SAMPLE_WIDTH` | Not 16-bit                                     |
| `TruncatedAudioError`         | `AUDIO_TRUNCATED`          | The file holds less audio than its header says |
| `AudioTooLongError`           | `AUDIO_TOO_LONG`           | Above the 30 s guard                           |

The three format errors share the base class `UnsupportedWavFormatError` (code
`UNSUPPORTED_WAV_FORMAT`), and all errors share `AudioProcessingError` (code
`AUDIO_PROCESSING_ERROR`). After the ffmpeg step exists, a format error
means a bug on our side, and a decode failure means a bad upload. How each code becomes an API
response is decided in week 3 (item 10). The AI service error shape stays
`{"error": {"code", "message"}}`.

### A.4 Output

The result format is `docs/contracts/ai-result.md`. Debug detail stays inside the AI service:

| Logged per request (no audio, no names)                                                                                                    | Why                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `attemptId`, `surah`, `ayah`, `level`                                                                                                      | Join with the attempt in the API                                       |
| Gate report: `quality`, `durationSeconds`, `speechSeconds`, `speechRatio`, `clippedRatio`, `rms`, `referenceSeconds`, `referenceAvailable` | Architecture §8.7 and quality-gate tuning (`GateReport.to_log_dict()`) |
| The error `code` when the audio was rejected by an error                                                                                   | Count guard and format rejections                                      |
| Per model: name, version, status (`ok`, `timeout`, `error`, `disabled`), inference ms                                                      | Latency target (NFR-PERF-003), kill switch                             |
| Per finding: `code`, `wordIndex`, `confidence` (the contract fields, no text)                                                              | Error analysis without any transcript                                  |
| Time per stage (decode, gate, each model) — week 3                                                                                         | Find the slow step                                                     |

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

Code: `services/ai/tests/test_audio.py`. Tests use synthetic audio built in the test, never a
child's recording and never a binary file in git.

### C.1 Done in week 2

| Area                   | What the tests pin                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format and header      | Wrong sample rate, stereo, 8-bit, non-WAV bytes and truncated files each raise their own error and code                                                                            |
| Duration guard         | The limit boundary, and that a too long clip is an error and never a quality                                                                                                       |
| Thresholds, both sides | 0.3 s of speech, the energy threshold, the 0.30 ratio floor, 40% of the reference, 1% clipped (0.9%, exactly 1.0%, 1.1%), the clipping level (31999 against 32000, negative peaks) |
| Edge cases             | Empty WAV, audio shorter than one frame, no reference duration                                                                                                                     |
| Order of checks        | Clipping wins over silent, silent wins over the reference length                                                                                                                   |
| Report                 | Measured values, `referenceAvailable`, JSON-safe log fields with no audio                                                                                                          |

The tests were also checked by changing the code 24 ways (constants, comparison operators, removed
checks, swapped order); every change made a test fail.

### C.2 Planned for week 3

| Area                      | Test                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Format matrix             | Tone plus noise made with ffmpeg in WebM/Opus, MP4/AAC, Ogg, WAV and MP3 all come out as 16 kHz mono 16-bit                     |
| Endpoint                  | Oversized file → `FILE_TOO_LARGE`; corrupt bytes and a wrong MIME type → a typed 4xx, never a 500; empty file; unsupported ayah |
| Decode safety             | A small file that decodes into a very long clip stops at the decode cap                                                         |
| Temporary files           | The temporary folder is empty after every request, including failed ones                                                        |
| Performance (GPU machine) | p50 and p95 per stage for 5 s and 30 s clips; N parallel requests keep memory flat and `/health` responsive                     |
| Gate evaluation           | Precision and recall against `poor_audio` labels (offline, B.8), not a unit test                                                |

---

## Open items

| #   | Item                                                                                                                            | Who decides                   | Needed by                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| 1   | Maximum length: the 30 s guard is decided (A.3). The `too_long` contract change is open                                         | Qussai + Ismail + API team    | Week 3                          |
| 2   | Quality gate values (A.3): starting values are in the code, to be tuned                                                         | Qussai, from labels           | Week 3                          |
| 3   | Split sizes (B.7)                                                                                                               | Qussai + Ismail               | Week 3                          |
| 4   | Target numbers (B.8)                                                                                                            | Mohammad, from week 4 numbers | Week 4                          |
| 5   | Who keeps the id-to-family list (B.3)                                                                                           | Mohammad                      | Week 2, before recordings start |
| 6   | Retention of evaluation recordings after the pilot (OD-04)                                                                      | Mohammad                      | Week 3                          |
| 7   | Noise detection: SNR estimate and Silero VAD instead of the energy threshold                                                    | Qussai                        | Week 3                          |
| 8   | Speech ratio definition (whole clip or trimmed) and its floor, from real children                                               | Qussai + Ismail               | Week 3                          |
| 9   | Browser capture: format and constraints (echo cancellation, noise suppression, gain), from a capture test with adult volunteers | Osama + Ismail                | Week 3                          |
| 10  | API response for each audio error code, and the child message for `too_long`                                                    | Ahmad + Qussai + Ismail       | Week 3                          |
| 11  | Reject an unsupported surah/ayah pair before any processing                                                                     | Qussai                        | Week 3                          |
