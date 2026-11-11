# Mission selection request, response and catalog formats (Pydantic). Owner: Qussai.
# Contract: docs/contracts/mission-selection.md
# Source of truth: packages/contracts/schemas/mission_selection.schema.json and
# mission_catalog.schema.json. tests/test_missions_contract.py fails if this file drifts.
#
# PRIVACY by construction: every request field is a uuid, a level or an UPPER_CASE id. There is no
# free-text field and unknown fields are rejected, so a name or message cannot be sent at all.
from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Level = Literal["beginner", "intermediate", "advanced"]
ReviewState = Literal["placeholder", "draft", "approved"]
ReasonRule = Literal[
    "RULE_VALUE_MATCH",  # first reviewed mission for the value and level, not done recently
    "RULE_VALUE_MATCH_REPEAT",  # every matching mission was done recently, so one repeats
    "RULE_NO_MISSION",  # no reviewed mission for this value and level
    "AI_SELECTED",  # the selector model chose one of the allowed missions
    "RULE_FALLBACK_AI_INVALID",  # the model's choice failed the guardrails, rules chose
    "RULE_FALLBACK_AI_ERROR",  # the model failed, rules chose
]

MISSION_ID = r"^MISSION_[A-Z0-9_]{1,56}$"
VALUE_ID = r"^VALUE_[A-Z0-9_]{1,58}$"
TEXT_KEY = r"^MISSION_TEXT_[A-Z0-9_]{1,50}$"
UUID = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
MAX_RECENT = 20

MissionId = Annotated[str, Field(pattern=MISSION_ID)]

STRICT = ConfigDict(extra="forbid", strict=True)


class Mission(BaseModel):
    model_config = STRICT

    id: str = Field(pattern=MISSION_ID)
    value: str = Field(pattern=VALUE_ID)
    levels: List[Level] = Field(min_length=1)
    reviewState: ReviewState
    # The reviewed wording lives in the app's messages under this key, never in a model
    textKey: str = Field(pattern=TEXT_KEY)


class MissionCatalog(BaseModel):
    model_config = STRICT

    version: str = Field(min_length=1, max_length=32)
    missions: List[Mission]


class SelectionRequest(BaseModel):
    model_config = STRICT

    # Opaque id for this request only. Never a child, family or session id (ADR-0004).
    requestId: str = Field(pattern=UUID)
    level: Level
    # The value from the Asia & Sham question the child answered wrongly (FR-AGT-004)
    value: str = Field(pattern=VALUE_ID)
    # Missions given recently, so they are not repeated when another one fits
    recentMissionIds: List[MissionId] = Field(default=[], max_length=MAX_RECENT)

    def recent(self):
        return set(self.recentMissionIds)


class SelectionResponse(BaseModel):
    model_config = STRICT

    requestId: str
    missionId: Optional[MissionId]
    reasonRule: ReasonRule
    # "rules", or the selector model that chose (e.g. "mock")
    selector: str
    catalogVersion: str
    # Set only when a model was asked
    promptVersion: Optional[str]
