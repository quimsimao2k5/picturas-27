# video_frames: still-frame extraction stage
FROM python:3.11-slim

# ffmpeg/ffprobe isolated in the container
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./utils ./utils
RUN pip install --no-cache-dir -r ./utils/requirements.txt
COPY ./video_frames/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ./video_common ./video_common
COPY ./video_frames .

CMD [ "python", "-u", "frames_service.py" ]
