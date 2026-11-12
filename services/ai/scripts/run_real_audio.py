# Runs the quality gate and both models on real recordings (week 2 exit gate). Owner: Qussai.
#
# Usage (from services/ai, on the GPU machine):
#   python scripts/run_real_audio.py <folder> <level>
#
#   folder: one mp3 per ayah, named SSSAAA.mp3 (surah and ayah, 3 digits each), e.g. 001001.mp3
#   level:  beginner, intermediate or advanced (decides what stops the child)
#
# Prints, for each recording: the gate result, then the result of each model in the contract format
# and how long it took. At the end: the GPU memory used. Nothing is written to disk.
# Recordings are never copied into the repository (it is public).
import json
import sys
import time
from pathlib import Path

import torch

# Lets this script do "from app..." like the service does
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.adapters import muaalem, whisper_quran  # noqa: E402
from app.audio import AudioError, check_quality, decode_audio  # noqa: E402
from app.reference import get_ayah  # noqa: E402

LEVELS = ["beginner", "intermediate", "advanced"]


def print_result(result, seconds):
    print(f"  {result.model} ({seconds:.2f} s): {result.decision}")
    for finding in result.findings:
        print("    " + json.dumps(finding.model_dump()))


def main():
    if len(sys.argv) != 3 or sys.argv[2] not in LEVELS:
        print("Usage: python scripts/run_real_audio.py <folder> <beginner|intermediate|advanced>")
        sys.exit(1)
    folder = Path(sys.argv[1])
    level = sys.argv[2]

    files = sorted(folder.glob("*.mp3"))
    if not files:
        print(f"No mp3 files in {folder}")
        sys.exit(1)

    print("Loading the models...")
    started = time.perf_counter()
    muaalem.load_model()
    whisper_quran.load_model()
    print(f"Loaded in {time.perf_counter() - started:.1f} s")
    print(f"{muaalem.MODEL}: {muaalem.model_version()}")
    print(f"{whisper_quran.MODEL}: {whisper_quran.model_version()}")
    print()

    for file in files:
        name = file.stem
        print(name)
        if len(name) != 6 or not name.isdigit():
            print("  skipped: the name is not SSSAAA")
            continue
        ayah = get_ayah(int(name[:3]), int(name[3:]))
        if ayah is None:
            print("  skipped: not one of the 25 prototype ayat")
            continue

        try:
            samples = decode_audio(file.read_bytes())
        except AudioError as error:
            print(f"  audio error: {error.code}")
            continue

        quality, report = check_quality(samples)
        print(f"  gate: {quality} {json.dumps(report)}")
        if quality != "ok":
            # A rejected recording never reaches the models
            continue

        started = time.perf_counter()
        result = muaalem.analyze(samples, ayah["text_uthmani"], level, name)
        print_result(result, time.perf_counter() - started)

        started = time.perf_counter()
        words = [word["text"] for word in ayah["words"]]
        result = whisper_quran.analyze(samples, words, level, name)
        print_result(result, time.perf_counter() - started)

    print()
    print(f"GPU memory used (peak): {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB")


if __name__ == "__main__":
    main()
