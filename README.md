# PictuRAS

**Your personal, intuitive and powerful image and video editor.**

PictuRAS is a web-based image and video editing platform that combines traditional image processing with AI-powered tools. It is built as a **microservices architecture** orchestrated with Docker Compose, and it is the code base for the group project of the curricular unit _Requisitos e Arquitetura de Software_ (RAS), University of Minho.

> **This repository is a starting point, not a finished product.**
> It is the result of two previous academic years of student work (see [AUTHORS.md](AUTHORS.md)). It contains working features, known limitations and technical debt — finding, documenting and improving those is part of your job this semester.

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Ports and Endpoints](#-ports-and-endpoints)
- [HTTPS and Certificates](#-https-and-certificates)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Video Tools](#-video-tools)
- [Development Workflow](#-development-workflow)
- [Troubleshooting](#-troubleshooting)
- [Authors](#-authors)
- [License](#-license)
- [Contributing](#-contributing)

---

## 🚀 Features

### Core Image Processing

- **Basic Editing**: brightness, contrast, saturation adjustments
- **Geometric Operations**: resize, rotate, crop
- **Filters and Effects**: binarization, borders, watermark
- **Bulk Processing**: apply a pipeline of tools to multiple images

### Video Editing

- **Upload and playback**: MP4, MOV and WebM videos, validated on upload (container, codec,
  duration, size, resolution) with per-plan limits — free 60 s / 100 MB, premium 600 s / 1 GB
- **Video-only tools**: `trim` (start/end in seconds) and `speed` (factor 0.25–5)
- **Automatic subtitles**: local speech recognition (Faster-Whisper), captions burned into the
  video in the spoken language — see [Video Tools](#-video-tools)
- **Extract frames**: turn every video into up to 100 PNG/JPEG stills, by count or interval,
  as the last pipeline step
- **Shared effects**: brightness, contrast, saturation, binarization, border, resize, rotate and
  crop also apply to every frame of a video
- **Fast preview**: previews render only the first 3 s (`VIDEO_PREVIEW_SECONDS`)
- **Export**: always MP4 (H.264 + AAC), keeping the original audio
- AI tools, watermark and PDF export are image-only and hidden in projects that contain videos

### AI-Powered Tools

- **Background Removal** (`bg_remove_ai`): AI-powered background removal for clean cutouts
- **Smart Cropping** (`cut_ai`): saliency-based intelligent cropping
- **Object Detection** (`obj_ai`): object detection and classification with YOLO
- **People Detection** (`people_ai`): person detection and counting
- **Text Recognition** (`text_ai`): OCR for text extraction from images
- **Image Enhancement** (`upgrade_ai`): AI-driven quality improvement and upscaling
- **Generative Expand** (`expand_ai`): outpainting / canvas expansion, backed by a generative
  image API (a local **mock** of the Stable Diffusion WebUI API ships with the project, so no
  GPU or external API key is required)

### User Management and Platform

- **Authentication**: user registration and login with JWT
- **Field-level encryption**: sensitive user fields are encrypted at rest in MongoDB
- **Subscription Plans**: free and premium tiers with different daily usage limits
- **Project Management**: organise images and editing pipelines into projects
- **Real-time Processing**: WebSocket-based progress updates while tools run
- **Encrypted object storage**: SeaweedFS S3 with encryption at rest
- **Automated backups**: periodic `mongodump` of all three databases

---

## 🏗️ Architecture

All traffic enters the system through a single **HTTPS reverse proxy (Nginx)**. Internal services
are **not** published to the host unless noted otherwise — they talk to each other over the
`elk` Docker bridge network.

```
                          https://localhost:8080
                                    │
                           ┌────────▼────────┐
                           │ Nginx (443/TLS) │
                           └────────┬────────┘
              ┌─────────────┬───────┴───────┬────────────────┐
              │             │               │                │
        / (frontend)  /api-gateway/     /socket.io       /s3[-console]/
              │             │               │                │
         ┌────▼────┐   ┌────▼────┐     ┌────▼────┐      ┌─────▼─────┐
         │ Next.js │   │   API   │     │   WS    │      │ SeaweedFS │
         │  :3000  │   │ Gateway │     │ Gateway │      │   :9000   │
         └─────────┘   │  :8000  │     │  :4000  │      └───────────┘
                       └────┬────┘     └────▲────┘
                            │               │ consumes ws_queue
        ┌───────────┬───────┴───────┐       │
        │           │               │       │
  ┌─────▼─────┐ ┌───▼───────┐ ┌─────▼─────┐ │
  │   users   │ │ projects  │ │ subscrip. │ │
  │  :10001   │ │   :9001   │ │  :11001   │ │
  └─────┬─────┘ └──┬─────┬──┘ └─────┬─────┘ │
        │          │     │          │       │
   ┌────▼───┐ ┌────▼───┐ │     ┌────▼───┐   │
   │MongoDB │ │MongoDB │ │     │MongoDB │   │
   │ :27019 │ │ :27018 │ │     │ :27017 │   │
   └────────┘ └────────┘ │     └────────┘   │
                         │                  │
                    ┌────▼──────────────────┴────┐
                    │      RabbitMQ  :5672       │◄─── 16 image tools + 3 video services
                    │    exchange "picturas"     │     (one queue per tool/service)
                    └────────────────────────────┘
```

The **WS Gateway talks only to RabbitMQ**: it consumes `ws_queue` and pushes progress events to
the browser over Socket.IO, authenticating the connection with the shared `JWT_SECRET_KEY`. It
has no link to any other microservice. Note that **`subscriptions` means paid memberships**
(plans, cards, billing status) — it is unrelated to WebSocket/event subscriptions.

### Frontend

- **Technology**: Next.js 15 with React 19, TypeScript and Tailwind CSS
- **Container port**: 3000 — **not published**, reachable only through Nginx
- Talks to the backend through the relative base URL `/api-gateway/`

### Backend Services

| Service                   | Container port | Responsibility                                  |
| ------------------------- | -------------- | ----------------------------------------------- |
| **API Gateway**           | 8000           | Single entry point for the REST API, JWT checks |
| **User Service**          | 10001          | Registration, authentication, user profile      |
| **Project Service**       | 9001           | Projects, media pipelines, tool orchestration   |
| **Subscription Service**  | 11001          | Plans, payments (mock), usage limits            |
| **Image Storage Service** | 11000          | Upload/download façade in front of SeaweedFS    |
| **WebSocket Gateway**     | 4000           | Real-time progress events to the browser        |

### Processing Tools

Each tool is an independent Python microservice that consumes a RabbitMQ queue, processes the
image from the shared `image_data` volume, and publishes the result back to the `picturas`
exchange:

`binarization` · `border` · `brightness` · `contrast` · `cut` · `resize` · `rotate` ·
`saturation` · `watermark` · `bg_remove_ai` · `cut_ai` · `expand_ai` · `obj_ai` · `people_ai` ·
`text_ai` · `upgrade_ai`

> The `watermark` tool runs from a pre-built public image
> (`prcsousa/picturas-watermark-tool-ms`) instead of being built from this repository — it is a
> deliberate example of integrating a third-party service.

**Videos** are handled by three video services instead of the image tools, one per kind of
stage, each with its own queue:

| Service           | Queue                   | Stage                                                                   |
| ----------------- | ----------------------- | ----------------------------------------------------------------------- |
| `video_effects`   | `video_effects_queue`   | Frame effects and `trim`/`speed`: one decode, one encode to MP4/H.264 + AAC |
| `video_subtitles` | `video_subtitles_queue` | Speech recognition (Faster-Whisper) and burned-in captions              |
| `video_frames`    | `video_frames_queue`    | Frame extraction (always the last stage)                                |

`projects` splits the pipeline of each video into stages (`videoStages` in
`projects/utils/video.js`): consecutive effects form one effects stage, each `subtitles` is a
stage of its own, and `extract_frames` is the last one. It sends the first stage and, as it
already does for image tools, sends the next stage when the previous one replies on
`project_queue`. Intermediate files go to a work directory on the shared `image_data` volume and
are removed when the job ends, fails or is cancelled; only the last stage produces the result.
Each service probes its input with `ffprobe`, reports progress as `video-progress` events on
`ws_queue` (as a share of the whole pipeline: one bar from 0 to 100 %), acknowledges the message
only at the end and leaves no partial output on failure. The frame effects
(`Tools/video_effects/effects.py`) are the same PIL operations as the image tools. The
RabbitMQ worker, `ffprobe` helper and errors shared by the three services live in
`Tools/video_common/`. `ffmpeg` is installed only inside these containers.

The **`autoscaler`** (`autoscaler/`) keeps the number of replicas of each video service in line
with its queue: every 2 s it reads the queue sizes in the RabbitMQ management API and asks for one
replica per message (waiting or in progress), within the limits below; it adds replicas at once
and removes them only after 30 s of lower load, idle replicas first. Replicas are created and
removed through the Docker API, so the `autoscaler` mounts `/var/run/docker.sock` (the only
service that does; it publishes no ports and only touches the video services of this Compose
project). A removed replica gets `SIGTERM` and finishes its current job first.

### Infrastructure

- **Message Queue**: RabbitMQ (asynchronous tool invocation)
- **Databases**: three independent MongoDB 4.4 instances (users, projects, subscriptions)
- **Object Storage**: SeaweedFS (S3-compatible) with encryption at rest

> **Why SeaweedFS?** The project originally used MinIO, whose container images were withdrawn
> from Docker Hub and quay.io in 2026, breaking every fresh build. SeaweedFS is S3-compatible,
> so only the endpoint and credentials changed — the application code still speaks plain S3 via
> `aws-sdk`. Encryption at rest is preserved through `-s3.encryptVolumeData`, which replaces
> MinIO's `MINIO_KMS_AUTO_ENCRYPTION`.

- **Reverse Proxy / TLS termination**: Nginx
- **Backups**: `mongo-backup` sidecar running `mongodump` every 24h into `./backups/mongo`
- **Monitoring**: ELK stack (Elasticsearch, Logstash, Kibana) — present but **commented out**
  in `docker-compose.yaml` and `nginx/nginx.conf`

---

## 🛠️ Quick Start

### Prerequisites

| Requirement        | Minimum                   | Notes                                                        |
| ------------------ | ------------------------- | ------------------------------------------------------------ |
| **Docker Engine**  | 24+                       | Docker Desktop on Windows/macOS                              |
| **Docker Compose** | v2 (`docker compose`)     | The old `docker-compose` (v1) hyphenated command is not used |
| **RAM**            | 8 GB free (16 GB advised) | ~25 containers, several with AI models loaded                |
| **Disk**           | ~15 GB free               | AI base images (PyTorch, OpenCV) are large                   |
| **Browser**        | Any modern browser        | Must accept a self-signed certificate                        |

On Docker Desktop, raise the memory limit in **Settings → Resources** if the AI tools get
OOM-killed.

> ⚠️ **Replacing your own Phase 1 version with this one?** Wipe your old Docker data first.
> Both versions use the same Compose project name (`picturas`), so this stack would reuse your
> old volumes — and the object storage layout changed (all files now live in one shared bucket,
> `users/<id>/…`, instead of one bucket per user). Old data is **not migrated**: with stale
> volumes, uploads and existing projects break in confusing ways.
>
> In the directory of your **old** checkout, before starting this one:
>
> ```bash
> docker compose down -v --remove-orphans   # deletes your old accounts, projects and files
> ```
>
> Then follow the installation below. This is needed only once. If you want to keep anything
> from your old instance, export it before running the command.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/picturas-um/picturas-27 picturas-27
   cd picturas-27
   ```

2. **Build and start the whole stack**

   ```bash
   docker compose up --build
   ```

   The **first** build downloads several GB of images and installs the Python AI dependencies —
   expect **15–30 minutes** depending on your connection. Later starts take seconds:

   ```bash
   docker compose up -d      # detached
   docker compose logs -f    # follow the logs
   ```

3. **Open the application**

   👉 **<https://localhost:8080>** — note the **`https`** and the port **`8080`**.

   Your browser will warn you about the self-signed certificate. Accept it
   (Chrome: _Advanced → Proceed to localhost (unsafe)_; Firefox: _Advanced → Accept the Risk_).
   See [HTTPS and Certificates](#-https-and-certificates) if the site does not load at all.

4. **Stop the stack**

   ```bash
   docker compose down          # stop and remove containers
   docker compose down -v       # ...and wipe all data (databases, images, objects)
   ```

### First Steps

1. Open <https://localhost:8080> and accept the certificate.
2. Register an account, or use the anonymous mode.
3. Create a project and upload an image or a video (samples in `samples/video/`).
4. Build a pipeline with the toolbar (filters, geometry, AI tools) and run it.
5. Watch the progress arrive live over the WebSocket, then download the results.

---

## 🔌 Ports and Endpoints

Everything a user needs is behind **one** address: `https://localhost:8080`. The remaining
ports are published only for **development and debugging**.

### Through the reverse proxy (HTTPS)

| URL                                   | Target                  |
| ------------------------------------- | ----------------------- |
| `https://localhost:8080/`             | Frontend (Next.js)      |
| `https://localhost:8080/api-gateway/` | REST API (API Gateway)  |
| `https://localhost:8080/socket.io`    | WebSocket Gateway       |
| `https://localhost:8080/s3/`          | Object storage (S3 API) |
| `https://localhost:8080/s3-console/`  | SeaweedFS filer web UI  |

### Published directly on the host

| Port    | Service              | URL / Credentials                               |
| ------- | -------------------- | ----------------------------------------------- |
| `8080`  | Nginx (HTTPS)        | <https://localhost:8080>                        |
| `9000`  | SeaweedFS S3 API     | <http://localhost:9000> — `admin` / `admin123`  |
| `9090`  | SeaweedFS filer UI   | <http://localhost:9090>                         |
| `11000` | Image Storage        | <http://localhost:11000>                        |
| `15672` | RabbitMQ Management  | <http://localhost:15672> — `user` / `password`  |
| `5672`  | RabbitMQ AMQP        | broker endpoint used by the tools               |
| `10001` | User Service         | <http://localhost:10001>                        |
| `11001` | Subscription Service | <http://localhost:11001>                        |
| `9002`  | Project Service      | <http://localhost:9002> (container port `9001`) |
| `4000`  | WebSocket Gateway    | <http://localhost:4000>                         |
| `7860`  | Generative mock API  | <http://localhost:7860> (used by `expand_ai`)   |
| `27018` | MongoDB (projects)   | `mongodb://localhost:27018`                     |
| `27019` | MongoDB (users)      | `mongodb://localhost:27019`                     |

Make sure the ports above are free before starting; see [Troubleshooting](#-troubleshooting).

---

## 🔐 HTTPS and Certificates

Nginx terminates TLS on container port `443`, published on host port `8080`. A **self-signed**
certificate pair is committed to the repository so the stack works out of the box:

```
certs/selfsigned.crt      # used by Nginx — the only certificate the browser sees
certs/selfsigned.key
```

Five further self-signed pairs are committed under `apiGateway/`, `users/`, `projects/`,
`subscriptions/` and `frontend/`. The internal services use them to speak HTTPS to each other
(`https://users:10001`, `https://projects:9001`, ...).

The bundled certificate is issued to `CN=localhost` and is valid until **14 September 2027**, so
it covers the whole academic year. To regenerate it (for a different hostname, or after it
expires):

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout certs/selfsigned.key \
  -out certs/selfsigned.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

docker compose restart nginx
```

> ⚠️ **The internal certificates are expired, and that is why nothing breaks.**
> All five service-to-service pairs expired in **January 2026**. The stack keeps working
> because every client is built as `https.Agent({ rejectUnauthorized: false })`, so expiry —
> and in fact the whole certificate chain — is never checked. Internal traffic is encrypted
> but **not authenticated**, and the client certificates passed to those agents are never
> requested by any server. Treat this as a finding to analyse, not a pattern to copy: fixing
> it (proper validation, or dropping internal TLS in favour of a trusted network boundary) is
> a legitimate architectural improvement. Only `certs/`, used by Nginx, is still valid.

**Why HTTPS matters here:** the browser refuses to open a secure WebSocket (`wss://`) from a
page served over plain HTTP, and several browser APIs used by the editor require a secure
context. Always use `https://localhost:8080` — **not** `http://`, and **not** `localhost:3000`.

**Overriding with a `.env` file.** The object-storage variables are read from the environment,
with the defaults above applied when unset, so the stack runs with no setup. To use your own
credentials, copy `.env.example` to `.env` and edit it — `.env` is git-ignored, and a single
entry there updates both the storage server and the client that talks to it:

```bash
cp .env.example .env     # then edit, and: docker compose up -d
```

> 🔎 **Committed secrets are a known issue.** Private keys, JWT secrets and database passwords
> are hard-coded in this repository for convenience. That is acceptable for a local
> setup but _unacceptable in production_ — moving them to a `.env` file (git-ignored) or a secrets
> manager is a good first improvement.

---

## 🔧 Configuration

All configuration currently lives as `environment:` entries in `docker-compose.yaml`.

| Variable                                      | Default                       | Service(s)             | Purpose                                      |
| --------------------------------------------- | ----------------------------- | ---------------------- | -------------------------------------------- |
| `JWT_SECRET_KEY`                              | `lisan_al_gaib`               | users, gateway, ws     | JWT signing key — **must match everywhere**  |
| `FIELD_ENCRYPTION_KEY`                        | `uma-frase-secreta-...`       | users                  | Key for field-level encryption in MongoDB    |
| `FREE_DAILY_OP`                               | `5`                           | users                  | Daily operation limit for free accounts      |
| `SECRET_KEY`                                  | `card_secret_key`             | subscriptions          | Payment-data encryption key                  |
| `S3_ENDPOINT`                                 | `seaweedfs:9000`              | img_storage            | Object storage endpoint                      |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`             | `admin` / `admin123`          | seaweedfs, img_storage | Object storage credentials                   |
| `S3_BUCKET`                                   | `picturas`                    | img_storage            | Shared bucket for all files (`users/<id>/…`) |
| `S3_KEK_PASSPHRASE`                           | `picturas-kek-...`            | seaweedfs              | Protects the key used for encryption at rest |
| `RABBITMQ_DEFAULT_USER` / `_PASS`             | `user` / `password`           | rabbitmq               | Broker credentials                           |
| `RABBITMQ_HOST` / `_PORT` / `_USER` / `_PASS` | `rabbitmq` / `5672` / ...     | tools, projects, ws    | Broker connection                            |
| `FRONTEND_URL`                                | `https://localhost:8080`      | img_storage            | CORS / redirect origin                       |
| `NEXT_PUBLIC_API_BASE_URL`                    | `/api-gateway/`               | frontend               | Relative API base (keep it relative!)        |
| `GEN_EXPAND_URL`                              | `http://generative-mock:7860` | expand_ai              | Generative image API endpoint                |
| `VIDEO_FREE_MAX_DURATION_S` / `_MAX_SIZE_MB`  | `60` / `100`                  | projects               | Video upload limits for free accounts        |
| `VIDEO_PREMIUM_MAX_DURATION_S` / `_SIZE_MB`   | `600` / `1024`                | projects               | Video upload limits for premium accounts     |
| `VIDEO_PREVIEW_SECONDS`                       | `3`                           | video_effects          | Length of a video preview render             |
| `WHISPER_MODEL`                               | `small`                       | video_subtitles        | Faster-Whisper model for automatic subtitles |
| `WHISPER_CACHE_DIR`                           | `/models/whisper`             | video_subtitles        | Model cache (the `whisper_models` volume)    |
| `WHISPER_CPU_THREADS`                         | `2`                           | video_subtitles        | CPU threads for speech recognition           |
| `VIDEO_EFFECTS_MIN_REPLICAS` / `_MAX_REPLICAS`   | `1` / `3`                  | autoscaler             | Replica limits of `video_effects`            |
| `VIDEO_SUBTITLES_MIN_REPLICAS` / `_MAX_REPLICAS` | `1` / `2`                  | autoscaler             | Replica limits of `video_subtitles`          |
| `VIDEO_FRAMES_MIN_REPLICAS` / `_MAX_REPLICAS`    | `1` / `2`                  | autoscaler             | Replica limits of `video_frames`             |
| `VIDEO_EFFECTS_MEM_LIMIT`                     | `3g`                          | video_effects          | Memory limit of each replica                 |
| `VIDEO_SUBTITLES_MEM_LIMIT`                   | `3g`                          | video_subtitles        | Memory limit of each replica                 |
| `VIDEO_FRAMES_MEM_LIMIT`                      | `512m`                        | video_frames           | Memory limit of each replica                 |

The replica and memory variables are read from the shell or a `.env` file next to
`docker-compose.yaml` (for example `VIDEO_SUBTITLES_MAX_REPLICAS=1` on a machine with little
memory). The `autoscaler` also takes `POLL_INTERVAL_S`, `MESSAGES_PER_REPLICA`,
`SCALE_DOWN_AFTER_S` and `STOP_TIMEOUT_S`, set in its block of `docker-compose.yaml`.

⚠️ If you change `JWT_SECRET_KEY`, change it in **all three** services (`users`, `api_gateway`,
`ws_gateway`) or authentication silently breaks.

### Persistent data

Named Docker volumes: `user_data`, `project_data`, `subscription_data`, `image_data`,
`seaweedfs_data`, `rabbitmq_data`, `whisper_models` (speech model weights). Database dumps are
written to the host at `./backups/mongo` (git-ignored). `docker compose down -v` deletes every volume — the dumps survive.

### Scaling

- Run more instances of a busy tool: `docker compose up -d --scale brightness_tool=3`
- Watch queue depth in the RabbitMQ management UI (<http://localhost:15672>)
- Tune per-container CPU/memory limits in `docker-compose.yaml` to match your machine

Containers are named `picturas-<service>-<n>` (from `name: picturas` in `docker-compose.yaml`),
independently of the directory you cloned into. Use `docker compose -p <other-name>` to run a
second, separate stack.

### Enabling the ELK stack (optional)

The Elasticsearch / Logstash / Kibana services are commented out at the top of
`docker-compose.yaml`, together with the matching `location` blocks in `nginx/nginx.conf`.
Uncomment both to enable centralised logging — budget an extra ~4 GB of RAM.

---

## 📁 Project Structure

```
picturas-27/
├── frontend/                 # Next.js 15 + React 19 frontend
├── apiGateway/               # REST API gateway (Express)
├── users/                    # User management service (Express + MongoDB)
├── projects/                 # Project & pipeline orchestration service
├── subscriptions/            # Subscription / payment service
├── imageStorageService/      # Image storage service: S3 façade in front of SeaweedFS
├── wsGateway/                # WebSocket gateway (Socket.IO)
├── generative-mock/          # Mock of the Stable Diffusion WebUI API (for expand_ai)
├── Tools/                    # Image and video processing microservices
│   ├── utils/                #   shared helpers (RabbitMQ, image I/O, messages)
│   ├── models/               #   pre-downloaded ML weights (e.g. yolov5su.pt)
│   ├── bg_remove_ai/  cut_ai/  expand_ai/  obj_ai/  people_ai/  text_ai/  upgrade_ai/
│   ├── binarization/  border/  brightness/  contrast/  cut/  resize/  rotate/  saturation/
│   ├── video_common/         #   RabbitMQ stage worker, ffprobe and errors shared by the video services
│   ├── video_effects/        #   video_effects: frame effects, trim and speed (ffmpeg + PIL)
│   ├── video_subtitles/      #   video_subtitles: automatic subtitles (Faster-Whisper)
│   ├── video_frames/         #   video_frames: frame extraction
│   └── tests/video_pipeline/ #   tests of whole pipelines across the three video services
├── autoscaler/               # Adjusts the replicas of the video services to their queues
├── samples/video/            # Sample videos for manual tests (valid, MOV, too long, corrupted)
├── rabbitMQ/                 # Broker image with queue/exchange definitions
├── nginx/nginx.conf          # Reverse proxy, TLS, CORS, WebSocket routing
├── certs/                    # Self-signed TLS certificate for Nginx
├── backups/mongo/            # Generated database dumps (git-ignored)
├── logstash.conf, kibana.yml # ELK configuration (stack currently disabled)
├── docker-compose.yaml       # Service orchestration — the single source of truth
└── LICENSE                   # CC BY-NC-SA 4.0
```

---

## 🎬 Video Tools

Besides `trim` and `speed`, projects with videos have two project-wide, video-only tools. Each
runs in its own service (`video_subtitles` and `video_frames`); images in the same project skip
them.

### Automatic subtitles

Choose **Automatic subtitles** in the toolbar and **Save**. **Apply** burns captions into every
video of the project, in the detected spoken language (no translation). Videos without audio or
without detected speech are left unchanged by this step, and original uploads are never
overwritten.

- Recognition runs locally with [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper)
  `small` on CPU/int8 — no external API or key. The first use downloads the model weights into
  the `whisper_models` volume; later runs reuse them.
- Order matters: tools placed after subtitles also change the captioned video, so put subtitles
  after `trim`/`speed` and other edits.
- Preview shows the first 3 s of the final timeline. Subtitle previews may take up to ten
  minutes on first use (model download, queued CPU work).
- Transcription can contain errors. Captions are not editable and there is no SRT export.
- Configured with `WHISPER_MODEL`, `WHISPER_CACHE_DIR` and `WHISPER_CPU_THREADS` (see
  [Configuration](#-configuration)). The worker image ships Noto fonts for multilingual captions.

Adapted from the Phase 1 submission of group **PL2-G5** (see [AUTHORS.md](AUTHORS.md)), which
exported text tracks instead of burning captions into the video.

### Extract frames

Choose **Extract frames**, pick either a number of evenly spaced frames (1–100) or one frame
every _N_ seconds, choose PNG or JPEG, and **Save**. **Apply** turns every video of the project
into still images.

- Extraction is always the **last** step and appears at most once; new effects are inserted
  before it and invalid reorderings are rejected. Trim, speed, subtitles and other preceding
  edits are reflected in the frames.
- Sampling starts at 0 s on the edited timeline and excludes its end. At most 100 frames per
  video: an interval that would produce more is rejected rather than silently truncated.
- **Preview** shows a contact sheet of up to six samples across the whole edited video (which
  can be slow when there are preceding effects). **Results** lists each frame as a separate
  image with a unique name, for individual download or in the project ZIP.
- With no preceding effects, frames are read directly from the original, without re-encoding.

Adapted from the Phase 1 submissions of groups **PL2-G5** (interval sampling, bounded output)
and **PL5-G6** (count-based PNG/JPEG extraction, frame manifest with timestamps) — see
[AUTHORS.md](AUTHORS.md).

### Playback

Videos never autoplay or loop: they play only when started, and pause when you leave their
carousel slide or close the preview.

---

## 💻 Development Workflow

### Rebuilding a single service

```bash
docker compose up -d --build users        # rebuild + restart one service
docker compose restart nginx              # config-only change, no rebuild needed
docker compose logs -f projects           # follow one service's logs
docker compose ps                         # what is running, and is it healthy?
```

### Live code reloading

`users`, `subscriptions`, `apiGateway` and `frontend` bind-mount their source directory into
the container, so edits on the host are visible inside it. The Node services run under
`nodemon` and reload automatically.

The **frontend image is built for production** (`bun run build` / `bun start`), so a source edit
will **not** hot-reload. For frontend development either rebuild:

```bash
docker compose up -d --build frontend
```

...or switch `frontend/Dockerfile` to the dev command already prepared there
(`CMD ["bun", "dev"]`, commented out at the bottom of the file).

Python tools have no bind mount — rebuild them after every change:

```bash
docker compose up -d --build border_tool
```

### Testing the video services

The tests run on the host, with no image to build. They only need Python 3.11+ and
`ffmpeg`/`ffprobe` on the `PATH` (`brew install ffmpeg`, `apt install ffmpeg`, ...). Each folder
is run on its own:

```bash
cd Tools
python3 -m venv .venv && .venv/bin/pip install -r video_common/requirements-dev.txt   # once
for t in video_effects/tests video_subtitles/tests video_frames/tests video_common/tests tests/video_pipeline; do
  .venv/bin/python -m pytest -q "$t"
done
```

`Tools/tests/video_pipeline` runs whole pipelines through the three services, chained in-process
the way `projects` chains them. Without ffmpeg on the host, run the tests in the already-built
images instead, e.g.
`docker compose run --rm --no-deps video_effects sh -c "pip install -q pytest && python -m pytest -q tests video_common/tests"`
(and `tests` in `video_subtitles` and `video_frames`). The autoscaler's tests:
`docker compose run --rm --no-deps autoscaler sh -c "pip install -q pytest && python -m pytest -q tests"`.

The media tests use real FFmpeg; speech recognition is simulated, so no model is downloaded.
The orchestration tests for the video pipeline, its split into stages and frame extraction run
inside `projects`:

```bash
docker compose run --rm --no-deps projects sh -c "node --test tests/*.test.js"
```

For manual tests, `samples/video/` has a valid 10 s 720p MP4, a MOV, a 90 s video that the free
plan must reject and a corrupted file — see its `README.md` for the expected result of each.

### Adding a new tool

1. Create `Tools/<your_tool>/` with `<your_tool>.py`, `requirements.txt` and a `Dockerfile`
   (copy an existing simple tool such as `border` as a template).
2. Reuse `Tools/utils/` for RabbitMQ connection, image handling and message schemas.
3. Register the queue in `rabbitMQ/`.
4. Add the service to `docker-compose.yaml` with `depends_on: rabbitmq (service_healthy)` and
   the `image_data` volume.
5. Expose it in the project service and in the frontend toolbar.

### Inspecting data

```bash
docker compose exec users_mongoDB mongo --port 27019
docker compose exec projects_mongoDB mongo --port 27018
```

Stored objects: <http://localhost:9090> (SeaweedFS filer UI).
Queues and message rates: <http://localhost:15672> (`user` / `password`).

---

## 🩹 Troubleshooting

**The page does not load / `ERR_CONNECTION_REFUSED`**
You are probably using `http://` instead of `https://`, or port `3000` instead of `8080`. The
only correct address is <https://localhost:8080>.

**"Your connection is not private" / `NET::ERR_CERT_AUTHORITY_INVALID`**
Expected — the certificate is self-signed. Accept the warning once per browser profile. If
Chrome refuses outright, type `thisisunsafe` with the warning page focused.

**Uploads or live updates fail although the page loads**
The browser blocks mixed content and insecure WebSockets. Make sure every request goes through
`https://localhost:8080` and that `NEXT_PUBLIC_API_BASE_URL` stays the **relative** value
`/api-gateway/`.

**`Bind for 0.0.0.0:8080 failed: port is already allocated`**
Another process holds the port. Find it with `lsof -i :8080` (macOS/Linux) or
`netstat -ano | findstr :8080` (Windows) and stop it. Do not remap Nginx to another host
port: `FRONTEND_URL` and the frontend's WebSocket URL both assume `8080`, so the page would
load while presigned image URLs and live updates kept pointing at the old port.

**A tool container keeps restarting**
Check `docker compose logs <tool>_tool`. The usual causes are RabbitMQ not being healthy yet
(it recovers on its own) or the container being OOM-killed — increase Docker's memory limit.

**AI tools are very slow the first time**
Some models are downloaded or warmed up on first use. `Tools/models/yolov5su.pt` is committed,
but other weights are fetched at runtime — the first request needs network access.

**A video upload is rejected**
The response gives the reason: check the plan limits (free 60 s / 100 MB) and that the file
is a valid MP4, MOV or WebM. Videos must go to `POST /:user/:project/video`; the image
endpoint rejects them.

**A video stays at 0% or never finishes**
Check the queue of the stage it is in (`video_effects_queue`, `video_subtitles_queue`,
`video_frames_queue`) in RabbitMQ (<http://localhost:15672>), the service logs
(`docker compose logs -f video_effects video_subtitles video_frames`) and the replica decisions
(`docker compose logs -f autoscaler`). With the default limits, at most 3 effects, 2 captioning
and 2 extraction jobs run at the same time; the rest wait in their queues.

**`expand_ai` fails**
It depends on `generative-mock` being healthy. Check <http://localhost:7860> and
`docker compose logs generative-mock`.

**Login works, then every request returns 401**
`JWT_SECRET_KEY` differs between `users`, `api_gateway` and `ws_gateway`.

**Everything is broken after pulling new code**
Rebuild from a clean slate:

```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

**Out of disk space**
`docker system prune -a --volumes` reclaims unused images and volumes — it also **deletes your
local data**, so use it deliberately.

---

## 👥 Authors

PictuRAS is a cumulative effort of several generations of students of _Requisitos e Arquitetura
de Software_ at the **University of Minho**, from the original 2024/2025 implementation to the
current year. The full history — who contributed what, and when — is in
[AUTHORS.md](AUTHORS.md). Add your group there as you start working on the project.

The latest contributions, from 2026/2027 (Phase 1), are:

### Video support — Group PL1-G4, 2026/2027

Contributed video support as an MVP: video upload with validation and per-plan limits, the
`video_tool` ffmpeg worker, the video-only `trim` and `speed` tools, and the frontend for video
upload, playback and editing:

- **PG61468** — José Nuno Fernandes do Vale Taveira Campelo
- **PG62409** — Martim Pereira Ribeiro
- **PG63966** — Gonçalo José Vieira de Castro
- **PG64019** — Pedro Miguel Cardoso Ribeiro

### Phase 1 ideas — Groups PL2-G5 and PL5-G6, 2026/2027

Automatic subtitles and frame extraction were adapted by the lecturers from these groups'
Phase 1 submissions (see [Video Tools](#-video-tools)); they are not wholesale imports.

**PL2-G5** — automatic subtitles with local Faster-Whisper, speech/no-audio handling, and
interval-based frame sampling with bounded output:

- **PG63933** — Cláudio Rafael Oliveira Ferreira
- **PG63948** — Diogo Linhares Campos
- **PG64003** — Marco António Ferreira Abreu
- **PG64010** — Nelson Daniel Araújo Sousa

**PL5-G6** — count-based PNG/JPEG frame extraction, frame manifests with timestamps and atomic
output:

- **PG64011** — Nuno Daniel Abreu da Silva
- **PG64042** — Vicente Alexandre Fernandes da Silva
- **PG64044** — Vítor Hugo Inácio Mina
- **PG65418** — João Pedro Belece Bernardo

---

## 📄 License

This project is licensed under the **Creative Commons
Attribution-NonCommercial-ShareAlike 4.0 International License** (CC BY-NC-SA 4.0).
See [LICENSE](LICENSE).

### What this means

- ✅ **Share** — copy and redistribute the material in any medium or format
- ✅ **Adapt** — remix, transform and build upon the material
- ✅ **Attribution** — you must give appropriate credit to the original authors
- ❌ **Commercial Use** — not permitted without explicit consent from all authors
- ✅ **Share Alike** — derivative works must be distributed under the same license

### For contributors

- New students and contributors are welcome.
- All contributions must maintain the same license terms.
- Commercial use requires explicit consent from all original authors.
- Any derivative work must be shared under the same license.

---

## 🤝 Contributing

1. Fork or branch from `main`.
2. Create a feature branch: `git checkout -b feature/<short-description>`.
3. Make your changes and keep the commits small and descriptive.
4. Test locally with `docker compose up --build` before pushing.
5. Open a pull request describing **what** changed and **why**.

Please do **not** commit `node_modules/`, generated images, database dumps or new secrets —
`.gitignore` already covers most of these.

---

## 📞 Support

- Open an issue in this repository for bugs and questions about the code base.
- Use the official university channels for anything related to the curricular unit.
- Follow the academic guidelines for collaborative work and attribution.

---

**PictuRAS** — Empowering creativity through intelligent image editing.
