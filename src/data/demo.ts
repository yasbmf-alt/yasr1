// Dados de DEMONSTRAÇÃO — fictícios, só existem na memória quando o modo demo está ligado.
import type { ErrorGroup, Activity, AgendaEvent, Area, Chapter, DataSnapshot, Deck, Flashcard, Mission, Session, Simulado, Topic } from '../types';
import { newCardState } from '../logic/fsrs';
import { DEFAULT_SETTINGS } from '../types';
import { addDays, today, weekStart } from '../logic/dates';

const SUBS = ['tratamento', 'diagnostico', 'conduta', 'classificacao', 'tratamento', 'complicacoes'] as const;
const RS = [['conceito'], ['desatencao'], ['conceito', 'interpretacao'], ['esquecimento'], ['conceito']] as const;
function demoErrors(wrong: number, seed: number): ErrorGroup[] {
  if (wrong <= 0) return [];
  const a = Math.ceil(wrong / 2);
  const out: ErrorGroup[] = [{ id: `eg${seed}a`, subtema: SUBS[seed % SUBS.length], reasons: [...RS[seed % RS.length]], count: a, note: '' }];
  if (wrong - a > 0) out.push({ id: `eg${seed}b`, subtema: SUBS[(seed + 2) % SUBS.length], reasons: [...RS[(seed + 1) % RS.length]], count: wrong - a, note: '' });
  return out;
}

const acts = (seed: string, doneCount: number, date: string): Activity[] =>
  (['videoaula', 'questoes', 'revisao', 'flashcards'] as const).map((type, i) => ({
    id: `${seed}-${type}`,
    type,
    label: { videoaula: 'Videoaula', questoes: 'Questões', revisao: 'Revisão', flashcards: 'Flashcards' }[type],
    plannedMinutes: [90, 60, 30, 20][i],
    plannedQuestions: type === 'questoes' ? 20 : null,
    required: true,
    done: i < doneCount,
    doneAt: i < doneCount ? addDays(date, i) : null,
    sessionId: i < doneCount ? `s-${seed}-${type}` : null,
    scheduledDate: null,
  }));

