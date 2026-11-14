# AGENTS.md

Guidance for AI coding agents (and humans) working on this repository. `README.md` is the
user-facing documentation; this file is the short version an agent needs before changing code.

## What the app is

PictuRAS is a web editor for images and videos, built as Docker Compose microservices. Users
create **projects**, add media (images and videos), build an ordered **pipeline** of effects,
and apply it to every media item of the project in one batch. The pipeline belongs to the project, not to each item.

Profiles: **anonymous** (images only, limited), **free** (`FREE_DAILY_OP` = 5 operations per day)
and **premium** (unlimited). `subscriptions` means paid plans/billing, not event subscriptions.

## Architecture

All traffic enters through nginx at `https://localhost:8080`:

| Path            | Target                                                       |
| --------------- | ------------------------------------------------------------ |
| `/`             | `frontend/`: Next.js 15 + React 19 + TypeScript (bun)        |
| `/api-gateway/` | `apiGateway/`: Express; checks the JWT and forwards requests |
| `/socket.io`    | `wsGateway/`: Socket.IO; pushes `ws_queue` events to the UI  |
| `/s3/`          | SeaweedFS (S3-compatible object storage)                     |

Behind the gateway:

- `users/`: accounts, login (JWT), profiles and the daily operations quota (MongoDB).
- `projects/`: orchestrator. Owns projects, media, pipelines and processing (MongoDB).
- `subscriptions/`: plans and mock payments (MongoDB).
- `imageStorageService/`: S3 façade with the stages `src`, `out`, `preview`, `preview_cache`.
- `Tools/<tool>/`: one Python microservice per effect, consuming `<tool>_queue` on the
  `picturas` direct exchange (RabbitMQ) and reading/writing the shared `image_data` volume.
  - Image tools (PIL): `binarization`, `border`, `brightness`, `contrast`, `cut`, `resize`,
    `rotate`, `saturation`; `watermark` runs from a pre-built public image.
  - AI tools: `bg_remove_ai`, `cut_ai`, `expand_ai` (uses `generative-mock/`), `obj_ai`,
    `people_ai`, `text_ai`, `upgrade_ai`.
  - `Tools/utils/`: shared RabbitMQ, image I/O and message helpers.
  - Video services, one per kind of stage, see below: `Tools/video_effects/`
    (`video_effects`), `Tools/video_subtitles/` (`video_subtitles`), `Tools/video_frames/`
    (`video_frames`); shared stage worker, ffprobe and errors in `Tools/video_common/`.
- `autoscaler/`: adjusts the replicas of the video services to their queue sizes.
- `rabbitMQ/definitions.json`: queues, exchange and bindings.
- `docker-compose.yaml`: the single source of truth for services and configuration.

### Processing flow

- **Images**: `projects` sends one message per (image, tool) step and advances the chain when
  the tool replies on `project_queue`. Progress goes to the browser through `ws_queue`.
- **Videos**: `projects` splits each video's pipeline into stages (`videoStages` in
  `projects/utils/video.js`) and chains them like image tools: it sends stage 0 and, when a
  stage replies on `project_queue`, the next one (`Process.video_job` keeps the stages, the
  work directory and the final output). Consecutive frame/time effects form one stage of
  `video_effects` (`video_effects_queue`: decodes once, applies the frame effects of
  `Tools/video_effects/effects.py`, same PIL operations as the image tools, encodes once to
  MP4/H.264 + AAC keeping the audio); each `subtitles` is a stage of `video_subtitles`;
  `extract_frames` is the last stage, in `video_frames`. Intermediate files live in a
  `video-stages-<uuid>` directory next to the final output on `image_data` and are removed
  when the job ends, fails or is cancelled; only the last stage stores a Result and notifies
  the user. Each service reports `video-progress` on `ws_queue` as a share of the whole
  pipeline, acks only at the end and leaves no partial output on failure. Preview mode
  renders only the first `VIDEO_PREVIEW_SECONDS` (3 s), cut in the last effects stage with
  `trim`/`speed` (`previewCut`).
- **Replicas**: the `autoscaler` polls the RabbitMQ management API every 2 s and keeps one
  replica per message (waiting + unacked) per video service, within env-configured limits
  (effects 1–3, subtitles 1–2, frames 1–2), scaling down after 30 s, idle clones first, with
  SIGTERM (the worker finishes its job). It clones the Compose container through
  `/var/run/docker.sock` with the same Compose labels.

### Media types

- Images are uploaded to `POST /:user/:project/img`, videos to `POST /:user/:project/video`;
  each endpoint rejects the other kind. Videos are stored with `media_type: "video"`.
