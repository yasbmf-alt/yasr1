import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorGroup, Activity, AgendaEvent, Chapter, DataSnapshot, Deck, ErrNote, Flashcard, Letter, Macete, Mission, Note, Session, Settings, Simulado, Topic, Voucher } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { createRepo, type Repo, type RepoMode } from './repo';
import { makeDemo } from './demo';
import { chapterProgress, missionProgress } from '../logic/progress';
import { today, uid } from '../logic/dates';
import { loadCustomSounds, setSoundEnabled, setSoundVolume, warmSounds } from '../logic/sound';

export interface SessionDraft {
  date: string;
  minutes: number | null;
  questions: number | null;
  correct: number | null;
  errorTopics: string[];
  errors?: ErrorGroup[];
  notes: string;
  source?: string;
  method?: string;
  mastery?: number | null;
  watched?: 'completa' | 'parcial' | null;
}

export interface CompletionResult {
  missionCompleted: boolean;
  chapterCompleted: boolean;
  firstBook: boolean;
}

interface Store {
  data: DataSnapshot;
  ready: boolean;
  mode: RepoMode | 'loading';
  error: string | null;
  saving: boolean;
  clearError(): void;
  saveChapter(c: Chapter): void;
  deleteChapter(id: string): void;
  saveMission(m: Mission): void;
  deleteMission(id: string): void;
  saveTopic(t: Topic): void;
  deleteTopic(id: string): boolean;
  completeActivity(missionId: string, activityId: string, draft: SessionDraft): CompletionResult;
  uncompleteActivity(missionId: string, activityId: string): void;
  saveSession(s: Session): void;
  deleteSession(id: string): void;
  saveSettings(p: Partial<Settings>): void;
  replaceAll(d: DataSnapshot): Promise<void>;
  saveNote(n: Note): void;
  deleteNote(id: string): void;
  saveEvent(e: AgendaEvent): void;
  deleteEvent(id: string): void;
  saveSimulado(s: Simulado): void;
  deleteSimulado(id: string): void;
  saveDeck(d: Deck): void;
  deleteDeck(id: string): void;
  saveCard(c: Flashcard): void;
  deleteCard(id: string): void;
  saveErrNote(n: ErrNote): void;
  deleteErrNote(id: string): void;
  saveMacete(m: Macete): void;
  deleteMacete(id: string): void;
  saveLetter(l: Letter): void;
  deleteLetter(id: string): void;
  saveVoucher(v: Voucher): void;
  deleteVoucher(id: string): void;
  snapshot(): DataSnapshot;
}