export function makeDemo(): DataSnapshot {
  const t = today();
  const w0 = addDays(weekStart(t), -14);
  const topics: Topic[] = (
    [
      ['d1', 'Exemplo · Asma', 'clinica', 'Pneumologia'],
      ['d2', 'Exemplo · Colecistite', 'cirurgia', 'Cirurgia geral'],
      ['d3', 'Exemplo · Pré-eclâmpsia', 'go', 'Obstetrícia'],
      ['d4', 'Exemplo · Bronquiolite', 'pediatria', 'Pneumologia pediátrica'],
      ['d5', 'Exemplo · Vigilância epidemiológica', 'preventiva', 'Epidemiologia'],
      ['d6', 'Exemplo · Diabetes', 'clinica', 'Endocrinologia'],
      ['d7', 'Exemplo · Hérnias', 'cirurgia', 'Cirurgia geral'],
    ] as [string, string, Area, string][]
  ).map(([id, name, area, specialty]) => ({
    id,
    name,
    area,
    specialty,
    priority: 'media',
    nextReviewOverride: null,
    coverAssetId: null,
    createdAt: new Date().toISOString(),
  }));

  const chapters: Chapter[] = [0, 1, 2].map((i) => ({
    id: `dc${i + 1}`,
    number: i + 1,
    title: `Semana ${i + 1} (exemplo)`,
    startDate: addDays(w0, i * 7),
    endDate: addDays(w0, i * 7 + 6),
  }));

  const plan: [string, string, number, 'medway' | 'internato'][] = [
    ['dc1', 'd1', 4, 'medway'], ['dc1', 'd2', 4, 'medway'], ['dc1', 'd6', 4, 'internato'],
    ['dc2', 'd3', 4, 'medway'], ['dc2', 'd4', 2, 'medway'], ['dc2', 'd7', 1, 'internato'],
    ['dc3', 'd5', 0, 'medway'], ['dc3', 'd1', 0, 'medway'], ['dc3', 'd2', 0, 'internato'],
  ];
  const missions: Mission[] = [];
  const sessions: Session[] = [];
  plan.forEach(([ch, topicId, done, kind], i) => {
    const chapter = chapters.find((c) => c.id === ch)!;
    const id = `dm${i}`;
    const activities = acts(id, done, chapter.startDate);
    missions.push({
      id,
      chapterId: ch,
      topicId,
      kind,
      label: topics.find((x) => x.id === topicId)!.name.replace('Exemplo · ', ''),
      order: i,
      scheduledDate: null,
      activities,
      notes: '',
      coverAssetId: null,
    });
    activities.filter((a) => a.done).forEach((a, k) => {
      const q = a.type === 'questoes' || a.type === 'revisao' ? 20 : null;
      sessions.push({
        id: a.sessionId!,
        date: a.doneAt!,
        topicId,
        missionId: id,
        activityId: a.id,
        type: a.type,
        minutes: a.plannedMinutes,
        questions: q,
        correct: q ? 11 + ((i * 3 + k * 2) % 9) : null,
        errorTopics: [],
        errors: q ? demoErrors(q - (11 + ((i * 3 + k * 2) % 9)), i + k) : [],
        notes: '',
        createdAt: new Date().toISOString(),
      });
    });
  });
  // algumas revisões avulsas para o jardim crescer
  for (let k = 0; k < 9; k++) {
    sessions.push({
      id: `sx${k}`,
      date: addDays(t, -k * 2),
      topicId: ['d1', 'd2', 'd3'][k % 3],
      missionId: null,
      activityId: null,
      type: 'revisao',
      minutes: 40 + (k % 3) * 25,
      questions: 15,
      correct: 10 + (k % 5),
      errorTopics: [],
      errors: demoErrors(15 - (10 + (k % 5)), k + 3),
      notes: '',
      createdAt: new Date().toISOString(),
    });
  }
  const ev = (id: string, type: AgendaEvent['type'], title: string, date: string, start: string, end: string, extra: Partial<AgendaEvent> = {}): AgendaEvent => ({
    id, type, title, date, start, end, recurrence: null, exceptions: [], missionId: null, activityId: null, simuladoId: null, notes: '',
    createdAt: new Date().toISOString(), ...extra,
  });
  const ws = weekStart(t);
  const events: AgendaEvent[] = [
    ev('de1', 'fixa', 'Internato (exemplo)', ws, '07:00', '12:00', { recurrence: { weekdays: [1, 2, 3, 4, 5], until: null } }),
    ev('de2', 'plantao', 'Plantão PS (exemplo)', addDays(ws, 5), '19:00', '07:00'),
    ev('de3', 'missao', '', addDays(ws, 1), '14:00', '16:00', { missionId: 'dm6' }),
    ev('de4', 'estudo', 'Questões de revisão', addDays(ws, 2), '14:00', '15:30'),
    ev('de5', 'pessoal', 'Compromisso (exemplo)', addDays(ws, 3), '18:00', '19:30'),
    ev('de6', 'simulado', 'Simulado semanal (exemplo)', addDays(ws, 6), '08:00', '12:00'),
    ev('de7', 'estudo', 'Flashcards', addDays(ws, 2), '15:00', '16:00'),
  ];
  const sim = (i: number, name: string, date: string, parts: [number, number][]): Simulado => {
    const keys: Simulado['areas'] = {} as Simulado['areas'];
    (['clinica', 'cirurgia', 'pediatria', 'go', 'preventiva'] as const).forEach((a, k) => { keys[a] = { correct: parts[k][0], total: parts[k][1] }; });
    const total = parts.reduce((x, p) => x + p[1], 0);
    const correct = parts.reduce((x, p) => x + p[0], 0);
    return { id: `ds${i}`, name, date, total, correct, minutes: 240 + i * 5, areas: keys, wrongTopics: [], errors: [{ id: `se${i}`, area: 'cirurgia', topicId: 'd2', subtema: 'conduta', reasons: ['conceito'], count: 3, note: '' }, { id: `sf${i}`, area: 'go', topicId: 'd3', subtema: 'tratamento', reasons: ['desatencao'], count: 2, note: '' }], notes: '', createdAt: new Date().toISOString() };
  };
  const simulados: Simulado[] = [
    sim(1, 'Simulado exemplo 1', addDays(t, -35), [[12, 20], [11, 20], [13, 20], [12, 20], [14, 20]]),
    sim(2, 'Simulado exemplo 2', addDays(t, -28), [[13, 20], [12, 20], [14, 20], [11, 20], [15, 20]]),
    sim(3, 'Simulado exemplo 3', addDays(t, -21), [[14, 20], [12, 20], [14, 20], [13, 20], [15, 20]]),
    sim(4, 'Simulado exemplo 4', addDays(t, -14), [[15, 20], [14, 20], [13, 20], [14, 20], [16, 20]]),
    sim(5, 'Simulado exemplo 5', addDays(t, -7), [[16, 20], [13, 20], [15, 20], [15, 20], [17, 20]]),
  ];
  const decks: Deck[] = [{ id: 'dd1', name: 'Exemplo · Asma', area: 'clinica', topicId: 'd1', createdAt: new Date().toISOString() }];
  const cards: Flashcard[] = [
    ['Exemplo: frente do cartão 1', 'Exemplo: verso do cartão 1'],
    ['Exemplo: frente do cartão 2', 'Exemplo: verso do cartão 2'],
    ['Exemplo: frente do cartão 3', 'Exemplo: verso do cartão 3'],
  ].map(([f, b], i) => ({ id: `dk${i}`, deckId: 'dd1', front: f, back: b, tags: [], fsrs: newCardState(), createdAt: new Date(Date.now() + i).toISOString() }));
  return { chapters, missions, topics, sessions, notes: [{ id: 'dn1', text: 'Exemplo de lembrete dentro do livro', color: 'manteiga', x: 7, y: 140, rot: -3, chapterId: null, createdAt: new Date().toISOString(), topicId: 'd1', onTrail: false, bx: 8, by: 10 }], events, simulados, decks, cards, errnotes: [{ id: 'den1', area: 'clinica', topicId: 'd1', subject: '', subtema: 'tratamento', text: 'Exemplo: confundo a ordem dos degraus do tratamento.', createdAt: new Date().toISOString() }],
    macetes: [
      { id: 'dmc1', title: 'Exemplo de macete', text: 'Exemplo: escreva aqui o seu macete com as suas palavras.', area: 'clinica', topicId: 'd1', tags: ['exemplo'], createdAt: new Date().toISOString() },
      { id: 'dmc2', title: 'Outro exemplo', text: 'Exemplo de macete de cirurgia.', area: 'cirurgia', topicId: 'd2', tags: [], createdAt: new Date().toISOString() },
    ],
    letters: [], vouchers: [], settings: { ...DEFAULT_SETTINGS } };
}
