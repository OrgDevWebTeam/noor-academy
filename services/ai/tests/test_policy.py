# Tests for the decision policy (CRS 5.4, Architecture 8.4). Owner: Qussai.
import pytest

from app.policy import CODES, decide, make_finding


def finding(code, confidence=0.95, word=1):
    return make_finding(word, code, confidence, 0, 500)


def test_no_findings_is_accepted():
    assert decide([], "beginner")[0] == "accepted"


@pytest.mark.parametrize(
    "code, beginner, intermediate, advanced",
    [
        ("ERR_MEM_OMISSION", "error", "error", "error"),
        ("ERR_PRON_LETTER_SUB", "accepted", "error", "error"),
        ("ERR_TAJ_QALQALA_OMIT", "accepted", "accepted", "accepted"),
    ],
)
def test_what_stops_each_level(code, beginner, intermediate, advanced):
    findings = [finding(code)]
    assert decide(findings, "beginner")[0] == beginner
    assert decide(findings, "intermediate")[0] == intermediate
    assert decide(findings, "advanced")[0] == advanced


def test_advanced_stops_on_targeted_tajweed_only():
    findings = [finding("ERR_TAJ_QALQALA_OMIT")]
    assert decide(findings, "advanced", {"ERR_TAJ_QALQALA_OMIT"})[0] == "error"
    assert decide(findings, "intermediate", {"ERR_TAJ_QALQALA_OMIT"})[0] == "accepted"


def test_low_confidence_is_uncertain_with_teacher_message():
    decision, findings = decide([finding("ERR_MEM_OMISSION", confidence=0.5)], "beginner")
    assert decision == "uncertain"
    assert findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"


def test_threshold_comes_from_env(monkeypatch):
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.4")
    assert decide([finding("ERR_MEM_OMISSION", confidence=0.5)], "beginner")[0] == "error"


@pytest.mark.parametrize("code", ["ERR_TAJ_UNMAPPED", "ERR_TECH_MODELS_DISAGREE"])
def test_unmapped_and_disagreement_go_to_teacher(code):
    assert decide([finding(code)], "beginner")[0] == "uncertain"


@pytest.mark.parametrize(
    "code", ["ERR_MEM_INSERTION", "ERR_PRON_MADD_ASLI_SHORT", "ERR_TAJ_GHONNA_OMIT"]
)
def test_codes_not_yet_approved_never_stop_a_child(code):
    assert decide([finding(code)], "advanced", {code})[0] == "accepted"


def test_every_code_builds_a_valid_finding():
    for code in CODES:
        assert finding(code).code == code
