"""Local speech recognition and burned-in captions, inspired by PL2-G5.

The model is loaded once per worker, lazily, and cached on a Docker volume.
No speech/audio is a successful no-op; model or encoder failures are errors.
"""
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from functools import lru_cache


@lru_cache(maxsize=1)
def speech_model():
    from faster_whisper import WhisperModel
    return WhisperModel(
        os.getenv("WHISPER_MODEL", "small"), device="cpu", compute_type="int8",
        cpu_threads=int(os.getenv("WHISPER_CPU_THREADS", "2")),
        download_root=os.getenv("WHISPER_CACHE_DIR", "/models/whisper"),
    )


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def write_captions(segments, path, duration, progress):
    """Bound timestamps and strip markup so recognition cannot inject ASS styles."""
    count = 0
    with open(path, "w", encoding="utf-8") as captions:
        for segment in segments:
            if not math.isfinite(segment.start) or not math.isfinite(segment.end):
                raise ValueError("Speech recognition returned invalid timestamps")
            start, end = max(0, segment.start), min(duration, segment.end)
            text = " ".join(segment.text.split())
            for char in "<>{}\\":
                text = text.replace(char, "")
            if not text or end <= start:
                continue
            count += 1
            captions.write(f"{count}\n{timestamp(start)} --> {timestamp(end)}\n{text}\n\n")
            progress(min(80, int(end / duration * 80)))
    return count


def caption_video(input_path, output_path, info, progress):
    if not info["has_audio"]:
        shutil.copyfile(input_path, output_path)
        progress(100)
        return

    with tempfile.TemporaryDirectory(prefix="speech-", dir=Path(output_path).parent) as work:
        # Detect input language; transcribe, never silently translate it.
        segments, _ = speech_model().transcribe(
            input_path, task="transcribe", language=None, beam_size=5,
            vad_filter=True, condition_on_previous_text=False,
        )
        captions = Path(work) / "captions.srt"
        if not write_captions(segments, captions, info["duration"], progress):
            shutil.copyfile(input_path, output_path)
            progress(100)
            return

        # Fixed relative filename avoids FFmpeg filter escaping of user paths.
        cmd = [
            "ffmpeg", "-y", "-v", "error", "-i", str(Path(input_path).resolve()),
            "-map", "0:v:0", "-map", "0:a:0?",
            "-vf", "subtitles=captions.srt:force_style='FontName=DejaVu Sans,FontSize=20,Outline=1,MarginV=16'",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart",
            str(Path(output_path).resolve()),
        ]
        result = subprocess.run(cmd, cwd=work, capture_output=True, text=True, timeout=1800)
        if result.returncode:
            raise RuntimeError(f"Could not render subtitles: {result.stderr[-500:]}")
        progress(100)
