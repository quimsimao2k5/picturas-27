"""Runs a whole video pipeline through the three video services, for the tests.

In production the projects orchestrator splits the pipeline into stages
(`videoStages` in projects/utils/video.js) and sends one stage at a time to the
service that owns it. This helper reproduces that chaining in-process, calling
each service's `run_stage` with the same message parameters, so the tests that
used to call the single video worker keep checking the same end-to-end
behaviour (order of stages, preview cut, no partial outputs).

`video_stages` mirrors the split rules of videoStages; projects/tests checks
the JavaScript side against the same examples (video-stages.test.js).
"""
from pathlib import Path
import tempfile

import effects_service
import frames_service
import subtitles_service
from frame_extraction import InvalidExtraction
from video_common.media import probe, stage_progress  # noqa: F401 (probe re-exported)

SERVICES = {
    "video_effects": effects_service,
    "video_subtitles": subtitles_service,
    "video_frames": frames_service,
}
TEMPORAL = {"trim", "speed"}


def _edit_stages(tools, preview):
    if not any(t.get("procedure") == "subtitles" for t in tools):
        return [{"service": "video_effects", "tools": list(tools), "previewCut": preview}]
    stages, pending = [], []
    for tool in tools:
        if tool.get("procedure") == "subtitles":
            # an effects stage first normalizes the input to MP4/H.264
            if pending or not stages:
                stages.append({"service": "video_effects", "tools": pending})
                pending = []
            stages.append({"service": "video_subtitles", "tools": [tool]})
        else:
            pending.append(tool)
    if pending:
        stages.append({"service": "video_effects", "tools": pending})
    # a preview is cut in the last effects stage with trim/speed (or the first)
    cut = max((i for i, s in enumerate(stages) if s["service"] == "video_effects"
               and any(t.get("procedure") in TEMPORAL for t in s["tools"])), default=0)
    for i, stage in enumerate(stages):
        if stage["service"] == "video_effects":
            stage["previewCut"] = preview and i == cut
    return stages


def video_stages(tools, preview=False):
    extractors = [i for i, t in enumerate(tools) if t.get("procedure") == "extract_frames"]
    if extractors and extractors != [len(tools) - 1]:
        # projects rejects these pipelines before dispatching anything
        raise InvalidExtraction("Frame extraction must appear once, at the end of the pipeline")
    if not extractors:
        return _edit_stages(tools, preview)
    # sampling spans the complete edited timeline, including in preview
    stages = _edit_stages(tools[:-1], False) if len(tools) > 1 else []
    return stages + [{"service": "video_frames", "tools": [tools[-1]]}]


def process_video(input_path, output_path, tools, progress_cb=None, preview=False):
    stages = video_stages(tools, preview)
    target = Path(output_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="stages-", dir=target.parent) as work:
        current = input_path
        for index, stage in enumerate(stages):
            last = index == len(stages) - 1
            out = str(target) if last else str(Path(work) / f"stage-{index}.mp4")
            params = {
                "inputImageURI": current, "outputImageURI": out,
                "tools": stage["tools"], "preview": preview,
                "previewCut": stage.get("previewCut", False),
                "stage": index, "stages": len(stages),
            }
            report = stage_progress(index, len(stages), progress_cb)
            if report and index > 0:
                report(0)  # the worker does the same at the start of a later stage
            result = SERVICES[stage["service"]].run_stage(params, report)
            current = out
    return result
