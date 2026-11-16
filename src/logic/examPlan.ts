// Lê um plano em texto (feito em outro chat, colado ou anexado) e transforma em
// fases e casinhas do capítulo especial. O app não interpreta conteúdo: só segue
// as linhas — cada linha vira uma casinha com horário, tipo e texto.
import type { ExamStepKind } from '../types';
import { addDays, fromKey, today } from './dates';

export interface PlanStep { day: string; time: string | null; kind: ExamStepKind; label: string }
export interface ParsedPlan {
  title?: string;
  start?: string;
  end?: string;
  examDate?: string;
  rules: string[];
  steps: PlanStep[];
  ignored: string[];
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const KIND_WORDS: [RegExp, ExamStepKind][] = [
  [/^(tema|temas|estudo|estudar|aula|videoaula|conteudo|teoria|leitura|ler)$/, 'tema'],
  [/^(questoes|questao|qs|banco|exercicios)$/, 'questoes'],
  [/^(flash|flashcard|flashcards|card|cards|anki)$/, 'flashcards'],
  [/^(revisao|revisar|resumo|mapa|mapas)$/, 'revisao'],
  [/^(prova|simulado|chefao)$/, 'prova'],
  [/^(correcao|corrigir)$/, 'correcao'],
  [/^(pausa|descanso|intervalo|almoco|lanche|jantar|cafe|cochilo|sono|refeicao)$/, 'pausa'],
  [/^(premio|recompensa|presente|mimo)$/, 'premio'],
  [/^(bonus|extra|desafio)$/, 'bonus'],
  [/^(outro|outra|tarefa)$/, 'outro'],
];
export const kindFromWord = (w: string): ExamStepKind | null => {
  const n = norm(w).replace(/[^a-z]/g, '');
  return KIND_WORDS.find(([re]) => re.test(n))?.[1] ?? null;
};

const WEEKDAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

/** 2026-11-21, 21/11/2026, 21/11/26 ou 21/11 (ano mais provável) */
export function parseDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : new Date().getFullYear();
  let key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // sem ano e já passou faz tempo: é do ano que vem
  if (!m[3] && key < addDays(today(), -60)) { y += 1; key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  return key;
}

const TIME = /^(\d{1,2})\s*(?:[:h]\s*(\d{2})?)\s*/i;

export function parsePlan(text: string): ParsedPlan {
  const out: ParsedPlan = { rules: [], steps: [], ignored: [] };
  const raw: { dayHint: string | null; time: string | null; kind: ExamStepKind; label: string }[] = [];
  let dayHint: string | null = null;
  let inRules = false;

  for (const line0 of text.split(/\r?\n/)) {
    let line = line0.trim();
    if (!line || /^[-=*_]{3,}$/.test(line)) continue;

    // títulos de seção: "# Título", "## Sábado 21/11", "### Dia 2", "## Regras"
    const h = line.match(/^#{1,6}\s*(.+)$/);
    if (h) {
      const body = h[1].replace(/[*_`]/g, '').trim();
      const nb = norm(body);
      if (/^regras?\b/.test(nb)) { inRules = true; continue; }
      inRules = false;
      const isDay = parseDate(body) || WEEKDAYS.some((w) => nb.includes(w)) || /\b(dia|fase)\s*\d+/.test(nb);
      if (isDay) dayHint = body;
      else if (!out.title && line.startsWith('# ')) out.title = body.replace(/^modo prova\s*[:\-–]\s*/i, '');
      continue;
    }

    line = line.replace(/^([-*•+]|\d+[.)])\s+/, '').replace(/^\[[ xX]?\]\s*/, '').replace(/\*\*/g, '').trim();
    if (!line) continue;

    // cabeçalho "chave: valor"
    const kv = line.match(/^([A-Za-zÀ-ú ]{2,20})\s*:\s*(.+)$/);
    if (kv) {
      const k = norm(kv[1]);
      const v = kv[2].trim();
      if (/^(titulo|nome|capitulo)$/.test(k)) { out.title = v; continue; }
      if (/^(inicio|comeca|de)$/.test(k) && parseDate(v)) { out.start = parseDate(v)!; continue; }
      if (/^(fim|termina|ate)$/.test(k) && parseDate(v)) { out.end = parseDate(v)!; continue; }
      if (/^(prova|data da prova|dia da prova)$/.test(k) && parseDate(v) && !/[a-z]{4,}/i.test(v.replace(/(segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo|feira)/gi, ''))) { out.examDate = parseDate(v)!; continue; }
      if (/^regras?$/.test(k)) { out.rules.push(v); continue; }
      if (/^(dia|fase)$/.test(k)) { dayHint = v; continue; }
    }
    if (inRules) { out.rules.push(line); continue; }

    // casinha: "07:00 | tema | Bronquiolite", "07h tema: Bronquiolite", "tema - Bronquiolite"
    let time: string | null = null;
    const tm = line.match(TIME);
    if (tm && Number(tm[1]) < 24 && (tm[2] || /h/i.test(tm[0]))) {
      time = `${tm[1].padStart(2, '0')}:${tm[2] ?? '00'}`;
      line = line.slice(tm[0].length).replace(/^[|\-–—:]\s*/, '').trim();
      // "07:00–08:30 | ..." → ignora o fim do bloco
      line = line.replace(/^(\d{1,2}\s*[:h]\s*\d{0,2})\s*/i, '').replace(/^[|\-–—:]\s*/, '').trim();
    }
    let kind: ExamStepKind | null = null;
    let label = '';
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      kind = kindFromWord(parts[0] ?? '');
      label = (kind ? parts.slice(1) : parts).join(' · ');
    } else {
      const m = line.match(/^([A-Za-zÀ-ú]+)\s*[:\-–—]\s*(.+)$/);
      if (m && kindFromWord(m[1])) { kind = kindFromWord(m[1]); label = m[2]; }
      else if (kindFromWord(line)) { kind = kindFromWord(line); label = ''; }
    }
    if (!kind) {
      if (time) { kind = 'outro'; label = line; } else { out.ignored.push(line0.trim()); continue; }
    }
    raw.push({ dayHint, time, kind, label: label.trim() });
  }

  // datas dos dias: pela data escrita, pelo dia da semana ou por "Dia N"
  const explicit = raw.map((r) => (r.dayHint ? parseDate(r.dayHint) : null)).filter(Boolean) as string[];
  const start = out.start ?? explicit.sort()[0] ?? today();
  const hints = [...new Set(raw.map((r) => r.dayHint))];
  const dayOf = (hint: string | null): string => {
    if (!hint) return start;
    const d = parseDate(hint);
    if (d) return d;
    const nh = norm(hint);
    const n = nh.match(/(?:dia|fase)\s*(\d+)/);
    if (n) return addDays(start, Math.max(0, Number(n[1]) - 1));
    const wd = WEEKDAYS.findIndex((w) => nh.includes(w));
    if (wd >= 0) {
      for (let i = 0; i < 14; i++) { const k = addDays(start, i); if (fromKey(k).getDay() === wd) return k; }
    }
    return addDays(start, Math.max(0, hints.indexOf(hint)));
  };
  out.steps = raw.map((r) => ({ day: dayOf(r.dayHint), time: r.time, kind: r.kind, label: r.label }));
  const days = out.steps.map((s) => s.day).sort();
  out.start = out.start ?? days[0];
  out.end = out.end ?? days.at(-1) ?? out.start;
  return out;
}

/** texto para colar no outro chat: pede o plano já no formato que o app lê */
export const PLAN_PROMPT = `Monte meu plano de estudo para a prova no formato do app Yas R1 (modo prova).
Responda SÓ com o plano, sem comentários, exatamente neste formato:

titulo: Maratona da prova de Pediatria
inicio: 21/11/2026
fim: 22/11/2026
prova: 23/11/2026
regra: celular longe durante os blocos
regra: errou questão? anota o porquê no caderno de erros

## Sábado 21/11
07:00 | tema | Bronquiolite — quadro, diagnóstico e conduta
08:30 | questoes | 20 questões de bronquiolite e IVAS
10:00 | pausa | café + alongar 15 min
10:15 | flashcards | flashcards de vacinas
12:00 | premio | almoço gostoso + 1 episódio da série
13:30 | revisao | resumo das provas anteriores (temas que mais caem)
19:00 | bonus | 10 questões extras dos temas mais fracos

## Domingo 22/11
07:00 | ...

Regras do formato:
- uma linha por bloco: horário | tipo | o que fazer
- tipos aceitos: tema, questoes, flashcards, revisao, prova, correcao, pausa, premio, bonus, outro
- "premio" = recompensa que libera quando eu terminar os blocos antes dele
- "bonus" = desafio extra opcional
- um título "## Dia da semana dd/mm" para cada dia`;
