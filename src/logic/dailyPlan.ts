// Plano diário dos flashcards: cabe no tempo do dia. Primeiro as revisões
// (as mais urgentes e dos temas que mais caem errado), depois os novos, até o
// limite do dia. O que não cabe espera a vez; nada é apagado nem adiado no FSRS.
import type { DataSnapshot, Flashcard } from '../types';
import { addDays, toKey, today } from './dates';
import { isMistake } from './simErrors';

export const DEFAULT_FLASH_MINUTES = 40;
export const DEFAULT_NEW_PER_DAY = 21;
const NEW_COST = 2.5; // um novo volta algumas vezes no mesmo dia (etapas de aprendizado)
const DAY = 86400000;

const dayOf = (iso: string) => toKey(new Date(iso));

/** segundos por resposta, medidos nos registros de flashcards dos últimos 30 dias */
export function secondsPerCard(d: DataSnapshot) {
  const from = addDays(today(), -29);
  let min = 0;
  let n = 0;
  for (const s of d.sessions)
    if (s.type === 'flashcards' && s.date >= from && s.minutes && s.questions) {
      min += s.minutes;
      n += s.questions;
    }
  return n >= 30 ? Math.min(45, Math.max(6, (min * 60) / n)) : 12;
}

/**
 * Peso de cada tema: errado em vários simulados, acerto baixo nas questões e
 * estudado há pouco na trilha sobem; tema que você já domina desce.
 */
export function topicWeights(d: DataSnapshot) {
  const w = new Map<string, number>();
  const add = (id: string | null | undefined, v: number) => {
    if (id) w.set(id, (w.get(id) ?? 0) + v);
  };
  const recentSim = addDays(today(), -120);
  const simsWrong = new Map<string, Set<string>>();
  for (const sim of d.simulados) {
    if (sim.date < recentSim) continue;
    for (const g of sim.errors ?? []) {
      if (!g.topicId || !isMistake(g) || !g.count) continue;
      simsWrong.set(g.topicId, (simsWrong.get(g.topicId) ?? new Set()).add(sim.id));
      add(g.topicId, Math.min(3, g.count) * 0.5);
    }
  }
  for (const [id, s] of simsWrong) add(id, s.size >= 2 ? 4 + s.size : 2);

  const from30 = addDays(today(), -29);
  const from7 = addDays(today(), -6);
  const qa = new Map<string, { q: number; c: number }>();
  for (const s of d.sessions) {
    if (!s.topicId || s.type === 'flashcards' || s.type === 'correcao') continue;
    if (s.date >= from7) add(s.topicId, 1.5); // acabou de estudar: cartão fresquinho fixa melhor
    if (s.date >= from30 && s.questions) {
      const x = qa.get(s.topicId) ?? { q: 0, c: 0 };
      x.q += s.questions;
      x.c += s.correct ?? 0;
      qa.set(s.topicId, x);
    }
  }
  for (const [id, x] of qa) {
    if (x.q < 10) continue;
    const acc = x.c / x.q;
    if (acc < 0.7) add(id, 3);
    else if (acc < 0.8) add(id, 1.5);
    else if (acc >= 0.85) add(id, -2);
  }
  return w;
}

const againRecent = (c: Flashcard, now: number) => (c.log ?? []).filter((r) => r.g === 1 && now - new Date(r.at).getTime() < 14 * DAY).length;

/** errado/aprendendo: o que o app pinta de vermelho */
export const isLearning = (c: Flashcard) => c.fsrs.phase === 'learning' || c.fsrs.phase === 'relearning';

export interface DayPlan {
  budget: number; // minutos do dia
  newLimit: number;
  secPer: number;
  doneToday: number; // respostas hoje
  newToday: number; // novos começados hoje
  minutesToday: number;
  reviewsDue: number; // revisões vencidas (todas)
  reviewIds: string[]; // revisões que cabem hoje
  newIds: string[]; // novos que cabem hoje
  queue: string[]; // fila de hoje (revisões primeiro)
  carried: number; // revisões que ficam para os próximos dias
  waiting: number; // novos na fila de espera
  estMinutes: number; // tempo estimado do que falta hoje
  doneForToday: boolean;
}

