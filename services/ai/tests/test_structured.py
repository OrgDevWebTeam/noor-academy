# Tests for checking raw model output (app/structured.py). Owner: Qussai.
import json

import pytest

from app.structured import MAX_FINDINGS, InvalidModelOutput, parse_output


def raw(**overrides):
    item = {
        "wordIndex": 1,
        "code": "ERR_MEM_OMISSION",
        "confidence": 0.9,
        "wordStartMs": 0,
        "wordEndMs": 600,
    }
    item.update(overrides)
    return item


def test_empty_output_has_no_findings():
    assert parse_output({"findings": []}) == []


def test_valid_finding_gets_category_and_message():
    [finding] = parse_output({"findings": [raw()]})
    assert finding.category == "memorization"
    assert finding.messageKey == "FEEDBACK_WORD_MISSED"


def test_json_text_is_accepted():
    text = json.dumps({"findings": [raw()]})
    assert parse_output(text) == parse_output(text.encode())
    assert len(parse_output(text)) == 1


def test_findings_are_sorted_merged_and_rounded():
    findings = parse_output(
        {
            "findings": [
                raw(wordIndex=3, code="ERR_PRON_HARAKA"),
                raw(wordIndex=1, confidence=0.5),
                raw(wordIndex=1, confidence=0.81234567),
                raw(wordIndex=1, code="ERR_MEM_SUBSTITUTION"),
            ]
        }
    )
    assert [(f.wordIndex, f.code) for f in findings] == [
        (1, "ERR_MEM_OMISSION"),
        (1, "ERR_MEM_SUBSTITUTION"),
        (3, "ERR_PRON_HARAKA"),
    ]
    # The duplicate keeps the highest confidence, rounded to 3 places
    assert findings[0].confidence == 0.812


def test_order_of_raw_findings_does_not_matter():
    items = [raw(wordIndex=w) for w in (4, 2, 3, 1)]
    assert parse_output({"findings": items}) == parse_output({"findings": items[::-1]})


@pytest.mark.parametrize(
    "bad",
    [
        None,
        [],
        "not json",
        {},
        {"findings": None},
        {"findings": [], "transcript": "anything"},
        {"findings": [raw(code="SOME_RAW_MODEL_CODE")]},
        {"findings": [raw(confidence=1.5)]},
        {"findings": [raw(confidence=-0.1)]},
        {"findings": [raw(confidence=float("nan"))]},
        {"findings": [raw(confidence="0.9")]},
        {"findings": [raw(wordIndex=0)]},
        {"findings": [raw(wordIndex=True)]},
        {"findings": [raw(wordIndex=1.5)]},
        {"findings": [raw(wordStartMs=700, wordEndMs=600)]},
        {"findings": [raw(extra="field")]},
        {"findings": [{"wordIndex": 1}]},
        {"findings": [raw()] * (MAX_FINDINGS + 1)},
    ],
)
def test_invalid_output_is_rejected(bad):
    with pytest.raises(InvalidModelOutput):
        parse_output(bad)


def test_error_message_does_not_repeat_model_text():
    with pytest.raises(InvalidModelOutput) as exc:
        parse_output({"findings": [raw(code="بِسْمِ secret transcript")]})
    assert "secret" not in str(exc.value)
    assert "بِسْمِ" not in str(exc.value)
