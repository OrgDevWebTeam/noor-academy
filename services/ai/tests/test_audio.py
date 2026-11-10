"""
Unit tests for audio format checks and the quality gate.
Owner: Ismail (AI 2). Aligned with KAN-27.

The first six tests are the original ones. The rest pin every threshold from both sides, the specific
errors, and the report, so changing a constant in app/audio.py fails a test.
"""

import io
import json
import math
import struct
import wave

import pytest

from app.audio import (
    CLIPPING_SAMPLE_THRESHOLD,
    MAX_AUDIO_SECONDS,
    TARGET_SAMPLE_RATE,
    AudioProcessingError,
    AudioTooLongError,
    GateThresholds,
    InvalidWavError,
    TruncatedAudioError,
    UnsupportedChannelsError,
    UnsupportedSampleRateError,
    UnsupportedSampleWidthError,
    UnsupportedWavFormatError,
    analyze_audio,
    evaluate_quality_gate,
    inspect_wav_header,
)


# ---------------------------------------------------------------- helpers
def build_wav(raw_pcm: bytes, sample_rate: int = TARGET_SAMPLE_RATE, channels: int = 1, width: int = 2) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(width)
        wav.setframerate(sample_rate)
        wav.writeframes(raw_pcm)
    return buf.getvalue()


def pcm16(samples) -> bytes:
    return struct.pack(f"<{len(samples)}h", *samples)


def tone(duration_s: float, amplitude: float = 5000.0, sample_rate: int = TARGET_SAMPLE_RATE):
    return [int(amplitude * math.sin(2 * math.pi * 220 * i / sample_rate)) for i in range(int(duration_s * sample_rate))]


def silence(duration_s: float, sample_rate: int = TARGET_SAMPLE_RATE):
    return [0] * int(duration_s * sample_rate)


def clip_with_speech(speech_s: float, total_s: float, amplitude: float = 5000.0) -> bytes:
    """`speech_s` of tone, then silence, `total_s` long in all."""
    return build_wav(pcm16(tone(speech_s, amplitude) + silence(total_s - speech_s)))


def create_synthetic_wav(
    duration_s: float,
    amplitude: float = 8000.0,
    sample_rate: int = TARGET_SAMPLE_RATE,
    clipping: bool = False,
) -> bytes:
    """Generates an in-memory 16-bit PCM Mono WAV buffer for testing."""
    num_samples = int(duration_s * sample_rate)
    samples = []
    for i in range(num_samples):
        if clipping and (i % 50 == 0):
            val = 32767
        elif amplitude == 0:
            val = 0
        else:
            val = int(amplitude * math.sin(2 * math.pi * 440 * (i / sample_rate)))
        samples.append(val)
    return build_wav(pcm16(samples), sample_rate)


# ---------------------------------------------------------------- original tests
def test_inspect_wav_header_success():
    wav_bytes = create_synthetic_wav(duration_s=1.0)
    sr, channels, width, frames = inspect_wav_header(wav_bytes)

    assert sr == 16000
    assert channels == 1
    assert width == 2
    assert frames == 16000


def test_inspect_wav_header_invalid_format():
    with pytest.raises(AudioProcessingError):
        inspect_wav_header(b"NOT_A_WAV_FILE_HEADER")


def test_quality_gate_silent():
    wav_bytes = create_synthetic_wav(duration_s=2.0, amplitude=0)
    quality, ratio = evaluate_quality_gate(wav_bytes)

    assert quality == "silent"
    assert ratio == 0.0


def test_quality_gate_too_noisy_clipping():
    wav_bytes = create_synthetic_wav(duration_s=2.0, amplitude=8000, clipping=True)
    quality, _ = evaluate_quality_gate(wav_bytes)

    assert quality == "too_noisy"


def test_quality_gate_too_short_against_reference():
    wav_bytes = create_synthetic_wav(duration_s=0.5, amplitude=6000)
    quality, _ = evaluate_quality_gate(wav_bytes, reference_duration_ms=4000)

    assert quality == "too_short"


