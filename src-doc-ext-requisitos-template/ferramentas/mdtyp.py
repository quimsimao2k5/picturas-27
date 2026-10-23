"""Conversao de Markdown (dos MD dos casos de uso) para markup Typst."""
import re

SPECIAL = set('\\#$@<>[]*_`~')


def esc_text(s):
    out = []
    for ch in s:
        out.append('\\' + ch if ch in SPECIAL else ch)
    t = ''.join(out)
    t = t.replace('//', '/\\/').replace('/*', '/\\*')
    return t


TOKEN = re.compile(r'`([^`]+)`|\*\*(.+?)\*\*|(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])|(?<![\w])_(?!\s)([^_]+?)_(?![\w])')


def inline(s):
    """Markdown inline -> Typst markup (sem quebras de linha)."""
    s = s.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    res = []
    pos = 0
    for m in TOKEN.finditer(s):
        res.append(esc_text(s[pos:m.start()]))
        code, bold, it1, it2 = m.groups()
        if code is not None:
            res.append('#raw("' + code.replace('\\', '\\\\').replace('"', '\\"') + '");')
        elif bold is not None:
            res.append('#strong[' + inline(bold) + '];')
        else:
            res.append('#emph[' + inline(it1 or it2) + '];')
        pos = m.end()
    res.append(esc_text(s[pos:]))
    return ''.join(res)


def cell(s):
    """Celula de tabela MD (com <br> e listas '- ') -> conteudo Typst."""
    s = s.strip()
    s = re.sub(r'</?ul>', '', s)
    s = re.sub(r'<li>', '<br>- ', s)
    s = re.sub(r'</li>', '', s)
    parts = re.split(r'<br\s*/?>', s)
    lines = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if re.match(r'^[-•]\s+', p):
            lines.append(('li', inline(re.sub(r'^[-•]\s+', '', p))))
        else:
            lines.append(('p', inline(p)))
    if not lines:
        return ''
    if len(lines) == 1 and lines[0][0] == 'p':
        return protect_start(lines[0][1])
    out = []
    for i, (k, t) in enumerate(lines):
        if k == 'li':
            out.append('\n- ' + t)
        else:
            out.append(('\n' if i else '') + protect_start(t) + (' \\' if i + 1 < len(lines) and lines[i + 1][0] == 'p' else ''))
    return ''.join(out) + '\n'


def protect_start(t):
    # evita que o inicio da celula seja lido como lista/enumeracao/titulo
    if re.match(r'^(\d+)\.', t):
        t = re.sub(r'^(\d+)\.', r'\1\\.', t)
    if t[:1] in '=+-/' and not t.startswith('—'):
        t = '\\' + t
    return t


def split_row(line):
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|'):
        line = line[:-1]
    return [c.strip() for c in line.split('|')]


def tables_after(md, heading_regex, count=None):
    """Devolve as tabelas (lista de linhas, sem a linha separadora) entre o titulo e o titulo seguinte do mesmo nivel ou superior."""
    lines = md.split('\n')
    start = None
    level = None
    for i, l in enumerate(lines):
        m = re.match(r'^(#+)\s+(.*)$', l)
        if m and re.search(heading_regex, m.group(2)):
            start = i + 1
            level = len(m.group(1))
            break
    if start is None:
        raise KeyError(heading_regex)
    end = len(lines)
    for j in range(start, len(lines)):
        m = re.match(r'^(#+)\s+', lines[j])
        if m and len(m.group(1)) <= level:
            end = j
            break
    tables, cur = [], []
    for l in lines[start:end]:
        if l.strip().startswith('|'):
            cur.append(l)
        else:
            if cur:
                tables.append(cur)
                cur = []
    if cur:
        tables.append(cur)
    res = []
    for t in tables:
        rows = [split_row(x) for x in t if not re.match(r'^\s*\|?\s*:?-{2,}', x)]
        res.append(rows)
    return res


def strip_md(s):
    """Texto simples (sem marcacao) de uma celula MD."""
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = s.replace('**', '').replace('`', '')
    s = re.sub(r'(?<![\w])\*([^*]+)\*(?![\w])', r'\1', s)
    return s.strip()
