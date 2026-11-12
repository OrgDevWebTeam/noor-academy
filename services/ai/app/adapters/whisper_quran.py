# whisper-quran adapter: one recording of one ayah -> contract result. Owner: Qussai.
# Licence: Apache-2.0.
#
# Steps:
#   1. The model writes down the words it hears (Arabic text with diacritics).
#   2. Both the transcript and the reference words are normalised (no diacritics, one form per letter),
#      because the model writes ordinary (Imlaei) spelling and the reference is Uthmani.
#   3. The two word lists are compared. A skipped word, a different word or an extra word becomes a
#      memorization finding (taxonomy 1.4: ERR_MEM_* come from this comparison).
# The transcript itself never leaves this file (contract rule: model text is never shown to a child).
import difflib
import re
import time

import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from app.policy import decide, make_finding
from app.schemas import AnalysisResult

MODEL = "whisper-quran"
MODEL_NAME = "tarteel-ai/whisper-base-ar-quran"
SAMPLE_RATE = 16000

# Harakat, Quranic marks (including small waw and small yaa) and tatweel
MARKS = re.compile("[ً-ٟۖ-ۭـ]")
# Letters written in more than one way
SAME_LETTER = {
    "ٱ": "ا",  # alif wasla -> alif
    "ٰ": "ا",  # dagger alif -> alif
    "أ": "ا",  # alif with hamza above -> alif
    "إ": "ا",  # alif with hamza below -> alif
    "آ": "ا",  # alif madda -> alif
    "ى": "ي",  # alif maqsura -> yaa
    "ؤ": "و",  # waw with hamza -> waw
    "ئ": "ي",  # yaa with hamza -> yaa
    "ة": "ه",  # taa marbuta -> haa
}

processor = None
model = None


def load_model():
    global processor, model
    if model is None:
        processor = WhisperProcessor.from_pretrained(MODEL_NAME)
        model = WhisperForConditionalGeneration.from_pretrained(MODEL_NAME).to("cuda").eval()
    return processor, model


def model_version():
    # Exact model revision (OPS-008)
    commit = load_model()[1].config._commit_hash or "unknown"
    return f"{MODEL_NAME}@{commit[:12]}"


def normalize(word):
    for letter, same in SAME_LETTER.items():
        word = word.replace(letter, same)
    return MARKS.sub("", word)


def transcribe(samples):
    """Returns (words, confidence). Confidence = the average probability of the model's tokens."""
    processor, model = load_model()
    features = processor(samples, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features.to("cuda")
    with torch.no_grad():
        output = model.generate(features, return_dict_in_generate=True, output_scores=True)
    scores = model.compute_transition_scores(output.sequences, output.scores, normalize_logits=True)
    text = processor.batch_decode(output.sequences, skip_special_tokens=True)[0]
    confidence = round(float(torch.exp(scores[0]).mean()), 3)
    return text.split(), confidence


def compare_words(reference_words, said_words):
    """
    Returns a list of (wordIndex, code). wordIndex counts the reference words from 1.
    An extra word points to the reference word just before it (contract rule for ERR_MEM_INSERTION).
    """
    expected = [normalize(w) for w in reference_words]
    said = [normalize(w) for w in said_words]
    errors = []
    matcher = difflib.SequenceMatcher(a=expected, b=said, autojunk=False)
    # ref_start and ref_end count from 0, so reference word i is word number i + 1
    for operation, ref_start, ref_end, said_start, said_end in matcher.get_opcodes():
        if operation == "delete":
            # Reference words that were not said
            for i in range(ref_start, ref_end):
                errors.append((i + 1, "ERR_MEM_OMISSION"))

        elif operation == "insert":
            # Extra words before reference word ref_start, so the word before them is number ref_start
            errors.append((max(ref_start, 1), "ERR_MEM_INSERTION"))

        elif operation == "replace":
            ref_count = ref_end - ref_start
            said_count = said_end - said_start
            different = min(ref_count, said_count)
            # Words read as other words
            for i in range(ref_start, ref_start + different):
                errors.append((i + 1, "ERR_MEM_SUBSTITUTION"))
            # More reference words than said words: the rest were skipped
            for i in range(ref_start + different, ref_end):
                errors.append((i + 1, "ERR_MEM_OMISSION"))
            # More said words than reference words: extra words after the last word of this part
            if said_count > ref_count:
                errors.append((ref_end, "ERR_MEM_INSERTION"))
    return errors


def analyze(samples, reference_words, level, attempt_id):
    """samples: 16 kHz mono float32 audio that passed the quality gate. reference_words: list of Uthmani words."""
    started = time.perf_counter()
    said_words, confidence = transcribe(samples)

    # One finding per word: the first one found
    findings_by_word = {}
    for word, code in compare_words(reference_words, said_words):
        if word not in findings_by_word:
            # No word timings yet, so the replay segment is 0-0 until the new timings are added
            findings_by_word[word] = make_finding(word, code, confidence, 0, 0)

    findings = [findings_by_word[word] for word in sorted(findings_by_word)]
    decision, findings = decide(findings, level)
    return AnalysisResult(
        attemptId=attempt_id,
        model=MODEL,
        modelVersion=model_version(),
        decision=decision,
        quality="ok",
        findings=findings,
        processingMs=int((time.perf_counter() - started) * 1000),
    )
