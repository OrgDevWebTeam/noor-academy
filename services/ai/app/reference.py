# The reference Quran text of the prototype ayat. Owner: Qussai.
# Source: packages/contracts/data/reference_quran_text.json (5 surahs, 25 ayat).
import json
from pathlib import Path

TEXT_FILE = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "data" / "reference_quran_text.json"

ayat = {}


def load_ayat():
    with open(TEXT_FILE, encoding="utf-8") as f:
        surahs = json.load(f)
    for surah in surahs:
        for ayah in surah["ayahs"]:
            ayat[(surah["surah_id"], ayah["ayah_id"])] = ayah


def get_ayah(surah, ayah):
    """Returns {"text_uthmani": ..., "words": [{"position", "text"}, ...]}, or None if not a prototype ayah."""
    if not ayat:
        load_ayat()
    return ayat.get((surah, ayah))
