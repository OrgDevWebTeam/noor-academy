"""
fetch_reference_timings.py - rebuilds reference_word_timings.json from the quran.com API.

Usage (from the repo root):
  python packages/contracts/data/fetch_reference_timings.py [--recitation 7]

- Reads the 25 ayat from reference_quran_text.json (the text is never taken from the API).
- Gets per-ayah word segments for one reciter (default 7 = Mishari Rashid al-Afasy, murattal).
- Gets each ayah's real audio length with ffprobe (needs ffmpeg on PATH); the mp3 files are
  only read in a temp folder and are not saved in the repo.
- Word 1 starts at 0 and the last word ends at the end of the file, as the validator requires.
  The other boundaries are the reciter's real segments, so the pauses between words are kept.

Reference reciter and licence are decision O-01 (Ismail + Mohammad). Re-run with another
--recitation id if the decision changes, then run validate_reference_data.py.
"""
import argparse, json, os, subprocess, tempfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://api.quran.com/api/v4/recitations/{rid}/by_chapter/{ch}?per_page=50&fields=segments"
AUDIO_BASE = "https://verses.quran.com/"
HEADERS = {"User-Agent": "noor-reference-data/1.0"}


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as r:
        return json.load(r)


def audio_duration_ms(url, folder):
    path = os.path.join(folder, os.path.basename(url))
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r, open(path, "wb") as out:
        out.write(r.read())
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    )
    return round(float(out.stdout.strip()) * 1000)


def build(rid):
    text = json.load(open(os.path.join(HERE, "reference_quran_text.json"), encoding="utf-8"))
    result = []
    with tempfile.TemporaryDirectory() as tmp:
        for surah in text:
            files = {f["verse_key"]: f for f in get_json(API.format(rid=rid, ch=surah["surah_id"]))["audio_files"]}
            for ayah in surah["ayahs"]:
                f = files[f"{surah['surah_id']}:{ayah['ayah_id']}"]
                segs = f["segments"]  # [index, wordPosition, startMs, endMs]
                if [s[1] for s in segs] != [w["position"] for w in ayah["words"]]:
                    raise SystemExit(f"{f['verse_key']}: API words do not match reference_quran_text.json")
                url = f["url"] if f["url"].startswith("http") else AUDIO_BASE + f["url"].lstrip("/")
                total = max(audio_duration_ms(url, tmp), segs[-1][3])
                words, prev_end = [], 0
                for i, (seg, word) in enumerate(zip(segs, ayah["words"])):
                    start = 0 if i == 0 else max(seg[2], prev_end)
                    end = total if i == len(segs) - 1 else seg[3]
                    words.append({"position": word["position"], "text": word["text"], "start_ms": start, "end_ms": end})
                    prev_end = end
                result.append({
                    "surah_id": surah["surah_id"],
                    "ayah_id": ayah["ayah_id"],
                    "audio_file": os.path.basename(f["url"]),
                    "total_duration_ms": total,
                    "words": words,
                })
                print(f"{f['verse_key']}: {len(words)} words, {total} ms")
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--recitation", type=int, default=7, help="quran.com recitation id (7 = Alafasy)")
    args = p.parse_args()
    data = build(args.recitation)
    with open(os.path.join(HERE, "reference_word_timings.json"), "w", encoding="utf-8", newline="\n") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
        out.write("\n")
    print(f"wrote {len(data)} ayat")
