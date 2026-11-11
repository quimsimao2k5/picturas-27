"""Cliente mínimo da API do PictuRAS para as medições da Fase 2.

Faz, como o frontend, o percurso completo de um utilizador:
registo -> login -> criar projeto -> carregar vídeo -> definir pipeline ->
processar -> esperar pelo fim (WebSocket) -> limpar.

Usa só a interface pública (nginx em https://localhost:8080), por isso mede o
sistema tal como o utilizador o vê e continua válido depois do refactoring,
desde que a API e os eventos WebSocket se mantenham (preservação funcional).
"""

from __future__ import annotations

import os
import threading
import time
import uuid
from dataclasses import dataclass, field

import requests
import socketio
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = os.environ.get("PICTURAS_URL", "https://localhost:8080")
API = BASE_URL + "/api-gateway"
PASSWORD = "Medicao-Fase2!"


class ApiError(RuntimeError):
    pass


def _check(resp: requests.Response, what: str) -> requests.Response:
    if resp.status_code >= 400:
        raise ApiError(f"{what}: HTTP {resp.status_code} {resp.text[:300]}")
    return resp


@dataclass
class JobTiming:
    """Tempos de um pedido de processamento, em segundos de relógio (time.time())."""

    submitted: float | None = None      # resposta 201 ao POST /process
    first_progress: float | None = None  # primeiro evento video-progress (o worker começou)
    finished: float | None = None        # evento process-update (resultado gravado)
    error: str | None = None
    progress_events: int = 0
    last_percent: float | None = None
    _done: threading.Event = field(default_factory=threading.Event, repr=False)

    @property
    def wait_s(self):
        if self.submitted is None or self.first_progress is None:
            return None
        return self.first_progress - self.submitted

    @property
    def total_s(self):
        if self.submitted is None or self.finished is None:
            return None
        return self.finished - self.submitted


class PicturasUser:
    """Um utilizador de teste, com a sua conta, o seu projeto e o seu WebSocket."""

    def __init__(self, label: str, premium: bool = True):
        self.label = label
        self.email = f"medicao-{label}-{uuid.uuid4().hex[:8]}@picturas.test"
        self.premium = premium
        self.http = requests.Session()
        self.http.verify = False
        self.uid: str | None = None
        self.token: str | None = None
        self.pid: str | None = None
        self.sio: socketio.Client | None = None
        self.job = JobTiming()

    # --- conta -------------------------------------------------------------
    def register_and_login(self):
        body = {
            "name": f"Medicao {self.label}",
            "email": self.email,
            "password": PASSWORD,
            # Conta premium criada diretamente: os vídeos de 150 s e 177 s passam o
            # limite de 60 s da conta gratuita e a conta premium não tem quota diária.
            "type": "premium" if self.premium else "free",
        }
        _check(self.http.post(f"{API}/users/", json=body, timeout=30), "registo")
        resp = _check(
            self.http.post(f"{API}/users/{self.email}/login", json={"password": PASSWORD}, timeout=30),
            "login",
        ).json()
        jwt = resp["jwt"]
        self.token = jwt if isinstance(jwt, str) else jwt.get("token")
        self.uid = resp["user"]["_id"]
        self.http.headers["Authorization"] = f"Bearer {self.token}"

    def _version(self) -> str:
        r = _check(self.http.get(f"{API}/projects/{self.uid}/{self.pid}", timeout=30), "obter projeto")
        return str(r.json().get("version", 0))

    # --- projeto -------------------------------------------------------------
    def create_project(self, name: str | None = None):
        r = _check(
            self.http.post(f"{API}/projects/{self.uid}", json={"name": name or f"medicao-{self.label}"}, timeout=30),
            "criar projeto",
        )
        self.pid = r.json()["_id"]

    def upload_video(self, path: str):
        with open(path, "rb") as f:
            files = {"video": (os.path.basename(path), f, _mime(path))}
            _check(
                self.http.post(
                    f"{API}/projects/{self.uid}/{self.pid}/video",
                    files=files,
                    headers={"X-Project-Version": self._version()},
                    timeout=600,
                ),
                f"carregar {os.path.basename(path)}",
            )

    def add_tool(self, procedure: str, params: dict | None = None):
        _check(
            self.http.post(
                f"{API}/projects/{self.uid}/{self.pid}/tool",
                json={"procedure": procedure, "params": params or {}},
                headers={"X-Project-Version": self._version()},
                timeout=30,
            ),
            f"acrescentar {procedure}",
        )

    # --- WebSocket ------------------------------------------------------------
    def connect_ws(self):
        sio = socketio.Client(ssl_verify=False, reconnection=True)

        @sio.on("video-progress")
        def _progress(data):
            if data.get("preview") or data.get("projectId") != self.pid:
                return
            now = time.time()
            if self.job.first_progress is None:
                self.job.first_progress = now
            self.job.progress_events += 1
            self.job.last_percent = data.get("percent")

        @sio.on("process-update")
        def _update(_msg_id):
            if self.job.finished is None:
                self.job.finished = time.time()
            self.job._done.set()

        @sio.on("process-error")
        def _error(data):
            self.job.error = f"{data}"
            self.job.finished = time.time()
            self.job._done.set()

        sio.connect(BASE_URL, transports=["websocket"], auth={"token": self.token}, wait_timeout=30)
        self.sio = sio

    # --- processamento -------------------------------------------------------
    def process(self):
        """Pede o processamento e regista o instante de aceitação (201)."""
        self.job = JobTiming()
        r = _check(
            self.http.post(
                f"{API}/projects/{self.uid}/{self.pid}/process",
                json={"runnerUserId": self.uid},
                headers={"X-Project-Version": self._version()},
                timeout=120,
            ),
            "processar",
        )
        self.job.submitted = time.time()
        body = r.json() if r.content else None
        if isinstance(body, dict) and body.get("completed"):
            # Sem alterações desde o último processamento: não há eventos do worker.
            self.job.finished = self.job.submitted
            self.job._done.set()

    def wait(self, timeout_s: float) -> JobTiming:
        if not self.job._done.wait(timeout_s):
            self.job.error = self.job.error or f"timeout ({timeout_s:.0f} s)"
        return self.job

    # --- limpeza -------------------------------------------------------------
    def cleanup(self):
        try:
            if self.sio is not None:
                self.sio.disconnect()
        except Exception:  # noqa: BLE001
            pass
        for url in (
            f"{API}/projects/{self.uid}/{self.pid}" if self.pid else None,
            f"{API}/users/{self.uid}" if self.uid else None,
        ):
            if url is None:
                continue
            try:
                hdr = {"X-Project-Version": self._version()} if "/projects/" in url else {}
                self.http.delete(url, headers=hdr, timeout=60)
            except Exception:  # noqa: BLE001
                pass


def _mime(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}.get(ext, "application/octet-stream")


def prepare_user(label: str, video: str, tools: list[tuple[str, dict]]) -> PicturasUser:
    """Cria conta, faz login, cria projeto, carrega o vídeo, define o pipeline e liga o WebSocket."""
    u = PicturasUser(label)
    u.register_and_login()
    u.create_project()
    u.upload_video(video)
    for proc, params in tools:
        u.add_tool(proc, params)
    u.connect_ws()
    return u
