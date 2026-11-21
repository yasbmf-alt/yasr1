// Tipos da batalha do Yas Quest (lógica separada da interface).

export interface BattleQuestion {
  id: string;
  tema: string;
  zona?: string;
  origem?: string;
  enunciado: string;
  alternativas: Record<string, string>; // A–E
  gabarito: string;
  comentario: string;
}

/** quem é quem na arena */
export interface BattleCast {
  tema: string; // nome do tema (ilha)
  slug: string; // chave dos sprites: monstros/<slug>, ilhas/<slug>
  monstro: string; // nome do monstro do tema
  serio?: boolean; // tema sensível: narrador sem piadas
  falas?: BattleFalas; // falas do dossiê da ilha (opcional)
  cartoesDe?: Record<string, string[]>; // id da questão → cartões de recuperação (para notar erro repetido)
}

/** falas prontas do Dr. Bigodes vindas do dossiê; a escolhida é a que mais combina com a questão */
export interface BattleFalas {
  entrada?: string[];
  acerto?: string[];
  erro?: string[];
  erroRepetido?: { fala: string; cartoes: string[] }[];
  durante?: string[];
  vitoria?: string[];
  derrota?: string[];
}

/** fluxo explícito de turnos */
export type Phase = 'entrada' | 'narracao' | 'pergunta' | 'escolha' | 'animacao' | 'feedback' | 'proximo' | 'fim';

export interface TurnResult {
  q: BattleQuestion;
  pick: string;
  ok: boolean;
  revisao: boolean; // era a segunda chance desta questão
}

export interface BattleState {
  phase: Phase;
  cast: BattleCast;
  queue: BattleQuestion[]; // próximas questões (a atual não está aqui)
  current: BattleQuestion | null;
  hpMax: number;
  hp: number;
  pick: string | null;
  ok: boolean | null;
  requeued: string[]; // ids que já voltaram para revisão nesta rodada
  results: TurnResult[];
  narration: string; // o que o Dr. Bigode está dizendo agora
  turn: number;
}

export type BattleEvent =
  | { type: 'AVANCAR' } // toque na caixa de texto / continuar
  | { type: 'ESCOLHER'; pick: string }
  | { type: 'ANIMACAO_FIM' }
  | { type: 'PROXIMO' };
