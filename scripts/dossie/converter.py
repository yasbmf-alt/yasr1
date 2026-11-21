# Converte os PDFs "YAS QUEST · DOSSIÊ DA MISSÃO" num pacote JSON importável pelo Porto.
import json, re, subprocess, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import resumo as R

ZONAS = {'CONDUTA': 'conduta', 'DIAGNÓSTICO': 'diagnostico', 'TRATAMENTO': 'tratamento', 'MECANISMO': 'mecanismo', 'PEGADINHA': 'pegadinha'}
DLG = {  # seção numerada da Parte 3 → chave
    'apresentação': 'apresentacao', 'introdução': 'problema', 'preparação': 'preparacao', 'transição': 'transicao',
    'quando acerto': 'acerto', 'quando erro repetidamente': 'erroRepetido', 'quando erro': 'erro', 'comentários': 'durante',
    'derrota': 'derrota', 'vitória': 'vitoria', 'convite': 'recuperacao',
}

def text(pdf):
    return subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True, check=True).stdout.replace('\f', '\n')

def between(t, a, b):
    i = t.index(a); j = t.index(b, i + len(a)) if b else len(t)
    return t[i + len(a):j]

def ends_open(s):
    return not re.search(r'[.;:!?)"”]\s*$', s)

def resumo(block):
    """seções {titulo, zona?, linhas[]}; linhas com nível de recuo: '- ' (1) e '  - ' (2)"""
    raw = [l.rstrip() for l in block.split('\n')]
    # passos numerados colados numa mesma linha: "… (questão 1). 3. Checar…"
    lines = []
    for l in raw:
        ind = len(l) - len(l.lstrip())
        parts = re.split(r'(?<=[.)]) (?=\d+\. [A-ZÁÉÍÓÚ])', l.strip())
        lines += [(ind, p) for p in parts if p] or [(ind, '')]
    secs, cur = [], None
    def new(titulo, zona=None):
        nonlocal cur
        cur = {'titulo': titulo, **({'zona': zona} if zona else {}), 'linhas': []}
        secs.append(cur)
    base = None
    for ind, s in lines:
        if not s: continue
        if s.startswith('Fonte principal') or (cur and cur['titulo'] == '_fonte' and ends_open(cur['linhas'][-1])):
            if not cur or cur['titulo'] != '_fonte': new('_fonte')
            cur['linhas'].append(s); continue
        m = re.match(r'^(CONDUTA|DIAGNÓSTICO|TRATAMENTO|MECANISMO|PEGADINHA)\s+(.+)$', s)
        if m: new(m.group(2).strip(), ZONAS[m.group(1)]); base = None; continue
        if s in ZONAS: new('', ZONAS[s]); base = None; continue
        if re.match(r'^\d+\. [A-ZÁÉÍÓÚ][^.]{2,60}$', s) and ind <= 1 and not s.endswith(('.', ';')):
            new(re.sub(r'^\d+\. ', '', s)); base = None; continue
        if re.match(r'^[A-ZÁÉÍÓÚÇÃÕÂÊ0-9 ,()/:·-]{6,}$', s) and not re.search(r'[a-z]', s):
            if cur and cur.get('zona') and not cur['titulo'] and not cur['linhas']: cur['titulo'] = s.capitalize()
            else: new(s.capitalize())
            base = None; continue
        if cur is None: new('')
        if cur.get('zona') and not cur['titulo'] and not cur['linhas']:
            cur['titulo'] = s; continue
        L = cur['linhas']
        if L and ends_open(L[-1]) and not re.match(r'^\d+\. ', s):
            L[-1] = (L[-1][:-1] + s) if L[-1].endswith('-') and not L[-1].endswith(' -') else f'{L[-1]} {s}'
            continue
        if base is None: base = ind
        lvl = 0 if re.match(r'^\d+\. ', s) else min(2, max(0, round((ind - base) / 3)))
        # itens "- x; - y" colados (causas reversíveis)
        if ' - ' in s and s.count(' - ') >= 2 and ':' in s:
            head, *items = re.split(r' - ', s)
            L.append(('- ' * 0) + head.strip())
            L += [f'- {x.strip()}' for x in items if x.strip()]
            continue
        L.append(('  ' * max(0, lvl - 1) + '- ' if lvl else '') + s)
    out = []
    for s in secs:
        if s['titulo'] == '_fonte': continue
        if not s['linhas'] and not s['titulo']: continue
        if not s['linhas'] and out and not s.get('zona'):  # título sem corpo ("2. Zonas") vira grupo
            s['grupo'] = True
        out.append(s)
    return out

