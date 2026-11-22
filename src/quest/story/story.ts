// Modo história: transforma o texto da missão (story do dossiê, falas do Chamado)
// em "cenas" com quem fala em cada momento: narrador, Dr. Bigodes, Yasmim ou o chefão.
import { CHAMADO, INTRO, ISLANDS, islandOf, FINAL, REVANCHE } from '../data';
import type { YqDossie } from '../dossie';
import { biomaOf, BIOMA_NOME, type BiomaId } from '../scene/Bioma';
import { FALAS } from '../falas';

export type Quem = 'narrador' | 'bigodes' | 'yas' | 'boss';
export interface Beat { quem: Quem; texto: string }
export interface Cena {
  id: string; // 'prologo' ou o tema
  capitulo: string; // "Prólogo", "Capítulo 3"
  titulo: string; // nome da ilha na história
  subtitulo?: string;
  bioma: BiomaId;
  boss?: { tema: string; nome: string };
  beats: Beat[];
  onDone?: () => void; // o que fazer quando a cena acabar (ex.: abrir o Chamado)
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set(['de', 'da', 'do', 'dos', 'das', 'sem', 'com', 'o', 'a']);

/** quem fala: o último personagem citado antes da fala (ou logo depois, em "…", diz Bigodes) */
function speaker(before: string, after: string, bossWords: string[]): Quem {
  const pick = (t: string, fromEnd: boolean): Quem | null => {
    const n = norm(t);
    const hits: { q: Quem; i: number }[] = [];
    const find = (re: RegExp, q: Quem) => { let m; const r = new RegExp(re.source, 'g'); while ((m = r.exec(n))) hits.push({ q, i: m.index }); };
    find(/bigode/, 'bigodes');
    find(/\byas(min)?\b/, 'yas');
    for (const w of bossWords) find(new RegExp(`\\b${w}`), 'boss');
    if (!hits.length) return null;
    hits.sort((a, b) => a.i - b.i);
    return fromEnd ? hits[hits.length - 1].q : hits[0].q;
  };
  // "…", diz Bigodes → quem vem depois do verbo; "vira para a Yas" não faz a Yas falar
  const tag = norm(after).match(/^\s*[,.]?\s*(diz|pergunta|responde|completa|grita|murmura|fala)\s+(o |a |dr\. )?([a-z]+)/);
  const fromTag = tag ? pick(tag[3], false) : null;
  const clean = before.replace(/(para|pra|com|olha|encara)\s+(a\s+)?yas(min)?/gi, '');
  return fromTag ?? pick(clean.slice(-220), true) ?? 'bigodes';
}

/** quebra narração longa em blocos de até ~190 caracteres, por frase */
function chunks(t: string, max = 190) {
  const sents = t.match(/[^.!?]+[.!?]+["”]?|\S[^.!?]*$/g) ?? [t];
  const out: string[] = []; let cur = '';
  for (const s of sents.map((x) => x.trim()).filter(Boolean)) {
    if (cur && (cur + ' ' + s).length > max) { out.push(cur); cur = s; } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

export function beatsFromStory(paras: string[], bossName?: string, bossAntigo?: string): Beat[] {
  const bossWords = [bossName, bossAntigo].filter(Boolean).flatMap((n) => norm(n!).split(/\s+/)).filter((w) => w.length > 2 && !STOP.has(w)).concat(['monstro', 'chefao', 'robo', 'dragao']);
  const beats: Beat[] = [];
  for (const p of paras) {
    const re = /["“]([^"”]+)["”]/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(p))) {
      const before = p.slice(last, m.index).trim();
      const after = p.slice(m.index + m[0].length);
      // narração entre as falas (tira "diz Bigodes." e afins, que viram o nome no balão)
      const narr = before.replace(/^[,.;:]?\s*(diz|pergunta|responde|completa|grita|murmura)[^.]*\.\s*/i, '').trim();
      if (narr.length > 3 && !/^(diz|pergunta|responde)\b/i.test(narr)) chunks(narr).forEach((c) => beats.push({ quem: 'narrador', texto: c }));
      const quem = speaker(p.slice(0, m.index), after, bossWords);
      chunks(m[1].trim(), 220).forEach((c) => beats.push({ quem, texto: c }));
      last = m.index + m[0].length;
    }
    const tail = p.slice(last).replace(/^[,.;:]?\s*(diz|pergunta|responde|completa|grita|murmura)\s+[^.]*\.\s*/i, '').trim();
    if (tail.length > 3) chunks(tail).forEach((c) => beats.push({ quem: 'narrador', texto: c }));
  }
  return beats;
}

const capNum = (tema: string) => ISLANDS.findIndex((i) => i.tema === tema) + 1;

export function cenaIlha(tema: string, dossie?: YqDossie): Cena {
  const i = islandOf(tema);
  const o = i ? FALAS[i.slug] : undefined; // falas oficiais do elenco
  const bossNome = i?.boss ?? (tema === FINAL ? 'Chefão da Prova' : 'Rei dos Fantasmas');
  const bioma = biomaOf(tema);
  const titulo = dossie?.ilha ?? o?.ilha ?? (tema === FINAL ? 'Hospital da Prova' : tema === REVANCHE ? 'Mar dos Fantasmas' : `${BIOMA_NOME[bioma]}: ${i?.short ?? tema}`);
  const prov = o?.interacoes.provocacao;
  const provocacao: Beat[] = prov ? [{ quem: 'yas', texto: prov.yas }, { quem: 'boss', texto: prov.vilao }, { quem: 'bigodes', texto: prov.bigodes }] : [];
  let beats: Beat[];
  if (dossie?.story.length) {
    beats = [...dossie.dialogos.apresentacao.map((t) => ({ quem: 'bigodes' as Quem, texto: t })), ...beatsFromStory(dossie.story, bossNome, i?.bossAntigo), ...provocacao];
  } else if (o) {
    beats = [
      { quem: 'narrador', texto: `${titulo}. Dizem que ${bossNome} guarda esta ilha.` },
      { quem: 'bigodes', texto: o.bigodes.entrada },
      ...provocacao,
    ];
  } else {
    beats = [
      { quem: 'narrador', texto: `${titulo}. Dizem que ${bossNome} guarda esta ilha.` },
      ...(CHAMADO[tema] ?? []).map((t) => ({ quem: 'bigodes' as Quem, texto: t })),
      { quem: 'yas', texto: 'Então bora. Eu vim preparada.' },
    ];
  }
  return {
    id: tema, capitulo: tema === FINAL ? 'Capítulo final' : tema === REVANCHE ? 'Capítulo extra' : `Capítulo ${capNum(tema)}`,
    titulo, subtitulo: i ? i.tema : undefined, bioma, boss: { tema, nome: bossNome }, beats,
  };
}

export function cenaPrologo(dias: number): Cena {
  const intro = INTRO(dias);
  return {
    id: 'prologo', capitulo: 'Prólogo', titulo: 'O arquipélago da R1', subtitulo: 'Urgência e Emergência · Saúde Mental', bioma: 'mente',
    beats: [
      { quem: 'narrador', texto: 'Era uma vez uma residente que tinha uma prova marcada e catorze temas para dominar.' },
      { quem: 'narrador', texto: 'Cada tema virou uma ilha. E cada ilha ganhou um chefão, que só cai com resposta certa.' },
      { quem: 'bigodes', texto: intro[0] },
      { quem: 'bigodes', texto: intro[1] },
      { quem: 'yas', texto: 'Dr. Bigodes? Você fala?' },
      { quem: 'bigodes', texto: 'Falo, corrijo questão e julgo em silêncio. Sou seu mentor nessa viagem.' },
      { quem: 'bigodes', texto: intro[2] },
      { quem: 'yas', texto: 'Ilha por ilha, então. Bora.' },
    ],
  };
}

export const CAPITULOS = (): string[] => [...ISLANDS.map((i) => i.tema), FINAL];
