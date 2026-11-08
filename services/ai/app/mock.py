# Fake results for MOCK_MODE that are not model findings. Owner: Qussai.
# The fake recitation models are in app/adapters/mock.py.
#
#   audio smaller than 1 KB          -> quality "too_short" (not an attempt)
#   Arabic word, empty expectedWord  -> "error", otherwise "accepted"
from app.adapters.mock import MOCK_VERSION
from app.schemas import AnalysisResult

MOCK_MODEL = "mock"
MIN_AUDIO_BYTES = 1024

__all__ = ["MOCK_MODEL", "MOCK_VERSION", "MIN_AUDIO_BYTES", "mock_quality", "mock_arabic_word"]


def mock_quality(audio_size):
    # Stand-in for the quality gate (app/quality.py, week 2)
    return "too_short" if audio_size < MIN_AUDIO_BYTES else "ok"


def mock_arabic_word(attempt_id, expected_word, processing_ms=0):
    # Accepted unless no expected word was sent
    decision = "accepted" if expected_word.strip() else "error"
    return AnalysisResult(
        attemptId=attempt_id,
        model=MOCK_MODEL,
        modelVersion=MOCK_VERSION,
        decision=decision,
        quality="ok",
        findings=[],
        processingMs=processing_ms,
    )
