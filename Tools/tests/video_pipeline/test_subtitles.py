"""Media tests use fake recognition, but real FFmpeg and pipeline execution."""
from types import SimpleNamespace
from pathlib import Path
import hashlib
import subprocess

import pytest
from PIL import Image, ImageChops

import subtitles
from pipeline import process_video, probe

CAPTIONS = [{"procedure": "subtitles", "params": {}}]


class Recognizer:
    def transcribe(self, path, **options):
        assert options["language"] is None
        assert options["task"] == "transcribe"
        return iter([SimpleNamespace(start=0.2, end=1.8, text="Hello from PictuRAS")]), None


def test_no_audio_does_not_load_model(silent_video, tmp_path, monkeypatch):
    monkeypatch.setattr(subtitles, "speech_model", lambda: pytest.fail("model not needed"))
    out = tmp_path / "out.mp4"
    before = Path(silent_video).read_bytes()
    process_video(silent_video, str(out), CAPTIONS)
    assert Path(silent_video).read_bytes() == before
    assert probe(str(out))["video_codec"] == "h264"
    assert not probe(str(out))["has_audio"]


def test_caption_rendering_preserves_audio_and_original(sample_video, tmp_path, monkeypatch):
    monkeypatch.setattr(subtitles, "speech_model", Recognizer)
    before = hashlib.sha256(Path(sample_video).read_bytes()).hexdigest()
    out = tmp_path / "out.mp4"
    progress = []
    result = process_video(sample_video, str(out), CAPTIONS, progress.append)
    assert result["has_audio"]
    assert result["duration"] == pytest.approx(4, abs=0.15)
    assert progress[-1] == 100 and progress == sorted(progress)
    assert before == hashlib.sha256(Path(sample_video).read_bytes()).hexdigest()
    # Captions alter the bottom of the frame where there is no other effect.
    for src, name in [(sample_video, "before.png"), (str(out), "after.png")]:
        subprocess.run(["ffmpeg", "-v", "error", "-ss", "1", "-i", src,
                        "-frames:v", "1", str(tmp_path / name)], check=True)
    a = Image.open(tmp_path / "before.png").convert("RGB").crop((20, 190, 300, 230))
    b = Image.open(tmp_path / "after.png").convert("RGB").crop((20, 190, 300, 230))
    assert sum(ImageChops.difference(a, b).convert("L").getdata()) / (280 * 40) > 3
    assert not list(tmp_path.glob("captions-*"))


def test_order_and_preview(sample_video, tmp_path, monkeypatch):
    seen = []
    class RecordingRecognizer(Recognizer):
        def transcribe(self, path, **options):
            seen.append(probe(path)["duration"])
            return super().transcribe(path, **options)
    monkeypatch.setattr(subtitles, "speech_model", RecordingRecognizer)
    trim = {"procedure": "trim", "params": {"start": 0, "end": 2}}
    speed = {"procedure": "speed", "params": {"factor": 2}}
    out = str(tmp_path / "order.mp4")
    result = process_video(sample_video, out, [trim, *CAPTIONS, speed])
    assert seen[0] == pytest.approx(2, abs=0.15)
    assert result["duration"] == pytest.approx(1, abs=0.15)
    process_video(sample_video, out, CAPTIONS, preview=True)
    assert seen[1] == pytest.approx(3, abs=0.15)


def test_no_speech_is_noop(sample_video, tmp_path, monkeypatch):
    monkeypatch.setattr(subtitles, "speech_model", lambda: SimpleNamespace(transcribe=lambda *a, **k: (iter([]), None)))
    out = tmp_path / "out.mp4"
    process_video(sample_video, str(out), CAPTIONS)
    assert probe(str(out))["has_audio"]
    assert probe(str(out))["duration"] == pytest.approx(4, abs=0.15)


def test_model_failure_does_not_publish_partial_output(sample_video, tmp_path, monkeypatch):
    def fail():
        raise RuntimeError("model unavailable")
    monkeypatch.setattr(subtitles, "speech_model", fail)
    out = tmp_path / "out.mp4"
    with pytest.raises(RuntimeError, match="model unavailable"):
        process_video(sample_video, str(out), CAPTIONS)
    assert not out.exists()
    assert not list(tmp_path.glob("captions-*"))


@pytest.mark.parametrize("following,expected_duration", [
    ({"procedure": "trim", "params": {"start": 3, "end": 4}}, 1),
    ({"procedure": "speed", "params": {"factor": 0.5}}, 3),
    ({"procedure": "speed", "params": {"factor": 2}}, 2),
])


def test_preview_after_temporal_edit(sample_video, tmp_path, monkeypatch,
                                     following, expected_duration):
    """Preview must keep source frames needed by edits after the captions."""
    seen = []

    class RecordingRecognizer(Recognizer):
        def transcribe(self, path, **options):
            seen.append(probe(path)["duration"])
            return super().transcribe(path, **options)

    monkeypatch.setattr(subtitles, "speech_model", RecordingRecognizer)
    out = str(tmp_path / "preview.mp4")
    result = process_video(sample_video, out, [*CAPTIONS, following, *CAPTIONS],
                           preview=True)
    assert seen[0] == pytest.approx(4, abs=0.15)
    assert seen[1] == pytest.approx(expected_duration, abs=0.15)
    assert result["duration"] == pytest.approx(expected_duration, abs=0.15)


def test_encoder_failure_preserves_previous_output(sample_video, tmp_path, monkeypatch):
    monkeypatch.setattr(subtitles, "speech_model", Recognizer)
    original_run = subprocess.run

    def fail_caption_encoder(cmd, **kwargs):
        if "-vf" in cmd and "subtitles=" in cmd[cmd.index("-vf") + 1]:
            Path(cmd[-1]).write_bytes(b"partial output")
            return SimpleNamespace(returncode=1, stderr="encoder failed")
        return original_run(cmd, **kwargs)

    monkeypatch.setattr(subtitles.subprocess, "run", fail_caption_encoder)
    out = tmp_path / "out.mp4"
    out.write_bytes(b"previous successful output")
    with pytest.raises(RuntimeError, match="encoder failed"):
        process_video(sample_video, str(out), CAPTIONS)
    assert out.read_bytes() == b"previous successful output"
    assert not list(tmp_path.glob("captions-*"))
