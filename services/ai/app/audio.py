"""
Audio ingestion checks and quality gate (KAN-27).
Owner: Ismail (AI 2). Aligned with docs/ai/audio-io-and-eval-dataset.md and contract v3.0.

STATUS (week 2): this module is NOT wired into the endpoints yet.
  * It accepts only 16 kHz, mono, 16-bit PCM WAV. Browsers send WebM/Opus or MP4/AAC, so the ffmpeg
    decode step (week 3) must run first.
  * It returns only the four contract qualities: ok, silent, too_short, too_noisy.
    A recording that is too long is NOT a quality: it raises AudioTooLongError. The `too_long` contract
    change is a week 3 decision with Qussai and the API team.

Order of checks:
  1. Header and format problems raise a specific AudioProcessingError (see the classes below).
  2. Duration above the limit raises AudioTooLongError (checked from the header, before any sample is read).
  3. Quality, first match wins:
       clipped samples above the limit        -> too_noisy
       less than 30 ms of audio               -> too_short
       too little speech                      -> silent
       speech too short for the reference     -> too_short   (only when a reference duration is given)
       speech ratio below the floor           -> too_noisy

KNOWN LIMITS (documented on purpose, to be fixed in week 3 with Silero VAD and an SNR estimate):
  * Speech detection is an absolute RMS threshold. Steady background noise counts as speech, so noise
    alone can come back `ok`. `too_noisy` from the speech ratio really means "mostly silence or very quiet".
  * All thresholds are starting values (taxonomy and audio doc, marked as proposals). They are tuned
    against the `poor_audio` labels in weeks 2-3.

Callers map AudioProcessingError.code to an API error. The report (GateReport.to_log_dict) is meant for
the per-request log; it never contains audio, names or transcripts (NFR-OBS-001).
"""

import io
import math
import sys
import wave
from array import array
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from app.schemas import Quality

# ---------------------------------------------------------------------------
# Target format (what quran-muaalem and whisper-quran need: 16 kHz mono waveform)
# ---------------------------------------------------------------------------
TARGET_SAMPLE_RATE = 16000
TARGET_CHANNELS = 1  # mono
TARGET_SAMPLE_WIDTH = 2  # bytes per sample: 16-bit PCM

# ---------------------------------------------------------------------------
# Gate thresholds (starting values, to be tuned against the poor_audio labels)
# ---------------------------------------------------------------------------
FRAME_SECONDS = 0.03  # analysis window for the energy check
MIN_RMS_ENERGY = 200.0  # frame RMS (16-bit scale) at or above this counts as speech
MIN_SPEECH_SECONDS = 0.3  # less speech than this -> silent
MIN_SPEECH_VS_REFERENCE = 0.40  # speech shorter than 40% of the reference ayah -> too_short
MIN_SPEECH_RATIO = 0.30  # speech frames / all frames below this -> too_noisy
CLIPPING_SAMPLE_THRESHOLD = 32000  # |sample| at or above this counts as clipped (16-bit max is 32767)
MAX_CLIPPING_RATIO = 0.01  # more than 1% clipped samples -> too_noisy
MAX_AUDIO_SECONDS = 30.0  # early guard (audio doc A.3 proposal, open item 1): longer raises AudioTooLongError


@dataclass(frozen=True)
class GateThresholds:
    """All gate thresholds in one place, so tests and week 3 tuning can pass their own values."""

    frame_seconds: float = FRAME_SECONDS
    min_rms_energy: float = MIN_RMS_ENERGY
    min_speech_seconds: float = MIN_SPEECH_SECONDS
    min_speech_vs_reference: float = MIN_SPEECH_VS_REFERENCE
    min_speech_ratio: float = MIN_SPEECH_RATIO
    clipping_sample_threshold: int = CLIPPING_SAMPLE_THRESHOLD
    max_clipping_ratio: float = MAX_CLIPPING_RATIO
    max_audio_seconds: float = MAX_AUDIO_SECONDS


DEFAULT_THRESHOLDS = GateThresholds()


