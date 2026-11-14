"""Caption file generation (no FFmpeg, no speech model)."""
from types import SimpleNamespace

import pytest

import subtitles


def test_captions_clamp_times_and_remove_markup(tmp_path):
    p = tmp_path / "captions.srt"
    segments = [SimpleNamespace(start=-1, end=5, text="Hello {\\an8}<b> world\n\nagain"),
                SimpleNamespace(start=5, end=7, text="outside")]
    assert subtitles.write_captions(segments, p, 4, lambda _: None) == 1
    text = p.read_text()
    assert "00:00:00,000 --> 00:00:04,000" in text
    assert "{" not in text and "<" not in text and "outside" not in text


@pytest.mark.parametrize("start,end", [(float("nan"), 1), (0, float("inf"))])
def test_invalid_recognition_timestamps_are_rejected(tmp_path, start, end):
    segment = SimpleNamespace(start=start, end=end, text="Hello")
    with pytest.raises(ValueError, match="invalid timestamps"):
        subtitles.write_captions([segment], tmp_path / "captions.srt", 4, lambda _: None)
