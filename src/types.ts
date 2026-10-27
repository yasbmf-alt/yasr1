// ─────────────────────────────────────────────────────────────
// Yas R1 · modelo de dados
// Coleções no banco: chapters, missions, topics, sessions, meta
// Tudo que é "progresso" (XP, streak, estágio das plantas, livros)
// é DERIVADO dos registros — nunca guardado como contador.
// ─────────────────────────────────────────────────────────────

export type Area = 'clinica' | 'cirurgia' | 'go' | 'pediatria' | 'preventiva' | 'geral';

export type ActivityType = 'videoaula' | 'questoes' | 'revisao' | 'flashcards' | 'leitura' | 'outro' | 'foco' | 'correcao';

// ── Erros classificados (registrados uma vez, usados em diagnóstico, gaveta e gráficos) ──
export type Subtema = 'diagnostico' | 'classificacao' | 'tratamento' | 'complicacoes' | 'conduta' | 'fisiopatologia' | 'epidemiologia' | 'outro';
export type ErrorReason = 'conceito' | 'raciocinio' | 'desatencao' | 'interpretacao' | 'esquecimento' | 'tempo';
/** um erro individual dentro de um grupo (simulados): motivo, questão e lacuna próprios */
export interface MistakeItem {
  id: string;
  question?: string; // número da questão (opcional)
  reason?: ErrorReason | null;
  gap?: string; // "O que eu precisava saber para acertar?"
}
export type CorrectionStatus = 'nao' | 'estudo' | 'corrigido';
export const CORRECTION_STATUS: { id: CorrectionStatus; label: string }[] = [
  { id: 'nao', label: 'Não iniciado' },
  { id: 'estudo', label: 'Em estudo' },
  { id: 'corrigido', label: 'Corrigido' },
];
export interface ErrorGroup {
  id: string;
  subtema: Subtema | null;
  reasons: ErrorReason[];
  count: number;
  note: string;
  // usados nos simulados, onde o tema vem da questão e não da sessão
  area?: BigArea | null;
  topicId?: string | null;
  subject?: string; // matéria/doença em texto quando não há tema cadastrado
  // detalhamento por erro (simulados). `reasons` continua sendo a união dos motivos.
  subtopic?: string; // subtópico em texto livre, ex.: "Escore de Wells"
  items?: MistakeItem[];
  kind?: 'erro' | 'revisar'; // revisar = acertei, mas quero revisar (não conta como erro)
  status?: CorrectionStatus; // correção desta ocorrência
}
export const SUBTEMAS: { id: Subtema; label: string }[] = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'classificacao', label: 'Classificação' },
  { id: 'tratamento', label: 'Tratamento' },
  { id: 'conduta', label: 'Conduta' },
  { id: 'complicacoes', label: 'Complicações' },
  { id: 'fisiopatologia', label: 'Fisiopatologia' },
  { id: 'epidemiologia', label: 'Epidemiologia' },
  { id: 'outro', label: 'Outro' },
];
export const REASONS: { id: ErrorReason; label: string; long: string }[] = [
  { id: 'conceito', label: 'Conceito', long: 'falta de conhecimento do conceito' },
  { id: 'raciocinio', label: 'Raciocínio clínico', long: 'raciocínio clínico incorreto' },
  { id: 'desatencao', label: 'Desatenção', long: 'desatenção' },
  { id: 'interpretacao', label: 'Interpretação', long: 'interpretação do enunciado' },
  { id: 'esquecimento', label: 'Esquecimento', long: 'conteúdo esquecido' },
  { id: 'tempo', label: 'Tempo', long: 'pressão do tempo' },
];
export const subtemaLabel = (s: Subtema | null | undefined) => SUBTEMAS.find((x) => x.id === s)?.label ?? 'Sem subtema';
export const reasonLabel = (r: ErrorReason) => REASONS.find((x) => x.id === r)?.label ?? r;

export type MissionKind = 'medway' | 'internato';

export type Priority = 'alta' | 'media' | 'baixa';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface Activity {
  id: string;
  type: ActivityType;
  label: string;
  plannedMinutes: number | null;
  plannedQuestions: number | null;
  required: boolean;
  done: boolean;
  doneAt: string | null; // YYYY-MM-DD
  sessionId: string | null; // registro criado ao concluir (evita duplicar)
  scheduledDate: string | null;
}

export interface Mission {
  id: string;
  chapterId: string;
  topicId: string;
  kind: MissionKind;
  label: string; // nome exibido na trilha (ex.: "… (Intensivo)")
  order: number;
  scheduledDate: string | null;
  activities: Activity[];
  notes: string;
  coverAssetId: string | null;
}

