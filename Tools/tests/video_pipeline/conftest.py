import os
import sys

HERE = os.path.dirname(__file__)
# the three video services, video_common (Tools/) and the pipeline helper
for rel in ("../..", "../../video_effects", "../../video_subtitles", "../../video_frames", "."):
    path = os.path.abspath(os.path.join(HERE, rel))
    if path not in sys.path:
        sys.path.insert(0, path)

from video_common.testing import sample_video, silent_video  # noqa: E402,F401 (fixtures)
