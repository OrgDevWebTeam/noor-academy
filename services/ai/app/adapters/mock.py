# Fake recitation adapters for MOCK_MODE, so developers can test every path without a GPU.
# Owner: Qussai.
#
# They stand in for the two real models and return raw output in the same shape, so the mock goes
# through the same checks, combining and decision policy as the real models will.
#
# Rules (always the same for the same input):
#   whisper-quran: ayah % 5 == 0 -> word 1 skipped, confidence 0.4  -> "uncertain"
#                  ayah % 3 == 0 -> word 1 read as a different word -> "error" at every level
#                  ayah % 7 == 0 -> word 2 skipped (0.9)
#   quran-muaalem: ayah % 7 == 0 -> haraka problem on word 2 (0.9)
# On ayah 7 and 14 one model says word 2 was skipped and the other heard it, so the models
# disagree -> "uncertain". Ayah 1, 2, 4 are accepted.
MOCK_VERSION = "0.2"

WORD_1 = (0, 600)
WORD_2 = (600, 1200)


def _finding(word_index, code, confidence, timing):
    start, end = timing
    return {
        "wordIndex": word_index,
        "code": code,
        "confidence": confidence,
        "wordStartMs": start,
        "wordEndMs": end,
    }


class MockWhisperQuran:
    name = "whisper-quran"
    version = f"mock-{MOCK_VERSION}"
    mock = True

    def analyze(self, audio, surah, ayah):
        if ayah % 5 == 0:
            findings = [_finding(1, "ERR_MEM_OMISSION", 0.4, WORD_1)]
        elif ayah % 3 == 0:
            findings = [_finding(1, "ERR_MEM_SUBSTITUTION", 0.92, WORD_1)]
        elif ayah % 7 == 0:
            findings = [_finding(2, "ERR_MEM_OMISSION", 0.9, WORD_2)]
        else:
            findings = []
        return {"findings": findings}


class MockMuaalem:
    name = "quran-muaalem"
    version = f"mock-{MOCK_VERSION}"
    mock = True

    def analyze(self, audio, surah, ayah):
        if ayah % 7 == 0:
            return {"findings": [_finding(2, "ERR_PRON_HARAKA", 0.9, WORD_2)]}
        return {"findings": []}
