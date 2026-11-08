# The interface every recitation model adapter follows. Owner: Qussai.
#
# An adapter wraps one model. It gets the audio and the expected ayah and returns RAW output:
# a dict (or JSON text) like this:
#
#   {"findings": [{"wordIndex": 1, "code": "ERR_MEM_OMISSION", "confidence": 0.4,
#                  "wordStartMs": 0, "wordEndMs": 600}]}
#
# The adapter maps its model's own codes to Noor codes (an unknown tajweed rule becomes
# ERR_TAJ_UNMAPPED, never a guess). It does not decide anything: app/structured.py checks the
# output and app/policy.py makes the decision, so models can be swapped without other changes.
from typing import Protocol, Union

RawOutput = Union[dict, str, bytes]


class RecitationAdapter(Protocol):
    # The model this adapter runs or stands in for, e.g. "quran-muaalem" or "whisper-quran".
    # Also names its kill switch: MODEL_QURAN_MUAALEM_ENABLED=false turns it off.
    name: str
    # Exact model revision (OPS-008)
    version: str
    # True for the fake adapters used in MOCK_MODE
    mock: bool

    def analyze(self, audio: bytes, surah: int, ayah: int) -> RawOutput: ...