# ---------------------------------------------------------------------------
# Errors: one class per failure, each with a stable `code` the caller can map to an API error
# ---------------------------------------------------------------------------
class AudioProcessingError(Exception):
    """Base class. Raised when the audio cannot be checked at all (not a quality result)."""

    code = "AUDIO_PROCESSING_ERROR"


class InvalidWavError(AudioProcessingError):
    code = "INVALID_WAV"


class UnsupportedWavFormatError(AudioProcessingError):
    """Base class for a valid WAV that is not 16 kHz, mono, 16-bit PCM."""

    code = "UNSUPPORTED_WAV_FORMAT"


class UnsupportedSampleRateError(UnsupportedWavFormatError):
    code = "UNSUPPORTED_SAMPLE_RATE"


class UnsupportedChannelsError(UnsupportedWavFormatError):
    code = "UNSUPPORTED_CHANNELS"


class UnsupportedSampleWidthError(UnsupportedWavFormatError):
    code = "UNSUPPORTED_SAMPLE_WIDTH"


class TruncatedAudioError(AudioProcessingError):
    """The header promises more audio than the file holds."""

    code = "AUDIO_TRUNCATED"


class AudioTooLongError(AudioProcessingError):
    code = "AUDIO_TOO_LONG"


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class GateReport:
    """Everything the gate measured. `quality` is one of the four contract values."""

    quality: Quality
    duration_seconds: float
    speech_seconds: float
    speech_ratio: float  # speech frames / all frames, over the whole clip
    clipped_ratio: float  # clipped samples / all samples
    rms: float  # RMS of the whole clip, 16-bit scale
    reference_seconds: Optional[float] = None
    # False means the "too short for the reference" check could not run (no reference duration given)
    reference_available: bool = False

    def to_log_dict(self) -> Dict[str, Any]:
        """JSON-safe fields for the per-request log (audio doc A.4). No audio, no names."""
        return {
            "quality": self.quality,
            "durationSeconds": round(self.duration_seconds, 3),
            "speechSeconds": round(self.speech_seconds, 3),
            "speechRatio": round(self.speech_ratio, 3),
            "clippedRatio": round(self.clipped_ratio, 4),
            "rms": round(self.rms, 1),
            "referenceSeconds": self.reference_seconds,
            "referenceAvailable": self.reference_available,
        }


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
def _read_header(wav_file) -> Tuple[int, int, int, int]:
    return (
        wav_file.getframerate(),
        wav_file.getnchannels(),
        wav_file.getsampwidth(),
        wav_file.getnframes(),
    )


def _open_wav(audio_bytes: bytes):
    try:
        return wave.open(io.BytesIO(audio_bytes), "rb")
    except Exception as exc:  # wave.Error, EOFError, struct.error on broken chunks
        raise InvalidWavError(f"Invalid WAV container: {exc}") from exc


def inspect_wav_header(audio_bytes: bytes) -> Tuple[int, int, int, int]:
    """
    Parses the RIFF/WAV header only. Does not check the format.
    Returns: (sample_rate, channels, sample_width, total_frames)
    """
    with _open_wav(audio_bytes) as wav_file:
        return _read_header(wav_file)


def validate_target_format(sample_rate: int, channels: int, sample_width: int) -> None:
    """Raises a specific error unless the audio is 16 kHz, mono, 16-bit PCM."""
    if sample_rate != TARGET_SAMPLE_RATE:
        raise UnsupportedSampleRateError(f"Expected {TARGET_SAMPLE_RATE} Hz, got {sample_rate} Hz")
    if channels != TARGET_CHANNELS:
        raise UnsupportedChannelsError(f"Expected {TARGET_CHANNELS} channel (mono), got {channels}")
    if sample_width != TARGET_SAMPLE_WIDTH:
        raise UnsupportedSampleWidthError(
            f"Expected {TARGET_SAMPLE_WIDTH * 8}-bit PCM, got {sample_width * 8}-bit"
        )


