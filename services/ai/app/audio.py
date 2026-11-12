# Audio decoding and the quality gate (FR-QUR-003, VAL-014). Owner: Qussai.
# Rules: docs/ai/audio-io-and-eval-dataset.md, section A.3.
#
# 1. decode_audio() turns any upload (webm, mp4, ogg, wav, mp3) into 16 kHz mono samples with ffmpeg.
# 2. check_quality() measures the samples and returns one of the contract qualities:
#    ok, silent, too_short, too_noisy, too_long.
# A rejected recording is not an attempt and never reaches the models.
#
# Needs ffmpeg on PATH and the packages in requirements-gpu.txt (torch, silero-vad).
import os
import subprocess
import tempfile

import numpy as np
import torch
from silero_vad import get_speech_timestamps, load_silero_vad

SAMPLE_RATE = 16000  # the models need 16 kHz mono

# Gate values. Starting values, tuned later against real recordings.
MAX_SECONDS = 30.0  # longer -> too_long
MIN_SECONDS = 0.03  # shorter (or empty) -> too_short
MIN_SPEECH_SECONDS = 0.3  # less speech than this -> silent
MIN_SPEECH_RATIO = 0.30  # speech seconds / all seconds below this -> too_noisy
CLIPPED_LEVEL = 0.976  # |sample| at or above this counts as clipped (32000 / 32768)
MAX_CLIPPED_RATIO = 0.01  # more than 1% clipped samples -> too_noisy

DECODE_TIMEOUT_SECONDS = 15

vad_model = None


class AudioError(Exception):
    """The audio could not be read at all. This is not a quality result."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def decode_audio(audio_bytes):
    """Returns the recording as 16 kHz mono float32 samples between -1 and 1."""
    if not audio_bytes:
        raise AudioError("EMPTY_AUDIO", "The audio file is empty")

    with tempfile.TemporaryDirectory() as folder:
        input_path = os.path.join(folder, "input")
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        # Decode a little more than the limit only: a tiny file can hold a very long recording
        command = [
            "ffmpeg", "-nostdin", "-loglevel", "error",
            "-i", input_path,
            "-t", str(MAX_SECONDS + 1),
            "-ac", "1", "-ar", str(SAMPLE_RATE),
            "-f", "s16le", "-",
        ]
        try:
            output = subprocess.run(command, capture_output=True, timeout=DECODE_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            raise AudioError("DECODE_TIMEOUT", "Decoding took too long")

    if output.returncode != 0:
        raise AudioError("DECODE_FAILED", "The file is not readable audio")

    samples = np.frombuffer(output.stdout, dtype=np.int16)
    return samples.astype(np.float32) / 32768.0


def speech_seconds(samples):
    """How many seconds of the recording Silero VAD hears as speech."""
    global vad_model
    if vad_model is None:
        vad_model = load_silero_vad()

    parts = get_speech_timestamps(torch.from_numpy(samples), vad_model, sampling_rate=SAMPLE_RATE)
    return sum(part["end"] - part["start"] for part in parts) / SAMPLE_RATE


def check_quality(samples):
    """Returns (quality, report). The report holds numbers only, so it is safe to log."""
    seconds = len(samples) / SAMPLE_RATE
    report = {"durationSeconds": round(seconds, 2)}

    # Checked in this order, the first match wins
    if seconds > MAX_SECONDS:
        return "too_long", report
    if seconds < MIN_SECONDS:
        return "too_short", report

    clipped_ratio = float(np.mean(np.abs(samples) >= CLIPPED_LEVEL))
    report["clippedRatio"] = round(clipped_ratio, 4)
    if clipped_ratio > MAX_CLIPPED_RATIO:
        return "too_noisy", report

    speech = speech_seconds(samples)
    speech_ratio = speech / seconds
    report["speechSeconds"] = round(speech, 2)
    report["speechRatio"] = round(speech_ratio, 2)
    report["rms"] = round(float(np.sqrt(np.mean(samples**2))), 4)
    if speech < MIN_SPEECH_SECONDS:
        return "silent", report
    if speech_ratio < MIN_SPEECH_RATIO:
        return "too_noisy", report

    return "ok", report
