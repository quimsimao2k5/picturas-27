"""video_subtitles service: speech recognition and burned-in captions stage.

Consumes video_subtitles_queue. Each message is one captions stage. The input
is always the MP4 produced by the previous stage (an effects stage normalizes
the original first), so captions never read the user's original directly.
"""
import os
from pathlib import Path
import uuid

from subtitles import caption_video
from video_common.media import probe
from video_common.worker import StageWorker

QUEUE = "video_subtitles_queue"
PROCEDURE = "video_subtitles"
MICROSERVICE = "picturas-video-subtitles-ms"


def run_stage(params, progress_cb):
    tools = params.get("tools") or []
    if [t.get("procedure") for t in tools] != ["subtitles"]:
        raise ValueError("A captions stage takes exactly one subtitles tool")
    source, output = params["inputImageURI"], params["outputImageURI"]
    # Render next to the output and publish it only when complete, so a failed
    # stage never leaves a partial video where the result is expected.
    target = Path(output).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.parent / f"{target.stem}.part-{uuid.uuid4().hex}.mp4"
    try:
        caption_video(source, str(partial), probe(source), progress_cb or (lambda _: None))
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)
    result = probe(output)
    result["frames"] = round(result["duration"] * result["fps"])
    return result


def worker():
    return StageWorker(QUEUE, PROCEDURE, MICROSERVICE, run_stage)


if __name__ == "__main__":
    worker().run()
