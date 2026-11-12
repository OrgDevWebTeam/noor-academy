# The AI service (internal HTTP only, never called by browsers). Owner: Qussai.
# Run: uvicorn app.main:app --port 8000
# Contract: docs/contracts/ai-result.md
#
# The endpoint returns mock results only. The real models are run from scripts/run_real_audio.py
# and are connected to this endpoint in week 3.
import os
import time

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.mock import MOCK_MODEL, MOCK_VERSION, mock_recitation
from app.schemas import AnalysisResult, Level

MAX_AUDIO_BYTES = 5 * 1024 * 1024  # 5 MB, same limit as the API (VAL-016)

app = FastAPI(title="Noor AI service")


def is_mock_mode():
    # Read every time, so tests can switch it
    return os.environ.get("MOCK_MODE", "true").lower() == "true"


def error_response(status, code, message):
    # Same error shape as the API
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


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
    if not is_mock_mode():
        return error_response(503, "MODELS_NOT_READY", "Real models are not connected yet")

    # Read at most one byte over the limit, so an oversized upload is never loaded fully into memory
    audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        return error_response(400, "FILE_TOO_LARGE", "The file is too large")

    processing_ms = int((time.perf_counter() - started) * 1000)
    return mock_recitation(attemptId, len(audio_bytes), ayah, level, processing_ms)
