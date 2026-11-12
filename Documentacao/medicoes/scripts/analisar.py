"""Resume os resultados de uma medição (baseline ou final) em <pasta>/resumo.md e resumo.json.

Uso:  python analisar.py ../baseline
Para cada métrica: mediana das 5 repetições, mínimo, máximo e intervalo interquartil (IQR).
"""

from __future__ import annotations

import csv
import json
import os
import statistics as st
import sys
from collections import defaultdict


def load(path):
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def summ(values):
    v = sorted(x for x in values if x is not None)
    if not v:
        return {"n": 0}
    q = st.quantiles(v, n=4) if len(v) >= 2 else [v[0], v[0], v[0]]
    return {"n": len(v), "mediana": round(st.median(v), 2), "min": round(v[0], 2), "max": round(v[-1], 2),
            "iqr": round(q[2] - q[0], 2)}


def by(rows, *keys):
    g = defaultdict(list)
    for r in rows:
        g[tuple(r[k] for k in keys)].append(r)
    return g


TOLERANCIA_FIM_S = 1.0


def concorrencia(rs):
    """A partir dos instantes de cada trabalho: máximo de trabalhos à espera (submetidos e ainda
    sem progresso) e máximo de trabalhos em processamento ao mesmo tempo (entre o primeiro
    progresso e o fim). Não depende do RabbitMQ, por isso é comparável antes e depois."""
    ev = []
    for r in rs:
        sub, ini, fim = num(r["submetido_epoch"]), num(r["inicio_epoch"]), num(r["fim_epoch"])
        if sub is None:
            continue
        ini = ini if ini is not None else fim
        # no mesmo instante, as saídas contam antes das entradas
        if ini is not None:
            ev += [(sub, 2, +1), (ini, 1, -1)]
        if ini is not None and fim is not None:
            # o "fim" inclui gravar o resultado e avisar o utilizador (0,3–0,9 s na verificação
            # cruzada com o log do worker); sobreposições abaixo de 1 s não são paralelismo
            ev += [(ini, 3, +1), (max(ini, fim - TOLERANCIA_FIM_S), 0, -1)]
    espera = proc = max_espera = max_proc = 0
    for t, kind, delta in sorted(ev):
        if kind in (1, 2):
            espera += delta
        else:
            proc += delta
        max_espera, max_proc = max(max_espera, espera), max(max_proc, proc)
    return max_espera, max_proc


def s1(d):
    rows = load(os.path.join(d, "s1", "s1.csv"))
    if not rows:
        return None
    atraso, espera, total_c, total_s, total_l = [], [], [], [], []
    for (_rep,), rs in by(rows, "rep").items():
        p = {r["papel"]: r for r in rs}
        so, com, leg = p.get("curto_sozinho"), p.get("curto_com_legendagem"), p.get("legendagem")
        if so and com and num(so["total_s"]) is not None and num(com["total_s"]) is not None:
            atraso.append(num(com["total_s"]) - num(so["total_s"]))
        if com:
            espera.append(num(com["espera_s"]))
            total_c.append(num(com["total_s"]))
        if so:
            total_s.append(num(so["total_s"]))
        if leg:
            total_l.append(num(leg["total_s"]))
    return {"curto_sozinho_total_s": summ(total_s), "curto_com_legendagem_espera_s": summ(espera),
            "curto_com_legendagem_total_s": summ(total_c), "atraso_causado_pela_legendagem_s": summ(atraso),
            "legendagem_total_s": summ(total_l)}


def s2(d):
    rows = load(os.path.join(d, "s2", "s2.csv"))
    if not rows:
        return None
    res = {}
    for (n,), rs_n in sorted(by(rows, "n").items(), key=lambda kv: int(kv[0][0])):
        span, thr, mean_total, max_total, mean_wait, erros = [], [], [], [], [], 0
        for (_rep,), rs in by(rs_n, "rep").items():
            ok = [r for r in rs if not r["erro"] and num(r["fim_epoch"]) is not None]
            erros += len(rs) - len(ok)
            if not ok:
                continue
            t0 = min(num(r["submetido_epoch"]) for r in rs if num(r["submetido_epoch"]) is not None)
            sp = max(num(r["fim_epoch"]) for r in ok) - t0
            span.append(sp)
            thr.append(len(ok) / sp * 60)
            tots = [num(r["total_s"]) for r in ok]
            mean_total.append(st.mean(tots))
            max_total.append(max(tots))
            waits = [num(r["espera_s"]) for r in ok if num(r["espera_s"]) is not None]
            if waits:
                mean_wait.append(st.mean(waits))
        conc = [concorrencia(rs)[1] for (_r,), rs in by(rs_n, "rep").items()]
        res[f"N={n}"] = {"makespan_s": summ(span), "debito_videos_min": summ(thr),
                         "max_videos_em_processamento_simultaneo": summ(conc),
                         "tempo_medio_conclusao_s": summ(mean_total), "tempo_max_conclusao_s": summ(max_total),
                         "espera_media_s": summ(mean_wait), "trabalhos_com_erro": erros}
    return res


