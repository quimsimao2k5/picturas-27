"""Amostragem de recursos durante um cenário (usada em S1, S2, S3 e M3).

Em cada amostra regista, por contentor do projeto Compose:
  - serviço, CPU (%), memória usada (MiB) e limite (MiB);
e, para o sistema:
  - número de réplicas de cada serviço (para ver se o sistema escala);
  - mensagens prontas e em processamento em cada fila do RabbitMQ.

Só usa o Docker CLI e a API de gestão do RabbitMQ (com recurso a `rabbitmqctl`
se a API não estiver acessível), para funcionar antes e depois do refactoring.
"""

from __future__ import annotations

import csv
import json
import os
import subprocess
import threading
import time

import requests

PROJECT = os.environ.get("COMPOSE_PROJECT", "picturas")
RABBIT_API = os.environ.get("RABBIT_API", "http://localhost:15672/api/queues")
RABBIT_AUTH = (os.environ.get("RABBIT_USER", "user"), os.environ.get("RABBIT_PASS", "password"))


def _run(cmd: list[str], timeout: float = 20) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False).stdout
    except (OSError, subprocess.TimeoutExpired):
        return ""


def compose_containers() -> dict[str, str]:
    """{nome do contentor: serviço} para os contentores em execução do projeto."""
    out = _run([
        "docker", "ps", "--filter", f"label=com.docker.compose.project={PROJECT}",
        "--format", '{{.Names}}\t{{.Label "com.docker.compose.service"}}',
    ])
    res = {}
    for line in out.splitlines():
        if "\t" in line:
            name, svc = line.split("\t", 1)
            res[name] = svc
    return res


def _mib(s: str) -> float:
    s = s.strip()
    units = {"KiB": 1 / 1024, "MiB": 1, "GiB": 1024, "TiB": 1024 * 1024, "kB": 1 / 1024, "MB": 1, "GB": 1024, "B": 1 / (1024 * 1024)}
    for u in sorted(units, key=len, reverse=True):
        if s.endswith(u):
            return float(s[: -len(u)]) * units[u]
    try:
        return float(s)
    except ValueError:
        return float("nan")


def docker_stats() -> list[dict]:
    out = _run(["docker", "stats", "--no-stream", "--format", "{{json .}}"], timeout=30)
    rows = []
    for line in out.splitlines():
        try:
            d = json.loads(line)
        except ValueError:
            continue
        used, _, limit = d.get("MemUsage", "0B / 0B").partition("/")
        rows.append({
            "container": d.get("Name"),
            "cpu_pct": float(d.get("CPUPerc", "0%").rstrip("%") or 0),
            "mem_mib": _mib(used),
            "mem_limit_mib": _mib(limit),
        })
    return rows


def queue_depths() -> dict[str, tuple[int, int]]:
    """{fila: (prontas, em processamento)}."""
    try:
        r = requests.get(RABBIT_API, auth=RABBIT_AUTH, timeout=5)
        r.raise_for_status()
        return {q["name"]: (q.get("messages_ready", 0), q.get("messages_unacknowledged", 0)) for q in r.json()}
    except Exception:  # noqa: BLE001 - recorre ao rabbitmqctl dentro do contentor
        out = _run(["docker", "compose", "-p", PROJECT, "exec", "-T", "rabbitmq", "rabbitmqctl", "-q",
                    "list_queues", "name", "messages_ready", "messages_unacknowledged"])
        res = {}
        for line in out.splitlines():
            parts = line.split()
            if len(parts) == 3 and parts[1].isdigit():
                res[parts[0]] = (int(parts[1]), int(parts[2]))
        return res


class Monitor:
    """Thread que amostra recursos a cada `interval` segundos para CSV."""

    def __init__(self, out_dir: str, tag: str, interval: float = 2.0, queues_filter: str = ""):
        self.interval = interval
        self.queues_filter = queues_filter
        self.res_path = os.path.join(out_dir, f"{tag}_recursos.csv")
        self.sys_path = os.path.join(out_dir, f"{tag}_sistema.csv")
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self.t0 = None

    def start(self):
        self.t0 = time.time()
        self._thread.start()
        return self

    def stop(self):
        self._stop.set()
        self._thread.join(timeout=60)

    def _loop(self):
        with open(self.res_path, "w", newline="") as fr, open(self.sys_path, "w", newline="") as fs:
            wr = csv.writer(fr)
            ws = csv.writer(fs)
            wr.writerow(["t_s", "servico", "contentor", "cpu_pct", "mem_mib", "mem_limit_mib"])
            ws.writerow(["t_s", "tipo", "nome", "valor1", "valor2"])
            while not self._stop.is_set():
                tick = time.time()
                t = round(tick - self.t0, 2)
                containers = compose_containers()
                replicas: dict[str, int] = {}
                for svc in containers.values():
                    replicas[svc] = replicas.get(svc, 0) + 1
                for svc, n in sorted(replicas.items()):
                    ws.writerow([t, "replicas", svc, n, ""])
                for q, (ready, unacked) in sorted(queue_depths().items()):
                    if self.queues_filter in q:
                        ws.writerow([t, "fila", q, ready, unacked])
                for row in docker_stats():
                    svc = containers.get(row["container"])
                    if svc is None:
                        continue
                    wr.writerow([t, svc, row["container"], row["cpu_pct"], round(row["mem_mib"], 1), round(row["mem_limit_mib"], 1)])
                fr.flush()
                fs.flush()
                self._stop.wait(max(0.0, self.interval - (time.time() - tick)))
