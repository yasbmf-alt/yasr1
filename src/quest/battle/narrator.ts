// Falas do Dr. Bigode na batalha: bem-humoradas, sem cobrança nem punição.
// Em temas sensíveis (ex.: emergências psiquiátricas) ele fica sério e acolhedor.
import { bestLine } from '../dossie';
import type { BattleCast, BattleQuestion, TurnResult } from './types';

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const narrator = {
  entrada: (c: BattleCast) =>
    c.falas?.entrada?.length ? pick(c.falas.entrada) : c.serio ? `Ilha de ${c.tema}. Aqui a gente vai com calma e cuidado.` : pick([
      `Um ${c.monstro} selvagem apareceu!`,
      `Atenção: ${c.monstro} à vista. Ele adora pegadinha.`,
      `Lá vem o ${c.monstro}. Respira, que você estudou.`,
    ]),
  apresentacao: (c: BattleCast, n: number) =>
    c.serio ? `${n} questão${n > 1 ? 'ões' : ''} sobre ${c.tema}. Leia com atenção, sem pressa.` : pick([
      `Tema: ${c.tema}. ${n} questão${n > 1 ? 'ões' : ''} nesta rodada. Cada acerto é um golpe.`,
      `${c.tema}! ${n} rodada${n > 1 ? 's' : ''} de perguntas. Eu narro, você brilha.`,
    ]),
  escolha: (c: BattleCast) => (c.serio ? 'Qual a melhor conduta?' : pick(['O que a Yas vai fazer?', 'Escolha o seu golpe.', 'Qual golpe você usa?'])),
  acerto: (c: BattleCast, q?: BattleQuestion) => (q && c.falas?.acerto && bestLine(c.falas.acerto, `${q.enunciado} ${q.alternativas[q.gabarito]} ${q.comentario}`)) || (c.serio ? 'Correto.' : pick(['Golpe certeiro!', 'Em cheio! O monstro sentiu essa.', 'Acertou! Bonito de ver.', 'Isso aí, direto no ponto.'])),
  erro: (c: BattleCast, q?: BattleQuestion, pickK?: string, prev: TurnResult[] = []) => erroDossie(c, q, pickK, prev) || (c.serio ? 'Não foi essa. Veja o porquê com calma.' : pick(['O monstro contra-atacou! Mas tudo bem: ela volta no fim pra você.', 'Essa escapou. Olha o porquê e segue.', 'Contra-ataque! Faz parte do treino.'])),
  proximo: (c: BattleCast, hp: number) => (c.serio ? 'Próxima questão.' : hp <= 1 ? 'Ele tá quase caindo…' : pick(['Próximo turno!', 'Bora pra próxima.', 'O monstro se levanta…'])),
  revisao: () => 'Essa já apareceu antes. Segunda chance!',
  /** comentário do Bigodes ao abrir a questão, só se alguma fala combinar com ela */
  durante: (c: BattleCast, q: BattleQuestion) => (c.falas?.durante ? bestLine(c.falas.durante, `${q.enunciado} ${Object.values(q.alternativas).join(' ')}`) : null),
  vitoria: (c: BattleCast) => c.falas?.vitoria?.length ? pick(c.falas.vitoria) : (c.serio ? `Rodada de ${c.tema} concluída.` : pick([`O ${c.monstro} desmaiou! Vitória!`, `${c.monstro} derrotado. Eu sabia. (Eu sempre sei.)`])),
  fimSemVitoria: (c: BattleCast) => c.falas?.derrota?.length ? pick(c.falas.derrota) : (c.serio ? 'Rodada concluída. Vale revisar os pontos abaixo.' : `O ${c.monstro} fugiu… mas agora você sabe onde ele se esconde.`),
};

/** erro repetido no mesmo subtópico (cartões em comum) → fala de reforço; senão, a fala de erro que combina com a escolha */
function erroDossie(c: BattleCast, q?: BattleQuestion, pickK?: string, prev: TurnResult[] = []): string | null {
  if (!q || !c.falas) return null;
  const mine = new Set(c.cartoesDe?.[q.id] ?? []);
  if (mine.size && c.falas.erroRepetido?.length) {
    const before = prev.filter((r) => !r.ok && r.q.id !== q.id).map((r) => new Set(c.cartoesDe?.[r.q.id] ?? []));
    // dispara uma vez: no 2º erro do mesmo subtópico
    const rep = c.falas.erroRepetido.find((e) => e.cartoes.some((x) => mine.has(x)) && before.filter((b) => e.cartoes.some((x) => b.has(x))).length === 1);
    if (rep) return rep.fala;
  }
  return c.falas.erro ? bestLine(c.falas.erro, `${pickK ? q.alternativas[pickK] : ''} ${q.enunciado}`) : null;
}

/** o porquê em uma frase: começo do comentário, sem ultrapassar ~200 caracteres */
export function shortWhy(q: BattleQuestion) {
  const c = (q.comentario || '').replace(/\s+/g, ' ').trim();
  if (!c) return `A certa é ${q.gabarito}) ${q.alternativas[q.gabarito] ?? ''}`;
  const m = c.match(/^(.{40,220}?[.!?])\s/);
  const s = m ? m[1] : c.slice(0, 200);
  return s.length < c.length && !m ? `${s}…` : s;
}
