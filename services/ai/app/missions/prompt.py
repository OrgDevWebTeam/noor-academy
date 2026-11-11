# The prompt contract for a mission selector model. Owner: Qussai.
#
# The template is a versioned file in prompts/. A new wording means a new file and version, so
# every result can say which prompt was used. Only ids, the value and the level are put into the
# prompt, and each must be a plain UPPER_CASE / lower_case token, so no personal data or text
# that could change the instructions (prompt injection) can get in.
import re
from pathlib import Path
from string import Template

PROMPT_VERSION = "mission_select_v0"
PROMPTS = Path(__file__).parent / "prompts"
SAFE_TOKEN = re.compile(r"[A-Za-z0-9_]{1,64}")


def _template():
    return Template((PROMPTS / f"{PROMPT_VERSION}.txt").read_text(encoding="utf-8"))


def render(value, level, candidate_ids):
    for token in (value, level, *candidate_ids):
        if not SAFE_TOKEN.fullmatch(token):
            raise ValueError("unsafe token in prompt input")
    if not candidate_ids:
        raise ValueError("a prompt needs at least one candidate")
    return _template().substitute(
        value=value,
        level=level,
        candidates="\n".join(f"- {mission_id}" for mission_id in candidate_ids),
    )


def allowed_ids_in(prompt):
    """The ids listed under ALLOWED in a rendered prompt (used by the mock selector)."""
    allowed = prompt.split("ALLOWED:", 1)[1]
    return [line[2:].strip() for line in allowed.splitlines() if line.startswith("- ")]
