# quran-muaalem adapter: one recording of one ayah -> contract result. Owner: Qussai.
# Mapping from the model's errors to our codes: docs/ai/tajweed_taxonomy_and_feedback.md, section 1.4.
# Licence: QML 1.0 (docs/ai/genai_and_safety_boundaries.en.md, section 3).
#
# Steps:
#   1. quran_phonetizer turns the expected ayah (Uthmani text) into reference phonemes.
#   2. The model listens to the recording and predicts the phonemes the child said.
#   3. explain_error compares the two and returns each error with its tajweed rule.
#   4. Each error becomes one finding: the word it is in, our code, and a confidence.
import os
import time
from importlib.metadata import version

from quran_muaalem import Muaalem
from quran_transcript import MoshafAttributes, chunck_phonemes, explain_error, quran_phonetizer
from quran_transcript.phonetics.error_explainer import align_phonemes_groups
from quran_transcript.phonetics.tajweed_rulses import (
    AaredMaddRule,
    Ghonnah,
    MaddRule,
    MoshaddadOrModghamNoonRule,
    Qalqalah,
)

from app.policy import decide, make_finding
from app.schemas import AnalysisResult

MODEL = "quran-muaalem"
MODEL_NAME = "obadx/muaalem-model-v3_2"
SAMPLE_RATE = 16000

# Which category comes first when one word has several errors (taxonomy 1.1)
CATEGORY_ORDER = ["memorization", "pronunciation", "tajweed", "technical"]

model = None


def load_model():
    global model
    if model is None:
        model = Muaalem(model_name_or_path=MODEL_NAME, device="cuda")
    return model


def model_version():
    # Package version + exact model revision (OPS-008)
    commit = load_model().model.config._commit_hash or "unknown"
    return f"{version('quran-muaalem')} {MODEL_NAME}@{commit[:12]}"


def moshaf_settings():
    # Expected madd lengths (taxonomy item 5.3, still open). Set them in .env to change them.
    return MoshafAttributes(
        rewaya="hafs",
        madd_monfasel_len=int(os.environ.get("MADD_MONFASEL_LEN", "2")),
        madd_mottasel_len=int(os.environ.get("MADD_MOTTASEL_LEN", "4")),
        madd_mottasel_waqf=int(os.environ.get("MADD_MOTTASEL_WAQF", "4")),
        madd_aared_len=int(os.environ.get("MADD_AARED_LEN", "2")),
    )


def word_index(uthmani_text, char_position):
    # Words are separated by spaces and numbered from 1
    return uthmani_text[:char_position].count(" ") + 1


def predicted_positions(ref_phonemes, predicted_phonemes):
    """
    explain_error gives each error's position in the REFERENCE phonemes only. To get a confidence we
    need the PREDICTED phonemes of the same error, so we repeat its alignment and remember, for each
    reference position, which predicted phonemes were lined up with it.
    """
    ref_groups = chunck_phonemes(ref_phonemes)
    predicted_groups = chunck_phonemes(predicted_phonemes)
    positions = {}
    ref_start = 0
    predicted_start = 0
    for align in align_phonemes_groups(ref_groups, predicted_groups):
        ref_length = 0 if align.op_type == "insert" else len(ref_groups[align.ref_idx])
        predicted_length = 0 if align.op_type == "delete" else len(predicted_groups[align.pred_idx])
        kind = "insert" if align.op_type == "insert" else "other"
        key = (ref_start, kind)
        positions.setdefault(key, [])
        positions[key].extend(range(predicted_start, predicted_start + predicted_length))
        ref_start += ref_length
        predicted_start += predicted_length
    return positions


def confidence(error, positions, probs):
    # The lowest probability of the predicted phonemes in this error.
    # A deleted phoneme has no prediction, so no confidence: 0 sends it to the teacher (taxonomy 1.4 rule 2).
    kind = "insert" if error.speech_error_type == "insert" else "other"
    values = [float(probs[i]) for i in positions.get((error.ph_pos[0], kind), [])]
    if not values:
        return 0.0
    return round(min(values), 3)


def error_code(error):
    """Our code for one model error, or None when it is not an error for us."""
    if error.error_type == "normal":
        return "ERR_PRON_LETTER_SUB"
    if error.error_type == "tashkeel":
        return "ERR_PRON_HARAKA"

    # error_type == "tajweed"
    if not error.ref_tajweed_rules:
        return "ERR_TAJ_UNMAPPED"
    rule = error.ref_tajweed_rules[0]

    if isinstance(rule, Qalqalah):
        return "ERR_TAJ_QALQALA_OMIT"
    if isinstance(rule, (Ghonnah, MoshaddadOrModghamNoonRule)):
        return "ERR_TAJ_GHONNA_OMIT"
    if isinstance(rule, MaddRule):
        too_long = error.predicted_len is not None and error.predicted_len > (error.expected_len or 0)
        # Aared madd is accepted at 2 counts or more (taxonomy 1.4)
        if isinstance(rule, AaredMaddRule) and (error.predicted_len or 0) >= 2:
            return None
        if too_long:
            # Our taxonomy has no code for a madd that is too long, so the teacher checks it
            return "ERR_TAJ_UNMAPPED"
        return "ERR_TAJ_MADD_SHORT"
    return "ERR_TAJ_UNMAPPED"


def analyze(samples, uthmani_text, level, attempt_id):
    """samples: 16 kHz mono float32 audio that passed the quality gate."""
    started = time.perf_counter()
    reference = quran_phonetizer(uthmani_text, moshaf_settings(), remove_spaces=True)
    output = load_model()([samples], [reference], sampling_rate=SAMPLE_RATE)[0]
    predicted = output.phonemes.text

    errors = explain_error(
        uthmani_text=uthmani_text,
        ref_ph_text=reference.phonemes,
        predicted_ph_text=predicted,
        mappings=reference.mappings,
    )
    positions = predicted_positions(reference.phonemes, predicted)

    # One finding per word: the first error of the most important category (taxonomy 1.1)
    findings_by_word = {}
    for error in errors:
        code = error_code(error)
        if code is None:
            continue
        # No word timings yet, so the replay segment is 0-0 until the new timings are added
        finding = make_finding(
            word_index(uthmani_text, error.uthmani_pos[0]), code, confidence(error, positions, output.phonemes.probs), 0, 0
        )
        current = findings_by_word.get(finding.wordIndex)
        if current is None or CATEGORY_ORDER.index(finding.category) < CATEGORY_ORDER.index(current.category):
            findings_by_word[finding.wordIndex] = finding

    findings = [findings_by_word[word] for word in sorted(findings_by_word)]
    decision, findings = decide(findings, level)
    return AnalysisResult(
        attemptId=attempt_id,
        model=MODEL,
        modelVersion=model_version(),
        decision=decision,
        quality="ok",
        findings=findings,
        processingMs=int((time.perf_counter() - started) * 1000),
    )
