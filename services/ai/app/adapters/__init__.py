# Model adapters and the registry that picks them. Owner: Qussai.
#
# One file per model (base.py has the interface). MOCK_MODE=true uses the fake adapters in
# mock.py; MOCK_MODE=false uses the real ones, so models can be swapped or switched off without
# changing anything else (NFR-AI-002).
#
# TODO(week 2, Qussai): real adapters (muaalem.py, whisper_quran.py) and the quality gate.
import os

from app.adapters.mock import MockMuaalem, MockWhisperQuran


def is_mock_mode():
    # Read every time, so tests can switch it
    return os.environ.get("MOCK_MODE", "true").lower() == "true"


def kill_switch_name(adapter):
    # "quran-muaalem" -> MODEL_QURAN_MUAALEM_ENABLED
    return f"MODEL_{adapter.name.upper().replace('-', '_')}_ENABLED"


def is_enabled(adapter):
    # Kill switch per model (Architecture 8.5). On unless set to "false".
    return os.environ.get(kill_switch_name(adapter), "true").lower() != "false"


def recitation_adapters():
    """Every adapter that should check a recitation, enabled or not. Empty = no models loaded."""
    if is_mock_mode():
        return [MockMuaalem(), MockWhisperQuran()]
    return []
