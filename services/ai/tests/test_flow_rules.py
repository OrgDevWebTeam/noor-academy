"""
Unit tests for practice flow tiered stopping rules and review policies.
Owner: Ismail (AI 2). Aligned with KAN-28.
"""

from app.policy import decide, make_finding


def test_beginner_stops_only_on_memorization():
    # Substitution stops beginner
    mem_finding = make_finding(1, "ERR_MEM_SUBSTITUTION", 0.95, 0, 500)
    decision, _ = decide([mem_finding], level="beginner")
    assert decision == "error"

    # Pronunciation does NOT stop beginner
    pron_finding = make_finding(1, "ERR_PRON_LETTER_SUB", 0.95, 0, 500)
    decision, _ = decide([pron_finding], level="beginner")
    assert decision == "accepted"


def test_intermediate_stops_on_pronunciation_and_memorization():
    pron_finding = make_finding(1, "ERR_PRON_HARAKA", 0.95, 0, 500)
    decision, _ = decide([pron_finding], level="intermediate")
    assert decision == "error"

    # Tajweed does NOT stop intermediate
    taj_finding = make_finding(1, "ERR_TAJ_MADD_SHORT", 0.95, 0, 500)
    decision, _ = decide([taj_finding], level="intermediate")
    assert decision == "accepted"


def test_advanced_stops_on_targeted_tajweed_only():
    taj_finding = make_finding(1, "ERR_TAJ_MADD_SHORT", 0.95, 0, 500)

    # If NOT targeted in current lesson -> accepted
    decision, _ = decide([taj_finding], level="advanced", targeted_tajweed_codes=())
    assert decision == "accepted"

    # If targeted in current lesson -> error
    decision, _ = decide(
        [taj_finding],
        level="advanced",
        targeted_tajweed_codes=("ERR_TAJ_MADD_SHORT",)
    )
    assert decision == "error"


def test_unapproved_codes_never_stop_child():
    # ERR_MEM_INSERTION is unapproved
    finding = make_finding(1, "ERR_MEM_INSERTION", 0.95, 0, 500)
    decision, _ = decide([finding], level="beginner")
    assert decision == "accepted"


def test_low_confidence_or_unmapped_escalates_to_teacher():
    # Low confidence (< 0.70)
    low_conf = make_finding(1, "ERR_MEM_SUBSTITUTION", 0.50, 0, 500)
    decision, findings = decide([low_conf], level="beginner")
    assert decision == "uncertain"
    assert findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"

    # Always uncertain code
    unmapped = make_finding(1, "ERR_TAJ_UNMAPPED", 0.95, 0, 500)
    decision, findings = decide([unmapped], level="advanced")
    assert decision == "uncertain"
    assert findings[0].messageKey == "FEEDBACK_TEACHER_REVIEW"