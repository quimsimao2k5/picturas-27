"""Teste de ponta a ponta da solução (decisão D32): imagens e vídeos processados pela API pública.

Corre-se antes e depois do refactoring, com a solução lançada, e tem de dar o mesmo resultado.
Usa o cliente dos scripts de medição (conta, login, projeto, upload, pipeline, WebSocket).

Casos:
  A. Projeto só com uma imagem: brilho → rotação 90°. Pré-visualização e resultado (imagem rodada).
  B. Projeto misto (imagem + vídeo de 10 s): brilho → corte do vídeo (1–6 s) → legendas.
     A imagem recebe só o brilho; o vídeo sai em MP4 com ≈ 5 s. Pré-visualização do vídeo (≤ 3 s).
  C. Projeto só com um vídeo: brilho → extração de 3 fotogramas PNG. Resultado: 3 imagens.

Uso:  python ponta_a_ponta.py --out <pasta>     (escreve ponta_a_ponta.json e ponta_a_ponta.txt)
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import threading
import time
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(REPO, "Documentacao", "medicoes", "scripts"))

from picturas_client import API, PicturasUser, _check  # noqa: E402

IMAGEM = os.path.join(REPO, "Tools", "text_ai", "easy_test.png")          # 640×480 PNG do repositório
VIDEO = os.path.join(REPO, "samples", "video", "sample_10s_720p.mp4")
TIMEOUT = 600


# ------------------------------------------------------------------ verificações de ficheiros
def png_size(data: bytes):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def mp4_duration(data: bytes):
    """Duração (s) a partir da caixa mvhd de um MP4, ou None se não for MP4."""
    if data[4:8] != b"ftyp":
        return None
    i = data.find(b"mvhd")
    if i < 0:
        return None
    version = data[i + 4]
    if version == 1:
        timescale, duration = struct.unpack(">IQ", data[i + 24:i + 36])
    else:
        timescale, duration = struct.unpack(">II", data[i + 16:i + 24])
    return duration / timescale if timescale else None


# ------------------------------------------------------------------ utilizador com eventos
class Cliente(PicturasUser):
    """Acrescenta ao cliente das medições: upload de imagens, pré-visualização e contagem de eventos."""

    def __init__(self, label):
        super().__init__(label)
        self.updates = 0
        self.errors = []
        self.previews = []
        self.lock = threading.Condition()

    def connect_ws(self):
        super().connect_ws()

        @self.sio.on("process-update")
        def _upd(_msg):
            with self.lock:
                self.updates += 1
                self.lock.notify_all()

        @self.sio.on("process-error")
        def _err(data):
            with self.lock:
                self.errors.append(str(data))
                self.lock.notify_all()

        @self.sio.on("preview-ready")
        def _prev(payload):
            # o projects envia um JSON {"imageUrl": ..., "textResults": [...], "mediaType": ...}
            url = payload
            try:
                url = json.loads(payload).get("imageUrl", payload) if isinstance(payload, str) else payload.get("imageUrl")
            except (ValueError, AttributeError):
                pass
            with self.lock:
                self.previews.append(("ok", url))
                self.lock.notify_all()

        @self.sio.on("preview-error")
        def _prev_err(data):
            with self.lock:
                self.previews.append(("erro", str(data)))
                self.lock.notify_all()

    def upload_image(self, path):
        with open(path, "rb") as f:
            _check(self.http.post(f"{API}/projects/{self.uid}/{self.pid}/img",
                                  files={"image": (os.path.basename(path), f, "image/png")},
                                  headers={"X-Project-Version": self._version()}, timeout=120),
                   "carregar imagem")

    def media(self):
        r = _check(self.http.get(f"{API}/projects/{self.uid}/{self.pid}", timeout=30), "obter projeto").json()
        return r.get("imgs", [])

    def preview(self, img_id):
        n = len(self.previews)
        _check(self.http.post(f"{API}/projects/{self.uid}/{self.pid}/preview/{img_id}",
                              json={"runnerUserId": self.uid},
                              headers={"X-Project-Version": self._version()}, timeout=60), "pré-visualizar")
        with self.lock:
            self.lock.wait_for(lambda: len(self.previews) > n, TIMEOUT)
        return self.previews[n] if len(self.previews) > n else ("erro", "timeout")

    def apply_and_wait(self, n_media):
        self.updates, self.errors = 0, []
        _check(self.http.post(f"{API}/projects/{self.uid}/{self.pid}/process",
                              json={"runnerUserId": self.uid},
                              headers={"X-Project-Version": self._version()}, timeout=120), "processar")
        with self.lock:
            self.lock.wait_for(lambda: self.updates >= n_media or self.errors, TIMEOUT)
        return self.updates, list(self.errors)

    def results(self, esperados, timeout=60):
        """Espera que os resultados fiquem gravados (commit da execução) e devolve a lista."""
        fim = time.time() + timeout
        res = []
        while time.time() < fim:
            r = self.http.get(f"{API}/projects/{self.uid}/{self.pid}/process/url", timeout=30)
            if r.status_code == 200:
                res = r.json().get("imgs", [])
                if len(res) >= esperados:
                    break
            time.sleep(1)
        return res

    def download(self, url):
        if url.startswith("/"):
            url = "https://localhost:8080" + url
        r = self.http.get(url, timeout=120)
        r.raise_for_status()
        return r.content


# ------------------------------------------------------------------ casos
class Relatorio:
    def __init__(self):
        self.checks = []

    def check(self, caso, descricao, ok, detalhe=""):
        self.checks.append({"caso": caso, "verificacao": descricao, "ok": bool(ok), "detalhe": str(detalhe)})
        print(f"  [{'OK' if ok else 'FALHA'}] {caso} · {descricao} {('— ' + str(detalhe)) if detalhe else ''}", flush=True)


def caso_a(rel):
    u = Cliente("e2e-a")
    try:
        u.register_and_login(); u.create_project(); u.upload_image(IMAGEM)
        u.add_tool("brightness", {"brightness": 1.2}); u.add_tool("rotate", {"degrees": 90})
        u.connect_ws()
        img_id = u.media()[0]["_id"]
        estado, url = u.preview(img_id)
        rel.check("A", "pré-visualização da imagem", estado == "ok", url if estado != "ok" else "")
        if estado == "ok":
            dims = png_size(u.download(url))
            rel.check("A", "pré-visualização é o PNG rodado (480×640)", dims == (480, 640), dims)
        upd, err = u.apply_and_wait(1)
        rel.check("A", "processamento sem erro", upd >= 1 and not err, err or f"{upd} evento(s)")
        res = u.results(1)
        rel.check("A", "1 resultado", len(res) == 1, len(res))
        if res:
            dims = png_size(u.download(res[0]["url"]))
            rel.check("A", "resultado é PNG rodado 90° (480×640)", dims == (480, 640), dims)
    finally:
        u.cleanup()


def caso_b(rel):
    u = Cliente("e2e-b")
    try:
        u.register_and_login(); u.create_project(); u.upload_image(IMAGEM); u.upload_video(VIDEO)
        media = u.media()
        vid = next(m["_id"] for m in media if m.get("media_type") == "video")
        img = next(m["_id"] for m in media if m.get("media_type") != "video")
        u.add_tool("brightness", {"brightness": 1.2})
        u.add_tool("trim", {"start": 1, "end": 6, "imgId": vid})
        u.add_tool("subtitles", {})
        u.connect_ws()
        estado, url = u.preview(vid)
        rel.check("B", "pré-visualização do vídeo", estado == "ok", url if estado != "ok" else "")
        if estado == "ok":
            d = mp4_duration(u.download(url))
            rel.check("B", "pré-visualização é MP4 com ≤ 3,5 s", d is not None and d <= 3.5, d)
        upd, err = u.apply_and_wait(2)
        rel.check("B", "processamento sem erro (imagem + vídeo)", upd >= 2 and not err, err or f"{upd} evento(s)")
        res = u.results(2)
        rel.check("B", "2 resultados", len(res) == 2, len(res))
        r_img = [r for r in res if str(r.get("og_img_id")) == str(img)]
        r_vid = [r for r in res if str(r.get("og_img_id")) == str(vid)]
        if r_img:
            dims = png_size(u.download(r_img[0]["url"]))
            rel.check("B", "imagem com o brilho e sem efeitos de vídeo (640×480 PNG)", dims == (640, 480), dims)
        else:
            rel.check("B", "resultado da imagem", False, "em falta")
        if r_vid:
            d = mp4_duration(u.download(r_vid[0]["url"]))
            rel.check("B", "vídeo em MP4 cortado para ≈ 5 s", d is not None and 4.5 <= d <= 5.5, d)
        else:
            rel.check("B", "resultado do vídeo", False, "em falta")
    finally:
        u.cleanup()


def caso_c(rel):
    u = Cliente("e2e-c")
    try:
        u.register_and_login(); u.create_project(); u.upload_video(VIDEO)
        u.add_tool("brightness", {"brightness": 1.2})
        u.add_tool("extract_frames", {"mode": "count", "count": 3, "format": "png"})
        u.connect_ws()
        upd, err = u.apply_and_wait(1)
        rel.check("C", "processamento sem erro", upd >= 1 and not err, err or f"{upd} evento(s)")
        res = u.results(3)
        rel.check("C", "3 fotogramas como resultados", len(res) == 3, len(res))
        tamanhos = {png_size(u.download(r["url"])) for r in res}
        rel.check("C", "fotogramas são PNG 1280×720", tamanhos == {(1280, 720)}, tamanhos)
        nomes = [r["name"] for r in res]
        rel.check("C", "nomes únicos", len(set(nomes)) == len(nomes), nomes)
    finally:
        u.cleanup()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", required=True)
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rel = Relatorio()
    inicio = datetime.now()
    for nome, caso in (("A", caso_a), ("B", caso_b), ("C", caso_c)):
        print(f"Caso {nome}", flush=True)
        try:
            caso(rel)
        except Exception as e:  # noqa: BLE001 - um erro inesperado conta como falha do caso
            rel.check(nome, "caso executado até ao fim", False, repr(e))
    ok = sum(c["ok"] for c in rel.checks)
    total = len(rel.checks)
    resumo = {"inicio": inicio.isoformat(timespec="seconds"), "verificacoes_ok": ok, "verificacoes": total,
              "resultado": "OK" if ok == total else "FALHA", "detalhe": rel.checks}
    json.dump(resumo, open(os.path.join(a.out, "ponta_a_ponta.json"), "w"), indent=2, ensure_ascii=False)
    with open(os.path.join(a.out, "ponta_a_ponta.txt"), "w") as f:
        f.write(f"Teste de ponta a ponta — {inicio:%Y-%m-%d %H:%M}\n\n")
        for c in rel.checks:
            f.write(f"[{'OK' if c['ok'] else 'FALHA'}] {c['caso']} · {c['verificacao']}"
                    f"{(' — ' + c['detalhe']) if c['detalhe'] and not c['ok'] else ''}\n")
        f.write(f"\n{ok}/{total} verificações OK — {resumo['resultado']}\n")
    print(f"\n{ok}/{total} verificações OK — {resumo['resultado']}")
    sys.exit(0 if ok == total else 1)


if __name__ == "__main__":
    main()
