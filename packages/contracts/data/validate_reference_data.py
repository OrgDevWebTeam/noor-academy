"""
validate_reference_data.py - run in CI on the Week-1 reference files.
Usage: python validate_reference_data.py reference_quran_text.json reference_word_timings.json [recitation_result.json]

Checks
  text    : 25 ayat, positions 1..n, text_uthmani == words joined by a space, no Arabic-Indic digits/Latin chars
  timings : every ayah in the text file has timings, words match the text file, start=0, end=total,
            monotonic, no overlaps, suspicious 'too clean' grids (every boundary on a 50 ms grid = likely hand-estimated)
  result  : word_text in a result file equals the reference word AFTER normalization AND (strictly) without it
"""
import json, re, sys, unicodedata

WASLA, ALEF = "\u0671", "\u0627"

def normalize(s):
    """Search/compare form only. Never store this form; keep the Uthmani original."""
    s = s.replace(WASLA, ALEF)
    s = re.sub(r"[\u064B-\u065F\u0670\u06D6-\u06ED]", "", s)   # harakat + Quranic marks
    return unicodedata.normalize("NFC", s)

def main(text_p, tim_p, res_p=None):
    text = json.load(open(text_p, encoding="utf-8"))
    tim = json.load(open(tim_p, encoding="utf-8"))
    problems, T = [], {}
    for s in text:
        for a in s["ayahs"]:
            k = (s["surah_id"], a["ayah_id"]); ws = [w["text"] for w in a["words"]]
            T[k] = ws
            if " ".join(ws) != a["text_uthmani"]: problems.append(f"{k}: text_uthmani != joined words")
            if [w["position"] for w in a["words"]] != list(range(1, len(ws) + 1)): problems.append(f"{k}: positions")
            if re.search(r"[0-9\u0660-\u0669A-Za-z]", a["text_uthmani"]): problems.append(f"{k}: digits/latin in text")
    print(f"text: {len(T)} ayat, {sum(map(len, T.values()))} words")

    got = {(t["surah_id"], t["ayah_id"]): t for t in tim}
    miss = sorted(set(T) - set(got))
    if miss: problems.append(f"timings missing for {len(miss)}/{len(T)} ayat, e.g. {miss[:4]}")
    for k, t in got.items():
        ws = t["words"]
        if k not in T: problems.append(f"{k}: timings for an ayah not in text"); continue
        if [w["text"] for w in ws] != T[k]: problems.append(f"{k}: timing words differ from text")
        if ws[0]["start_ms"] != 0 or ws[-1]["end_ms"] != t["total_duration_ms"]: problems.append(f"{k}: start/end vs total")
        for a, b in zip(ws, ws[1:]):
            if b["start_ms"] < a["end_ms"]: problems.append(f"{k}: overlap at word {b['position']}")
    b = [x for t in got.values() for w in t["words"] for x in (w["start_ms"], w["end_ms"])]
    grid = sum(1 for x in b if x % 50 == 0)
    if b and grid == len(b): problems.append(f"timings: ALL {len(b)} boundaries sit on a 50 ms grid -> look hand-estimated; verify against forced alignment/QUL")
    gaps = [bb["start_ms"] - aa["end_ms"] for t in got.values() for aa, bb in zip(t["words"], t["words"][1:])]
    if gaps and all(g == 0 for g in gaps): problems.append("timings: zero silence between every pair of words (no pauses) -> check boundaries")

    if res_p:
        r = json.load(open(res_p, encoding="utf-8"))
        k = (r.get("surah", r.get("surah_id")), r.get("ayah", r.get("ayah_id")))
        for f in r.get("findings", []):
            i = f.get("word_index", f.get("word_position")); ref = T[k][i - 1]
            if f.get("word_text") != ref:
                tag = "differs only by alif-wasla/marks" if normalize(f["word_text"]) == normalize(ref) else "different word"
                problems.append(f"result {k} word {i}: {f['word_text']!r} != reference {ref!r} ({tag})")
    print("\n".join(("FAIL: " + p) for p in problems) or "ALL CHECKS PASSED")
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
