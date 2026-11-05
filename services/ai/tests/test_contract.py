# Keeps the AI service in line with the contract source of truth. Owner: Qussai.
# packages/contracts/schemas/recitation_result.schema.json + safe_messages_v1_1.json
import json
import re
import typing
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from app.main import app
from app.policy import CODES
from app.schemas import Category, Decision, ErrorCode, Quality

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMAS = REPO_ROOT / "packages" / "contracts" / "schemas"
CONTRACT_DOC = REPO_ROOT / "docs" / "contracts" / "ai-result.md"

SCHEMA = json.loads((SCHEMAS / "recitation_result.schema.json").read_text(encoding="utf-8"))
MESSAGES = json.loads((SCHEMAS / "safe_messages_v1_1.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA)
FINDING = SCHEMA["$defs"]["finding"]["properties"]

client = TestClient(app)


def values(literal):
    return list(typing.get_args(literal))


def test_pydantic_enums_match_the_schema():
    assert values(Decision) == SCHEMA["properties"]["decision"]["enum"]
    assert values(Quality) == SCHEMA["properties"]["quality"]["enum"]
    assert values(Category) == FINDING["category"]["enum"]
    assert values(ErrorCode) == FINDING["code"]["enum"]
    assert list(CODES) == FINDING["code"]["enum"]


def test_every_message_key_exists_in_safe_messages():
    for _category, message_key in CODES.values():
        assert message_key in MESSAGES, message_key


@pytest.mark.parametrize("ayah, size", [(1, 2000), (3, 2000), (5, 2000), (1, 10)])
def test_mock_results_pass_the_json_schema(ayah, size):
    response = client.post(
        "/v1/recitation/analyze",
        files={"audio": ("rec.webm", b"\x00" * size, "audio/webm")},
        data={"attemptId": "attempt-1", "surah": "1", "ayah": str(ayah), "level": "beginner"},
    )
    errors = [e.message for e in VALIDATOR.iter_errors(response.json())]
    assert errors == []


def test_examples_in_the_contract_doc_pass_the_json_schema():
    blocks = re.findall(r"```json\n(.*?)```", CONTRACT_DOC.read_text(encoding="utf-8"), re.S)
    results = [json.loads(b) for b in blocks if '"decision"' in b]
    assert len(results) == 5
    for result in results + SCHEMA["examples"]:
        assert [e.message for e in VALIDATOR.iter_errors(result)] == []


def test_schema_rejects_word_zero_and_wrong_category():
    good = SCHEMA["examples"][0]
    word_zero = json.loads(json.dumps(good))
    word_zero["findings"][0]["wordIndex"] = 0
    wrong_category = json.loads(json.dumps(good))
    wrong_category["findings"][0]["category"] = "tajweed"
    assert not VALIDATOR.is_valid(word_zero)
    assert not VALIDATOR.is_valid(wrong_category)


def test_schema_rejects_a_quality_rejection_with_findings():
    bad = json.loads(json.dumps(SCHEMA["examples"][0]))
    bad["quality"] = "silent"
    assert not VALIDATOR.is_valid(bad)
