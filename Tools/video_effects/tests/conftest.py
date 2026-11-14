import os
import sys

HERE = os.path.dirname(__file__)
# service code (../) and video_common (../ in the image, ../../ in the repository)
for rel in ("../..", ".."):
    path = os.path.abspath(os.path.join(HERE, rel))
    if path not in sys.path:
        sys.path.insert(0, path)

from video_common.testing import sample_video, silent_video  # noqa: E402,F401 (fixtures)
