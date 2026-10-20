FROM node:20

# ffprobe (FFmpeg) is used to validate integrity, container, codecs,
# duration and resolution of uploaded videos (UC-VID-002, steps 6-7).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 11002
CMD ["npm", "start"]