- Video validation (container, codec, duration, size, resolution) and the orchestrator's video
  logic live in `projects/utils/video.js`. Limits are env vars of `projects`
  (`VIDEO_FREE_*`, `VIDEO_PREMIUM_*`): free 60 s / 100 MB, premium 600 s / 1 GB.
- `trim` (`start`/`end` in seconds) and `speed` (`factor` 0.25–5) are video-only and apply to
  one video (`params.imgId`); every other effect applies to all media. Images skip video-only
  tools. Each effect on a video counts as one operation.
- `subtitles` is video-only and project-wide (no `imgId`): Faster-Whisper CPU/int8
  detects the spoken language and burns captions into the MP4. No audio/speech is a no-op.
  It runs as its own stage in `video_subtitles` (an empty effects stage first normalizes
  the input when it comes first); contiguous ordinary effects still share one
  decode/encode pass. Models persist in `whisper_models`.
- `extract_frames` is video-only and project-wide, terminal and unique. It runs in
  `video_frames` (alone, it reads the original without transcoding): count (1–100) or
  interval, PNG/JPEG, max100 images per video. Full output
  is a frame manifest; preview is a contact sheet across the edited timeline. The
  orchestrator saves each frame as a separate image Result with the source `img_id`
  and unique result ID/name. Register all batch Process records before dispatch.
- In projects with videos the frontend hides image-only tools (AI, watermark) and PDF export.

## Running and testing

```bash
docker compose up -d --build                 # first build: 15-30 min, ~15 GB disk, 8+ GB RAM
docker compose up -d --build <service>       # rebuild one service after a change
docker compose restart nginx                 # after rebuilding the frontend (avoids 502)
docker compose logs -f <service>
docker compose down [-v]                     # stop (-v also wipes all data)
```

Replacing an older (e.g. Phase 1) checkout: it shares the Compose project name `picturas` and
its volumes, whose S3 layout (one bucket per user) is incompatible. Run
`docker compose down -v --remove-orphans` once before the first `up`.

Video service tests run on the host (needs ffmpeg/ffprobe on the PATH, no Docker), one folder
at a time:

```bash
cd Tools && python3 -m venv .venv && .venv/bin/pip install -r video_common/requirements-dev.txt
for t in video_effects/tests video_subtitles/tests video_frames/tests video_common/tests tests/video_pipeline; do .venv/bin/python -m pytest -q "$t"; done
```

`Tools/tests/video_pipeline/pipeline.py` chains the three services in-process with the same
split as `videoStages`; keep both in sync (`projects/tests/video-stages.test.js` has the same
cases).

- Open `https://localhost:8080` (https, port 8080) and accept the self-signed certificate.
- `users`, `subscriptions` and `apiGateway` bind-mount their source and reload with nodemon.
  The frontend is a production build and Python tools have no bind mount: rebuild them.
- RabbitMQ management: `http://localhost:15672` (`user` / `password`).
- Sample videos for manual tests: `samples/video/` (see its README).

## Conventions

- Code, comments, identifiers and user-facing messages in English.
- Extend the existing design instead of rewriting it; change base behaviour only when needed.
- Small commits with descriptive subjects (under 72 characters).
- Keep each file's existing line endings: some files are stored with CRLF. Do not reformat
  unrelated code.
- Never commit secrets, `.env`, `node_modules/`, generated media or `backups/`.
- To add a tool: create `Tools/<tool>/` from a simple tool (e.g. `border`), register its queue in
  `rabbitMQ/definitions.json`, add the service to `docker-compose.yaml`
  (`depends_on: rabbitmq: service_healthy`, `image_data` volume), then expose it in `projects`
  and in the frontend toolbar.

## Known pitfalls

- `JWT_SECRET_KEY` must be the same in `users`, `api_gateway` and `ws_gateway`.
- Keep `NEXT_PUBLIC_API_BASE_URL` relative (`/api-gateway/`) and do not remap port 8080.
- Internal service-to-service TLS certificates are expired and not validated
  (`rejectUnauthorized: false`); several secrets are committed. Known issues, not patterns.
- RabbitMQ consumers must survive broker restarts.
- The image tools auto-acknowledge messages and swap `messageId`/`correlationId` in their error
  replies, so their errors do not reach the user.
- The users service answers errors with a non-standard 701 status (including "daily limit
  reached"); `projects` maps that case to 403 before replying.
- Image/video handling is branched in the orchestrator, and PIL effects are duplicated in
  `Tools/video_effects/effects.py`.
