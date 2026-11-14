"""Stage worker: replies, error codes and pipeline progress, without RabbitMQ."""
import json

import pytest

from video_common.media import InvalidVideo, stage_progress
from video_common.worker import CODES, StageWorker


class InvalidThing(Exception):
    pass


def message(procedure="video_effects", stage=0, stages=1, preview=False, user="u1"):
    return json.dumps({
        "messageId": "request-1",
        "procedure": procedure,
        "parameters": {
            "inputImageURI": "in.mp4", "outputImageURI": "out.mp4",
            "tools": [{"procedure": "brightness", "params": {}}],
            "preview": preview, "stage": stage, "stages": stages,
            "progress": {"user": user, "projectId": "p1", "imgId": "i1"},
        },
    }).encode()


def worker(run_stage, codes=()):
    w = StageWorker("video_effects_queue", "video_effects", "test-ms", run_stage, codes)
    w.published = []
    w._publish = lambda queue, msg: w.published.append((queue, msg))
    return w


def percents(w):
    return [m["percent"] for q, m in w.published if q == "ws_queue"]


@pytest.mark.parametrize("stage,stages,steps,expected", [
    (0, 1, [0, 50, 99, 100], [0, 50, 99, 100]),
    (0, 2, [0, 50, 100], [0, 25, 50]),
    (1, 2, [0, 50, 100], [50, 75, 100]),
    (1, 3, [100], [66]),
])
def test_stage_progress_is_a_share_of_the_whole_pipeline(stage, stages, steps, expected):
    seen = []
    report = stage_progress(stage, stages, seen.append)
    for pct in steps:
        report(pct)
    assert seen == expected


def test_success_reply_keeps_the_single_worker_format(capsys):
    w = worker(lambda params, cb: {"frames": 75, "duration": 3.0})
    reply = w.handle(message())
    assert reply["correlationId"] == "request-1" and reply["status"] == "success"
    assert reply["output"] == {"type": "video", "imageURI": "out.mp4"}
    assert reply["metadata"]["microservice"] == "test-ms"
    out = capsys.readouterr().out
    assert "[video] msg=request-1 preview=False tools=['brightness']" in out
    assert "[video] msg=request-1 ok frames=75 t=" in out


def test_frames_and_preview_image_outputs():
    frames = [{"file": "d/frame-0001.png", "time": 0}]
    w = worker(lambda p, cb: {"frames": frames, "output_type": "frames", "output_path": "d"})
    assert w.handle(message("video_effects"))["output"] == {
        "type": "frames", "imageURI": "d", "frames": frames}
    w = worker(lambda p, cb: {"frames": 6, "output_type": "image", "output_path": "sheet.png"})
    assert w.handle(message())["output"] == {"type": "image", "imageURI": "sheet.png"}


def test_errors_map_to_the_existing_codes():
    def fail(error):
        def run(params, cb):
            raise error
        return run
    w = worker(fail(InvalidThing("bad trim")), [(InvalidThing, CODES["invalid_trim"])])
    reply = w.handle(message())
    assert reply["status"] == "error"
    assert reply["error"]["code"] == 2003 and reply["error"]["msg"] == "bad trim"
    assert worker(fail(InvalidVideo("x"))).handle(message())["error"]["code"] == 2004
    assert worker(fail(RuntimeError("x"))).handle(message())["error"]["code"] == 2001


def test_wrong_procedure_is_rejected_without_processing():
    w = worker(lambda p, cb: pytest.fail("must not run"))
    assert w.handle(message("video_frames"))["error"]["code"] == CODES["wrong_procedure"]


def test_invalid_message_is_discarded():
    assert worker(lambda p, cb: None).handle(b"not json") is None


def test_intermediate_stage_never_reports_completion():
    def run(params, cb):
        for pct in (10, 99, 100):
            cb(pct)
        return {"frames": 1}
    w = worker(run)
    w.handle(message(stage=0, stages=2))
    assert percents(w) == [5, 49, 50]
    w = worker(run)
    w.handle(message(stage=1, stages=2, preview=True))
    assert percents(w) == [50, 55, 99, 100]
    assert all(m["preview"] is True and m["imgId"] == "i1" for q, m in w.published)


def test_progress_needs_a_user():
    w = worker(lambda p, cb: (cb(50), {"frames": 1})[1])
    w.handle(message(user=None))
    assert w.published == []
