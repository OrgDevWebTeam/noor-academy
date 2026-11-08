# Turns raw adapter output into checked findings. Owner: Qussai.
#
# Model output is never trusted. Anything that does not match the raw format exactly (unknown
# field or code, confidence outside 0-1, NaN, broken timings, wrong types) raises
# InvalidModelOutput, and the pipeline sends the ayah to the teacher instead of guessing.
#
# The result is deterministic: the same raw output always gives the same findings in the same
# order (sorted by word then code, duplicates merged, confidence rounded).
from typing import List

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.policy import make_finding
from app.schemas import ErrorCode, Finding

MAX_FINDINGS = 200
CONFIDENCE_DECIMALS = 3


class InvalidModelOutput(Exception):
    """The adapter returned something that is not valid raw output."""


class RawFinding(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    wordIndex: int = Field(ge=1)
    code: ErrorCode
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    wordStartMs: int = Field(ge=0)
    wordEndMs: int = Field(ge=0)

    @model_validator(mode="after")
    def check_timing(self):
        if self.wordEndMs < self.wordStartMs:
            raise ValueError("wordEndMs is before wordStartMs")
        return self


class RawModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    findings: List[RawFinding] = Field(max_length=MAX_FINDINGS)


def _validate(raw):
    if isinstance(raw, (str, bytes)):
        return RawModelOutput.model_validate_json(raw)
    if isinstance(raw, dict):
        return RawModelOutput.model_validate(raw)
    raise InvalidModelOutput(f"expected a dict or JSON text, got {type(raw).__name__}")


def parse_output(raw) -> List[Finding]:
    try:
        output = _validate(raw)
    except ValidationError as exc:
        # Only the first problem, and no values: raw output may hold a transcript
        first = exc.errors()[0]
        where = ".".join(str(part) for part in first["loc"]) or "output"
        raise InvalidModelOutput(f"{where}: {first['type']}") from None

    # One finding per word and code, keeping the most confident one
    best = {}
    for item in output.findings:
        key = (item.wordIndex, item.code)
        if key not in best or item.confidence > best[key].confidence:
            best[key] = item

    return [
        make_finding(
            item.wordIndex,
            item.code,
            round(item.confidence, CONFIDENCE_DECIMALS),
            item.wordStartMs,
            item.wordEndMs,
        )
        for _key, item in sorted(best.items())
    ]
