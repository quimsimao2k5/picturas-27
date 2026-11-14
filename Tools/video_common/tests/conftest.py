import os
import sys

# video_common's parent (Tools/ in the repository, /app in the images)
PARENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PARENT not in sys.path:
    sys.path.insert(0, PARENT)
