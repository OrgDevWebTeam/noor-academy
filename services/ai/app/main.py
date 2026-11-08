# The AI service (internal HTTP only, never called by browsers). Owner: Qussai.
# Run: uvicorn app.main:app --port 8000
# Contract: docs/contracts/ai-result.md
import time

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.adapters import is_mock_mode, recitation_adapters
from app.mock import MOCK_MODEL, MOCK_VERSION, mock_arabic_word, mock_quality
from app.pipeline import model_label, run_recitation
from app.schemas import AnalysisResult, Level

MAX_AUDIO_BYTES = 5 * 1024 * 1024  # 5 MB, same limit as the API (VAL-016)

app = FastAPI(title="Noor AI service")


def error_response(status, code, message):
    # Same error shape as the API
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def elapsed_ms(started):
    return int((time.perf_counter() - started) * 1000)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"][1:]) or "body"
    return error_response(400, "VALIDATION_ERROR", f"{field}: {first['msg']}")


@app.get("/health")
def health():
    models = [{"name": MOCK_MODEL, "version": MOCK_VERSION}] if is_mock_mode() else []
    return {"status": "ok", "mockMode": is_mock_mode(), "models": models}


@app.post("/v1/recitation/analyze", response_model=AnalysisResult)
async def analyze_recitation(
    audio: UploadFile = File(...),
    attemptId: str = Form(...),
    surah: int = Form(..., ge=1, le=114),
    ayah: int = Form(..., ge=1),
    level: Level = Form(...),
):
    started = time.perf_counter()
    adapters = recitation_adapters()
    if not adapters:
        return error_response(503, "MODELS_NOT_READY", "Real models are not installed yet")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return error_response(400, "FILE_TOO_LARGE", "The file is too large")

    model, model_version = model_label(adapters)
    # TODO(week 2, Qussai): real quality gate (app/quality.py) for MOCK_MODE=false
    quality = mock_quality(len(audio_bytes)) if is_mock_mode() else "ok"
    if quality != "ok":
        decision, findings = "uncertain", []
    else:
        decision, findings = run_recitation(adapters, audio_bytes, surah, ayah, level)

    return AnalysisResult(
        attemptId=attemptId,
        model=model,
        modelVersion=model_version,
        decision=decision,
        quality=quality,
        findings=findings,
        processingMs=elapsed_ms(started),
    )


@app.post("/v1/arabic/word", response_model=AnalysisResult)
async def analyze_arabic_word(
    audio: UploadFile = File(...),
    attemptId: str = Form(...),
    # Default "" so an empty word reaches the mock (and gives "error")
    expectedWord: str = Form(""),
):
    started = time.perf_counter()
    if not is_mock_mode():
        # TODO(week 5, Qussai): Arabic word check with faster-whisper
        return error_response(503, "MODELS_NOT_READY", "Real models are not installed yet")

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return error_response(400, "FILE_TOO_LARGE", "The file is too large")

    return mock_arabic_word(attemptId, expectedWord, elapsed_ms(started))
