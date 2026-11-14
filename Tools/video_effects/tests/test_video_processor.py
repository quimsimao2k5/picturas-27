"""Automated tests for the video worker.

Each test documents the behaviour it verifies.
"""
import hashlib
import os
import subprocess

import pytest
from PIL import Image, ImageStat

from effects import UnsupportedEffect
from video_processor import (InvalidSpeed, InvalidTrim, InvalidVideo, PREVIEW_SECONDS,
                             atempo_chain, probe, process_video, resolve_trim)


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def frame_at(path, t, tmp_path):
    out = str(tmp_path / f"frame_{t}.png")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", path,
                    "-frames:v", "1", out], check=True)
    return Image.open(out).convert("RGB")


def mean(img):
    return sum(ImageStat.Stat(img).mean) / 3


# Characteristics read on upload
def test_probe_reads_characteristics(sample_video):
    info = probe(sample_video)
    assert info["width"] == 320 and info["height"] == 240
    assert info["duration"] == pytest.approx(4, abs=0.1)
    assert info["fps"] == pytest.approx(25)
    assert info["video_codec"] == "h264"
    assert info["has_audio"] is True


# A file that is not a video is rejected
def test_probe_rejects_non_video(tmp_path):
    bad = tmp_path / "fake.mp4"
    bad.write_bytes(b"this is not a video")
    with pytest.raises(InvalidVideo):
        probe(str(bad))


# The pipeline is applied to the whole video, in order
def test_sequence_applied_in_order(sample_video, tmp_path):
    out = str(tmp_path / "out.mp4")
    tools = [
        {"procedure": "rotate", "params": {"degrees": 90}},
        {"procedure": "resize", "params": {"width": 200, "height": 100}},
    ]
    info = process_video(sample_video, out, tools)
    # rotate then resize => 200x100; in reverse order it would be 100x200
    assert (info["width"], info["height"]) == (200, 100)
    assert info["duration"] == pytest.approx(4, abs=0.15)


# The image effect really changes the frames
def test_brightness_changes_frames(sample_video, tmp_path):
    out = str(tmp_path / "dark.mp4")
    process_video(sample_video, out, [{"procedure": "brightness", "params": {"brightness": 0.3}}])
    before = mean(frame_at(sample_video, 2, tmp_path))
    after = mean(frame_at(out, 2, tmp_path))
    assert after < before * 0.5


# The original is left unchanged
def test_original_unchanged(sample_video, tmp_path):
    h = sha(sample_video)
    process_video(sample_video, str(tmp_path / "o.mp4"),
                  [{"procedure": "contrast", "params": {"contrastFactor": 1.5}}])
    assert sha(sample_video) == h


# Audio kept, MP4/H.264 output
def test_audio_kept_and_output_is_h264(sample_video, tmp_path):
    out = str(tmp_path / "a.mp4")
    info = process_video(sample_video, out, [{"procedure": "saturation", "params": {"saturationFactor": 0}}])
    assert info["video_codec"] == "h264"
    assert info["has_audio"] and info["audio_codec"] == "aac"
    assert "mp4" in info["format_name"]


# MOV input without audio is also accepted
def test_mov_without_audio(silent_video, tmp_path):
    out = str(tmp_path / "s.mp4")
    info = process_video(silent_video, out, [{"procedure": "binarization", "params": {"threshold": 128}}])
    assert info["has_audio"] is False
    assert info["duration"] == pytest.approx(2, abs=0.15)


# Trim cuts picture and audio on the same window
def test_trim_cuts_video_and_audio(sample_video, tmp_path):
    out = str(tmp_path / "t.mp4")
    info = process_video(sample_video, out, [{"procedure": "trim", "params": {"start": 1, "end": 2.5}}])
    assert info["duration"] == pytest.approx(1.5, abs=0.15)
    assert info["has_audio"]


# Successive trims compose into one window, each relative to the previous result
def test_successive_trims_compose():
    tools = [{"procedure": "trim", "params": {"start": 1, "end": 4}},
             {"procedure": "trim", "params": {"start": 0.5, "end": 2}}]
    assert resolve_trim(tools, 4.0) == (1.5, 3.0)


# An invalid trim is rejected without producing output
@pytest.mark.parametrize("params", [
    {"start": 2, "end": 1},      # end before start
    {"start": 1, "end": 1},      # empty window
    {"start": 5, "end": 6},      # outside the duration
    {"start": -1, "end": 2},     # negative start
    {"start": 0, "end": "x"},    # not numeric
])
def test_invalid_trim_rejected(sample_video, tmp_path, params):
    out = str(tmp_path / "bad.mp4")
    with pytest.raises(InvalidTrim):
        process_video(sample_video, out, [{"procedure": "trim", "params": params}])
    assert not os.path.exists(out)


