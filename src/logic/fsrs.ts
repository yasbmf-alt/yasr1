// FSRS-5 (Free Spaced Repetition Scheduler) com os pesos padrão publicados.
// Agenda só os flashcards; as revisões de tema seguem a lógica própria do app.
import type { CardState } from '../types';

const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const RETENTION = 0.9;
const MAX_IVL = 36500;

export type Rating = 1 | 2 | 3 | 4; // De novo, Difícil, Bom, Fácil
export const RATING_LABEL: Record<Rating, string> = { 1: 'De novo', 2: 'Difícil', 3: 'Bom', 4: 'Fácil' };

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const initS = (g: Rating) => Math.max(0.1, W[g - 1]);
const initD = (g: Rating) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);
const retrievability = (elapsedDays: number, s: number) => Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
const interval = (s: number) => Math.min(MAX_IVL, Math.max(1, Math.round((s / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1))));

function nextD(d: number, g: Rating) {
  const delta = -W[6] * (g - 3);
  const dp = d + (delta * (10 - d)) / 9;
  return clampD(W[7] * initD(4) + (1 - W[7]) * dp);
}
function recallS(d: number, s: number, r: number, g: Rating) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
}
function forgetS(d: number, s: number, r: number) {
  const v = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(v, s);
}
const shortTermS = (s: number, g: Rating) => s * Math.exp(W[17] * (g - 3 + W[18]));

export function newCardState(now = new Date()): CardState {
  return { due: now.toISOString(), stability: 0, difficulty: 0, reps: 0, lapses: 0, phase: 'new', lastReview: null };
}

/** Calcula o próximo estado do cartão para uma resposta. */
export function schedule(c: CardState, g: Rating, now = new Date()): CardState {
  const minutes = (m: number) => new Date(now.getTime() + m * 60000).toISOString();
  const days = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();

  if (c.phase === 'new' || !c.lastReview) {
    const s = initS(g);
    const d = initD(g);
    if (g === 1) return { ...c, stability: s, difficulty: d, reps: 1, lapses: 0, phase: 'learning', lastReview: now.toISOString(), due: minutes(1) };
    if (g === 2) return { ...c, stability: s, difficulty: d, reps: 1, phase: 'learning', lastReview: now.toISOString(), due: minutes(6) };
    return { ...c, stability: s, difficulty: d, reps: 1, phase: 'review', lastReview: now.toISOString(), due: days(interval(s)) };
  }

  const elapsed = Math.max(0, (now.getTime() - new Date(c.lastReview).getTime()) / 86400000);
  const sameDay = elapsed < 1;
  const r = retrievability(elapsed, Math.max(0.1, c.stability));
  const d = nextD(c.difficulty, g);
  let s: number;
  if (sameDay) s = shortTermS(Math.max(0.1, c.stability), g);
  else s = g === 1 ? forgetS(c.difficulty, c.stability, r) : recallS(c.difficulty, c.stability, r, g);
  s = Math.max(0.1, s);

  if (g === 1)
    return { ...c, stability: s, difficulty: d, reps: c.reps + 1, lapses: c.lapses + (c.phase === 'review' ? 1 : 0), phase: 'relearning', lastReview: now.toISOString(), due: minutes(5) };
  if (g === 2 && (c.phase === 'learning' || c.phase === 'relearning'))
    return { ...c, stability: s, difficulty: d, reps: c.reps + 1, lastReview: now.toISOString(), due: minutes(10) };
  return { ...c, stability: s, difficulty: d, reps: c.reps + 1, phase: 'review', lastReview: now.toISOString(), due: days(interval(s)) };
}

/** Texto curto do intervalo até a próxima revisão. */
export function previewLabel(c: CardState, g: Rating, now = new Date()) {
  const next = schedule(c, g, now);
  const mins = Math.round((new Date(next.due).getTime() - now.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const d = Math.round(mins / 1440);
  if (d < 31) return `${d} d`;
  if (d < 365) return `${Math.round(d / 30)} m`;
  return `${(d / 365).toFixed(1).replace('.', ',')} a`;
}

export const isDue = (c: CardState, now = new Date()) => new Date(c.due).getTime() <= now.getTime();
