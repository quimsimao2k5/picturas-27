"""video_frames service: still-frame extraction stage (always the last one).

Consumes video_frames_queue. When extraction is the only tool, the stage reads
the user's original directly (no transcoding) and uses the video stream
duration, so a longer audio track cannot create out-of-range sample times.
After other stages, it reads the edited video they produced.
"""
from frame_extraction import InvalidExtraction, extract_frames
from video_common.media import probe
from video_common.worker import StageWorker

QUEUE = "video_frames_queue"
PROCEDURE = "video_frames"
MICROSERVICE = "picturas-video-frames-ms"


def run_stage(params, progress_cb):
    tools = params.get("tools") or []
    if [t.get("procedure") for t in tools] != ["extract_frames"]:
        raise InvalidExtraction("Frame extraction must appear once, at the end of the pipeline")
    source = params["inputImageURI"]
    from_original = int(params.get("stage", 0)) == 0
    return extract_frames(source, params["outputImageURI"],
                          probe(source, prefer_video_duration=from_original),
                          tools[0].get("params", {}), progress_cb or (lambda _: None),
                          preview=bool(params.get("preview")))


def worker():
    return StageWorker(QUEUE, PROCEDURE, MICROSERVICE, run_stage)


if __name__ == "__main__":
    worker().run()
