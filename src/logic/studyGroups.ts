// Agrupamento só de exibição: os registros (sessões) continuam intactos.
// Junta as atividades do mesmo tema no mesmo dia num item só.
import type { Area, Session, Simulado, Topic } from '../types';

export interface StudyGroup {
  key: string; // data + tema
  date: string;
  topicId: string;
  title: string;
  area: Area;
  sessions: Session[];
  minutes: number;
  questions: number; // só atividades com questões e acertos informados
  correct: number;
  createdAt: string; // o mais recente, para ordenar
}

/** chave do "tema" de uma sessão: o tema, ou o simulado corrigido */
const subjectKey = (s: Session) => (s.type === 'correcao' && s.simuladoId ? `sim:${s.simuladoId}` : s.topicId || 'livre');

/** acerto só conta questões de verdade (flashcards e registros sem acertos ficam de fora) */
export const hasAccuracy = (s: Session) => s.type !== 'flashcards' && !!s.questions && s.correct != null;

export function groupStudy(sessions: Session[], topics: Topic[], sims: Simulado[]): StudyGroup[] {
  const tmap = new Map(topics.map((t) => [t.id, t]));
  const smap = new Map(sims.map((s) => [s.id, s]));
  const m = new Map<string, StudyGroup>();
  for (const s of sessions) {
    const k = `${s.date}|${subjectKey(s)}`;
    let g = m.get(k);
    if (!g) {
      const t = tmap.get(s.topicId);
      const sim = s.simuladoId ? smap.get(s.simuladoId) : null;
      g = {
        key: k, date: s.date, topicId: s.topicId, area: t?.area ?? 'geral', sessions: [], minutes: 0, questions: 0, correct: 0, createdAt: s.createdAt,
        title: s.type === 'correcao' ? `Correção · ${sim?.name ?? 'simulado'}` : t?.name ?? (s.topicId ? 'Tema removido' : 'Estudo livre'),
      };
      m.set(k, g);
    }
    g.sessions.push(s);
    g.minutes += s.minutes ?? 0;
    if (hasAccuracy(s)) {
      g.questions += s.questions!;
      g.correct += s.correct!;
    }
    if (s.createdAt > g.createdAt) g.createdAt = s.createdAt;
  }
  for (const g of m.values()) g.sessions.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...m.values()].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export const groupPct = (g: Pick<StudyGroup, 'questions' | 'correct'>) => (g.questions ? Math.round((g.correct / g.questions) * 100) : null);
