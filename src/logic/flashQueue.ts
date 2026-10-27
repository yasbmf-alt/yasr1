// Filas de estudo dos flashcards. Nada aqui apaga ou adia cartões: o que
// não for respondido continua novo/vencido e aparece na próxima vez.
import type { Deck, Flashcard } from '../types';
import { isDue } from './fsrs';
import { toKey } from './dates';

export const DAILY_GOAL = 30; // meta do dia (não é limite)
export const TURBO_SIZE = 30;

const DAY = 86400000;
const againRecent = (c: Flashcard, now: number, days = 14) => (c.log ?? []).filter((r) => r.g === 1 && now - new Date(r.at).getTime() < days * DAY).length;

/** baralho inteiro: todos os vencidos e todos os novos (sem limite de novos) */
export function deckQueue(deckId: string, cards: Flashcard[], now = new Date()) {
  const mine = cards.filter((c) => c.deckId === deckId);
  const due = mine.filter((c) => c.fsrs.phase !== 'new' && isDue(c.fsrs, now)).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
  const fresh = mine.filter((c) => c.fsrs.phase === 'new').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...due, ...fresh].map((c) => c.id);
}

export function deckCounts(deck: Deck, cards: Flashcard[], now = new Date()) {
  const mine = cards.filter((c) => c.deckId === deck.id);
  const fresh = mine.filter((c) => c.fsrs.phase === 'new').length;
  const due = mine.filter((c) => c.fsrs.phase !== 'new' && isDue(c.fsrs, now)).length;
  return { total: mine.length, fresh, due, ready: due + fresh, studied: mine.length - fresh };
}

/** "risco" de esquecer: atrasados primeiro, depois muito errados e difíceis */
function risk(c: Flashcard, now: number) {
  const overdue = (now - new Date(c.fsrs.due).getTime()) / DAY;
  return (overdue > 0 ? 10 + Math.min(overdue, 30) : overdue * 0.3) + c.fsrs.lapses * 2 + (c.fsrs.difficulty - 5) * 0.6 + againRecent(c, now) * 4;
}

/** Turbo: 30 cartões de temas já estudados, misturados, priorizando o que mais precisa */
export function turboQueue(cards: Flashcard[], size = TURBO_SIZE, now = Date.now()) {
  const pool = cards.filter((c) => c.fsrs.phase !== 'new').map((c) => ({ c, r: risk(c, now) })).sort((a, b) => b.r - a.r).slice(0, size);
  // intercala baralhos para a sessão ficar misturada
  const byDeck = new Map<string, Flashcard[]>();
  for (const { c } of pool) byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c]);
  const lists = [...byDeck.values()];
  const out: string[] = [];
  while (lists.some((l) => l.length)) for (const l of lists) if (l.length) out.push(l.shift()!.id);
  return out;
}

/** meus erros: cartões que errei recentemente (ou que costumo esquecer) */
export function mistakesQueue(cards: Flashcard[], now = Date.now(), max = 50) {
  return cards
    .map((c) => {
      const last = (c.log ?? []).at(-1);
      const lastAgain = [...(c.log ?? [])].reverse().find((r) => r.g === 1);
      const score = (last?.g === 1 ? 100 : 0) + againRecent(c, now, 30) * 10 + c.fsrs.lapses * 3;
      return { c, score, when: lastAgain?.at ?? '' };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.when.localeCompare(a.when))
    .slice(0, max)
    .map((x) => x.c.id);
}

/** cartões respondidos hoje (para a meta diária) */
export function answeredToday(cards: Flashcard[], sessionsToday: number) {
  const t = toKey(new Date());
  const logged = cards.reduce((a, c) => a + (c.log ?? []).filter((r) => toKey(new Date(r.at)) === t).length, 0);
  return Math.max(logged, sessionsToday);
}