export interface Topic {
  id: string;
  name: string;
  area: Area;
  specialty: string;
  priority: Priority;
  nextReviewOverride: string | null;
  coverAssetId: string | null;
  createdAt: string;
  map?: ConceptMap; // mapa conceitual único do tema (compartilhado por todos os simulados)
}

// ── Mapa conceitual ────────────────────────────────────────────
export type MapColor = 'azul' | 'rosa' | 'lilas' | 'lima' | 'manteiga' | 'pessego' | 'neutro';
export interface MapLink { label: string; url: string }
export interface MapNode {
  id: string;
  parentId: string | null; // null = nó solto (a raiz é o próprio tema)
  title: string;
  x: number;
  y: number;
  color?: MapColor;
  collapsed?: boolean;
  notes?: string;
  explanation?: string;
  list?: string[];
  links?: MapLink[];
  images?: string[]; // ids de arquivo
  // nós criados pelo app no mapa do simulado
  area?: BigArea; // nó da grande área
  ref?: string; // nó do tema: id do tema (ou "g:<id do grupo>" quando o erro não tem tema)
}
export interface ConceptMap {
  rootId: string;
  nodes: MapNode[];
  updatedAt: string;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  topicId: string;
  missionId: string | null;
  activityId: string | null;
  type: ActivityType;
  minutes: number | null;
  questions: number | null;
  correct: number | null;
  errorTopics: string[]; // até 2 assuntos em que mais errou
  errors?: ErrorGroup[]; // classificação opcional dos erros
  notes: string;
  createdAt: string; // ISO
  focus?: boolean; // veio do Cantinho de Concentração
  // campos que dependem do tipo de atividade (todos opcionais)
  source?: string; // questões: de onde vieram
  method?: string; // revisão: como revisou
  mastery?: number | null; // revisão: percepção de domínio, 1 a 5
  watched?: 'completa' | 'parcial' | null; // videoaula: conclusão
  simuladoId?: string; // correção de simulado: qual prova foi corrigida
}

export const QUESTION_SOURCES = ['Medway', 'Prova anterior', 'Banco de questões', 'Apostila', 'Simulado', 'Outra'];
export const REVIEW_METHODS = ['Flashcards', 'Resumo', 'Mapa mental', 'Releitura', 'Questões', 'Áudio / aula'];
export const MASTERY: { v: number; label: string }[] = [
  { v: 1, label: 'Ainda confuso' },
  { v: 2, label: 'Inseguro' },
  { v: 3, label: 'Razoável' },
  { v: 4, label: 'Bem' },
  { v: 5, label: 'Domino' },
];

export interface DecorPlacement {
  x: number; // % da cena
  y: number;
  placed: boolean;
}

export interface StickerPlacement {
  x: number; // % do armário
  y: number;
  rot: number;
  placed: boolean;
}

export interface Settings {
  id: 'settings';
  sound: boolean;
  soundVolume: number; // 0–1
  reducedMotion: 'system' | 'on' | 'off';
  ambient: boolean; // nuvens, pétalas, borboletas
  assetMap: Record<string, string>; // slot → asset id
  gardenDecor: Record<string, DecorPlacement>;
  gardenView: 'canteiros' | 'calendario';
  stickers: Record<string, StickerPlacement>;
  libraryOrder: 'estudo' | 'area';
  celebrationPhrases: string[];
  agendaView: 'semana' | 'mes';
  // 2.0
  rewardImages: RewardImage[];
  rewardUsedMissions: string[];
  soundAssets: Record<string, string>; // nome do som → asset id
  ambientVolume: number;
  letterMinDays: number;
  mimos: MimoType[];
  mimoMinDays: number;
  mimoChance: number; // 0–1
  rotations: Rotation[];
  eggsFound: Record<string, string>; // id → ISO da descoberta
  // 3.0 · eventos especiais
  events?: import('./logic/events').SpecialEvent[]; // só o que foi editado; o resto vem do padrão
  eventsOff?: boolean; // desliga todas as decorações de evento
  eventsSeen?: Record<string, string>; // "id:ano" → ISO da celebração vista
  graduationDate?: string; // YYYY-MM-DD, data real da formatura
  mascotLinesSeen?: Record<string, string>; // frases raras já ditas
  lastBackupAt?: string; // ISO do último backup baixado
  backupReminder?: boolean; // lembrete semanal de backup (padrão: ligado)
  streakBreakSeen?: string; // último dia da sequência perdida cuja animação triste já foi mostrada
}