def s3(d):
    rows = load(os.path.join(d, "s3", "s3.csv"))
    if not rows:
        return None
    reps = sorted({r["rep"] for r in rows}, key=int)
    max_rep, var_rep, fila_max, proc_max, cpu_video, makespan = [], [], [], [], [], []
    detalhe = {}
    for rep in reps:
        sist = load(os.path.join(d, "s3", f"s3_rep{rep}_sistema.csv"))
        recs = load(os.path.join(d, "s3", f"s3_rep{rep}_recursos.csv"))
        marcos = json.load(open(os.path.join(d, "s3", f"s3_rep{rep}_marcos.json")))
        rep_by_svc = defaultdict(list)
        for r in sist:
            if r["tipo"] == "replicas":
                rep_by_svc[r["nome"]].append(int(r["valor1"]))
        video_svcs = [s for s in rep_by_svc if "video" in s or "subtit" in s or "frame" in s]
        tot_rep = []
        times = sorted({float(r["t_s"]) for r in sist if r["tipo"] == "replicas"})
        for t in times:
            tot_rep.append(sum(int(r["valor1"]) for r in sist
                               if r["tipo"] == "replicas" and float(r["t_s"]) == t and r["nome"] in video_svcs))
        max_rep.append(max(tot_rep, default=0))
        var_rep.append(max(tot_rep, default=0) - min(tot_rep, default=0))
        me, mp = concorrencia([r for r in rows if r["rep"] == rep])
        fila_max.append(me)
        proc_max.append(mp)
        burst = [r for r in recs if marcos["rajada"] <= float(r["t_s"]) <= marcos["fim_trabalhos"] and r["servico"] in video_svcs]
        by_t = defaultdict(float)
        for r in burst:
            by_t[r["t_s"]] += float(r["cpu_pct"])
        if by_t:
            cpu_video.append(st.mean(by_t.values()))
        makespan.append(marcos["fim_trabalhos"] - marcos["rajada"])
        detalhe[f"rep{rep}"] = {"servicos_video": video_svcs,
                                "replicas_max_por_servico": {s: max(v) for s, v in rep_by_svc.items() if s in video_svcs}}
    return {"replicas_video_max": summ(max_rep), "variacao_replicas_video": summ(var_rep),
            "max_videos_a_espera": summ(fila_max), "max_videos_em_processamento_simultaneo": summ(proc_max),
            "cpu_video_medio_na_rajada_pct": summ(cpu_video),
            "duracao_rajada_s": summ(makespan), "detalhe": detalhe}


# Duração dos vídeos (ffprobe, 11/11/2026), usada quando o CSV não a traz
# (na medição inicial o anfitrião não tinha ffprobe).
DURACOES = {"sample_10s_720p.mp4": 10.0, "speech_mandela_177s_1080p.webm": 176.62,
            "02_curto_720p_30s.mp4": 30.0, "01_demo_1080p_150s.mp4": 150.0}


def dur(r):
    return num(r["duracao_video_s"]) or DURACOES.get(r["video"])


def s4(d):
    rows = load(os.path.join(d, "s4", "s4.csv"))
    if not rows:
        return None
    res = {}
    for (video,), rs in by(rows, "video").items():
        ratios = [num(r["total_s"]) / dur(r) for r in rs
                  if num(r["total_s"]) is not None and dur(r)]
        res[video] = {"total_s": summ([num(r["total_s"]) for r in rs]), "razao_tempo_duracao": summ(ratios)}
    return res


