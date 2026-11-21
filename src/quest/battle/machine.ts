// Máquina de estados da batalha — pura (sem React), fácil de testar.
//
//   entrada → narracao → pergunta → escolha → animacao → feedback → proximo ─┐
//                           ▲                                                │
//                           └──────────── (ainda há questões e HP) ◀─────────┘
//                                                         (HP zerou ou acabou) → fim
//
// Regras: só o monstro tem HP (= nº de questões da rodada). Acerto tira 1 de HP.
// Erro = contra-ataque só visual; a questão volta UMA vez no fim da rodada.
import { narrator } from './narrator';
import type { BattleCast, BattleEvent, BattleQuestion, BattleState } from './types';

export function initBattle(cast: BattleCast, questions: BattleQuestion[]): BattleState {
  const qs = questions.filter((q) => q.alternativas[q.gabarito]);
  return {
    phase: 'entrada',
    cast,
    queue: qs,
    current: null,
    hpMax: qs.length,
    hp: qs.length,
    pick: null,
    ok: null,
    requeued: [],
    results: [],
    narration: narrator.entrada(cast),
    turn: 0,
  };
}

export function battleReducer(s: BattleState, e: BattleEvent): BattleState {
  switch (s.phase) {
    case 'entrada':
      if (e.type !== 'AVANCAR') return s;
      return { ...s, phase: 'narracao', narration: narrator.apresentacao(s.cast, s.hpMax) };

    case 'narracao':
      if (e.type !== 'AVANCAR') return s;
      return nextQuestion(s);

    case 'pergunta':
      // o enunciado terminou de aparecer → abre o menu de golpes
      if (e.type !== 'AVANCAR') return s;
      return { ...s, phase: 'escolha' };

    case 'escolha': {
      if (e.type !== 'ESCOLHER' || !s.current) return s;
      const ok = e.pick === s.current.gabarito;
      const revisao = s.requeued.includes(s.current.id);
      const back = !ok && !revisao; // volta uma vez no fim da rodada
      return {
        ...s,
        phase: 'animacao',
        pick: e.pick,
        ok,
        hp: ok ? Math.max(0, s.hp - 1) : s.hp,
        queue: back ? [...s.queue, s.current] : s.queue,
        requeued: back ? [...s.requeued, s.current.id] : s.requeued,
        results: [...s.results, { q: s.current, pick: e.pick, ok, revisao }],
      };
    }

    case 'animacao':
      if (e.type !== 'ANIMACAO_FIM') return s;
      return { ...s, phase: 'feedback', narration: s.ok ? narrator.acerto(s.cast, s.current ?? undefined) : narrator.erro(s.cast, s.current ?? undefined, s.pick ?? undefined, s.results.slice(0, -1)) };

    case 'feedback':
      if (e.type !== 'PROXIMO') return s;
      if (s.hp <= 0 || !s.queue.length) return finish(s);
      return { ...s, phase: 'proximo', narration: narrator.proximo(s.cast, s.hp) };

    case 'proximo':
      if (e.type !== 'AVANCAR') return s;
      return nextQuestion(s);

    case 'fim':
      return s;
  }
}

function nextQuestion(s: BattleState): BattleState {
  const [current, ...queue] = s.queue;
  if (!current) return finish(s);
  return { ...s, phase: 'pergunta', current, queue, pick: null, ok: null, turn: s.turn + 1, narration: s.requeued.includes(current.id) ? narrator.revisao() : narrator.durante(s.cast, current) ?? '' };
}

function finish(s: BattleState): BattleState {
  return { ...s, phase: 'fim', current: null, narration: s.hp <= 0 ? narrator.vitoria(s.cast) : narrator.fimSemVitoria(s.cast) };
}

/** resumo final: acertos (na primeira tentativa) e temas/zonas para revisar */
export function summary(s: BattleState) {
  const first = s.results.filter((r) => !r.revisao);
  const okFirst = first.filter((r) => r.ok).length;
  const wrongIds = new Set(s.results.filter((r) => !r.ok).map((r) => r.q.id));
  const toReview = [...new Map(s.results.filter((r) => wrongIds.has(r.q.id)).map((r) => [r.q.id, r.q])).values()];
  const zonas = [...new Set(toReview.map((q) => q.zona).filter(Boolean))] as string[];
  return { total: first.length, okFirst, recovered: s.results.filter((r) => r.revisao && r.ok).length, toReview, zonas, won: s.hp <= 0 };
}
