# Tests for running and combining the adapters (app/pipeline.py). Owner: Qussai.
from app.adapters import is_enabled, kill_switch_name
from app.adapters.mock import MockMuaalem, MockWhisperQuran
from app.pipeline import combine, model_label, run_recitation
from app.policy import make_finding


class FakeAdapter:
    mock = False

    def __init__(self, name, output=None, error=None, version="1.0"):
        self.name = name
        self.version = version
        self.output = output if output is not None else {"findings": []}
        self.error = error

    def analyze(self, audio, surah, ayah):
        if self.error:
            raise self.error
        return self.output


def raw(word, code, confidence=0.9):
    return {
        "wordIndex": word,
        "code": code,
        "confidence": confidence,
        "wordStartMs": 0,
        "wordEndMs": 500,
    }


def run(*adapters, level="beginner"):
    return run_recitation(list(adapters), b"audio", 1, 1, level)


def test_clean_output_is_accepted():
    assert run(FakeAdapter("quran-muaalem"), FakeAdapter("whisper-quran")) == ("accepted", [])


def test_findings_from_both_models_are_joined():
    words = FakeAdapter("whisper-quran", {"findings": [raw(1, "ERR_MEM_SUBSTITUTION")]})
    sounds = FakeAdapter("quran-muaalem", {"findings": [raw(3, "ERR_PRON_HARAKA")]})
    decision, findings = run(words, sounds)
    assert decision == "error"
    assert [f.code for f in findings] == ["ERR_MEM_SUBSTITUTION", "ERR_PRON_HARAKA"]


def test_skipped_word_that_muaalem_heard_is_a_disagreement():
    words = FakeAdapter("whisper-quran", {"findings": [raw(2, "ERR_MEM_OMISSION")]})
    sounds = FakeAdapter("quran-muaalem", {"findings": [raw(2, "ERR_TAJ_MADD_SHORT", 0.8)]})
    decision, findings = run(words, sounds)
    assert decision == "uncertain"
    assert [(f.wordIndex, f.code) for f in findings] == [(2, "ERR_TECH_MODELS_DISAGREE")]
    assert findings[0].confidence == 0.8
    assert findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"


def test_findings_on_different_words_are_not_a_disagreement():
    words = [make_finding(1, "ERR_MEM_OMISSION", 0.9, 0, 500)]
    sounds = [make_finding(2, "ERR_PRON_HARAKA", 0.9, 500, 900)]
    combined = combine({"whisper-quran": words, "quran-muaalem": sounds})
    assert [f.code for f in combined] == ["ERR_MEM_OMISSION", "ERR_PRON_HARAKA"]


def test_invalid_output_goes_to_the_teacher():
    words = FakeAdapter("whisper-quran", {"findings": [raw(1, "ERR_MEM_OMISSION")]})
    broken = FakeAdapter("quran-muaalem", {"findings": [raw(1, "UNKNOWN_CODE")]})
    decision, findings = run(words, broken)
    assert decision == "uncertain"
    # Findings from the model that worked are kept for the teacher
    assert [f.code for f in findings] == ["ERR_MEM_OMISSION"]
    assert findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"


def test_a_crashing_model_does_not_fail_the_request():
    crashed = FakeAdapter("quran-muaalem", error=RuntimeError("CUDA out of memory"))
    assert run(crashed, FakeAdapter("whisper-quran")) == ("uncertain", [])


def test_kill_switch_sends_every_ayah_to_the_teacher(monkeypatch):
    sounds = FakeAdapter("quran-muaalem")
    monkeypatch.setenv(kill_switch_name(sounds), "false")
    assert kill_switch_name(sounds) == "MODEL_QURAN_MUAALEM_ENABLED"
    assert not is_enabled(sounds)
    assert run(sounds, FakeAdapter("whisper-quran"))[0] == "uncertain"


def test_switched_off_model_is_not_called(monkeypatch):
    monkeypatch.setenv("MODEL_QURAN_MUAALEM_ENABLED", "false")
    crashed = FakeAdapter("quran-muaalem", error=AssertionError("should not run"))
    assert run(crashed) == ("uncertain", [])


def test_model_label():
    assert model_label([MockMuaalem(), MockWhisperQuran()]) == ("mock", "0.2")
    assert model_label([FakeAdapter("quran-muaalem", version="v3.2")]) == (
        "quran-muaalem",
        "v3.2",
    )
    assert model_label(
        [FakeAdapter("quran-muaalem", version="v3.2"), FakeAdapter("whisper-quran", version="b1")]
    ) == ("combined", "quran-muaalem@v3.2+whisper-quran@b1")