const EMPTY: DataSnapshot = {
  chapters: [], missions: [], topics: [], sessions: [], notes: [], events: [], simulados: [], decks: [], cards: [],
  errnotes: [], macetes: [], letters: [], vouchers: [],
  settings: DEFAULT_SETTINGS,
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataSnapshot>(EMPTY);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Store['mode']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const repo = useRef<Repo | null>(null);
  const latest = useRef<DataSnapshot>(EMPTY);

  useEffect(() => {
    let un: (() => void) | undefined;
    let alive = true;
    void createRepo(makeDemo).then((r) => {
      if (!alive) return;
      repo.current = r;
      r.onError = (m) => setError(m);
      r.onPending = (n) => setSaving(n > 0);
      setMode(r.mode);
      un = r.subscribe((snap, rd) => {
        latest.current = snap;
        setData(snap);
        if (rd) setReady(true);
      });
    });
    return () => {
      alive = false;
      un?.();
    };
  }, []);

  useEffect(() => setSoundEnabled(data.settings.sound), [data.settings.sound]);
  useEffect(() => setSoundVolume(data.settings.soundVolume ?? 0.7), [data.settings.soundVolume]);
  const soundKey = JSON.stringify(data.settings.soundAssets ?? {});
  useEffect(() => {
    const map = Object.fromEntries(Object.entries(data.settings.soundAssets ?? {}).map(([k, id]) => [k, `/_blob/${id}`]));
    const run = () => void loadCustomSounds(map);
    if (Object.keys(map).length) window.addEventListener('pointerdown', run, { once: true });
    else run();
    return () => window.removeEventListener('pointerdown', run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundKey]);
  useEffect(() => {
    const w = () => warmSounds();
    window.addEventListener('pointerdown', w, { once: true });
    return () => window.removeEventListener('pointerdown', w);
  }, []);

  const put = useCallback((col: Parameters<Repo['put']>[0], doc: { id: string } | object) => {
    repo.current?.put(col, doc as never);
  }, []);
  const remove = useCallback((col: Parameters<Repo['remove']>[0], id: string) => repo.current?.remove(col, id), []);

  const api = useMemo<Store>(() => {
    const cur = () => latest.current;
    const findMission = (id: string) => cur().missions.find((m) => m.id === id);

    return {
      data,
      ready,
      mode,
      error,
      saving,
      clearError: () => setError(null),
      saveChapter: (c) => put('chapters', c),
      deleteChapter: (id) => {
        for (const m of cur().missions.filter((x) => x.chapterId === id)) remove('missions', m.id);
        remove('chapters', id);
      },
      saveMission: (m) => put('missions', m),
      deleteMission: (id) => {
        for (const e of cur().events.filter((x) => x.missionId === id)) remove('events', e.id);
        remove('missions', id);
      },
      saveTopic: (t) => put('topics', t),
      deleteTopic: (id) => {
        const used = cur().missions.some((m) => m.topicId === id) || cur().sessions.some((s) => s.topicId === id);
        if (used) return false;
        remove('topics', id);
        return true;
      },
      completeActivity: (missionId, activityId, draft) => {
        const m = findMission(missionId);
        const res: CompletionResult = { missionCompleted: false, chapterCompleted: false, firstBook: false };
        if (!m) return res;
        const act = m.activities.find((a) => a.id === activityId);
        if (!act) return res;
        const wasComplete = missionProgress(m).complete;
        const ch = cur().chapters.find((c) => c.id === m.chapterId);
        const chWas = ch ? chapterProgress(ch, cur().missions).complete : false;
        res.firstBook = !cur().sessions.some((s) => s.topicId === m.topicId);

        const sessionId = act.sessionId ?? uid();
        const session: Session = {
          id: sessionId,
          date: draft.date || today(),
          topicId: m.topicId,
          missionId: m.id,
          activityId: act.id,
          type: act.type,
          minutes: draft.minutes,
          questions: draft.questions,
          correct: draft.correct,
          errorTopics: draft.errorTopics.filter((e) => e.trim()).slice(0, 2),
          errors: draft.errors ?? [],
          notes: draft.notes,
          ...(draft.source ? { source: draft.source } : {}),
          ...(draft.method ? { method: draft.method } : {}),
          ...(draft.mastery ? { mastery: draft.mastery } : {}),
          ...(draft.watched ? { watched: draft.watched } : {}),
          createdAt: new Date().toISOString(),
        };
        const nextActs: Activity[] = m.activities.map((a) =>
          a.id === act.id ? { ...a, done: true, doneAt: session.date, sessionId } : a,
        );
        const nm: Mission = { ...m, activities: nextActs };
        put('sessions', session);
        put('missions', nm);
        res.missionCompleted = !wasComplete && missionProgress(nm).complete;
        if (ch && !chWas) {
          const ms = cur().missions.map((x) => (x.id === nm.id ? nm : x));
          res.chapterCompleted = chapterProgress(ch, ms).complete;
        }
        return res;
      },
      uncompleteActivity: (missionId, activityId) => {
        const m = findMission(missionId);
        if (!m) return;
        const act = m.activities.find((a) => a.id === activityId);
        if (!act) return;
        if (act.sessionId) remove('sessions', act.sessionId);
        put('missions', {
          ...m,
          activities: m.activities.map((a) => (a.id === activityId ? { ...a, done: false, doneAt: null, sessionId: null } : a)),
        });
      },
      saveSession: (s) => {
        put('sessions', s);
        // mantém a atividade vinculada sincronizada (data de conclusão)
        if (s.missionId && s.activityId) {
          const m = findMission(s.missionId);
          const a = m?.activities.find((x) => x.id === s.activityId);
          if (m && a && (a.doneAt !== s.date || !a.done || a.sessionId !== s.id)) {
            put('missions', {
              ...m,
              activities: m.activities.map((x) =>
                x.id === a.id ? { ...x, done: true, doneAt: s.date, sessionId: s.id } : x,
              ),
            });
          }
        }
      },
      deleteSession: (id) => {
        const s = cur().sessions.find((x) => x.id === id);
        remove('sessions', id);
        if (s?.missionId && s.activityId) {
          const m = findMission(s.missionId);
          if (m)
            put('missions', {
              ...m,
              activities: m.activities.map((x) =>
                x.sessionId === id ? { ...x, done: false, doneAt: null, sessionId: null } : x,
              ),
            });
        }
      },
      saveSettings: (p) => put('meta', { ...cur().settings, ...p, id: 'settings' }),
      replaceAll: async (d) => {
        await repo.current?.replaceAll(d);
      },
      saveNote: (n) => put('notes', n),
      deleteNote: (id) => remove('notes', id),
      saveEvent: (e) => put('events', e),
      deleteEvent: (id) => remove('events', id),
      saveSimulado: (x) => put('simulados', x),
      deleteSimulado: (id) => {
        for (const e of cur().events.filter((x) => x.simuladoId === id)) put('events', { ...e, simuladoId: null });
        remove('simulados', id);
      },
      saveDeck: (d) => put('decks', d),
      deleteDeck: (id) => {
        for (const c of cur().cards.filter((x) => x.deckId === id)) remove('cards', c.id);
        remove('decks', id);
      },
      saveCard: (c) => put('cards', c),
      deleteCard: (id) => remove('cards', id),
      saveErrNote: (n) => put('errnotes', n),
      deleteErrNote: (id) => remove('errnotes', id),
      saveMacete: (m) => put('macetes', m),
      deleteMacete: (id) => remove('macetes', id),
      saveLetter: (l) => put('letters', l),
      deleteLetter: (id) => remove('letters', id),
      saveVoucher: (v) => put('vouchers', v),
      deleteVoucher: (id) => remove('vouchers', id),
      snapshot: () => latest.current,
    };
  }, [data, ready, mode, error, saving, put, remove]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
