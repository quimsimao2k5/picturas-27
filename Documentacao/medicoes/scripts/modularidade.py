"""Métricas de modularidade do processamento de vídeo (M1 e M2).

M2 — acoplamento estático (não precisa da solução a correr):
  * responsabilidades de vídeo por unidade implantável (serviço Compose), a partir
    dos ficheiros que cada Dockerfile copia para a imagem;
  * tamanho e complexidade ciclomática (radon) do código Python de vídeo;
  * dependências internas entre módulos Python de vídeo (fan-out, fan-in);
  * dispersão do conhecimento sobre as ferramentas de vídeo: ficheiros e
    serviços que referem cada procedimento de vídeo;
  * efeitos implementados em duplicado (ferramenta de imagem + worker de vídeo);
  * tamanho e ramificação imagem/vídeo no orquestrador (`projects`).

M1 — impacto de uma mudança: dado um conjunto de ficheiros alterados (lista ou
`git diff --name-only A..B`), indica as unidades implantáveis que têm de ser
reconstruídas/reiniciadas e as responsabilidades de vídeo interrompidas.

Uso:
  python modularidade.py m2 --out ../baseline/m2
  python modularidade.py m1 --diff <base>..<ramo-de-sonda> --nome C2 --out ../baseline/m1
  python modularidade.py m1 --ficheiros docker-compose.yaml:video_tool --nome C1 --out ../baseline/m1
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
IGNORAR = ("node_modules", "/.git/", "/tests/", "/.next/", "__pycache__", "/Documentacao/")

PROCEDIMENTOS_VIDEO = ["trim", "speed", "subtitles", "extract_frames"]

# Marcadores de cada responsabilidade de vídeo no código (procurados nos ficheiros
# que cada imagem Docker inclui). Mantêm-se iguais na medição final.
RESPONSABILIDADES = {
    "consumir_trabalhos_video": re.compile(r"basic_consume\(.*(VIDEO|video)"),
    "efeitos_por_fotograma": re.compile(r"def apply_frame_effects|FRAME_EFFECTS\s*="),
    "efeitos_de_tempo": re.compile(r"InvalidTrim|InvalidSpeed|TIME_EFFECTS"),
    "legendagem": re.compile(r"faster_whisper|WhisperModel"),
    "extracao_fotogramas": re.compile(r"def extract_frames|extract_frames\("),
    "codificacao_ffmpeg": re.compile(r"[\"']ffmpeg[\"']"),
}


# ---------------------------------------------------------------- Compose/Docker
def compose_services() -> dict[str, dict]:
    """{serviço: {context, dockerfile}} para os serviços com `build` (lê o YAML sem dependências)."""
    path = os.path.join(REPO, "docker-compose.yaml")
    services, cur, in_services, in_build = {}, None, False, False
    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if re.match(r"^services:\s*$", line):
            in_services = True
            continue
        if in_services and re.match(r"^\S", line):
            in_services = False
        if not in_services:
            continue
        m = re.match(r"^  ([A-Za-z0-9_\-]+):\s*$", line)
        if m:
            cur, in_build = m.group(1), False
            continue
        if cur is None:
            continue
        if re.match(r"^    build:\s*$", line):
            in_build = True
            services.setdefault(cur, {"context": ".", "dockerfile": "Dockerfile"})
            continue
        m = re.match(r"^    build:\s*(\S+)\s*$", line)
        if m:
            services[cur] = {"context": m.group(1), "dockerfile": "Dockerfile"}
            continue
        if in_build:
            m = re.match(r"^      (context|dockerfile):\s*(\S+)", line)
            if m:
                services[cur][m.group(1)] = m.group(2)
            elif re.match(r"^    \S", line):
                in_build = False
    return services


def compose_env_block(service: str) -> str:
    """Texto do bloco do serviço no docker-compose.yaml (para detetar mudanças de configuração)."""
    text = open(os.path.join(REPO, "docker-compose.yaml"), encoding="utf-8").read()
    m = re.search(rf"^  {re.escape(service)}:\n((?:    .*\n|\n)*)", text, re.M)
    return m.group(1) if m else ""


def copied_paths(svc: dict) -> list[str]:
    """Caminhos (relativos ao repositório) que o Dockerfile do serviço copia para a imagem."""
    ctx = os.path.normpath(os.path.join(REPO, svc["context"]))
    df = os.path.join(ctx, svc["dockerfile"])
    paths = []
    if not os.path.exists(df):
        return paths
    for line in open(df, encoding="utf-8"):
        m = re.match(r"^\s*(COPY|ADD)\s+(.*)$", line, re.I)
        if not m or "--from" in line:
            continue
        parts = [p for p in m.group(2).split() if not p.startswith("--")]
        for src in parts[:-1]:
            paths.append(os.path.relpath(os.path.normpath(os.path.join(ctx, src)), REPO))
    return paths


def files_under(rel: str) -> list[str]:
    absp = os.path.join(REPO, rel)
    if os.path.isfile(absp):
        return [rel]
    out = []
    for root, dirs, files in os.walk(absp):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "__pycache__", ".next")]
        for f in files:
            out.append(os.path.relpath(os.path.join(root, f), REPO))
    return out


def unit_files() -> dict[str, list[str]]:
    return {name: sorted({f for p in copied_paths(svc) for f in files_under(p)})
            for name, svc in compose_services().items()}


def read(rel: str) -> str:
    try:
        return open(os.path.join(REPO, rel), encoding="utf-8", errors="ignore").read()
    except OSError:
        return ""


def responsabilidades_por_unidade(units: dict[str, list[str]]) -> dict[str, list[str]]:
    res = {}
    for name, files in units.items():
        code = [f for f in files if f.endswith((".py", ".js", ".ts")) and not any(i in "/" + f for i in IGNORAR)]
        found = sorted(r for r, rx in RESPONSABILIDADES.items() if any(rx.search(read(f)) for f in code))
        if found:
            res[name] = found
    return res


# ------------------------------------------------------------------- Python
def video_python_files(units, resp) -> list[str]:
    files = set()
    for name in resp:
        files.update(f for f in units[name] if f.endswith(".py") and not any(i in "/" + f for i in IGNORAR))
    return sorted(files)


def radon_metrics(files: list[str]) -> dict:
    try:
        from radon.complexity import cc_visit
        from radon.metrics import mi_visit
        from radon.raw import analyze
    except ImportError:
        return {"erro": "radon não instalado (pip install radon)"}
    per_file, all_cc = {}, []
    for f in files:
        src = read(f)
        try:
            raw = analyze(src)
            blocks = cc_visit(src)
            mi = mi_visit(src, multi=True)
        except Exception as e:  # noqa: BLE001
            per_file[f] = {"erro": str(e)}
            continue
        ccs = [b.complexity for b in blocks]
        all_cc += ccs
        per_file[f] = {"sloc": raw.sloc, "funcoes": len(ccs), "cc_max": max(ccs, default=0),
                       "cc_media": round(sum(ccs) / len(ccs), 2) if ccs else 0, "mi": round(mi, 1)}
    return {
        "por_ficheiro": per_file,
        "sloc_total": sum(v.get("sloc", 0) for v in per_file.values()),
        "funcoes": len(all_cc),
        "cc_media": round(sum(all_cc) / len(all_cc), 2) if all_cc else 0,
        "cc_max": max(all_cc, default=0),
        "funcoes_cc_maior_10": sum(1 for c in all_cc if c > 10),
    }


def python_imports(files: list[str]) -> dict:
    """Grafo de dependências internas entre os módulos Python de vídeo."""
    mods = {os.path.splitext(os.path.basename(f))[0]: f for f in files}
    out_deps = defaultdict(set)
    for name, f in mods.items():
        try:
            tree = ast.parse(read(f))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            targets = []
            if isinstance(node, ast.Import):
                targets = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                targets = [node.module]
            for t in targets:
                base = t.split(".")[-1] if t.split(".")[0] in ("utils", "video") else t.split(".")[0]
                if base in mods and base != name:
                    out_deps[name].add(base)
    fan_in = defaultdict(int)
    for deps in out_deps.values():
        for d in deps:
            fan_in[d] += 1
    return {
        "modulos": sorted(mods),
        "dependencias": {k: sorted(v) for k, v in sorted(out_deps.items())},
        "fan_out_max": max((len(v) for v in out_deps.values()), default=0),
        "fan_in_max": max(fan_in.values(), default=0),
        "arestas": sum(len(v) for v in out_deps.values()),
    }


# ----------------------------------------------------------------- dispersão
def all_source_files() -> list[str]:
    out = []
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "__pycache__", ".next", "Documentacao", "tests")]
        for f in files:
            if f.endswith((".py", ".js", ".ts", ".tsx")):
                out.append(os.path.relpath(os.path.join(root, f), REPO))
    return out


def componente(rel: str) -> str:
    parts = rel.split(os.sep)
    return "/".join(parts[:2]) if parts[0] == "Tools" else parts[0]


def dispersao() -> dict:
    files = all_source_files()
    res = {}
    for proc in PROCEDIMENTOS_VIDEO:
        rx = re.compile(rf"[\"']{proc}[\"']")
        hits = sorted(f for f in files if rx.search(read(f)))
        res[proc] = {"ficheiros": hits, "n_ficheiros": len(hits), "componentes": sorted({componente(f) for f in hits})}
    return res


def duplicacao() -> dict:
    """Efeitos por fotograma do worker de vídeo que também existem como ferramenta de imagem."""
    src = read("Tools/video/effects.py")
    m = re.search(r"FRAME_EFFECTS\s*=\s*\{(.*?)\}", src, re.S)
    names = re.findall(r"[\"'](\w+)[\"']", m.group(1)) if m else []
    dup = [n for n in names if os.path.isdir(os.path.join(REPO, "Tools", n))]
    return {"efeitos_video": names, "duplicados_com_ferramenta_imagem": dup, "n_duplicados": len(dup)}


def orquestrador() -> dict:
    res = {}
    for f in ["projects/routes/projects.js", "projects/utils/video.js"]:
        src = read(f)
        res[f] = {
            "linhas": src.count("\n"),
            "referencias_video": len(re.findall(r"isVideoMedia|media_type|videoPipeline|VIDEO_TOOLS|PER_VIDEO_TOOLS|[\"']video[\"']", src)),
            "rotas": len(re.findall(r"router\.(get|post|put|delete|patch)\(", src)),
        }
    return res


# ---------------------------------------------------------------------- M1
def m1(changed: list[str], nome: str) -> dict:
    units = unit_files()
    resp = responsabilidades_por_unidade(units)
    services = compose_services()
    rebuild, restart = set(), set()
    for item in changed:
        path, _, svc_cfg = item.partition(":")
        if path == "docker-compose.yaml":
            # mudança de configuração: reinicia os serviços indicados (ou todos, se não indicado)
            restart.update([svc_cfg] if svc_cfg else services)
            continue
        for name, files in units.items():
            if path in files:
                rebuild.add(name)
                restart.add(name)
    interrompidas = sorted({r for u in restart for r in resp.get(u, [])})
    return {
        "mudanca": nome,
        "ficheiros_alterados": changed,
        "n_ficheiros": len(changed),
        "componentes_alterados": sorted({componente(p.partition(':')[0]) for p in changed}),
        "unidades_a_reconstruir": sorted(rebuild),
        "unidades_a_reiniciar": sorted(restart),
        "responsabilidades_de_video_interrompidas": interrompidas,
        "n_responsabilidades_interrompidas": len(interrompidas),
    }


# --------------------------------------------------------------------- main
def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("metrica", choices=["m1", "m2"])
    p.add_argument("--out", required=True)
    p.add_argument("--diff", help="intervalo git A..B (M1)")
    p.add_argument("--ficheiros", nargs="*", default=[], help="ficheiros alterados (M1); docker-compose.yaml:<serviço> para configuração")
    p.add_argument("--nome", default="mudanca", help="identificador da mudança (M1)")
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, cwd=REPO).stdout.strip()

    if a.metrica == "m2":
        units = unit_files()
        resp = responsabilidades_por_unidade(units)
        pyfiles = video_python_files(units, resp)
        res = {
            "commit": commit,
            "responsabilidades_por_unidade": resp,
            "unidades_com_video": len(resp),
            "max_responsabilidades_numa_unidade": max((len(v) for v in resp.values()), default=0),
            "python_video": radon_metrics(pyfiles),
            "dependencias_python_video": python_imports(pyfiles),
            "dispersao_procedimentos_video": dispersao(),
            "efeitos_duplicados": duplicacao(),
            "orquestrador": orquestrador(),
        }
        path = os.path.join(a.out, "m2_modularidade.json")
    else:
        changed = list(a.ficheiros)
        if a.diff:
            changed += subprocess.run(["git", "diff", "--name-only", a.diff], capture_output=True,
                                      text=True, cwd=REPO).stdout.split()
        res = m1(changed, a.nome) | {"commit": commit}
        path = os.path.join(a.out, f"m1_{a.nome}.json")

    with open(path, "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(json.dumps(res, indent=2, ensure_ascii=False)[:4000])
    print(f"\nGuardado em {path}")


if __name__ == "__main__":
    main()