export function dayPlan(d: DataSnapshot, now = new Date()): DayPlan {
  const budget = d.settings.flashMinutes ?? DEFAULT_FLASH_MINUTES;
  const newLimit = d.settings.flashNewPerDay ?? DEFAULT_NEW_PER_DAY;
  const secPer = secondsPerCard(d);
  const t = toKey(now);
  const ms = now.getTime();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let doneToday = 0;
  let newToday = 0;
  for (const c of d.cards) {
    const log = c.log ?? [];
    const n = log.filter((r) => dayOf(r.at) === t).length;
    doneToday += n;
    if (n && log.length && dayOf(log[0].at) === t) newToday++;
  }
  const loggedMin = d.sessions.filter((s) => s.type === 'flashcards' && s.date === t).reduce((a, s) => a + (s.minutes ?? 0), 0);
  const minutesToday = Math.max(loggedMin, Math.round((doneToday * secPer) / 60));
  // o que já foi feito hoje desconta do tempo pelo mesmo cálculo do plano (sem arredondar por sessão)
  let left = Math.max(0, budget * 60 - doneToday * secPer); // segundos que sobram hoje

  const deckTopic = new Map(d.decks.map((x) => [x.id, x.topicId]));
  const weights = topicWeights(d);
  const wOf = (c: Flashcard) => weights.get(deckTopic.get(c.deckId) ?? '') ?? 0;

  // revisões: aprendendo primeiro, depois as mais atrasadas/arriscadas dos temas mais importantes
  const due = d.cards.filter((c) => c.fsrs.phase !== 'new' && new Date(c.fsrs.due).getTime() <= (isLearning(c) ? endOfDay.getTime() : ms));
  const score = (c: Flashcard) => {
    const overdue = (ms - new Date(c.fsrs.due).getTime()) / DAY;
    return (isLearning(c) ? 1000 : 0) + Math.min(overdue, 30) / Math.max(1, c.fsrs.stability) * 10 + c.fsrs.lapses * 2 + againRecent(c, ms) * 3 + wOf(c) * 2;
  };
  const sortedDue = due.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s).map((x) => x.c);
  const fitReviews = Math.floor(left / secPer);
  const reviewIds = sortedDue.slice(0, fitReviews).map((c) => c.id);
  left -= reviewIds.length * secPer;

  // novos: temas mais importantes primeiro; dentro do tema, na ordem em que foram criados
  const fresh = d.cards
    .filter((c) => c.fsrs.phase === 'new')
    .sort((a, b) => wOf(b) - wOf(a) || a.createdAt.localeCompare(b.createdAt));
  const slots = Math.max(0, Math.min(newLimit - newToday, Math.floor(left / (secPer * NEW_COST))));
  const newIds = fresh.slice(0, slots).map((c) => c.id);

  // os novos entram misturados no fim das revisões, um a cada 4 cartões
  const queue: string[] = [];
  const r = [...reviewIds];
  const n = [...newIds];
  while (r.length || n.length) {
    for (let k = 0; k < 4 && r.length; k++) queue.push(r.shift()!);
    if (n.length) queue.push(n.shift()!);
  }
  const estMinutes = Math.round((reviewIds.length * secPer + newIds.length * secPer * NEW_COST) / 60);
  return {
    budget, newLimit, secPer, doneToday, newToday, minutesToday,
    reviewsDue: due.length, reviewIds, newIds, queue,
    carried: Math.max(0, due.length - reviewIds.length),
    waiting: Math.max(0, fresh.length - newIds.length),
    estMinutes,
    doneForToday: queue.length === 0,
  };
}

/** quantos dias o atraso atual leva para zerar no ritmo do plano (aproximado) */
export function catchUpDays(p: DayPlan) {
  if (!p.carried) return 0;
  const perDay = Math.max(1, Math.floor((p.budget * 60) / p.secPer));
  return Math.ceil((p.reviewsDue) / perDay);
}
