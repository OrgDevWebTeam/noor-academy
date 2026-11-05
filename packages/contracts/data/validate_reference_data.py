"""
validate_reference_data.py - integrity checks for the Week-1 reference data.

Usage:
  python validate_reference_data.py reference_quran_text.json reference_word_timings.json [recitation_result.json] [--draft]

Modes
  strict (default): every problem is a failure (exit 1). Use once all 25 ayat have reviewed timings.
  --draft         : DRAFT MODE for CI while timings are still being generated. Data-completeness problems are
                    reported as WARN and do not fail the run (missing ayat, 50 ms grid, zero gaps).
                    Integrity problems still FAIL: text/word mismatches, positions, start/end vs total, overlaps,
                    and any result-file word that differs from the reference.
                    Remove --draft from CI when the timings are complete.

Checks
  text    : 25 ayat, positions 1..n, text_uthmani == words joined by a space, no digits/latin characters
  timings : words match the text file, start=0, end=total, no overlaps  [integrity]
            every ayah present, boundaries not all on a 50 ms grid, pauses between words  [completeness]
  result  : word_text in a result file equals the reference word exactly (alif-wasla/marks differences are reported).
            Findings without word_text (contract v3) are skipped.
"""
import json, re, sys, unicodedata

WASLA, ALEF = "\u0671", "\u0627"
EXPECTED_AYAT = 25


def normalize(s):
    """Comparison form only. Never store this form; keep the Uthmani original."""
    s = s.replace(WASLA, ALEF)
    s = re.sub(r"[\u064B-\u065F\u0670\u06D6-\u06ED]", "", s)   # harakat + Quranic marks
    return unicodedata.normalize("NFC", s)


def check(text_p, tim_p, res_p=None):
    """Returns (hard, soft): integrity failures and completeness warnings."""
    text = json.load(open(text_p, encoding="utf-8"))
    tim = json.load(open(tim_p, encoding="utf-8"))
    hard, soft, T = [], [], {}
    for s in text:
        for a in s["ayahs"]:
            k = (s["surah_id"], a["ayah_id"]); ws = [w["text"] for w in a["words"]]
            T[k] = ws
            if " ".join(ws) != a["text_uthmani"]: hard.append(f"{k}: text_uthmani != joined words")
            if [w["position"] for w in a["words"]] != list(range(1, len(ws) + 1)): hard.append(f"{k}: positions")
            if re.search(r"[0-9\u0660-\u0669A-Za-z]", a["text_uthmani"]): hard.append(f"{k}: digits/latin in text")
    if len(T) != EXPECTED_AYAT: hard.append(f"text has {len(T)} ayat, expected {EXPECTED_AYAT}")
    print(f"text: {len(T)} ayat, {sum(map(len, T.values()))} words")

    got = {(t["surah_id"], t["ayah_id"]): t for t in tim}
    miss = sorted(set(T) - set(got))
    print(f"timings: {len(got)}/{len(T)} ayat covered")
    if miss: soft.append(f"timings missing for {len(miss)}/{len(T)} ayat, e.g. {miss[:4]}")
    for k, t in got.items():
        ws = t["words"]
        if k not in T: hard.append(f"{k}: timings for an ayah not in text"); continue
        if [w["text"] for w in ws] != T[k]: hard.append(f"{k}: timing words differ from text")
        if ws[0]["start_ms"] != 0 or ws[-1]["end_ms"] != t["total_duration_ms"]: hard.append(f"{k}: start/end vs total")
        for a, b in zip(ws, ws[1:]):
            if b["start_ms"] < a["end_ms"]: hard.append(f"{k}: overlap at word {b['position']}")
    b = [x for t in got.values() for w in t["words"] for x in (w["start_ms"], w["end_ms"])]
    if b and all(x % 50 == 0 for x in b):
        soft.append(f"ALL {len(b)} timing boundaries sit on a 50 ms grid -> look hand-estimated; verify against forced alignment/QUL")
    gaps = [bb["start_ms"] - aa["end_ms"] for t in got.values() for aa, bb in zip(t["words"], t["words"][1:])]
    if gaps and all(g == 0 for g in gaps): soft.append("zero silence between every pair of words -> check boundaries")

    if res_p:
        r = json.load(open(res_p, encoding="utf-8"))
        k = (r.get("surah", r.get("surah_id")), r.get("ayah", r.get("ayah_id")))
        for f in r.get("findings", []):
            if "word_text" not in f: continue  # contract v3 results carry wordIndex only, no word text
            i = f.get("wordIndex", f.get("word_index", f.get("word_position"))); ref = T[k][i - 1]
            if f.get("word_text") != ref:
                if unicodedata.normalize("NFC", f["word_text"]) == unicodedata.normalize("NFC", ref):
                    tag = "canonically equivalent: only the ORDER of combining marks differs (e.g. shadda/fatha); copy word_text from the reference file, do not retype it"
                elif normalize(f["word_text"]) == normalize(ref):
                    tag = "differs only by alif-wasla/marks"
                else:
                    tag = "different word"
                hard.append(f"result {k} word {i}: {f['word_text']!r} != reference {ref!r} ({tag})")
    return hard, soft


def main(argv):
    draft = "--draft" in argv
    args = [a for a in argv if a != "--draft"]
    if len(args) < 2:
        print(__doc__); return 2
    hard, soft = check(*args[:3])
    for p in hard: print("FAIL:", p)
    for p in soft: print(("WARN (draft mode): " if draft else "FAIL: ") + p)
    failed = bool(hard) or (bool(soft) and not draft)
    print("RESULT:", "FAILED" if failed else ("PASSED with warnings (draft mode)" if soft else "ALL CHECKS PASSED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