# ---------------------------------------------------------------------------
# Gate
# ---------------------------------------------------------------------------
def analyze_audio(
    audio_bytes: bytes,
    reference_duration_ms: Optional[int] = None,
    thresholds: GateThresholds = DEFAULT_THRESHOLDS,
) -> GateReport:
    """
    Checks one WAV and returns everything it measured.
    reference_duration_ms: length of the reference recitation of this ayah. None or 0 means unknown,
    and then the "too short for the reference" check is skipped (report.reference_available is False).
    Raises AudioProcessingError subclasses for broken, wrong-format, truncated or too long audio.
    """
    t = thresholds
    reference_seconds = (
        reference_duration_ms / 1000.0 if reference_duration_ms and reference_duration_ms > 0 else None
    )

    with _open_wav(audio_bytes) as wav_file:
        sample_rate, channels, sample_width, total_frames = _read_header(wav_file)
        validate_target_format(sample_rate, channels, sample_width)

        duration_seconds = total_frames / float(sample_rate)
        if duration_seconds > t.max_audio_seconds:  # from the header: nothing is read yet
            raise AudioTooLongError(
                f"Audio is {duration_seconds:.1f} s, the limit is {t.max_audio_seconds:.1f} s"
            )

        try:
            raw_frames = wav_file.readframes(total_frames)
        except Exception as exc:
            raise TruncatedAudioError(f"Could not read the WAV data: {exc}") from exc

    expected_bytes = total_frames * channels * sample_width
    if len(raw_frames) < expected_bytes:
        raise TruncatedAudioError(
            f"WAV data is shorter than its header says: expected {expected_bytes} bytes, got {len(raw_frames)}"
        )

    reference_available = reference_seconds is not None
    if total_frames == 0:
        return GateReport("too_short", 0.0, 0.0, 0.0, 0.0, 0.0, reference_seconds, reference_available)

    # 16-bit samples in a compact array (2 bytes each) instead of one Python int object per sample
    samples = array("h")
    samples.frombytes(raw_frames)
    if sys.byteorder == "big":
        samples.byteswap()

    # Clipping
    limit = t.clipping_sample_threshold
    clipped = sum(1 for s in samples if s >= limit or s <= -limit)
    clipped_ratio = clipped / float(total_frames)

    # Frame energy (an approximate VAD, see KNOWN LIMITS)
    frame_size = int(sample_rate * t.frame_seconds)
    total_chunks = total_frames // frame_size
    active_frames = 0
    total_square_sum = 0
    for i in range(total_chunks):
        chunk = samples[i * frame_size : (i + 1) * frame_size]
        square_sum = sum(s * s for s in chunk)
        total_square_sum += square_sum
        if math.sqrt(square_sum / frame_size) >= t.min_rms_energy:
            active_frames += 1
    total_square_sum += sum(s * s for s in samples[total_chunks * frame_size :])  # tail shorter than a frame

    rms = math.sqrt(total_square_sum / total_frames)
    speech_seconds = (active_frames * frame_size) / float(sample_rate)
    speech_ratio = active_frames / float(total_chunks) if total_chunks else 0.0

    quality: Quality
    if clipped_ratio > t.max_clipping_ratio:
        quality = "too_noisy"
    elif total_chunks == 0:
        quality = "too_short"
    elif speech_seconds < t.min_speech_seconds:
        quality = "silent"
    elif reference_seconds is not None and speech_seconds < t.min_speech_vs_reference * reference_seconds:
        quality = "too_short"
    elif speech_ratio < t.min_speech_ratio:
        quality = "too_noisy"
    else:
        quality = "ok"

    return GateReport(
        quality=quality,
        duration_seconds=duration_seconds,
        speech_seconds=speech_seconds,
        speech_ratio=speech_ratio,
        clipped_ratio=clipped_ratio,
        rms=rms,
        reference_seconds=reference_seconds,
        reference_available=reference_available,
    )


def evaluate_quality_gate(
    audio_bytes: bytes,
    reference_duration_ms: Optional[int] = None,
    thresholds: GateThresholds = DEFAULT_THRESHOLDS,
) -> Tuple[Quality, float]:
    """
    Kept for existing callers and tests: returns (quality, speech_ratio rounded to 2 decimals).
    Use analyze_audio() when you need the other measurements for the log.
    """
    report = analyze_audio(audio_bytes, reference_duration_ms, thresholds)
    return report.quality, round(report.speech_ratio, 2)
