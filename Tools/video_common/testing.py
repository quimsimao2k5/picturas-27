"""Test fixtures shared by the video services (imported by each tests/conftest.py)."""
import subprocess

import pytest


def make_video(path, seconds=4, size="320x240", fps=25, audio=True, vcodec="libx264"):
    cmd = ["ffmpeg", "-y", "-v", "error",
           "-f", "lavfi", "-i", f"testsrc=size={size}:rate={fps}:duration={seconds}"]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}",
                "-c:a", "aac"]
    cmd += ["-c:v", vcodec, "-pix_fmt", "yuv420p", "-shortest", path]
    subprocess.run(cmd, check=True)
    return path


@pytest.fixture
def sample_video(tmp_path):
    """Test video: 4 s, 320x240, 25 fps, with audio."""
    return make_video(str(tmp_path / "sample.mp4"))


@pytest.fixture
def silent_video(tmp_path):
    return make_video(str(tmp_path / "silent.mov"), seconds=2, audio=False)