def m3(d, ref_s2):
    rows = load(os.path.join(d, "m3", "m3.csv"))
    if not rows:
        return None
    ref = None
    try:
        ref = ref_s2["N=4"]["tempo_max_conclusao_s"]["mediana"]
    except (TypeError, KeyError):
        pass
    afetados, falhados, leg_ok, tot = [], [], 0, []
    for (_rep,), rs in by(rows, "rep").items():
        curtos = [r for r in rs if r["papel"] == "curto"]
        f = sum(1 for r in curtos if r["erro"])
        falhados.append(f)
        tot += [num(r["total_s"]) for r in curtos if not r["erro"]]
        if ref:
            afetados.append(sum(1 for r in curtos if r["erro"] or (num(r["total_s"]) or 0) > 1.5 * ref) / len(curtos) * 100)
        leg_ok += sum(1 for r in rs if r["papel"] == "legendagem" and not r["erro"])
    return {"referencia_s2_n4_tempo_max_s": ref, "curtos_afetados_pct": summ(afetados),
            "curtos_falhados_por_rep": summ(falhados), "curtos_total_s": summ(tot),
            "legendagens_concluidas": f"{leg_ok}/{len(by(rows, 'rep'))}"}


def table(title, data):
    lines = [f"### {title}", "", "| Métrica | n | Mediana | Mín. | Máx. | IQR |", "|---|---|---|---|---|---|"]

    def walk(prefix, obj):
        for k, v in obj.items():
            if isinstance(v, dict) and "n" in v:
                if v["n"]:
                    lines.append(f"| {prefix}{k} | {v['n']} | {v['mediana']} | {v['min']} | {v['max']} | {v['iqr']} |")
                else:
                    lines.append(f"| {prefix}{k} | 0 | – | – | – | – |")
            elif isinstance(v, dict) and k != "detalhe":
                walk(f"{prefix}{k} · ", v)
            elif not isinstance(v, (dict, list)):
                lines.append(f"| {prefix}{k} | | {v} | | | |")
    walk("", data)
    return "\n".join(lines) + "\n"


def main():
    d = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "../baseline")
    res = {"s1": s1(d), "s2": s2(d), "s3": s3(d), "s4": s4(d)}
    res["m3"] = m3(d, res["s2"])
    for extra in ("m2/m2_modularidade.json",):
        p = os.path.join(d, extra)
        if os.path.exists(p):
            res["m2"] = json.load(open(p))
    md = [f"# Resumo das medições — {os.path.basename(d)}", ""]
    titles = {"s1": "S1 — Bloqueio pela legendagem", "s2": "S2 — Carga concorrente",
              "s3": "S3 — Adaptação à carga", "s4": "S4 — Tempo de edição / duração",
              "m3": "M3 — Isolamento de falhas"}
    for k, t in titles.items():
        if res.get(k):
            md.append(table(t, res[k]))
    m1 = {}
    for nome in ("C1", "C2", "C3"):
        pth = os.path.join(d, "m1", f"m1_{nome}.json")
        if os.path.exists(pth):
            m1[nome] = json.load(open(pth))
    if m1:
        res["m1"] = m1
        md += ["### M1 — Impacto de uma mudança", "",
               "| Mudança | Ficheiros | Componentes | Unidades a reconstruir | Unidades a reiniciar | Funcionalidades de vídeo interrompidas | (responsabilidades técnicas) |",
               "|---|---|---|---|---|---|---|"]
        for nome, r in m1.items():
            md.append(f"| {nome} | {r['n_ficheiros']} | {', '.join(r['componentes_alterados'])} | "
                      f"{', '.join(r['unidades_a_reconstruir']) or '—'} | {', '.join(r['unidades_a_reiniciar']) or '—'} | "
                      f"{r.get('n_funcionalidades_interrompidas', '–')} ({', '.join(r.get('funcionalidades_de_video_interrompidas', []))}) | "
                      f"{r['n_responsabilidades_interrompidas']} |")
        md.append("")
    if res.get("m2"):
        m = res["m2"]
        md += ["### M2 — Acoplamento estático", "",
               f"- Unidades implantáveis com responsabilidades de vídeo: {m['unidades_com_video']}",
               f"- Máximo de funcionalidades de vídeo numa unidade (edição, legendagem, extração): {m.get('max_funcionalidades_numa_unidade', '–')} — {m.get('funcionalidades_por_unidade', {})}",
               f"- Máximo de responsabilidades técnicas numa unidade (detalhe): {m['max_responsabilidades_numa_unidade']}",
               f"- Python de vídeo: {m['python_video'].get('sloc_total')} SLOC, CC média {m['python_video'].get('cc_media')}, "
               f"CC máx. {m['python_video'].get('cc_max')}, funções com CC > 10: {m['python_video'].get('funcoes_cc_maior_10')}",
               f"- Efeitos duplicados entre imagem e vídeo: {m['efeitos_duplicados']['n_duplicados']}", ""]
    with open(os.path.join(d, "resumo.json"), "w") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    open(os.path.join(d, "resumo.md"), "w").write("\n".join(md))
    print("\n".join(md))


if __name__ == "__main__":
    main()
