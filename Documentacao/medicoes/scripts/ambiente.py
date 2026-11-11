"""Regista o ambiente da medição em <out>/ambiente.json (máquina, Docker, commit, imagens)."""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))


def sh(cmd: list[str]) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=60, cwd=REPO).stdout.strip()
    except Exception as e:  # noqa: BLE001
        return f"(indisponível: {e})"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)

    info = {
        "registado_em": datetime.now(timezone.utc).isoformat(),
        "anfitriao": {
            "sistema": platform.platform(),
            "maquina": sh(["sysctl", "-n", "hw.model"]) or platform.machine(),
            "processador": sh(["sysctl", "-n", "machdep.cpu.brand_string"]) or platform.processor(),
            "nucleos": sh(["sysctl", "-n", "hw.ncpu"]),
            "memoria_bytes": sh(["sysctl", "-n", "hw.memsize"]),
            "macos": sh(["sw_vers"]),
        },
        "docker": {
            "versao": sh(["docker", "version", "--format", "{{json .}}"]),
            "cpus_atribuidos": sh(["docker", "info", "--format", "{{.NCPU}}"]),
            "memoria_atribuida_bytes": sh(["docker", "info", "--format", "{{.MemTotal}}"]),
            "compose": sh(["docker", "compose", "version", "--short"]),
        },
        "repositorio": {
            "commit": sh(["git", "rev-parse", "HEAD"]),
            "descricao": sh(["git", "log", "-1", "--format=%h %s"]),
            "alteracoes_locais": sh(["git", "status", "--short"]),
        },
        "servicos": sh(["docker", "compose", "ps", "--format", "{{.Service}}\t{{.Image}}\t{{.Status}}"]),
        "imagens": sh(["docker", "compose", "images"]),
    }
    path = os.path.join(a.out, "ambiente.json")
    with open(path, "w") as f:
        json.dump(info, f, indent=2, ensure_ascii=False)
    print(f"Ambiente registado em {path}")


if __name__ == "__main__":
    main()
