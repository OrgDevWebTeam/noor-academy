# Runs the recitation adapters and turns their output into one result. Owner: Qussai.
#
#   adapters -> raw output -> structured.parse_output -> combine -> policy.decide
#
# The ayah goes to the teacher ("uncertain") when a model is switched off (listen-and-record,
# Architecture 8.5), crashes, or returns output that fails the checks. The child is never stuck.
import logging

from app.adapters import is_enabled, kill_switch_name
from app.adapters.mock import MOCK_VERSION
from app.policy import decide, make_finding, to_teacher
from app.structured import InvalidModelOutput, parse_output

log = logging.getLogger("noor.ai.pipeline")

WORDS_MODEL = "whisper-quran"
SOUNDS_MODEL = "quran-muaalem"


def combine(findings_by_model):
    """Joins the findings of all models. If whisper-quran says a word was skipped but muaalem heard
    a sound problem in that same word, the models disagree: both are replaced with
    ERR_TECH_MODELS_DISAGREE for that word, which always goes to the teacher."""
    words = findings_by_model.get(WORDS_MODEL, [])
    sounds = findings_by_model.get(SOUNDS_MODEL, [])
    heard = {f.wordIndex: f for f in sounds}
    skipped = {f.wordIndex for f in words if f.code == "ERR_MEM_OMISSION"}
    disputed = skipped & set(heard)

    others = [
        f
        for name, model_findings in findings_by_model.items()
        if name not in (WORDS_MODEL, SOUNDS_MODEL)
        for f in model_findings
    ]
    combined = [f for f in words + sounds if f.wordIndex not in disputed] + others

    for word in disputed:
        omission = next(f for f in words if f.wordIndex == word and f.code == "ERR_MEM_OMISSION")
        confidence = min(omission.confidence, heard[word].confidence)
        combined.append(
            make_finding(
                word,
                "ERR_TECH_MODELS_DISAGREE",
                confidence,
                omission.wordStartMs,
                omission.wordEndMs,
            )
        )
    return sorted(combined, key=lambda f: (f.wordIndex, f.code))


def model_label(adapters):
    """The model and modelVersion fields of the result (OPS-008)."""
    if all(a.mock for a in adapters):
        return "mock", MOCK_VERSION
    if len(adapters) == 1:
        return adapters[0].name, adapters[0].version
    return "combined", "+".join(f"{a.name}@{a.version}" for a in adapters)


def run_recitation(adapters, audio, surah, ayah, level):
    """Returns (decision, findings) for one ayah."""
    findings_by_model = {}
    send_to_teacher = False

    for adapter in adapters:
        if not is_enabled(adapter):
            log.info("model switched off (%s)", kill_switch_name(adapter))
            send_to_teacher = True
            continue
        try:
            raw = adapter.analyze(audio, surah, ayah)
            findings_by_model[adapter.name] = parse_output(raw)
        except InvalidModelOutput as exc:
            log.warning("invalid output from %s: %s", adapter.name, exc)
            send_to_teacher = True
        except Exception as exc:
            # A model crash must not fail the request. Only the error type is logged.
            log.error("model %s failed: %s", adapter.name, type(exc).__name__)
            send_to_teacher = True

    findings = combine(findings_by_model)
    if send_to_teacher:
        return "uncertain", to_teacher(findings)
    return decide(findings, level)
