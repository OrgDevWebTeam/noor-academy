# Noor AI service

Owner: Qussai. A small FastAPI program that checks Quran recitation recordings. The API calls it
over HTTP; browsers never do. It is Python, so it is not part of the pnpm workspace or Turborepo.

- Result format: [`docs/contracts/ai-result.md`](../../docs/contracts/ai-result.md)
- Audio input and evaluation data: [`docs/ai/audio-io-and-eval-dataset.md`](../../docs/ai/audio-io-and-eval-dataset.md)
- Safety rules: [`docs/ai/genai_and_safety_boundaries.en.md`](../../docs/ai/genai_and_safety_boundaries.en.md)

## Where we are (week 2)

- The endpoint returns **mock** results only (`MOCK_MODE=true`), so nobody needs a GPU to build
  features. With `MOCK_MODE=false` it returns `503 MODELS_NOT_READY`.
- The quality gate and both model adapters run on real audio from
  [`scripts/run_real_audio.py`](scripts/run_real_audio.py). They are connected to the endpoint in
  week 3, together with merging the two models.

## Run the mock service

With Docker Compose from the repo root (MongoDB and this service on `127.0.0.1:8000`, the API's
default `AI_SERVICE_URL`):

```bash
docker compose up -d --wait
```

Or with Python 3.11+:

```bash
cd services/ai
python -m venv .venv
# Windows:   .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/health or http://localhost:8000/docs.

## Run the real models (GPU machine)

Needs an NVIDIA GPU, Python 3.12 and ffmpeg on `PATH`.

```bash
cd services/ai
pip install -r requirements-dev.txt
pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cu130
pip install -r requirements-gpu.txt
python scripts/run_real_audio.py <folder with the recordings> <beginner|intermediate|advanced>
```

The folder holds one mp3 per ayah, named `SSSAAA.mp3` (surah and ayah, 3 digits each), for example
`001001.mp3` for Al-Fatiha 1. Only the 25 prototype ayat are checked. **Recordings are never
copied into this repository** (it is public).

For each file the script prints the gate result, the result of each model in the contract format,
the seconds per model and the GPU memory used.

## Run the test

```bash
cd services/ai
pytest
```

`tests/test_contract.py` checks the service against
`packages/contracts/schemas/recitation_result.schema.json` and `safe_messages_v1_1.json`, so run it
from inside the repository.

## Settings

| Variable               | Default | Meaning                                                                           |
| ---------------------- | ------- | --------------------------------------------------------------------------------- |
| `MOCK_MODE`            | `true`  | Fake results from the endpoint. `false` returns 503 until week 3                  |
| `CONFIDENCE_THRESHOLD` | `0.70`  | Below this a finding makes the ayah `uncertain`. Provisional until week 4 (OD-02) |

## What the mock returns

| Input                          | Result                                                   |
| ------------------------------ | -------------------------------------------------------- |
| audio smaller than 1 KB        | `quality: "too_short"` (not an attempt)                  |
| ayah divisible by 5 (5, 10, …) | word 1 skipped, confidence 0.4 → `uncertain`             |
| ayah divisible by 3 (3, 6, 9)  | word 1 read as a different word → `error` at every level |
| any other ayah                 | `accepted`                                               |

## Files

| File                            | What it does                                                       |
| ------------------------------- | ------------------------------------------------------------------ |
| `app/main.py`                   | The HTTP endpoints (mock only for now)                             |
| `app/schemas.py`                | The result format (Pydantic)                                       |
| `app/policy.py`                 | Decision policy v0: codes → accepted / error / uncertain per level |
| `app/mock.py`                   | Fake results for `MOCK_MODE`                                       |
| `app/audio.py`                  | ffmpeg decode and the quality gate (Silero VAD)                    |
| `app/reference.py`              | The reference text of the 25 prototype ayat                        |
| `app/adapters/muaalem.py`       | quran-muaalem → contract findings                                  |
| `app/adapters/whisper_quran.py` | whisper-quran transcript → word comparison → contract findings     |
| `scripts/run_real_audio.py`     | Runs the gate and both models on a folder of real recordings       |
| `tests/test_contract.py`        | Keeps the result format in line with the JSON Schema               |

## Models and licences

| Component                        | Use                                   | Licence                              |
| -------------------------------- | ------------------------------------- | ------------------------------------ |
| quran-muaalem (obadx)            | Pronunciation and tajweed errors      | **QML 1.0**                          |
| tarteel-ai/whisper-base-ar-quran | Word-level transcript                 | Apache-2.0                           |
| Silero VAD                       | Speech vs silence in the quality gate | MIT                                  |
| ffmpeg                           | Decoding uploads                      | LGPL/GPL (run as a separate program) |

QML 1.0 conditions (AI notice before first use, use according to Islamic law, no ad tracking, fix
a violation within 30 days): see `docs/ai/genai_and_safety_boundaries.en.md` section 3.
