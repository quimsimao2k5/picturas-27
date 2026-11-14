"""video_effects service: frame and time effects stage of a video pipeline.

Consumes video_effects_queue. Each message is one effects stage: the effects
that come one after another in the user's pipeline (brightness, contrast,
trim, speed, ...), applied in one decode and one encode.
"""
from effects import UnsupportedEffect
from video_common.worker import CODES, StageWorker
from video_processor import InvalidSpeed, InvalidTrim, process_video

QUEUE = "video_effects_queue"
PROCEDURE = "video_effects"
MICROSERVICE = "picturas-video-effects-ms"


def run_stage(params, progress_cb):
    # previewCut: this is the stage where a preview is cut to its first seconds
    # (the last effects stage with trim/speed); earlier stages keep the whole video.
    preview = bool(params.get("preview"))
    cut = bool(params.get("previewCut", preview))
    return process_video(params["inputImageURI"], params["outputImageURI"],
                         params.get("tools") or [], progress_cb, preview=cut)


def worker():
    return StageWorker(QUEUE, PROCEDURE, MICROSERVICE, run_stage, [
        (UnsupportedEffect, CODES["unsupported_effect"]),
        (InvalidTrim, CODES["invalid_trim"]),
        (InvalidSpeed, CODES["invalid_speed"]),
    ])


if __name__ == "__main__":
    worker().run()
