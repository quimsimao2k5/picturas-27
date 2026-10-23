import re, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mdtyp import cell, tables_after, strip_md, inline
from gen_uc import load, UCS

SRC = os.path.join(HERE, '..') + os.sep
PRIO = {'Deve ter': '#must', 'Deveria ter': '#should', 'Poderia ter': '#could', 'Não terá': '#wont'}
UCNAME = {'UC-VID-001': 'UC-VID-001 — Recorte', 'UC-VID-002': 'UC-VID-002 — Biblioteca', 'UC-VID-003': 'UC-VID-003 — Reprodução'}


def idcell(s):
    return inline(strip_md(s))


def fr_rows():
    out = []
    for uc, fn in UCS:
        md = load(fn)
        t = tables_after(md, r'^4\.1\.1 ')[0]
        for r in t[1:]:
            rid, req, prio, evol, novo, orig, just, crit = (r + [''] * 8)[:8]
            p = strip_md(prio)
            pr = PRIO.get(p, inline(p))
            if 'RETIRADO' in req:
                pr = '#text(fill: gray)[Retirado]'
            out.append((strip_md(rid), [f'[{idcell(rid)}]', f'[{cell(req)}]', f'[{pr}]', f'[{inline(strip_md(novo))}]', f'[{cell(orig)}]', f'[{cell(just)}]', f'[{cell(crit)}]']))
    return out


def nfr_rows():
    out = []
    for uc, fn in UCS:
        md = load(fn)
        t = tables_after(md, r'^4\.1\.2 ')[0]
        for r in t[1:]:
            rid, req, car, mvp, prod, evol, orig, crit = (r + [''] * 8)[:8]
            out.append((strip_md(rid), [f'[{idcell(rid)}]', f'[{cell(req)}]', f'[{cell(car)}]', f'[{cell(mvp)}]', f'[{cell(prod)}]', f'[{cell(orig)}]', f'[{cell(crit)}]']))
    return out


def completude_rows():
    out = []
    for uc, fn in UCS:
        md = load(fn)
        t = tables_after(md, r'^4\.1\.3 ')[0]
        for r in t[1:]:
            out.append([f'[{UCNAME[uc]}]'] + [f'[{cell(c)}]' for c in (r + [''] * 4)[:4]])
    return out


def main():
    fr = fr_rows(); nfr = nfr_rows()
    o = ['#import "../template.typ": *', '',
         '// Gerado a partir das secções 4.1 dos três MD em Documentacao/ (gen/gen_ers.py).', '',
         '#paisagem[', '= Especificação de Requisitos do Sistema (ERS)', '',
         'Os requisitos estão agrupados por caso de uso (coluna _Origem_) e identificados como #raw("REQ-VID-{FUNC}-nnn"): #raw("TRIM") para o recorte (UC-VID-001), #raw("LIB") para a biblioteca (UC-VID-002) e #raw("PLAY") para a reprodução (UC-VID-003). A prioridade segue MoSCoW (#must, #should, #could). A coluna _Novo/Alt_ indica se o requisito é novo ou altera um comportamento do PictuRAS existente. Os requisitos partilhados têm um único dono, a biblioteca (UC-VID-002); as linhas marcadas como _Referência_ remetem para esse dono e as marcadas como _Retirado_ mantêm-se para que os identificadores não sejam reutilizados.', '',
         '== Requisitos Funcionais', '',
         f'#tab([Requisitos funcionais de vídeo (MVP) — {len(fr)} requisitos],',
         '  tabela(',
         '    colunas: (2.8cm, 1fr, 1.5cm, 1.15cm, 3.1cm, 3.6cm, 4.9cm),',
         '    tamanho: 8pt,',
         '    [ID], [Requisito], [Prioridade], [Novo/ Alt], [Origem], [Justificação], [Critério de aceitação],']
    for _, r in fr:
        o.append('    ' + ', '.join(r) + ',')
    o += ['  ),', ')', '', '== Requisitos Não Funcionais e de Qualidade', '',
          'Cada requisito não funcional indica a característica ISO/IEC 25010, o alvo do MVP (Fase 1) e o alvo de produção, que orienta a evolução na Fase 2. As referências #raw("DQ") na coluna _Origem_ são locais ao caso de uso indicado (ver secção 7.2).', '',
          f'#tab([Requisitos não funcionais de vídeo (MVP) — {len(nfr)} requisitos],',
          '  tabela(',
          '    colunas: (2.8cm, 1fr, 2.4cm, 3.2cm, 3.3cm, 3.1cm, 4.7cm),',
          '    tamanho: 8pt,',
          '    [ID], [Requisito], [Característica ISO/IEC 25010], [Alvo MVP], [Alvo produção], [Origem], [Critério de aceitação / verificação],']
    for _, r in nfr:
        o.append('    ' + ', '.join(r) + ',')
    o += ['  ),', ')', ']', '',
          '== Verificação da completude e dos limites do âmbito', '',
          'A tabela confirma, para cada caso de uso, que os tópicos exigidos pelas diretrizes foram tratados ou explicitamente excluídos do âmbito do MVP.', '',
          '#tab([Verificação da completude e dos limites do âmbito],',
          '  tabela(',
          '    colunas: (2.2cm, 2.4cm, 1.8cm, 1fr, 3.3cm),',
          '    tamanho: 8.5pt,',
          '    [Caso de uso], [Tópico a verificar], [Aplicável?], [Decisão / justificação], [Requisito(s) relacionado(s)],']
    for r in completude_rows():
        o.append('    ' + ', '.join(r) + ',')
    o += ['  ),', ')', '']
    open(SRC + 'capitulos/05-ers.typ', 'w', encoding='utf-8').write('\n'.join(o))
    print('FR', len(fr), 'NFR', len(nfr), 'total', len(fr) + len(nfr))


if __name__ == '__main__':
    main()
