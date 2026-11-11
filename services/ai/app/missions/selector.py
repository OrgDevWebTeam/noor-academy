# Mission selection: rules first, an optional selector model behind a kill switch. Owner: Qussai.
#
#   request -> reviewed candidates -> rules choose
#                                  -> (MISSIONS_AI_ENABLED=true) model chooses -> guardrails
#
# The rules always have an answer ready, so a model that is off, fails or breaks a guardrail
# never stops the family loop. MISSIONS_AI_ENABLED is off by default. There is no real model yet
# (that needs a new architecture decision, safety doc section 2.6), only the mock selector.
import hashlib
import json
import logging
import os
import time

from app.missions.contracts import SelectionResponse
from app.missions.guardrails import (
    GuardrailViolation,
    candidates,
    check_model_output,
    is_mock_mode,
    load_catalog,
)
from app.missions.prompt import PROMPT_VERSION, allowed_ids_in, render

log = logging.getLogger("noor.ai.missions")


class MockSelector:
    """Reads the prompt like a model would and always gives the same answer for the same prompt."""

    name = "mock"

    def choose(self, prompt):
        allowed = allowed_ids_in(prompt)
        index = int(hashlib.sha256(prompt.encode("utf-8")).hexdigest(), 16) % len(allowed)
        return json.dumps({"missionId": allowed[index]})


def ai_enabled():
    # Kill switch: off unless set to "true"
    return os.environ.get("MISSIONS_AI_ENABLED", "false").lower() == "true"


def active_selector():
    if not ai_enabled():
        return None
    # TODO(Qussai): a real local selector model, only after a new ADR (safety doc 2.6)
    return MockSelector() if is_mock_mode() else None


def _telemetry(response, candidate_count, guardrail, started):
    # One event per selection. Ids and codes only: no child data, prompt or model text.
    event = {
        "event": "mission_selection",
        "requestId": response.requestId,
        "selector": response.selector,
        "reasonRule": response.reasonRule,
        "guardrail": guardrail,
        "candidateCount": candidate_count,
        "catalogVersion": response.catalogVersion,
        "promptVersion": response.promptVersion,
        "latencyMs": int((time.perf_counter() - started) * 1000),
    }
    log.info(json.dumps(event))
    return event


def select_mission(request, catalog=None, selector=None):
    started = time.perf_counter()
    catalog = catalog or load_catalog()
    selector = selector if selector is not None else active_selector()
    allowed, all_repeats = candidates(catalog, request)

    def respond(mission_id, reason, chosen_by, prompt_version=None, guardrail=None):
        response = SelectionResponse(
            requestId=request.requestId,
            missionId=mission_id,
            reasonRule=reason,
            selector=chosen_by,
            catalogVersion=catalog.version,
            promptVersion=prompt_version,
        )
        _telemetry(response, len(allowed), guardrail, started)
        return response

    if not allowed:
        return respond(None, "RULE_NO_MISSION", "rules")

    rule_choice = allowed[0]
    rule_reason = "RULE_VALUE_MATCH_REPEAT" if all_repeats else "RULE_VALUE_MATCH"
    if selector is None:
        return respond(rule_choice, rule_reason, "rules")

    prompt = render(request.value, request.level, allowed)
    try:
        raw = selector.choose(prompt)
    except Exception as exc:
        log.error("mission selector %s failed: %s", selector.name, type(exc).__name__)
        return respond(rule_choice, "RULE_FALLBACK_AI_ERROR", "rules", PROMPT_VERSION, "MODEL_ERROR")

    try:
        chosen = check_model_output(raw, allowed)
    except GuardrailViolation as violation:
        return respond(
            rule_choice, "RULE_FALLBACK_AI_INVALID", "rules", PROMPT_VERSION, violation.code
        )
    return respond(chosen, "AI_SELECTED", selector.name, PROMPT_VERSION)