def test_quality_gate_valid_recitation():
    wav_bytes = create_synthetic_wav(duration_s=3.0, amplitude=5000)
    quality, ratio = evaluate_quality_gate(wav_bytes, reference_duration_ms=3000)

    assert quality == "ok"
    # The gate has no 0.70 rule (its floor is 0.30). Only check the value is a valid ratio.
    assert 0.0 < ratio <= 1.0


# ---------------------------------------------------------------- format and header errors
def test_wrong_sample_rate_raises_specific_error():
    wav_bytes = build_wav(pcm16(tone(1.0, sample_rate=44100)), sample_rate=44100)
    with pytest.raises(UnsupportedSampleRateError) as info:
        analyze_audio(wav_bytes)
    assert info.value.code == "UNSUPPORTED_SAMPLE_RATE"
    assert "44100" in str(info.value)


def test_stereo_raises_specific_error():
    wav_bytes = build_wav(pcm16(tone(1.0) * 2), channels=2)
    with pytest.raises(UnsupportedChannelsError) as info:
        analyze_audio(wav_bytes)
    assert info.value.code == "UNSUPPORTED_CHANNELS"


def test_8_bit_raises_specific_error():
    wav_bytes = build_wav(bytes([128]) * 16000, width=1)
    with pytest.raises(UnsupportedSampleWidthError) as info:
        analyze_audio(wav_bytes)
    assert info.value.code == "UNSUPPORTED_SAMPLE_WIDTH"


def test_format_errors_share_one_base_class():
    wav_bytes = build_wav(pcm16(tone(1.0, sample_rate=8000)), sample_rate=8000)
    with pytest.raises(UnsupportedWavFormatError):
        analyze_audio(wav_bytes)


def test_non_wav_bytes_raise_invalid_wav():
    # What a browser upload (WebM/Opus) looks like to this module until the ffmpeg step exists
    with pytest.raises(InvalidWavError) as info:
        analyze_audio(b"\x1aE\xdf\xa3" + bytes(2000))
    assert info.value.code == "INVALID_WAV"


def test_truncated_wav_raises_truncated_error():
    good = build_wav(pcm16(tone(2.0)))
    with pytest.raises(TruncatedAudioError) as info:
        analyze_audio(good[:20000])
    assert info.value.code == "AUDIO_TRUNCATED"


# ---------------------------------------------------------------- duration guard
def test_default_duration_limit_is_30_seconds():
    assert MAX_AUDIO_SECONDS == 30.0


def test_duration_limit_boundary_uses_header_only():
    limit = GateThresholds(max_audio_seconds=2.0)
    assert analyze_audio(clip_with_speech(2.0, 2.0), thresholds=limit).quality == "ok"
    with pytest.raises(AudioTooLongError) as info:
        analyze_audio(clip_with_speech(2.05, 2.05), thresholds=limit)
    assert info.value.code == "AUDIO_TOO_LONG"


def test_too_long_is_an_error_never_a_quality():
    # Contract v3.0 has no `too_long`, and the cap must not be reported as noise
    wav_bytes = build_wav(pcm16(tone(31.0)))
    with pytest.raises(AudioTooLongError):
        evaluate_quality_gate(wav_bytes)


# ---------------------------------------------------------------- thresholds, both sides
def test_silent_boundary_0_3_seconds_of_speech():
    assert analyze_audio(clip_with_speech(0.27, 0.47)).quality == "silent"
    assert analyze_audio(clip_with_speech(0.30, 0.50)).quality == "ok"


def test_energy_threshold_separates_quiet_from_speech():
    assert analyze_audio(clip_with_speech(1.0, 1.0, amplitude=200)).quality == "silent"  # RMS about 141
    assert analyze_audio(clip_with_speech(1.0, 1.0, amplitude=400)).quality == "ok"  # RMS about 283


def test_speech_ratio_floor_0_30():
    # 2 s clip: 0.45 s of speech is ratio 0.225, 0.65 s is ratio 0.325 (both above the 0.3 s silence limit)
    low = analyze_audio(clip_with_speech(0.45, 2.0))
    high = analyze_audio(clip_with_speech(0.65, 2.0))
    assert (low.quality, high.quality) == ("too_noisy", "ok")