export interface RewardImage {
  id: string;
  assetId: string;
  active: boolean;
  addedAt: string;
}
export interface MimoType {
  id: string;
  emoji: string;
  name: string;
  message: string;
  active: boolean;
}
export interface Rotation {
  id: string;
  name: string;
  place: string;
  start: string;
  end: string;
  notes: string;
}

// ── Gaveta, macetes, cartas, vales ─────────────────────────────
export interface ErrNote {
  id: string;
  area: Area;
  topicId: string | null;
  subject: string;
  subtema: Subtema | null;
  text: string;
  createdAt: string;
}
export interface Macete {
  id: string;
  title: string;
  text: string;
  area: Area;
  topicId: string | null;
  tags: string[];
  createdAt: string;
}
export type LetterMode = 'surpresa' | 'data' | 'marco';
export interface Letter {
  id: string;
  title: string;
  body: string;
  envelope: NoteColor;
  mode: LetterMode;
  openDate: string | null; // surpresa (sorteada ao lacrar) ou data escolhida
  milestone: string | null;
  sealed: boolean;
  sealedAt: string | null;
  openedAt: string | null;
  createdAt: string;
}
export interface Voucher {
  id: string;
  mimoId: string;
  emoji: string;
  name: string;
  message: string;
  receivedAt: string;
  status: 'disponivel' | 'aproveitado' | 'arquivado';
  usedAt: string | null;
  source: string;
}

// ── Post-its da trilha ─────────────────────────────────────────
export type NoteColor = 'manteiga' | 'rosa' | 'lilas' | 'azul' | 'lima' | 'pessego';
export interface Note {
  id: string;
  text: string;
  color: NoteColor;
  x: number; // % da largura do mapa
  y: number; // px a partir do topo do mapa
  rot: number;
  chapterId: string | null; // null = aparece em todos os capítulos
  createdAt: string;
  topicId?: string | null; // ligado ao livro da matéria
  onTrail?: boolean; // false = só dentro do livro
  bx?: number; // posição dentro do livro (%)
  by?: number;
}

// ── Agenda ─────────────────────────────────────────────────────
export type EventType = 'estudo' | 'missao' | 'internato' | 'plantao' | 'fixa' | 'pessoal' | 'simulado';
export interface Recurrence {
  weekdays: number[]; // 0 = domingo
  until: string | null;
}
export interface AgendaEvent {
  id: string;
  type: EventType;
  title: string;
  date: string; // YYYY-MM-DD (início; para recorrentes, a 1ª data)
  start: string; // HH:MM
  end: string; // HH:MM (menor que start = termina no dia seguinte)
  recurrence: Recurrence | null;
  exceptions: string[]; // datas puladas de um evento recorrente
  missionId: string | null;
  activityId: string | null;
  simuladoId: string | null;
  notes: string;
  createdAt: string;
}

// ── Simulados ──────────────────────────────────────────────────
export type BigArea = 'clinica' | 'cirurgia' | 'pediatria' | 'go' | 'preventiva';
export const BIG_AREAS: BigArea[] = ['clinica', 'cirurgia', 'pediatria', 'go', 'preventiva'];
export interface AreaScore {
  correct: number | null;
  total: number | null;
}
export interface Simulado {
  id: string;
  name: string;
  date: string;
  total: number | null;
  correct: number | null;
  minutes: number | null;
  areas: Record<BigArea, AreaScore>;
  wrongTopics: string[];
  errors?: ErrorGroup[];
  notes: string;
  createdAt: string;
  map?: ConceptMap; // mapa de correção: simulado → grandes áreas → temas errados
  correctionDoneAt?: string | null; // YYYY-MM-DD em que a correção foi concluída
  correctionTimer?: CorrectionTimer; // cronômetro em andamento (tempo ainda não registrado)
}
export interface CorrectionTimer {
  runningSince: string | null; // ISO; null = pausado
  days: Record<string, number>; // YYYY-MM-DD → milissegundos ativos já contados
}

// ── Flashcards ─────────────────────────────────────────────────
export interface Deck {
  id: string;
  name: string;
  area: Area;
  topicId: string | null;
  createdAt: string;
}
export type CardPhase = 'new' | 'learning' | 'review' | 'relearning';
export interface CardState {
  due: string; // ISO
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  phase: CardPhase;
  lastReview: string | null; // ISO
}
export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  fsrs: CardState;
  createdAt: string;
  log?: CardReview[]; // últimas respostas (para estatísticas, Turbo e "Revisar meus erros")
}
export interface CardReview {
  at: string; // ISO
  g: 1 | 2 | 3 | 4; // De novo, Difícil, Bom, Fácil
}

