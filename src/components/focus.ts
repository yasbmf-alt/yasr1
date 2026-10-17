// Cronômetro do Cantinho de Concentração. Estado guardado no navegador para
// sobreviver a recarregamentos; o registro de horas vai para o banco ao encerrar.
import { useEffect, useState } from 'react';

export interface FocusState {
  running: boolean;
  startedAt: number | null; // ms do último "iniciar"
  accumulated: number; // ms já contados antes da última pausa
  topicId: string | null;
  countdown: number | null; // minutos do temporizador regressivo, ou null para progressivo
}

const KEY = 'yasr1-focus';
const EMPTY: FocusState = { running: false, startedAt: null, accumulated: 0, topicId: null, countdown: null };
const listeners = new Set<() => void>();

function read(): FocusState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}
let state: FocusState = read();

function write(next: FocusState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const focusState = () => state;
export const elapsedMs = (s = state) => s.accumulated + (s.running && s.startedAt ? Date.now() - s.startedAt : 0);
export const isActive = (s = state) => s.running || s.accumulated > 0;

export const focus = {
  start(topicId: string | null, countdown: number | null) {
    write({ running: true, startedAt: Date.now(), accumulated: state.running ? elapsedMs() : state.accumulated, topicId, countdown });
  },
  pause() {
    if (!state.running) return;
    write({ ...state, running: false, startedAt: null, accumulated: elapsedMs() });
  },
  resume() {
    if (state.running) return;
    write({ ...state, running: true, startedAt: Date.now() });
  },
  setTopic(topicId: string | null) {
    write({ ...state, topicId });
  },
  setCountdown(countdown: number | null) {
    write({ ...state, countdown });
  },
  /** zera e devolve os minutos contados */
  consume(): number {
    const m = Math.round(elapsedMs() / 60000);
    write(EMPTY);
    return m;
  },
};

export function useFocus(tickMs = 1000) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    const id = state.running ? setInterval(l, tickMs) : null;
    return () => {
      listeners.delete(l);
      if (id) clearInterval(id);
    };
  }, [tickMs, state.running]);
  return state;
}

/** Minutos do cronômetro em andamento, para preencher registros sem duplicar horas. */
export function useFocusPrefill(): number | null {
  const s = useFocus(30000);
  if (!isActive(s)) return null;
  const m = Math.round(elapsedMs(s) / 60000);
  return m > 0 ? m : null;
}