def test_reference_length_boundary_40_percent():
    # Reference 2000 ms: the limit is 0.8 s of speech
    short = analyze_audio(clip_with_speech(0.75, 0.85), reference_duration_ms=2000)
    enough = analyze_audio(clip_with_speech(0.85, 0.95), reference_duration_ms=2000)
    assert (short.quality, enough.quality) == ("too_short", "ok")


def test_clipping_ratio_boundary_1_percent():
    def with_clipped(n_clipped, value=32767):
        samples = tone(1.0)  # 16000 samples
        for k in range(n_clipped):
            samples[k * 90] = value
        return build_wav(pcm16(samples))

    assert analyze_audio(with_clipped(144)).quality == "ok"  # 0.9%
    assert analyze_audio(with_clipped(160)).quality == "ok"  # exactly 1.0% is allowed
    assert analyze_audio(with_clipped(176)).quality == "too_noisy"  # 1.1%


def test_clipping_sample_threshold_edge():
    assert CLIPPING_SAMPLE_THRESHOLD == 32000  # pinned on purpose: the values below are literals

    def with_level(value):
        samples = tone(1.0)
        for k in range(320):  # 2% of the samples
            samples[k * 50] = value
        return build_wav(pcm16(samples))

    assert analyze_audio(with_level(31999)).quality == "ok"
    assert analyze_audio(with_level(32000)).quality == "too_noisy"
    assert analyze_audio(with_level(-32000)).quality == "too_noisy"  # negative peaks too


# ---------------------------------------------------------------- empty and tiny audio, precedence
def test_zero_frame_wav_is_too_short():
    report = analyze_audio(build_wav(b""))
    assert report.quality == "too_short"
    assert (report.duration_seconds, report.speech_ratio) == (0.0, 0.0)


def test_audio_shorter_than_one_frame_is_too_short():
    assert analyze_audio(build_wav(pcm16(tone(0.01)))).quality == "too_short"  # 10 ms


def test_clipping_wins_over_silent():
    # 2 s clip: 352 clipped samples (1.1%) packed into the first 9 frames, so speech is only 0.27 s (silent)
    samples = silence(2.0)
    for k in range(352):
        samples[k * 12] = 32767
    report = analyze_audio(build_wav(pcm16(samples)))
    assert report.speech_seconds < 0.3 and report.clipped_ratio > 0.01
    assert report.quality == "too_noisy"


def test_silent_wins_over_reference_length():
    report = analyze_audio(clip_with_speech(0.1, 1.0), reference_duration_ms=5000)
    assert report.quality == "silent"


# ---------------------------------------------------------------- report
def test_report_measurements():
    report = analyze_audio(build_wav(pcm16(tone(3.0, amplitude=5000))), reference_duration_ms=3000)
    assert report.quality == "ok"
    assert report.duration_seconds == 3.0
    assert report.speech_seconds > 2.9
    assert report.speech_ratio > 0.97
    assert report.clipped_ratio == 0.0
    assert abs(report.rms - 5000 / math.sqrt(2)) < 50
    assert report.reference_available is True and report.reference_seconds == 3.0


def test_report_flags_missing_reference():
    without = analyze_audio(build_wav(pcm16(tone(2.0))))
    assert without.reference_available is False and without.reference_seconds is None
    assert analyze_audio(build_wav(pcm16(tone(2.0))), reference_duration_ms=0).reference_available is False


def test_report_log_dict_is_json_safe_and_has_no_audio():
    log = analyze_audio(build_wav(pcm16(tone(1.0)))).to_log_dict()
    json.dumps(log)  # must not raise
    assert set(log) == {
        "quality", "durationSeconds", "speechSeconds", "speechRatio",
        "clippedRatio", "rms", "referenceSeconds", "referenceAvailable",
    }


def test_wrapper_matches_report():
    wav_bytes = clip_with_speech(0.65, 2.0)
    report = analyze_audio(wav_bytes)
    assert evaluate_quality_gate(wav_bytes) == (report.quality, round(report.speech_ratio, 2))