def story(block):
    lines = [l.strip() for l in block.split('\n')]
    lines = [l for l in lines if l]
    title, body = lines[0], lines[1:]
    width = max(len(l) for l in body)
    paras, cur = [], ''
    for l in body:
        cur = f'{cur} {l}'.strip() if cur else l
        if len(l) < width * 0.8 and re.search(r'[.!?"”]$', l):
            paras.append(cur); cur = ''
    if cur: paras.append(cur)
    return title, paras

def dialogos(block):
    d = {k: [] for k in set(DLG.values())}
    d['erroRepetido'] = []
    key, buf = None, None
    def flush():
        nonlocal buf
        if buf is None: return
        m = re.match(r'^Bigodes(?: \(([^)]+)\))?:\s*["“](.*)["”]\s*$', buf)
        if not m: print('  ? fala estranha:', buf[:80], file=sys.stderr)
        else:
            sub, fala = m.group(1), m.group(2).strip()
            if key == 'erroRepetido': d[key].append({'subtopico': sub or '', 'fala': fala})
            elif key: d[key].append(fala)
        buf = None
    for l in block.split('\n'):
        s = l.strip()
        if not s: continue
        m = re.match(r'^(\d+)\. (.+)$', s)
        if m and not s.startswith('Bigodes'):
            flush()
            low = m.group(2).lower()
            key = next((v for k, v in DLG.items() if low.startswith(k)), None)
            if key is None: print('  ? seção de diálogo:', s, file=sys.stderr)
            continue
        if s.startswith('Bigodes'):
            flush(); buf = s
        elif buf is not None:
            buf = (buf[:-1] + s) if buf.endswith('-') else f'{buf} {s}'
    flush()
    return d

def anexo(t):
    j = t[t.index('{', t.index('Anexo · JSON')):]
    out, acc = [], ''
    for l in j.split('\n'):
        acc = f'{acc} {l.strip()}' if acc else l
        if acc.replace('\\"', '').count('"') % 2 == 0:
            out.append(acc); acc = ''
    return json.loads('\n'.join(out))

def refs_list(refs):
    out = []
    for l in [x.strip() for x in refs.split('\n') if x.strip()]:
        if out and not re.search(r'[.]$', out[-1]): out[-1] += ' ' + l
        else: out.append(l)
    return out

def card_refs(fala, ids):
    # "Cartões SR11 a SR14", "PC05 a PC10", "SR03, SR07"
    found = []
    for a, b in re.findall(r'([A-Z]{2}\d{2})(?:\s*(?:a|-|–)\s*([A-Z]{2}\d{2}))?', fala):
        if b and a[:2] == b[:2]:
            found += [f'{a[:2]}{n:02d}' for n in range(int(a[2:]), int(b[2:]) + 1)]
        else:
            found.append(a)
    return [c for c in dict.fromkeys(found) if c in ids]

# correções pontuais de extração (texto de fórmula em destaque fora de ordem no PDF)
FIX = {
    'Alcalose metabólica: . Ou, pelo atalho, PaCO₂ =': 'Alcalose metabólica: PaCO₂ esperada = 0,7 × (HCO₃⁻ − 24) + 40 ± 2. Ou, pelo atalho, PaCO₂ = HCO₃⁻ + 15.',
}
DROP_AFTER_FIX = {'PaCO₂ esperada = 0,7 × (HCO₃⁻ − 24) + 40 ± 2', 'HCO₃⁻ + 15.'}

