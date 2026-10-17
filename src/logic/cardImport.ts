// Importação de baralhos em CSV/TSV ou JSON (inclusive os gerados pelo Claude).

export interface RawCard {
  front: string;
  back: string;
  tags: string[];
}

const FRONT_KEYS = ['front', 'frente', 'pergunta', 'question', 'q', 'termo', 'enunciado'];
const BACK_KEYS = ['back', 'verso', 'resposta', 'answer', 'a', 'definicao', 'definição'];
const TAG_KEYS = ['tags', 'tag', 'etiquetas'];

function pick(o: Record<string, unknown>, keys: string[]) {
  for (const k of Object.keys(o)) if (keys.includes(k.toLowerCase().trim())) return o[k];
  return undefined;
}
const toTags = (v: unknown) =>
  Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : typeof v === 'string' ? v.split(/[;,|]/).map((s) => s.trim()).filter(Boolean) : [];

export function parseJSON(text: string): { cards: RawCard[]; deckName?: string } {
  const j = JSON.parse(text);
  let arr: unknown[] = [];
  let deckName: string | undefined;
  if (Array.isArray(j)) arr = j;
  else if (j && typeof j === 'object') {
    const o = j as Record<string, unknown>;
    deckName = typeof o.deck === 'string' ? o.deck : typeof o.name === 'string' ? o.name : typeof o.nome === 'string' ? o.nome : typeof o.baralho === 'string' ? o.baralho : undefined;
    const list = o.cards ?? o.cartoes ?? o['cartões'] ?? o.flashcards ?? o.itens;
    if (Array.isArray(list)) arr = list;
  }
  const cards: RawCard[] = [];
  for (const it of arr) {
    if (Array.isArray(it) && it.length >= 2) cards.push({ front: String(it[0]), back: String(it[1]), tags: toTags(it[2]) });
    else if (it && typeof it === 'object') {
      const o = it as Record<string, unknown>;
      const f = pick(o, FRONT_KEYS);
      const b = pick(o, BACK_KEYS);
      if (f != null && b != null) cards.push({ front: String(f), back: String(b), tags: toTags(pick(o, TAG_KEYS)) });
    }
  }
  return { cards: cards.filter((c) => c.front.trim() && c.back.trim()), deckName };
}

/** CSV com aspas, separador detectado (tab, ponto e vírgula ou vírgula). */
export function parseCSV(text: string): RawCard[] {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const semi = firstLine.match(/;/g)?.length ?? 0;
  const comma = firstLine.match(/,/g)?.length ?? 0;
  const sep = firstLine.includes('\t') ? '\t' : semi > comma ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"' && field === '') q = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const clean = rows.filter((r) => r.some((c) => c.trim()));
  if (!clean.length) return [];
  const head = clean[0].map((c) => c.toLowerCase().trim());
  let fi = 0;
  let bi = 1;
  let ti = 2;
  let start = 0;
  if (head.some((h) => FRONT_KEYS.includes(h)) || head.some((h) => BACK_KEYS.includes(h))) {
    fi = Math.max(0, head.findIndex((h) => FRONT_KEYS.includes(h)));
    bi = head.findIndex((h) => BACK_KEYS.includes(h));
    if (bi < 0) bi = fi === 0 ? 1 : 0;
    ti = head.findIndex((h) => TAG_KEYS.includes(h));
    start = 1;
  }
  return clean
    .slice(start)
    .map((r) => ({ front: (r[fi] ?? '').trim(), back: (r[bi] ?? '').trim(), tags: ti >= 0 ? toTags(r[ti]) : [] }))
    .filter((c) => c.front && c.back);
}

export function parseAny(text: string, filename = ''): { cards: RawCard[]; deckName?: string; error?: string } {
  const t = text.replace(/^﻿/, '').trim();
  if (!t) return { cards: [], error: 'O conteúdo está vazio.' };
  const looksJSON = filename.toLowerCase().endsWith('.json') || t.startsWith('[') || t.startsWith('{');
  if (looksJSON) {
    try {
      const r = parseJSON(t);
      if (!r.cards.length) return { cards: [], error: 'Não encontrei cartões com frente e verso nesse JSON.' };
      return r;
    } catch {
      if (filename.toLowerCase().endsWith('.json')) return { cards: [], error: 'Esse JSON não está válido.' };
    }
  }
  const cards = parseCSV(t);
  if (!cards.length) return { cards: [], error: 'Não encontrei cartões. Use duas colunas: frente e verso.' };
  return { cards };
}
