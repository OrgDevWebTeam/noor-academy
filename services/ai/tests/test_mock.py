# Tests for every mock path of the AI service. Owner: Qussai.
# Run from services/ai/: pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AnalysisResult

client = TestClient(app)

BIG_AUDIO = b"\x00" * 2000  # bigger than 1 KB
SMALL_AUDIO = b"\x00" * 100  # smaller than 1 KB


def analyze(ayah, audio=BIG_AUDIO, level="beginner", surah="1"):
    return client.post(
        "/v1/recitation/analyze",
        files={"audio": ("rec.webm", audio, "audio/webm")},
        data={"attemptId": "attempt-1", "surah": surah, "ayah": str(ayah), "level": level},
    )


def check_contract(response):
    # Fails if the body does not match the contract
    return AnalysisResult(**response.json())


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mockMode"] is True
    assert body["models"] == [{"name": "mock", "version": "0.2"}]


def test_accepted():
    response = analyze(ayah=1)
    assert response.status_code == 200
    result = check_contract(response)
    assert result.decision == "accepted"
    assert result.quality == "ok"
    assert result.findings == []
    assert result.attemptId == "attempt-1"
    assert result.model == "mock"


def test_error_on_first_word():
    result = check_contract(analyze(ayah=3))
    assert result.decision == "error"
    finding = result.findings[0]
    assert finding.wordIndex == 1  # words are numbered from 1
    assert finding.category == "memorization"
    assert finding.code == "ERR_MEM_SUBSTITUTION"
    assert finding.messageKey == "FEEDBACK_WORD_DIFFERENT"
    assert (finding.wordStartMs, finding.wordEndMs) == (0, 600)


def test_error_stops_every_level():
    for level in ("beginner", "intermediate", "advanced"):
        assert check_contract(analyze(ayah=3, level=level)).decision == "error"


def test_uncertain_goes_to_teacher():
    result = check_contract(analyze(ayah=5))
    assert result.decision == "uncertain"
    assert result.findings[0].confidence == 0.4
    assert result.findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"


def test_multiple_of_5_and_3_is_uncertain():
    # The "% 5" rule is checked first
    assert check_contract(analyze(ayah=15)).decision == "uncertain"


def test_too_short_audio():
    result = check_contract(analyze(ayah=1, audio=SMALL_AUDIO))
    assert result.quality == "too_short"
    assert result.decision == "uncertain"
    assert result.findings == []


def test_missing_field_gives_400():
    response = client.post(
        "/v1/recitation/analyze",
        files={"audio": ("rec.webm", BIG_AUDIO, "audio/webm")},
        data={"attemptId": "attempt-1", "surah": "1", "level": "beginner"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_wrong_level_gives_400():
    assert analyze(ayah=1, level="expert").status_code == 400


def test_ayah_zero_and_surah_115_give_400():
    assert analyze(ayah=0).status_code == 400
    assert analyze(ayah=1, surah="115").status_code == 400


def test_file_too_large_gives_400():
    response = analyze(ayah=1, audio=b"\x00" * (5 * 1024 * 1024 + 1))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_arabic_word_accepted():
    response = client.post(
        "/v1/arabic/word",
        files={"audio": ("word.webm", BIG_AUDIO, "audio/webm")},
        data={"attemptId": "attempt-2", "expectedWord": "PLACEHOLDER WORD"},
    )
    assert response.status_code == 200
    assert check_contract(response).decision == "accepted"


def test_arabic_word_empty_expected_word_is_error():
    response = client.post(
        "/v1/arabic/word",
        files={"audio": ("word.webm", BIG_AUDIO, "audio/webm")},
        data={"attemptId": "attempt-2", "expectedWord": ""},
    )
    assert check_contract(response).decision == "error"


def test_models_not_ready_when_mock_mode_is_off(monkeypatch):
    monkeypatch.setenv("MOCK_MODE", "false")
    response = analyze(ayah=1)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODELS_NOT_READY"
    assert client.get("/health").json()["mockMode"] is False
