import re, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mdtyp import cell, tables_after, strip_md, inline

MD = os.path.join(HERE, '..', '..', 'Documentacao') + os.sep
SRC = os.path.join(HERE, '..') + os.sep
UCS = [
    ('UC-VID-001', 'RAS-Exercicio1_Recorte_de_Video.md'),
    ('UC-VID-002', 'RAS_UC_Biblioteca_Videos.md'),
    ('UC-VID-003', 'RAS-exercicio1_Reproducao_Video.md'),
]

# Correcoes aplicadas ao texto dos MD (ver revisao do relatorio)
FIXES = [
    ('baseada em MinIO / compatível com S3, em contentor Docker isolado', 'baseada em SeaweedFS, compatível com a API S3, em contentor Docker isolado'),
    ('emissão de *presigned URLs* assinadas com HMAC-SHA256 e identificadores UUIDv4', 'emissão de *presigned URLs* assinadas com tempo de vida limitado'),
    ('contentor Docker com MinIO compatível com API S3', 'contentor Docker com SeaweedFS, compatível com a API S3'),
    ('separação entre conceitos de domínio e detalhes de infraestrutura (MinIO)', 'separação entre conceitos de domínio e detalhes de infraestrutura'),
    ('registadas na secção 4.3', 'registadas na secção 7.2 (identificadas como UC-VID-001/DQ-nnn)'),
    ('seguem as decisões `DQ-001` a `DQ-006` da secção 4.3', 'seguem as decisões `UC-VID-002/DQ-001` a `DQ-006` da secção 7.2'),
]


def load(fn):
    s = open(MD + fn, encoding='utf-8').read()
    for a, b in FIXES:
        s = s.replace(a, b)
    return s


def rows_of(md, heading):
    t = tables_after(md, heading)[0]
    return t[0], t[1:]


def widths(ncols, first='2.2cm'):
    if ncols == 2:
        return f'({first}, 1fr)'
    if ncols == 3:
        return f'({first}, 1fr, 1fr)'
    return '(' + ', '.join(['auto'] + ['1fr'] * (ncols - 1)) + ')'


def table(caption, header, rows, cols=None, size=None):
    n = len(header)
    out = [f'#tab([{caption}],', '  tabela(', f'    colunas: {cols or widths(n)},']
    if size:
        out.append(f'    tamanho: {size},')
    out.append('    ' + ', '.join('[' + inline(strip_md(h)) + ']' for h in header) + ',')
    for r in rows:
        r = (r + [''] * n)[:n]
        out.append('    ' + ', '.join('[' + cell(c) + ']' for c in r) + ',')
    out += ['  ),', ')', '']
    return '\n'.join(out)


def gen(ucid, fn):
    md = load(fn)
    h, rows = rows_of(md, r'^2\.1 ')
    fields = {strip_md(r[0]): r[1] for r in rows}
    name = strip_md(fields['Nome'])
    o = ['#import "../template.typ": *', '', f'// {ucid} — gerado a partir de Documentacao/{fn} (versão {strip_md(fields["Versão"])})', '',
         f'== {ucid} — {inline(name)}', '', '=== Cabeçalho', '']
    pairs = []
    for r in rows:
        k = strip_md(r[0])
        k_t = {'Stakeholders e Interesses': '_Stakeholders_ e Interesses', 'Trigger': '_Trigger_'}.get(k, inline(k))
        pairs.append(f'    [{k_t}], [{cell(r[1])}],')
    o += [f'#tab([Caso de uso {ucid} — {inline(name)}],', '  tabela-campos(', *pairs, '  ),', ')', '']
    sec = [
        (r'^2\.2 ', 'Fluxo Principal', 'Fluxo principal', '(1.2cm, 1fr, 1fr)'),
        (r'^2\.3 ', 'Fluxos Alternativos', 'Fluxos alternativos', '(3.2cm, 1fr)'),
        (r'^2\.4 ', 'Exceções', 'Exceções', None),
        (r'^2\.5 ', 'Pós-condições', 'Pós-condições', '(3cm, 1fr)'),
        (r'^2\.6 ', 'Regras de Negócio e Restrições', 'Regras de negócio e restrições', '(1.2cm, 1fr)'),
        (r'^2\.7 ', 'Assunções', 'Assunções', None),
        (r'^2\.8 ', 'Questões em Aberto', 'Questões em aberto', None),
    ]
    for rx, title, cap, cols in sec:
        hdr, rws = rows_of(md, rx)
        if cols is None:
            n = len(hdr)
            if title == 'Exceções':
                cols = '(1.2cm, 1fr, 1.6fr)' if n == 3 else '(4.5cm, 1fr)'
            else:
                cols = '(1.2cm, 1.6fr, 1fr)' if n == 3 else '(1.2cm, 1fr)'
        o += [f'=== {title}', '', table(f'{ucid} — {cap}', hdr, rws, cols)]
    open(SRC + f'casos-uso/{ucid}.typ', 'w', encoding='utf-8').write('\n'.join(o))
    return name


if __name__ == '__main__':
    for u, f in UCS:
        print(u, gen(u, f))
