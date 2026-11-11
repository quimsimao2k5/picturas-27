"""Cenários de medição da Fase 2 (par A: elasticidade + modularidade do vídeo).

  aquecimento  descarrega o modelo Whisper e aquece caches (resultados descartados)
  s1           bloqueio pela legendagem
  s2           carga concorrente (1, 2, 4 e 8 utilizadores)
  s3           adaptação à carga (rajada e depois calma, com amostragem de recursos)
  s4           tempo de edição / duração do vídeo, um vídeo de cada vez
  m3           isolamento de falhas (a legendagem é terminada a meio)
  todos        aquecimento + s4 + s1 + s2 + s3 + m3

Exemplo:  python cenarios.py todos --reps 5 --out ../baseline

Os cenários e o método estão descritos em ../PLANO_MEDICAO.md. Cada cenário grava
um CSV por cenário em <out>/<cenario>/ e as amostras de recursos ao lado.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import threading
import time
from datetime import datetime

from monitor import Monitor, PROJECT
from picturas_client import PicturasUser, prepare_user

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SAMPLES = os.path.join(REPO, "samples", "video")
EXTRA = os.path.abspath(os.path.join(HERE, "..", "videos"))

VIDEO_10S = os.path.join(SAMPLES, "sample_10s_720p.mp4")
VIDEO_FALA = os.path.join(SAMPLES, "speech_mandela_177s_1080p.webm")
VIDEO_30S = os.path.join(EXTRA, "02_curto_720p_30s.mp4")
VIDEO_150S = os.path.join(EXTRA, "01_demo_1080p_150s.mp4")

BRILHO = [("brightness", {"brightness": 1.2})]
LEGENDAS = [("subtitles", {})]

FIELDS = ["cenario", "rep", "n", "papel", "utilizador", "video", "pipeline", "duracao_video_s",
          "submetido_epoch", "inicio_epoch", "fim_epoch", "espera_s", "total_s",
          "eventos_progresso", "erro"]


# --------------------------------------------------------------------------- util
def log(msg: str):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def fmt(x) -> str:
    return "n/d" if x is None else f"{x:.1f}"


# Duração dos vídeos usados (medida com ffprobe a 11/11/2026), usada quando o
# anfitrião não tem ffprobe.
DURACOES = {"sample_10s_720p.mp4": 10.0, "speech_mandela_177s_1080p.webm": 176.62,
            "02_curto_720p_30s.mp4": 30.0, "01_demo_1080p_150s.mp4": 150.0}


def duracao(path: str) -> float | None:
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, timeout=30)
        return round(float(out.stdout.strip()), 2)
    except Exception:  # noqa: BLE001 - ffprobe é opcional no anfitrião
        return DURACOES.get(os.path.basename(path))


def row(cenario, rep, n, papel, u: PicturasUser, video, pipeline):
    j = u.job
    r = lambda x: None if x is None else round(x, 3)  # noqa: E731
    return {
        "cenario": cenario, "rep": rep, "n": n, "papel": papel, "utilizador": u.label,
        "video": os.path.basename(video), "pipeline": "+".join(p for p, _ in pipeline),
        "duracao_video_s": duracao(video),
        "submetido_epoch": r(j.submitted), "inicio_epoch": r(j.first_progress), "fim_epoch": r(j.finished),
        "espera_s": r(j.wait_s), "total_s": r(j.total_s),
        "eventos_progresso": j.progress_events, "erro": j.error or "",
    }


class Writer:
    def __init__(self, out_dir: str, cenario: str):
        self.dir = os.path.join(out_dir, cenario)
        os.makedirs(self.dir, exist_ok=True)
        self.path = os.path.join(self.dir, f"{cenario}.csv")
        new = not os.path.exists(self.path)
        self.f = open(self.path, "a", newline="")
        self.w = csv.DictWriter(self.f, fieldnames=FIELDS)
        if new:
            self.w.writeheader()

    def write(self, rows):
        for r in rows:
            self.w.writerow(r)
        self.f.flush()

    def close(self):
        self.f.close()


def submit_together(users: list[PicturasUser]):
    """Submete todos os pedidos ao mesmo tempo (uma thread por utilizador)."""
    barrier = threading.Barrier(len(users))
    errors = []

    def go(u):
        barrier.wait()
        try:
            u.process()
        except Exception as e:  # noqa: BLE001
            u.job.error = f"submissão: {e}"
            u.job._done.set()
            errors.append(e)

    ts = [threading.Thread(target=go, args=(u,)) for u in users]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return errors


def wait_all(users, timeout_s):
    deadline = time.time() + timeout_s
    for u in users:
        u.wait(max(1.0, deadline - time.time()))


def wait_until(cond, timeout_s, step=0.5):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if cond():
            return True
        time.sleep(step)
    return False


def cleanup(users):
    for u in users:
        u.cleanup()


# ---------------------------------------------------------------------- cenários
def aquecimento(args):
    log("Aquecimento: legendagem do vídeo de fala (descarrega o modelo Whisper) e um brilho no vídeo de 10 s")
    users = [prepare_user("aquec-legendas", VIDEO_FALA, LEGENDAS), prepare_user("aquec-brilho", VIDEO_10S, BRILHO)]
    for u in users:
        u.process()
        u.wait(args.timeout * 2)  # o primeiro uso inclui a descarga do modelo
        log(f"  {u.label}: total={u.job.total_s} erro={u.job.error}")
    cleanup(users)


def s1(args):
    """Um vídeo curto (10 s, brilho) pedido enquanto corre uma legendagem (177 s)."""
    w = Writer(args.out, "s1")
    for rep in range(1, args.reps + 1):
        log(f"S1 rep {rep}/{args.reps}: controlo (vídeo curto sozinho)")
        ctrl = prepare_user(f"s1r{rep}-controlo", VIDEO_10S, BRILHO)
        ctrl.process()
        ctrl.wait(args.timeout)
        w.write([row("s1", rep, 1, "curto_sozinho", ctrl, VIDEO_10S, BRILHO)])
        cleanup([ctrl])
        time.sleep(args.pausa)

        log(f"S1 rep {rep}/{args.reps}: legendagem + vídeo curto")
        longo = prepare_user(f"s1r{rep}-legendas", VIDEO_FALA, LEGENDAS)
        curto = prepare_user(f"s1r{rep}-curto", VIDEO_10S, BRILHO)
        mon = Monitor(w.dir, f"s1_rep{rep}", args.intervalo).start()
        longo.process()
        # o vídeo curto só é pedido depois de a legendagem ter começado a ser processada
        if not wait_until(lambda: longo.job.first_progress is not None or longo.job._done.is_set(), args.timeout):
            log("  aviso: a legendagem não começou dentro do tempo limite")
        curto.process()
        wait_all([curto, longo], args.timeout)
        mon.stop()
        w.write([row("s1", rep, 2, "legendagem", longo, VIDEO_FALA, LEGENDAS),
                 row("s1", rep, 2, "curto_com_legendagem", curto, VIDEO_10S, BRILHO)])
        log(f"  curto: sozinho={fmt(ctrl.job.total_s)}s com legendagem={fmt(curto.job.total_s)}s "
            f"(espera {fmt(curto.job.wait_s)}s)")
        cleanup([longo, curto])
        time.sleep(args.pausa)
    w.close()


def s2(args):
    """N utilizadores pedem ao mesmo tempo um brilho no vídeo de 10 s."""
    w = Writer(args.out, "s2")
    for n in args.niveis:
        for rep in range(1, args.reps + 1):
            log(f"S2 N={n} rep {rep}/{args.reps}")
            users = [prepare_user(f"s2n{n}r{rep}-u{i}", VIDEO_10S, BRILHO) for i in range(1, n + 1)]
            mon = Monitor(w.dir, f"s2_n{n}_rep{rep}", args.intervalo).start()
            submit_together(users)
            wait_all(users, args.timeout)
            mon.stop()
            w.write([row("s2", rep, n, "curto", u, VIDEO_10S, BRILHO) for u in users])
            done = [u.job.finished for u in users if u.job.finished and not u.job.error]
            subs = [u.job.submitted for u in users if u.job.submitted]
            if done and subs:
                span = max(done) - min(subs)
                log(f"  makespan={span:.1f}s débito={len(done) / span * 60:.2f} vídeos/min")
            cleanup(users)
            time.sleep(args.pausa)
    w.close()


def s3(args):
    """Rajada (8 vídeos curtos + 1 legendagem) entre dois períodos de calma, com amostragem de recursos."""
    w = Writer(args.out, "s3")
    for rep in range(1, args.reps + 1):
        log(f"S3 rep {rep}/{args.reps}")
        curtos = [prepare_user(f"s3r{rep}-curto{i}", VIDEO_10S, BRILHO) for i in range(1, 9)]
        longo = prepare_user(f"s3r{rep}-legendas", VIDEO_FALA, LEGENDAS)
        mon = Monitor(w.dir, f"s3_rep{rep}", args.intervalo).start()
        marcos = {"inicio_monitor": mon.t0}
        time.sleep(args.calma_antes)
        marcos["rajada"] = time.time()
        submit_together(curtos + [longo])
        wait_all(curtos + [longo], args.timeout)
        marcos["fim_trabalhos"] = time.time()
        time.sleep(args.calma_depois)
        marcos["fim_monitor"] = time.time()
        mon.stop()
        with open(os.path.join(w.dir, f"s3_rep{rep}_marcos.json"), "w") as f:
            json.dump({k: round(v - mon.t0, 2) for k, v in marcos.items()}, f, indent=2)
        w.write([row("s3", rep, 9, "curto", u, VIDEO_10S, BRILHO) for u in curtos]
                + [row("s3", rep, 9, "legendagem", longo, VIDEO_FALA, LEGENDAS)])
        cleanup(curtos + [longo])
        time.sleep(args.pausa)
    w.close()


def s4(args):
    """Tempo de edição de um vídeo sozinho, em proporção à sua duração (REQ-VID-EDIT-010)."""
    w = Writer(args.out, "s4")
    videos = [VIDEO_10S, VIDEO_30S, VIDEO_150S]
    for v in videos:
        if not os.path.exists(v):
            sys.exit(f"Falta o vídeo {v} (ver PLANO_MEDICAO.md, secção Vídeos)")
    for rep in range(1, args.reps + 1):
        for v in videos:
            log(f"S4 rep {rep}/{args.reps}: {os.path.basename(v)}")
            u = prepare_user(f"s4r{rep}-{os.path.basename(v)[:8]}", v, BRILHO)
            u.process()
            u.wait(args.timeout)
            w.write([row("s4", rep, 1, "sozinho", u, v, BRILHO)])
            cleanup([u])
            time.sleep(args.pausa)
    w.close()


def m3(args):
    """Isolamento de falhas: a componente que faz a legendagem é terminada a meio de um trabalho.

    Na base a legendagem corre no `video_tool`; depois do refactoring, indica-se o
    serviço que a faz com --servico-legendas. Mede-se o que acontece aos 4 vídeos
    curtos (sem legendas) pedidos durante a legendagem.
    """
    w = Writer(args.out, "m3")
    svc = args.servico_legendas
    eventos_path = os.path.join(w.dir, "m3_eventos.csv")
    new = not os.path.exists(eventos_path)
    with open(eventos_path, "a", newline="") as fe:
        ev = csv.writer(fe)
        if new:
            ev.writerow(["rep", "evento", "epoch", "detalhe"])
        for rep in range(1, args.reps + 1):
            log(f"M3 rep {rep}/{args.reps} (serviço terminado: {svc})")
            longo = prepare_user(f"m3r{rep}-legendas", VIDEO_FALA, LEGENDAS)
            curtos = [prepare_user(f"m3r{rep}-curto{i}", VIDEO_10S, BRILHO) for i in range(1, 5)]
            mon = Monitor(w.dir, f"m3_rep{rep}", args.intervalo).start()
            longo.process()
            wait_until(lambda: (longo.job.last_percent or 0) >= 20 or longo.job._done.is_set(), args.timeout)
            submit_together(curtos)
            time.sleep(5)
            t_kill = time.time()
            out = subprocess.run(["docker", "compose", "-p", PROJECT, "kill", "-s", "SIGKILL", svc],
                                 capture_output=True, text=True, cwd=REPO)
            ev.writerow([rep, "kill", round(t_kill, 3), (out.stdout + out.stderr).strip()[:200]])
            time.sleep(args.m3_reinicio)
            t_start = time.time()
            out = subprocess.run(["docker", "compose", "-p", PROJECT, "start", svc],
                                 capture_output=True, text=True, cwd=REPO)
            ev.writerow([rep, "start", round(t_start, 3), (out.stdout + out.stderr).strip()[:200]])
            fe.flush()
            wait_all(curtos + [longo], args.timeout)
            mon.stop()
            w.write([row("m3", rep, 5, "legendagem", longo, VIDEO_FALA, LEGENDAS)]
                    + [row("m3", rep, 5, "curto", u, VIDEO_10S, BRILHO) for u in curtos])
            cleanup(curtos + [longo])
            time.sleep(args.pausa)
    w.close()


CENARIOS = {"aquecimento": aquecimento, "s1": s1, "s2": s2, "s3": s3, "s4": s4, "m3": m3}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cenario", choices=[*CENARIOS, "todos"])
    p.add_argument("--reps", type=int, default=5)
    p.add_argument("--out", required=True, help="pasta de resultados (ex.: ../baseline)")
    p.add_argument("--timeout", type=float, default=1800, help="tempo máximo por trabalho, em s")
    p.add_argument("--pausa", type=float, default=10, help="pausa entre repetições, em s")
    p.add_argument("--intervalo", type=float, default=2, help="intervalo de amostragem de recursos, em s")
    p.add_argument("--niveis", type=int, nargs="+", default=[1, 2, 4, 8], help="N de utilizadores em S2")
    p.add_argument("--calma-antes", type=float, default=30)
    p.add_argument("--calma-depois", type=float, default=120)
    p.add_argument("--servico-legendas", default="video_tool", help="serviço Compose que faz a legendagem (M3)")
    p.add_argument("--m3-reinicio", type=float, default=5, help="segundos entre terminar e voltar a arrancar (M3)")
    p.add_argument("--servicos-log", nargs="+", default=["video_tool", "projects"],
                   help="serviços Compose cujos logs se guardam em cada cenário (após o refactoring, os serviços de vídeo novos)")
    args = p.parse_args()
    args.out = os.path.abspath(args.out)
    os.makedirs(args.out, exist_ok=True)

    ordem = ["aquecimento", "s4", "s1", "s2", "s3", "m3"] if args.cenario == "todos" else [args.cenario]
    for c in ordem:
        t = time.time()
        log(f"=== {c} ===")
        try:
            CENARIOS[c](args)
        finally:
            guardar_logs(c, t, args)
        log(f"=== {c} concluído em {(time.time() - t) / 60:.1f} min ===")


def guardar_logs(cenario: str, desde_epoch: float, args):
    """Guarda os logs dos serviços (com hora) durante o cenário, para verificação cruzada dos tempos.

    O `video_tool` regista, por vídeo, `[video] msg=... ok frames=... t=XXs`: é uma fonte
    independente destes scripts para confirmar os tempos dos CSV.
    """
    pasta = os.path.join(args.out, cenario)
    os.makedirs(pasta, exist_ok=True)
    desde = datetime.fromtimestamp(desde_epoch - 5).astimezone().isoformat(timespec="seconds")
    cmd = ["docker", "compose", "-p", PROJECT, "logs", "--no-color", "--timestamps", "--since", desde, *args.servicos_log]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO, timeout=300)
        texto = out.stdout + (f"\n[stderr]\n{out.stderr}" if out.stderr.strip() else "")
    except (OSError, subprocess.TimeoutExpired) as e:
        texto = f"(não foi possível obter os logs: {e})"
    with open(os.path.join(pasta, f"logs_{cenario}.txt"), "w") as f:
        f.write(f"# {' '.join(cmd)}\n{texto}")
    log(f"  logs de {', '.join(args.servicos_log)} guardados em {cenario}/logs_{cenario}.txt")


if __name__ == "__main__":
    main()
