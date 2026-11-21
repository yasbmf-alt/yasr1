# Extrai a "Parte 1 · Resumo-mestre" com estrutura: seções, tópicos (com nível) e tabelas.
# Usa pdftotext -bbox-layout (texto fiel) + pdfplumber (marcadores de tópico e cabeçalhos de tabela).
import re, subprocess, html, logging
import pdfplumber
logging.getLogger('pdfminer').setLevel(logging.ERROR)

ZONAS = {'CONDUTA': 'conduta', 'DIAGNÓSTICO': 'diagnostico', 'TRATAMENTO': 'tratamento', 'MECANISMO': 'mecanismo', 'PEGADINHA': 'pegadinha'}
KEEP_UP = {'SRAG', 'SDRA', 'PCR', 'PALS', 'BLS', 'ACLS', 'DPOC', 'VNI', 'IOT', 'VM', 'PEEP', 'TQT', 'SNC', 'LRA', 'DRC', 'HCO₃⁻', 'CO₂', 'O₂', 'SG', 'UTI', 'IRpA', 'FV', 'TV', 'AESP', 'ECG'}

def pages_bbox(pdf):
    x = subprocess.run(['pdftotext', '-bbox-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout
    pages = []
    for pg in re.findall(r'<page [^>]*>(.*?)</page>', x, re.S):
        lines = []
        for blk_i, blk in enumerate(re.findall(r'<block [^>]*>(.*?)</block>', pg, re.S)):
            for ln in re.findall(r'<line ([^>]*)>(.*?)</line>', blk, re.S):
                a = dict(re.findall(r'(\w+)="([\d.]+)"', ln[0]))
                words = [(float(w[0]), float(w[1]), float(w[2]), float(w[3]), html.unescape(w[4])) for w in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', ln[1])]
                if not words: continue
                lines.append({'x': float(a['xMin']), 'y': float(a['yMin']), 'x1': float(a['xMax']), 'y1': float(a['yMax']), 'h': float(a['yMax']) - float(a['yMin']), 'words': words, 'blk': blk_i, 'text': ' '.join(w[4] for w in words)})
        lines.sort(key=lambda l: (round(l['y']), l['x']))
        # junta pedaços da mesma linha visual (fórmulas em destaque, etiqueta de zona + subtítulo)
        merged = []
        for l in lines:
            m = next((r for r in merged[-3:] if min(r['y1'], l['y1']) - max(r['y'], l['y']) > 0.5 * min(r['h'], l['h'])), None)
            if m and (l['x'] > m['x1'] - 1 or l['x1'] < m['x'] + 1):
                m['words'] = sorted(m['words'] + l['words'], key=lambda w: w[0])
                m['x'], m['x1'] = min(m['x'], l['x']), max(m['x1'], l['x1'])
                m['y'], m['y1'] = min(m['y'], l['y']), max(m['y1'], l['y1'])
                m['h'] = max(m['h'], l['h'])
                m['text'] = ' '.join(w[4] for w in m['words'])
            else:
                merged.append(dict(l))
        pages.append(merged)
    return pages

def page_marks(p):
    bullets = [(c['x0'], c['top'], c['bottom']) for c in p.curves if c['x1'] - c['x0'] < 6 and c['bottom'] - c['top'] < 6]
    heads = {}
    seps = []
    for r in p.rects:
        w, h = r['x1'] - r['x0'], r['bottom'] - r['top']
        col = r.get('non_stroking_color')
        if 15 < h < 45 and isinstance(col, tuple) and len(col) == 3 and col[0] > 0.93 and col[0] < 0.95:
            heads.setdefault(round(r['top']), []).append((r['x0'], r['x1'], r['top'], r['bottom']))
        elif h < 2 and w < 400 and isinstance(col, tuple) and len(col) == 3 and 0.92 < col[0] < 0.93:
            seps.append((r['x0'], r['top']))
    tables = sorted((sorted(v) for v in heads.values()), key=lambda c: c[0][2])
    return bullets, tables, seps

def smart_case(s):
    out = []
    for i, w in enumerate(s.split(' ')):
        core = w.strip('(),:')
        if core in KEEP_UP or re.match(r'^[A-Z]{2,4}$', core) and core not in {'DE', 'DA', 'DO', 'E', 'O', 'A', 'OS', 'AS', 'NO', 'NA', 'QUE', 'SE', 'EM', 'COM', 'SEM', 'POR', 'NÃO', 'AO', 'OU', 'DOS', 'DAS', 'MAIS', 'JÁ', 'PARA', 'AINDA', 'CAIU', 'BEM', 'FAZ'}:
            out.append(w)
        else:
            lw = w.lower()
            out.append(lw[:1].upper() + lw[1:] if i == 0 else lw)
    return ' '.join(out)

def is_caps(t):
    return len(t) > 5 and not re.search(r'[a-zà-ú]', t) and re.search(r'[A-ZÁ-Ú]{3}', t)

def extract(pdf_path, start='Parte 1 · Resumo-mestre', end='Parte 2 · Story da missão'):
    pages = pages_bbox(pdf_path)
    pl = pdfplumber.open(pdf_path)
    secs = []
    cur = None
    started = done = False
    pending_zone = None
    stack = []  # posições x dos níveis de tópico
    last = None  # último item (para continuação)

    def new_sec(titulo, zona=None):
        nonlocal cur, stack, last
        cur = {'titulo': titulo, **({'zona': zona} if zona else {}), 'blocos': []}
        secs.append(cur); stack = []; last = None

    def add(b):
        nonlocal last
        if cur is None: new_sec('')
        cur['blocos'].append(b); last = b

    for pi, lines in enumerate(pages):
        if done: break
        bullets, tables, seps = page_marks(pl.pages[pi])
        used = set()
        # tabelas: cabeçalho + linhas até o fim da última linha separadora
        tblocks = []
        for ti, cells in enumerate(tables):
            top, bot = cells[0][2], cells[0][3]
            nxt = tables[ti + 1][0][2] if ti + 1 < len(tables) else 1e9
            cols = [c[0] for c in cells] + [cells[-1][1]]
            my = sorted(s[1] for s in seps if cols[0] - 2 <= s[0] <= cols[-1] and bot < s[1] < nxt)
            rows_y = [bot] + sorted(set(round(y, 1) for y in my))
            body = [l for l in lines if l['y'] > bot - 1]
            # fim: depois do último separador, linhas seguidas sem buraco grande
            endy = rows_y[-1]
            prev = endy
            for l in body:
                if l['y'] < endy: continue
                if l['y'] - prev > 8 or l['h'] >= 17.5 or re.match(r'^\d+\.\d+ ', l['text']) or l['y'] >= nxt - 1: break
                prev = l['y1']
            rows_y.append(prev + 0.5)
            grid = [[[] for _ in cells] for _ in range(len(rows_y) - 1)]
            head = [[] for _ in cells]
            for li, l in enumerate(lines):
                if l['y'] >= top - 1 and l['y1'] <= rows_y[-1] + 1:
                    for w in l['words']:
                        ci = max(0, min(len(cells) - 1, sum(1 for c in cols[1:-1] if w[0] >= c - 1)))
                        if w[1] < bot:
                            head[ci].append(w[4])
                        else:
                            ri = max(0, sum(1 for y in rows_y[1:-1] if w[1] >= y - 1))
                            grid[min(ri, len(grid) - 1)][ci].append(w[4])
                    used.add(li)
            tblocks.append((top, {'t': 'tabela', 'cab': [' '.join(h) for h in head], 'linhas': [[' '.join(c) for c in r] for r in grid if any(r)]}))
        tblocks.sort(key=lambda t: t[0])

        for li, l in enumerate(lines):
            t = l['text'].strip()
            if not started:
                if t == start: started = True
                continue
            if t == end: done = True; break
            while tblocks and tblocks[0][0] <= l['y'] + 1:
                add(tblocks.pop(0)[1]); stack = []
            if li in used: continue
            h = l['h']
            if h > 28: continue  # título de parte
            if t.startswith('Fonte principal') or (last and last.get('_fonte')):
                last = {'_fonte': True} if not re.search(r'[.]$', t) else None
                continue
            mz = re.match(r'^(CONDUTA|DIAGNÓSTICO|TRATAMENTO|MECANISMO|PEGADINHA) (.+)$', t)
            if mz:
                new_sec(mz.group(2).strip(), ZONAS[mz.group(1)]); continue
            if t in ZONAS:
                pending_zone = (ZONAS[t], l['y'])
                # subtítulo da zona costuma estar na mesma altura (já visto antes ou logo depois)
                if cur and cur.get('_zsub') and abs(cur['_zsub'] - l['y']) < 8 and not cur.get('zona'):
                    cur['zona'] = ZONAS[t]; cur.pop('_zsub'); pending_zone = None
                else:
                    new_sec('', ZONAS[t]); pending_zone = None
                continue
            if h >= 21 and re.match(r'^\d+\. ', t):
                new_sec(re.sub(r'^\d+\. ', '', t)); continue
            if re.match(r'^\d+\.\d+\.? \S', t) and h < 21:
                add({'t': 'h', 'texto': re.sub(r'^\d+\.\d+\.? ', '', t)}); stack = []; continue
            if 17.5 <= h < 21:
                if cur and cur.get('zona') and not cur['titulo'] and not cur['blocos']:
                    cur['titulo'] = t
                else:
                    new_sec(t); cur['_zsub'] = l['y']
                continue
            if re.match(r'^\d+\.\d+\.? \S', t) and l['h'] < 21 and not re.search(r'[.;]$', t):
                add({'t': 'h', 'texto': re.sub(r'^\d+\.\d+\.? ', '', t)}); stack = []; continue
            if is_caps(t) and h < 15:
                tt = smart_case(t)
                if cur and cur.get('zona') and not cur['titulo'] and not cur['blocos']: cur['titulo'] = tt
                elif cur and not cur.get('zona') and cur['titulo'] and not cur['titulo'].isupper() and secs and not cur.get('_box'):
                    add({'t': 'h', 'texto': tt}); stack = []
                else:
                    new_sec(tt); cur['_box'] = True
                continue
            # marcador de tópico?
            mid = (l['y'] + l['y1']) / 2
            bx = next((b[0] for b in bullets if l['x'] - 20 < b[0] < l['x'] - 2 and abs((b[1] + b[2]) / 2 - mid) < 6), None)
            num = re.match(r'^\d+\. ', t)
            if bx is not None or num:
                x = bx if bx is not None else l['x']
                while stack and stack[-1] > x + 3: stack.pop()
                if not stack or x > stack[-1] + 3: stack.append(x)
                add({'t': 'li', 'nivel': len(stack), 'texto': t, '_x': l['x'], '_y1': l['y1'], **({'num': True} if num and bx is None else {})})
                continue
            # continuação da linha anterior
            if last and last.get('t') in ('li', 'p') and l['y'] - last['_y1'] < 5 and (abs(l['x'] - last['_x']) < 4 or (last.get('num') and l['x'] > last['_x'])):
                last['texto'] = (last['texto'][:-1] + t) if last['texto'].endswith('-') and not last['texto'].endswith(' -') else f"{last['texto']} {t}"
                last['_y1'] = l['y1']; continue
            while stack and stack[-1] > l['x'] - 8: stack.pop()
            add({'t': 'p', 'texto': t, '_x': l['x'], '_y1': l['y1'], 'nivel': len(stack)})
    # limpeza: listas "a; - b; - c" coladas e passos numerados colados
    out = []
    for s in secs:
        blocos = []
        for b in s['blocos']:
            if b['t'] in ('li', 'p'):
                txt = re.sub(r'\s+', ' ', b['texto']).strip()
                txt = re.sub(r'\s+-$', '', txt)
                if txt in ('-', ''): continue
                parts = re.split(r'(?<=[.)]) (?=\d+\. [A-ZÁÉÍÓÚ])', txt)
                for k, ptxt in enumerate(parts):
                    nb = {'t': 'li' if (b['t'] == 'li' or k > 0) else 'p', 'texto': ptxt, 'nivel': b.get('nivel', 0) or (1 if k > 0 else 0)}
                    ptxt = re.sub(r'(?<=[.;]) (?=[A-ZÁ-Ú][^.:;]{0,50}: - )', '\n', ptxt)
                    if '\n' in ptxt or re.search(r'(?<=[.;:]) - ', ptxt):
                        segs = ptxt.split('\n')
                        for si, seg in enumerate(segs):
                            head, *items = re.split(r'(?<=[.;:]) - ', seg)
                            blocos.append({**nb, 'texto': head.strip()})
                            blocos += [{'t': 'li', 'nivel': nb['nivel'] + 1, 'texto': i.strip()} for i in items if i.strip()]
                    elif False:
                        head, *items = ptxt.split(' - ')
                        blocos.append({**nb, 'texto': head.strip()})
                        blocos += [{'t': 'li', 'nivel': nb['nivel'] + 1, 'texto': i.strip()} for i in items if i.strip()]
                    else:
                        blocos.append(nb)
            else:
                blocos.append(b)
        for b in blocos:
            for k in list(b):
                if k.startswith('_'): b.pop(k)
            if b.get('nivel') == 0: b.pop('nivel')
        s2 = {k: v for k, v in s.items() if not k.startswith('_')}
        s2['blocos'] = blocos
        if s2['titulo'] or blocos: out.append(s2)
    return out

if __name__ == '__main__':
    import sys, json
    r = extract(sys.argv[1])
    for s in r:
        print(f"\n### [{s.get('zona','')}] {s['titulo']}")
        for b in s['blocos']:
            if b['t'] == 'tabela':
                print('  TABELA', b['cab']); [print('   |', ' | '.join(x)) for x in b['linhas']]
            else:
                print('  ' + '  ' * b.get('nivel', 0) + {'li': '• ', 'p': '', 'h': '## '}[b['t']] + b['texto'][:150])