# An effect that makes no sense for video is rejected
def test_unsupported_effect_rejected(sample_video, tmp_path):
    out = str(tmp_path / "x.mp4")
    with pytest.raises(UnsupportedEffect):
        process_video(sample_video, out, [{"procedure": "obj_ai", "params": {}}])
    assert not os.path.exists(out)


# A failure midway leaves no partial output
def test_failure_leaves_no_partial_output(sample_video, tmp_path):
    out = str(tmp_path / "f.mp4")
    calls = {"n": 0}

    def boom(pct):
        calls["n"] += 1
        if calls["n"] == 3:
            raise RuntimeError("injected failure")

    with pytest.raises(RuntimeError):
        process_video(sample_video, out, [{"procedure": "brightness", "params": {"brightness": 1.2}}],
                      progress_cb=boom)
    assert not os.path.exists(out)
    assert not os.path.exists(out + ".part.mp4")


# Progress increases up to 100 %
def test_progress_reported(sample_video, tmp_path):
    seen = []
    process_video(sample_video, str(tmp_path / "p.mp4"),
                  [{"procedure": "brightness", "params": {"brightness": 1.1}}],
                  progress_cb=seen.append)
    assert seen == sorted(seen)
    assert seen[-1] == 100 and len(seen) > 5


# Preview of the initial excerpt only
def test_preview_limited_excerpt(sample_video, tmp_path):
    h = sha(sample_video)
    info = process_video(sample_video, str(tmp_path / "pv.mp4"),
                         [{"procedure": "rotate", "params": {"degrees": 180}}], preview=True)
    assert info["duration"] == pytest.approx(min(PREVIEW_SECONDS, 4), abs=0.15)
    assert sha(sample_video) == h


# 2x halves the duration and keeps the audio in sync
def test_speed_up(sample_video, tmp_path):
    info = process_video(sample_video, str(tmp_path / "fast.mp4"),
                         [{"procedure": "speed", "params": {"factor": 2}}])
    assert info["duration"] == pytest.approx(2, abs=0.15)
    assert info["has_audio"]
    assert info["fps"] == pytest.approx(25)


# 0.5x doubles the duration
def test_slow_down(silent_video, tmp_path):
    info = process_video(silent_video, str(tmp_path / "slow.mp4"),
                         [{"procedure": "speed", "params": {"factor": 0.5}}])
    assert info["duration"] == pytest.approx(4, abs=0.15)


# Extreme factors 0.25x and 5x keep the audio
@pytest.mark.parametrize("factor,expected", [(0.25, 16), (5, 0.8)])
def test_speed_limits(sample_video, tmp_path, factor, expected):
    info = process_video(sample_video, str(tmp_path / f"s{factor}.mp4"),
                         [{"procedure": "speed", "params": {"factor": factor}}])
    assert info["duration"] == pytest.approx(expected, abs=0.2)
    assert info["has_audio"]


# Factors outside [0.25, 5] are rejected without output
@pytest.mark.parametrize("factor", [0.1, 6, "fast", None])
def test_invalid_speed_rejected(sample_video, tmp_path, factor):
    out = str(tmp_path / "bad.mp4")
    with pytest.raises(InvalidSpeed):
        process_video(sample_video, out, [{"procedure": "speed", "params": {"factor": factor}}])
    assert not os.path.exists(out)


# Trim refers to the original video, then speed is applied
def test_trim_then_speed(sample_video, tmp_path):
    info = process_video(sample_video, str(tmp_path / "ts.mp4"),
                         [{"procedure": "trim", "params": {"start": 0, "end": 4}},
                          {"procedure": "speed", "params": {"factor": 2}}])
    assert info["duration"] == pytest.approx(2, abs=0.15)


# The audio tempo chain stays within ffmpeg's [0.5, 2] per stage
def test_atempo_chain():
    for factor in (0.25, 0.5, 1.5, 2, 5):
        stages = [float(x.split("=")[1]) for x in atempo_chain(factor).split(",")]
        assert all(0.5 <= s <= 2.0 for s in stages)
        prod = 1.0
        for s in stages:
            prod *= s
        assert prod == pytest.approx(factor)


# The same input and sequence give the same frames
def test_edit_is_reproducible(sample_video, tmp_path):
    tools = [{"procedure": "brightness", "params": {"brightness": 1.2}},
             {"procedure": "speed", "params": {"factor": 2}}]

    def frames(path):
        out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:v",
                              "-f", "framemd5", "-"], check=True, capture_output=True, text=True)
        return [line for line in out.stdout.splitlines() if not line.startswith("#")]

    a = str(tmp_path / "a.mp4")
    b = str(tmp_path / "b.mp4")
    process_video(sample_video, a, tools)
    process_video(sample_video, b, tools)
    assert frames(a) and frames(a) == frames(b)
