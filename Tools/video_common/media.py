"""Video characteristics (ffprobe) and the errors shared by the video services."""
import json
import os
import subprocess
from fractions import Fraction


class InvalidVideo(Exception):
    """File is not a readable video (corrupted, no video stream, ...)."""


class ProcessingError(Exception):
    """ffmpeg failure while decoding or encoding."""


def probe(path: str, prefer_video_duration: bool = False) -> dict:
    """Reads the video characteristics with ffprobe."""
    cmd = [
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise InvalidVideo(f"Unreadable video file: {res.stderr.strip()[:200]}")

    data = json.loads(res.stdout or "{}")
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if video is None:
        raise InvalidVideo("The file has no video stream")

    fmt = data.get("format", {})
    duration = float(
        (video.get("duration") if prefer_video_duration else None)
        or fmt.get("duration") or video.get("duration") or 0
    )
    if duration <= 0:
        raise InvalidVideo("Could not determine the video duration")

    fps_str = video.get("avg_frame_rate") or video.get("r_frame_rate") or "0/1"
    try:
        fps = float(Fraction(fps_str))
    except (ZeroDivisionError, ValueError):
        fps = 0.0
    if fps <= 0:
        fps_str, fps = "25/1", 25.0

    return {
        "duration": duration,
        "width": int(video["width"]),
        "height": int(video["height"]),
        "fps": fps,
        "fps_str": fps_str,
        "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name") if audio else None,
        "has_audio": audio is not None,
        "format_name": fmt.get("format_name"),
        "size_bytes": int(fmt.get("size") or os.path.getsize(path)),
    }


def stage_progress(stage: int, stages: int, callback):
    """Maps the progress of one stage (0-100) to the progress of the whole pipeline.

    The user sees a single bar: (stage + pct/100) * 100 / stages. Only the end of
    the last stage reports 100, which is when the video counts as done.
    """
    if not callback:
        return None
    stages = max(1, int(stages))
    stage = min(max(0, int(stage)), stages - 1)

    def report(percent):
        if stage == stages - 1 and percent >= 100:
            callback(100)
        else:
            callback(min(99, int((stage + percent / 100) * 100 / stages)))

    return report
