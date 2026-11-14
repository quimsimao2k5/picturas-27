"""Bounded still-frame extraction and a small preview contact sheet."""
import math
import os
from pathlib import Path
import subprocess
import tempfile
import uuid

from PIL import Image, ImageDraw

MAX_FRAMES = 100


class InvalidExtraction(ValueError):
    """Invalid frame extraction parameters or an excessive output count."""


def validate_params(params):
    if not isinstance(params, dict):
        raise InvalidExtraction("Frame extraction requires parameters")
    mode = params.get("mode", "count")
    fmt = params.get("format", "png")
    if mode not in ("count", "interval") or fmt not in ("png", "jpeg"):
        raise InvalidExtraction("Choose count/interval and PNG/JPEG")
    value = params.get("count", 6) if mode == "count" else params.get("interval", 2)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise InvalidExtraction("Frame count or interval must be a finite number")
    if mode == "count" and (value != int(value) or not 1 <= value <= MAX_FRAMES):
        raise InvalidExtraction("Frame count must be an integer between 1 and 100")
    if mode == "interval" and value <= 0:
        raise InvalidExtraction("Frame interval must be greater than zero")
    return mode, value, fmt


def sampling_times(params, duration, fps):
    mode, value, fmt = validate_params(params)
    if mode == "count":
        times = [i * duration / int(value) for i in range(int(value))]
    else:
        # Avoid allocating huge lists for very small, otherwise valid intervals.
        times = [i * value for i in range(MAX_FRAMES + 1) if i * value < duration]
        if len(times) > MAX_FRAMES:
            raise InvalidExtraction("Interval would produce more than 100 frames; increase it")
    # CFR-normalized videos may contain fewer frames than the requested count.
    # Repeating the final frame is preferable to seeking beyond its last timestamp.
    last_frame = max(0, duration - 1 / fps)
    return [min(t, last_frame) for t in times], fmt


def extract_frames(input_path, output_path, info, params, progress, preview=False):
    times, fmt = sampling_times(params, info["duration"], info["fps"])
    if preview and len(times) > 6:
        times = [times[round(i * (len(times) - 1) / 5)] for i in range(6)]
    parent = Path(output_path).resolve().parent
    parent.mkdir(parents=True, exist_ok=True)
    # Every successful render gets its own directory. A failed retry cannot
    # overwrite a previous generation that the storage service still needs.
    destination = parent / f"{Path(output_path).stem}-frames-{uuid.uuid4().hex}"
    with tempfile.TemporaryDirectory(prefix="extract-", dir=parent) as work:
        work = Path(work)
        frames_dir = work / "frames"
        frames_dir.mkdir()
        records = []
        sheet = Image.new("RGB", (384 * min(3, len(times)), 240 * math.ceil(len(times) / 3)), "#181818") if preview else None
        for index, timestamp in enumerate(times):
            extension = "png" if preview or fmt == "png" else "jpg"
            name = f"frame-{index + 1:04d}-{round(timestamp * 1000):09d}ms.{extension}"
            path = frames_dir / name
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{timestamp:.9f}",
                   "-i", str(Path(input_path).resolve()), "-map", "0:v:0", "-an", "-frames:v", "1"]
            if extension == "jpg":
                cmd += ["-q:v", "2"]
            cmd += [str(path)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if result.returncode or not path.is_file() or not path.stat().st_size:
                raise RuntimeError(f"Could not extract frame {index + 1}: {result.stderr[-500:]}")
            if preview:
                with Image.open(path) as frame:
                    frame = frame.convert("RGB")
                    frame.thumbnail((384, 216))
                    x, y = (index % 3) * 384, (index // 3) * 240
                    sheet.paste(frame, (x + (384 - frame.width) // 2, y + (216 - frame.height) // 2))
                    ImageDraw.Draw(sheet).text((x + 8, y + 220), f"{timestamp:.3f} s", fill="white")
            records.append({"file": str(destination / name), "time": timestamp})
            progress(min(99, round((index + 1) * 99 / len(times))))
        if preview:
            preview_path = parent / f"{Path(output_path).stem}-contact-{uuid.uuid4().hex}.png"
            sheet.save(work / "contact.png", format="PNG")
            os.replace(work / "contact.png", preview_path)
            output = {"output_type": "image", "output_path": str(preview_path),
                      "frames": len(times), "width": sheet.width, "height": sheet.height}
        else:
            os.replace(frames_dir, destination)
            output = {"output_type": "frames", "output_path": str(destination), "frames": records,
                      "width": info["width"], "height": info["height"]}
    progress(100)
    return {**info, **output}