def fix_resumo(secs):
    for s in secs:
        out, fixed = [], False
        for b in s['blocos']:
            t = b.get('texto')
            if t in FIX: b = {**b, 'texto': FIX[t]}; fixed = True
            elif fixed and t in DROP_AFTER_FIX: continue
            out.append(b)
        s['blocos'] = out
    return secs

def convert(pdf):
    t = text(pdf)
    p1 = between(t, 'Parte 1 · Resumo-mestre\n', 'Parte 2 · Story da missão\n')
    p2 = between(t, 'Parte 2 · Story da missão\n', 'Parte 3 · Diálogos do Dr. Bigodes\n')
    p3 = between(t, 'Parte 3 · Diálogos do Dr. Bigodes\n', 'Parte 4 · Flashcards\n')
    refs = between(t, '\nReferências\n', 'Anexo · JSON').strip()
    a = anexo(t)
    ilha, paras = story(p2)
    cards = [{'id': c['id'], 'subtopico': c['subtopico'], 'pergunta': c['pergunta'].strip(), 'resposta': c['resposta'].strip(), 'zonas': c.get('zonas', []), **({'ref': c['ref']} if c.get('ref') else {})} for c in a['flashcards']]
    q = {}
    for k, v in a['mapa'].get('questoes', {}).items():
        m = re.match(r'^(\S+)\s*(?:\((.*)\))?$', k.strip())
        q[m.group(1)] = {'cartoes': v, **({'assunto': m.group(2)} if m.group(2) else {})}
    ids = {c['id'] for c in cards}
    dl = dialogos(p3)
    dl['erroRepetido'] = [{**e, 'cartoes': card_refs(e['fala'], ids)} for e in dl['erroRepetido']]
    return {
        'tema': a['tema'], 'ilha': a.get('ilha') or ilha,
        'resumo': fix_resumo(R.extract(pdf)), 'story': paras, 'dialogos': dl, 'flashcards': cards,
        'mapa': {'subtopicos': a['mapa'].get('subtopicos', {}), 'zonas': a['mapa'].get('zonas', {}), 'questoes': q},
        'referencias': refs_list(refs),
    }

if __name__ == '__main__':
    out, bank = sys.argv[1], json.load(open(sys.argv[2]))
    byid = {q['id']: q for q in bank}
    pack = {'tipo': 'yq-dossies', 'versao': 1, 'dossies': []}
    for pdf in sys.argv[3:]:
        d = convert(pdf)
        # conferências: questões do mapa existem e são do tema; cartões citados existem
        ids = {c['id'] for c in d['flashcards']}
        for qid, m in d['mapa']['questoes'].items():
            if qid not in byid: print(f'  ! {qid} não está no banco', file=sys.stderr)
            elif byid[qid]['tema'] != d['tema']: print(f'  ! {qid} é de {byid[qid]["tema"]}', file=sys.stderr)
            for c in m['cartoes']:
                if c not in ids: print(f'  ! {qid} cita {c} inexistente', file=sys.stderr)
        for grp in ('subtopicos', 'zonas'):
            for k, v in d['mapa'][grp].items():
                for c in v:
                    if c not in ids: print(f'  ! mapa.{grp}.{k} cita {c}', file=sys.stderr)
        tq = [q['id'] for q in bank if q['tema'] == d['tema']]
        miss = [x for x in tq if x not in d['mapa']['questoes']]
        print(f"{d['tema']}: {len(d['resumo'])} seções, {len(d['story'])} parágrafos, {sum(len(v) for v in d['dialogos'].values())} falas, {len(d['flashcards'])} cartões, {len(d['mapa']['questoes'])}/{len(tq)} questões mapeadas{' · faltam ' + ','.join(miss) if miss else ''}", file=sys.stderr)
        pack['dossies'].append(d)
    json.dump(pack, open(out, 'w'), ensure_ascii=False, indent=1)
