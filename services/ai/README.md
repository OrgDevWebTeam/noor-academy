# Noor AI service

Owner: Qussai. A small FastAPI program that checks recordings. The API calls it over HTTP;
browsers never do. It is Python, so it is not part of the pnpm workspace or Turborepo.

- Result format: [`docs/contracts/ai-result.md`](../../docs/contracts/ai-result.md)
- Audio input and evaluation data: [`docs/ai/audio-io-and-eval-dataset.md`](../../docs/ai/audio-io-and-eval-dataset.md)
- Safety rules: [`docs/ai/genai_and_safety_boundaries.en.md`](../../docs/ai/genai_and_safety_boundaries.en.md)

On laptops it runs with `MOCK_MODE=true` and returns fake (but contract-valid) results, so nobody
needs a GPU to build features.

## Run locally

Needs Python 3.11.

```bash
cd services/ai
python -m venv .venv
# Windows:   .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/health or http://localhost:8000/docs.

## Run with Docker

The easiest way is Docker Compose from the repo root. It starts MongoDB and this service in mock
mode on `127.0.0.1:8000`, which is the API's default `AI_SERVICE_URL`:

```bash
docker compose up -d --wait
```

Or on its own:

```bash
cd services/ai
docker build -t noor-ai .
docker run --rm -p 8000:8000 noor-ai
```

## Run the tests

```bash
cd services/ai
pytest
```

The tests also check the service against `packages/contracts/schemas/recitation_result.schema.json`
and `safe_messages_v1_1.json`, so run them from inside the repository.

## Settings

| Variable               | Default | Meaning                                                                           |
| ---------------------- | ------- | --------------------------------------------------------------------------------- |
| `MOCK_MODE`            | `true`  | Fake results. `false` needs the real models (week 2)                              |
| `CONFIDENCE_THRESHOLD` | `0.70`  | Below this a finding makes the ayah `uncertain`. Provisional until week 4 (OD-02) |

## What the mock returns

| Input                             | Result                                                   |
| --------------------------------- | -------------------------------------------------------- |
| audio smaller than 1 KB           | `quality: "too_short"` (not an attempt)                  |
| ayah divisible by 5 (5, 10, …)    | word 1 skipped, confidence 0.4 → `uncertain`             |
| ayah divisible by 3 (3, 6, 9)     | word 1 read as a different word → `error` at every level |
| any other ayah                    | `accepted`                                               |
| Arabic word, empty `expectedWord` | `error`; otherwise `accepted`                            |

With `MOCK_MODE=false` both endpoints return `503 MODELS_NOT_READY` until the real models are added.

## Files

| File             | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `app/main.py`    | The HTTP endpoints                                                 |
| `app/schemas.py` | The result format (Pydantic)                                       |
| `app/policy.py`  | Decision policy v0: codes → accepted / error / uncertain per level |
| `app/mock.py`    | Fake results for `MOCK_MODE`                                       |
| `app/adapters/`  | Real model adapters (week 2)                                       |
| `tests/`         | Mock, policy and contract tests                                    |
