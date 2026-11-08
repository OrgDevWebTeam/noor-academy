# Keeps mission selection in line with its JSON schemas. Owner: Qussai.
# packages/contracts/schemas/mission_selection.schema.json + mission_catalog.schema.json
import json
import typing
from pathlib import Path

from jsonschema import Draft202012Validator

from app.missions.contracts import (
    Level,
    ReasonRule,
    ReviewState,
    SelectionRequest,
    SelectionResponse,
)
from app.missions.guardrails import CATALOG_FILE
from app.missions.selector import select_mission

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMAS = REPO_ROOT / "packages" / "contracts" / "schemas"

SELECTION = json.loads((SCHEMAS / "mission_selection.schema.json").read_text(encoding="utf-8"))
CATALOG = json.loads((SCHEMAS / "mission_catalog.schema.json").read_text(encoding="utf-8"))
DEFS = SELECTION["$defs"]


def validator_for(name):
    return Draft202012Validator({"$ref": f"#/$defs/{name}", "$defs": DEFS})


def values(literal):
    return list(typing.get_args(literal))


def test_pydantic_fields_match_the_schema():
    assert set(SelectionRequest.model_fields) == set(DEFS["request"]["properties"])
    assert set(SelectionResponse.model_fields) == set(DEFS["response"]["properties"])
    assert values(ReasonRule) == DEFS["response"]["properties"]["reasonRule"]["enum"]
    assert values(Level) == DEFS["level"]["enum"]
    mission = CATALOG["properties"]["missions"]["items"]["properties"]
    assert values(ReviewState) == mission["reviewState"]["enum"]


def test_placeholder_catalog_passes_the_schema():
    catalog = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    errors = [e.message for e in Draft202012Validator(CATALOG).iter_errors(catalog)]
    assert errors == []


def test_schema_example_matches_the_service():
    [example] = SELECTION["examples"]
    assert validator_for("request").is_valid(example["request"])
    assert validator_for("response").is_valid(example["response"])
    response = select_mission(SelectionRequest(**example["request"]))
    assert response.model_dump() == example["response"]


def test_every_reason_passes_the_response_schema():
    for reason in values(ReasonRule):
        response = SelectionResponse(
            requestId="r",
            missionId=None,
            reasonRule=reason,
            selector="rules",
            catalogVersion="v",
            promptVersion=None,
        )
        assert validator_for("response").is_valid(response.model_dump())


def test_schema_rejects_extra_fields_and_free_text():
    good = SELECTION["examples"][0]["request"]
    assert not validator_for("request").is_valid({**good, "childName": "Ahmad"})
    assert not validator_for("request").is_valid({**good, "value": "honesty"})
    bad_response = {**SELECTION["examples"][0]["response"], "message": "Well done"}
    assert not validator_for("response").is_valid(bad_response)
