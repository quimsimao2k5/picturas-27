"""Frame extraction exercises actual FFmpeg outputs without a speech model."""
from pathlib import Path
import hashlib

import pytest
from PIL import Image

import frame_extraction
from frame_extraction import InvalidExtraction
from pipeline import process_video


def tool(**params):
    return {"procedure": "extract_frames", "params": params}


@pytest.mark.parametrize("fmt,extension", [("png", ".png"), ("jpeg", ".jpg")])
def test_count_images_and_original_preserved(sample_video, tmp_path, fmt, extension):
    source_hash = hashlib.sha256(Path(sample_video).read_bytes()).hexdigest()
    progress = []
    result = process_video(sample_video, str(tmp_path / "result.mp4"),
                           [tool(count=4, format=fmt)], progress.append)
    assert result["output_type"] == "frames"
    assert [f["time"] for f in result["frames"]] == pytest.approx([0, 1, 2, 3], abs=0.05)
    for frame in result["frames"]:
        path = Path(frame["file"])
        assert path.parent == Path(result["output_path"])
        assert path.suffix == extension
        with Image.open(path) as image:
            assert image.size == (320, 240)
            assert image.format == ("PNG" if fmt == "png" else "JPEG")
    assert len({f["file"] for f in result["frames"]}) == 4
    assert hashlib.sha256(Path(sample_video).read_bytes()).hexdigest() == source_hash
    assert progress[-1] == 100 and progress == sorted(progress)
    assert not list(tmp_path.glob("extract-*"))
    assert not list(tmp_path.glob("frame-source-*"))


def test_interval_sampling(sample_video, tmp_path):
    result = process_video(sample_video, str(tmp_path / "result.mp4"),
                           [tool(mode="interval", interval=1.5)])
    assert [f["time"] for f in result["frames"]] == pytest.approx([0, 1.5, 3])


def test_preview_contact_sheet_uses_full_edited_timeline(sample_video, tmp_path, monkeypatch):
    sampled = []
    real_run = frame_extraction.subprocess.run

    def record(cmd, **kwargs):
        if "-frames:v" in cmd:
            sampled.append(float(cmd[cmd.index("-ss") + 1]))
        return real_run(cmd, **kwargs)

    monkeypatch.setattr(frame_extraction.subprocess, "run", record)
    speed = {"procedure": "speed", "params": {"factor": 0.5}}
    result = process_video(sample_video, str(tmp_path / "preview.mp4"),
                           [speed, tool(count=12)], preview=True)
    assert result["output_type"] == "image"
    assert result["duration"] == pytest.approx(8, abs=0.15)
    assert result["frames"] == 6
    assert len(sampled) == 6 and sampled[-1] > 7
    with Image.open(result["output_path"]) as sheet:
        assert sheet.format == "PNG"
        assert sheet.size == (1152, 480)
    assert not Path(tmp_path / "preview.mp4").exists()


def test_preceding_effects_apply_to_every_frame(sample_video, tmp_path):
    resize = {"procedure": "resize", "params": {"width": 80, "height": 60}}
    trim = {"procedure": "trim", "params": {"start": 1, "end": 3}}
    result = process_video(sample_video, str(tmp_path / "result.mp4"),
                           [trim, resize, tool(count=2)])
    assert result["duration"] == pytest.approx(2, abs=0.15)
    assert [f["time"] for f in result["frames"]] == pytest.approx([0, 1], abs=0.05)
    for frame in result["frames"]:
        with Image.open(frame["file"]) as image:
            assert image.size == (80, 60)


@pytest.mark.parametrize("tools", [[tool(), {"procedure": "rotate"}], [tool(), tool()]])
def test_extraction_must_be_terminal_once(sample_video, tmp_path, tools):
    with pytest.raises(InvalidExtraction, match="once"):
        process_video(sample_video, str(tmp_path / "result.mp4"), tools)


def test_extractor_failure_leaves_previous_output(sample_video, tmp_path, monkeypatch):
    target = tmp_path / "result.mp4"
    target.write_bytes(b"previous output")
    real_run = frame_extraction.subprocess.run

    def fail(cmd, **kwargs):
        if "-frames:v" in cmd:
            Path(cmd[-1]).write_bytes(b"partial")
            raise RuntimeError("frame encoder failed")
        return real_run(cmd, **kwargs)

    monkeypatch.setattr(frame_extraction.subprocess, "run", fail)
    with pytest.raises(RuntimeError, match="frame encoder failed"):
        process_video(sample_video, str(target), [tool()])
    assert target.read_bytes() == b"previous output"
    assert not list(tmp_path.glob("extract-*"))
    assert not list(tmp_path.glob("frame-source-*"))
    assert not list(tmp_path.glob("result-frames-*"))


def test_extraction_does_not_load_speech_model(silent_video, tmp_path, monkeypatch):
    import subtitles
    monkeypatch.setattr(subtitles, "speech_model", lambda: pytest.fail("no captions requested"))
    result = process_video(silent_video, str(tmp_path / "result.mp4"), [tool(count=1)])
    assert len(result["frames"]) == 1


def test_captions_run_before_extraction(sample_video, tmp_path, monkeypatch):
    from types import SimpleNamespace
    import subtitles
    seen = []

    def transcribe(path, **kwargs):
        seen.append(path)
        return iter([SimpleNamespace(start=0, end=3, text="Frame captions")]), None

    monkeypatch.setattr(subtitles, "speech_model", lambda: SimpleNamespace(transcribe=transcribe))
    result = process_video(sample_video, str(tmp_path / "result.mp4"),
                           [{"procedure": "subtitles"}, tool(count=2)])
    assert len(seen) == 1
    assert result["output_type"] == "frames" and len(result["frames"]) == 2


@pytest.mark.parametrize("fmt", ["png", "jpeg"])
def test_extraction_only_seeks_original_without_transcoding(silent_video, tmp_path, monkeypatch, fmt):
    import video_processor
    monkeypatch.setattr(video_processor, "_process_video",
                        lambda *a, **k: pytest.fail("extraction-only must not transcode"))
    result = process_video(silent_video, str(tmp_path / "result.mp4"),
                           [tool(count=100, format=fmt)])
    assert result["output_type"] == "frames"
    assert len(result["frames"]) == 100
    assert result["frames"][-1]["time"] < result["duration"]
    for frame in result["frames"]:
        with Image.open(frame["file"]) as image:
            assert image.format == ("PNG" if fmt == "png" else "JPEG")
    assert not list(tmp_path.glob("frame-source-*"))


def test_extraction_uses_video_duration_when_audio_is_longer(sample_video, tmp_path):
    import subprocess
    source = tmp_path / "long-audio.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-i", sample_video,
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
                    str(source)], check=True)
    result = process_video(str(source), str(tmp_path / "result.mp4"), [tool(count=4)])
    assert result["duration"] == pytest.approx(4, abs=0.1)
    assert [frame["time"] for frame in result["frames"]] == pytest.approx([0, 1, 2, 3], abs=0.05)
