# Guardrails for mission selection. Owner: Qussai.
# Rules: docs/ai/genai_and_safety_boundaries.en.md section 2.3, docs/contracts/mission-selection.md
#
# 1. Only reviewed missions can be chosen. Placeholders are allowed in MOCK_MODE only.
# 2. A model only ever sees mission ids that already passed rule 1, the value and the level.
# 3. A model's reply must be exactly {"missionId": "<one of those ids>"}. Anything else (extra
#    fields, free text, an unknown or invented id, a too-long reply) is a violation and the rules
#    choose instead. Model text is never passed on.
import json
import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError

from app.missions.contracts import MISSION_ID, STRICT, MissionCatalog

CATALOG_FILE = Path(__file__).parent / "catalog.placeholder.json"
MAX_OUTPUT_CHARS = 500


class GuardrailViolation(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class ModelChoice(BaseModel):
    model_config = STRICT

    missionId: str = Field(pattern=MISSION_ID)


def is_mock_mode():
    return os.environ.get("MOCK_MODE", "true").lower() == "true"


def allowed_review_states():
    return {"approved", "placeholder"} if is_mock_mode() else {"approved"}


@lru_cache
def load_catalog(path=CATALOG_FILE):
    catalog = MissionCatalog.model_validate(json.loads(Path(path).read_text(encoding="utf-8")))
    ids = [m.id for m in catalog.missions]
    keys = [m.textKey for m in catalog.missions]
    if len(set(ids)) != len(ids) or len(set(keys)) != len(keys):
        raise ValueError("mission ids and text keys must be unique")
    return catalog


def candidates(catalog, request):
    """Returns (mission ids that may be chosen, whether they are all repeats)."""
    states = allowed_review_states()
    matching = sorted(
        m.id
        for m in catalog.missions
        if m.value == request.value and request.level in m.levels and m.reviewState in states
    )
    fresh = [mission_id for mission_id in matching if mission_id not in request.recent()]
    if fresh:
        return fresh, False
    return matching, bool(matching)


def check_model_output(raw, allowed_ids):
    """Returns the chosen mission id, or raises GuardrailViolation."""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    if isinstance(raw, str):
        if len(raw) > MAX_OUTPUT_CHARS:
            raise GuardrailViolation("OUTPUT_TOO_LONG")
        try:
            choice = ModelChoice.model_validate_json(raw.strip())
        except ValidationError:
            raise GuardrailViolation("OUTPUT_FORMAT") from None
    elif isinstance(raw, dict):
        try:
            choice = ModelChoice.model_validate(raw)
        except ValidationError:
            raise GuardrailViolation("OUTPUT_FORMAT") from None
    else:
        raise GuardrailViolation("OUTPUT_FORMAT")

    if choice.missionId not in allowed_ids:
        raise GuardrailViolation("MISSION_NOT_ALLOWED")
    return choice.missionId
