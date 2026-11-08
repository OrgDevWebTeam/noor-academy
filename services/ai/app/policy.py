# Decision policy v0: turns findings into accepted / error / uncertain. Owner: Qussai.
# Rules: docs/contracts/ai-result.md ("Rules") and CRS 5.4. Error codes: Ismail's taxonomy.
#
# The threshold is provisional (0.70) until the week 4 benchmark (OD-02).
import os

from app.schemas import Finding

DEFAULT_THRESHOLD = 0.70

# Which code goes with which category and child-safe message
CODES = {
    "ERR_MEM_OMISSION": ("memorization", "FEEDBACK_WORD_MISSED"),
    "ERR_MEM_SUBSTITUTION": ("memorization", "FEEDBACK_WORD_DIFFERENT"),
    "ERR_MEM_INSERTION": ("memorization", "FEEDBACK_WORD_DIFFERENT"),
    "ERR_PRON_LETTER_SUB": ("pronunciation", "FEEDBACK_LISTEN_AND_REPEAT_WORD"),
    "ERR_PRON_HARAKA": ("pronunciation", "FEEDBACK_CHECK_HARAKA"),
    "ERR_PRON_MADD_ASLI_SHORT": ("pronunciation", "FEEDBACK_LISTEN_AND_REPEAT_WORD"),
    "ERR_TAJ_MADD_SHORT": ("tajweed", "FEEDBACK_MADD_REMINDER"),
    "ERR_TAJ_GHONNA_OMIT": ("tajweed", "FEEDBACK_GHUNNA_REMINDER"),
    "ERR_TAJ_QALQALA_OMIT": ("tajweed", "FEEDBACK_QALQALA_REMINDER"),
    "ERR_TAJ_UNMAPPED": ("tajweed", "FEEDBACK_TEACHER_REVIEW"),
    "ERR_TECH_MODELS_DISAGREE": ("technical", "FEEDBACK_TEACHER_REVIEW"),
}

# Codes that always send the ayah to the teacher
ALWAYS_UNCERTAIN = {"ERR_TAJ_UNMAPPED", "ERR_TECH_MODELS_DISAGREE"}

# Proposed codes (marked in the taxonomy). They are reported but never stop a child until approved.
NOT_YET_APPROVED = {"ERR_MEM_INSERTION", "ERR_PRON_MADD_ASLI_SHORT", "ERR_TAJ_GHONNA_OMIT"}

# Categories that stop the child at each level (CRS 5.4).
# Advanced also stops on tajweed, but only for the rules targeted in the lesson (passed in).
STOPS = {
    "beginner": {"memorization"},
    "intermediate": {"memorization", "pronunciation"},
    "advanced": {"memorization", "pronunciation"},
}


def confidence_threshold():
    # Read every time, so it can be changed in .env without a code change
    return float(os.environ.get("CONFIDENCE_THRESHOLD", DEFAULT_THRESHOLD))


def make_finding(word_index, code, confidence, word_start_ms, word_end_ms):
    """Builds a finding with the category and message that belong to the code."""
    category, message_key = CODES[code]
    return Finding(
        wordIndex=word_index,
        category=category,
        code=code,
        confidence=confidence,
        wordStartMs=word_start_ms,
        wordEndMs=word_end_ms,
        messageKey=message_key,
    )


def stops_child(finding, level, targeted_tajweed_codes=()):
    if finding.code in NOT_YET_APPROVED:
        return False
    if finding.category in STOPS[level]:
        return True
    return level == "advanced" and finding.code in targeted_tajweed_codes


def to_teacher(findings):
    """The same findings with the teacher message, for an ayah the teacher checks."""
    return [f.model_copy(update={"messageKey": "FEEDBACK_TEACHER_REVIEW"}) for f in findings]


def decide(findings, level, targeted_tajweed_codes=()):
    """Returns (decision, findings). Findings that send the ayah to the teacher get the teacher message."""
    threshold = confidence_threshold()
    unsure = [f for f in findings if f.confidence < threshold or f.code in ALWAYS_UNCERTAIN]

    if unsure:
        # The child moves on and the teacher checks the ayah (FR-QUR-006)
        return "uncertain", to_teacher(findings)

    if any(stops_child(f, level, targeted_tajweed_codes) for f in findings):
        return "error", findings

    # Findings that do not stop this level are kept as notes
    return "accepted", findings
