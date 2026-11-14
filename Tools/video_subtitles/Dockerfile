# video_subtitles: speech recognition and burned-in captions stage
FROM python:3.11-slim

# ffmpeg/ffprobe isolated in the container
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-noto-core fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./utils ./utils
RUN pip install --no-cache-dir -r ./utils/requirements.txt
COPY ./video_subtitles/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ./video_common ./video_common
COPY ./video_subtitles .

CMD [ "python", "-u", "subtitles_service.py" ]
