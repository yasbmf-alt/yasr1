// Segredos ocasionais. Aparecem em dias sorteados de forma determinística
// (mesmo dia → mesmo resultado), sem exigir estudo nem tempo.
import { today } from './dates';

export function dayHash(salt: string, date = today()) {
  let h = 2166136261;
  for (const c of `${date}|${salt}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** verdadeiro em mais ou menos 1 de cada `n` dias */
export const eggDay = (salt: string, n: number) => dayHash(salt) % n === 0;

export const SECRET_PHRASES = [
  'psiu: você está indo melhor do que imagina.',
  'achou! a gatinha aprova o seu esforço 🐾',
  'segredo: até as R1 mais tops já erraram essa questão.',
  'um café, uma revisão e o mundo é seu.',
  'você é a protagonista dessa história, diva.',
  'nota mental: descansar também é estudar.',
  'a banca não sabe o que está vindo aí 💅',
  'cada post-it é uma versão sua mais preparada.',
];
export const phraseOfDay = (salt: string) => SECRET_PHRASES[dayHash(salt) % SECRET_PHRASES.length];
