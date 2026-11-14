"""Stage split used by the tests; projects/tests/video-stages.test.js checks the same cases."""
import pytest

from pipeline import video_stages

B = {"procedure": "brightness", "params": {"brightness": 0.5}}
C = {"procedure": "contrast", "params": {"contrastFactor": 1.2}}
T = {"procedure": "trim", "params": {"start": 0, "end": 2}}
S = {"procedure": "speed", "params": {"factor": 2}}
SUB = {"procedure": "subtitles", "params": {}}
X = {"procedure": "extract_frames", "params": {"mode": "count", "count": 3, "format": "png"}}


def shape(stages):
    return [(s["service"].split("_")[1], [t["procedure"] for t in s["tools"]], s.get("previewCut"))
            for s in stages]


@pytest.mark.parametrize("tools,preview,expected", [
    ([B], False, [("effects", ["brightness"], False)]),
    ([B], True, [("effects", ["brightness"], True)]),
    ([T, B, SUB], False, [("effects", ["trim", "brightness"], False), ("subtitles", ["subtitles"], None)]),
    ([SUB, C], True, [("effects", [], True), ("subtitles", ["subtitles"], None),
                      ("effects", ["contrast"], False)]),
    ([SUB, S, SUB], True, [("effects", [], False), ("subtitles", ["subtitles"], None),
                           ("effects", ["speed"], True), ("subtitles", ["subtitles"], None)]),
    ([B, X], True, [("effects", ["brightness"], False), ("frames", ["extract_frames"], None)]),
    ([X], True, [("frames", ["extract_frames"], None)]),
    ([SUB, X], False, [("effects", [], False), ("subtitles", ["subtitles"], None),
                       ("frames", ["extract_frames"], None)]),
    ([], False, [("effects", [], False)]),
])
def test_split_into_stages(tools, preview, expected):
    assert shape(video_stages(tools, preview)) == expected