export interface DataSnapshot {
  chapters: Chapter[];
  missions: Mission[];
  topics: Topic[];
  sessions: Session[];
  notes: Note[];
  events: AgendaEvent[];
  simulados: Simulado[];
  decks: Deck[];
  cards: Flashcard[];
  errnotes: ErrNote[];
  macetes: Macete[];
  letters: Letter[];
  vouchers: Voucher[];
  settings: Settings;
}

export type Collection =
  | 'chapters' | 'missions' | 'topics' | 'sessions' | 'meta'
  | 'notes' | 'events' | 'simulados' | 'decks' | 'cards'
  | 'errnotes' | 'macetes' | 'letters' | 'vouchers';

export const DEFAULT_MIMOS: MimoType[] = [
  ['sushi', '🍣', 'Vale sushi', 'Você arrasou! Que tal comemorar com um jantar japonês especial?'],
  ['cinema', '🎬', 'Vale cinema', 'Uma sessão de cinema pra desligar a cabeça. Você merece.'],
  ['docinho', '🍫', 'Vale docinho', 'Escolha a sua sobremesa favorita, sem culpa nenhuma.'],
  ['banho', '🛁', 'Vale banho relaxante', 'Um banho demorado, cheirinho bom e nada de questões.'],
  ['cafe', '☕', 'Vale cafeteria', 'Um café especial numa cafeteria que você goste.'],
  ['flores', '💐', 'Vale flores', 'Compre flores para você mesma.'],
  ['filme', '🍿', 'Vale noite de filme', 'Pipoca, coberta e um filme que você ama.'],
  ['spa', '🧖‍♀️', 'Vale spa em casa', 'Skincare caprichado e um momento só seu.'],
  ['comprinhas', '🛍️', 'Vale comprinhas', 'Escolha um presentinho para você.'],
  ['jantar', '🍝', 'Vale jantar especial', 'Sair para comer algo diferente e gostoso.'],
].map(([id, emoji, name, message]) => ({ id, emoji, name, message, active: true }));

export const DEFAULT_PHRASES = [
  'vc lacrou mt hj diva!',
  'a missão foi dada e a missão foi CUMPRIDA',
  'ela não erra, ela revisa',
  'capítulo fechado, recalque aberto',
];

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  sound: true,
  soundVolume: 0.7,
  reducedMotion: 'system',
  ambient: true,
  assetMap: {},
  gardenDecor: {},
  gardenView: 'canteiros',
  stickers: {},
  libraryOrder: 'estudo',
  celebrationPhrases: DEFAULT_PHRASES,
  agendaView: 'semana',
  rewardImages: [],
  rewardUsedMissions: [],
  soundAssets: {},
  ambientVolume: 0.5,
  letterMinDays: 20,
  mimos: DEFAULT_MIMOS,
  mimoMinDays: 14,
  mimoChance: 0.3,
  rotations: [],
  eggsFound: {},
};

export const AREAS: { id: Area; label: string; short: string; color: string; ink: string }[] = [
  { id: 'clinica', label: 'Clínica Médica', short: 'Clínica', color: 'var(--rosa)', ink: 'var(--rosa-ink)' },
  { id: 'cirurgia', label: 'Cirurgia', short: 'Cirurgia', color: 'var(--azul-claro)', ink: 'var(--azul-ink)' },
  { id: 'go', label: 'Ginecologia e Obstetrícia', short: 'GO', color: 'var(--lilas)', ink: 'var(--lilas-ink)' },
  { id: 'pediatria', label: 'Pediatria', short: 'Pediatria', color: 'var(--manteiga)', ink: 'var(--manteiga-ink)' },
  { id: 'preventiva', label: 'Preventiva', short: 'Preventiva', color: 'var(--lima)', ink: 'var(--lima-ink)' },
  { id: 'geral', label: 'Geral', short: 'Geral', color: 'var(--pessego)', ink: 'var(--pessego-ink)' },
];

export const areaOf = (id: Area) => AREAS.find((a) => a.id === id) ?? AREAS[5];

export const ACTIVITY_TYPES: { id: ActivityType; label: string }[] = [
  { id: 'videoaula', label: 'Videoaula' },
  { id: 'questoes', label: 'Questões' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'leitura', label: 'Leitura' },
  { id: 'outro', label: 'Outro' },
  { id: 'foco', label: 'Sessão de foco' },
];

// a correção de simulado é registrada pela Correção de Simulados, não pelos formulários de sessão
export const CORRECTION_TYPE = { id: 'correcao' as ActivityType, label: 'Correção de simulado' };
export const activityLabel = (t: ActivityType) => (t === 'correcao' ? CORRECTION_TYPE.label : ACTIVITY_TYPES.find((a) => a.id === t)?.label ?? t);
