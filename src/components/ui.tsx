import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from './Icon';
import { Asset } from '../assets/registry';
import { play } from '../logic/sound';
import { CHAPTER_LINES, DONE_LINES, MISSION_LINES, randomLine } from '../logic/messages';
import { useStore } from '../data/store';
import { ImagePop, LetterOpen, VoucherReveal, type Overlay } from './Overlays';
import { EventCard } from './EventDecor';

// ── Contexto de interface: celebrações, bolhas e navegação ────

export type Page = 'trilha' | 'quarto' | 'biblioteca' | 'agenda' | 'evolucao' | 'painel' | 'simulados' | 'flashcards' | 'config';

interface Celebration {
  kind: 'mission' | 'chapter';
  title: string;
  line: string;
  extras: string[];
}

export type TopicTab = 'geral' | 'mapa' | 'resumo' | 'questoes';
export interface TopicFocus {
  tab?: TopicTab;
  nodeId?: string | null;
  simId?: string | null; // mapa de qual simulado
}

interface UI {
  page: Page;
  go(p: Page): void;
  toast(text: string, tone?: 'diva' | 'info' | 'erro'): void;
  celebrate(c: Omit<Celebration, 'line'> & { line?: string }): void;
  activityDone(): void;
  openTopic(id: string | null, focus?: TopicFocus): void;
  topicId: string | null;
  topicFocus: TopicFocus | null; // aba (e nó do mapa) para abrir a página do tema
  openMission(id: string): void;
  pendingMission: string | null;
  clearPendingMission(): void;
  openBook(topicId: string, maceteId?: string): void;
  pendingBook: string | null;
  pendingMacete: string | null; // abrir o livro direto neste macete
  clearPendingBook(): void;
  roomView: string | null;
  setRoomView(v: string | null): void;
  openRoom(view: string | null): void;
  enqueue(o: Overlay): void;
  busy: boolean; // há celebração ou pop-up na tela
}

const Ctx = createContext<UI | null>(null);
export const useUI = () => {
  const u = useContext(Ctx);
  if (!u) throw new Error('UIProvider ausente');
  return u;
};

const PAGES: Page[] = ['trilha', 'quarto', 'biblioteca', 'agenda', 'evolucao', 'painel', 'simulados', 'flashcards', 'config'];
const pageFromHash = (): Page => {
  const h = location.hash.replace('#', '') as Page;
  return PAGES.includes(h) ? h : 'trilha';
};

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: string }[]>([]);
  const [cel, setCel] = useState<Celebration | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [topicFocus, setTopicFocus] = useState<TopicFocus | null>(null);
  const [pendingMission, setPendingMission] = useState<string | null>(null);
  const [pendingBook, setPendingBook] = useState<string | null>(null);
  const [pendingMacete, setPendingMacete] = useState<string | null>(null);
  const [roomView, setRoomView] = useState<string | null>(null);
  const [queue, setQueue] = useState<Overlay[]>([]);
  const shift = useCallback(() => setQueue((q) => q.slice(1)), []);
  const { data } = useStore();
  const phrases = data.settings.celebrationPhrases?.filter((x) => x.trim()) ?? [];

  useEffect(() => {
    const on = () => setPage(pageFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const toast = useCallback((text: string, tone: 'diva' | 'info' | 'erro' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'erro' ? 6000 : 3600);
  }, []);

  const value: UI = {
    page,
    go: (p) => {
      setPage(p);
      try {
        history.replaceState(null, '', `#${p}`);
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0 });
    },
    toast,
    celebrate: (c) => {
      play(c.kind === 'chapter' ? 'chapter' : 'mission');
      setCel({ ...c, line: c.line ?? randomLine(phrases.length ? phrases : c.kind === 'chapter' ? CHAPTER_LINES : MISSION_LINES) });
    },
    activityDone: () => {
      play('check');
      toast(randomLine(phrases.length && Math.random() < 0.5 ? phrases : DONE_LINES), 'diva');
    },
    openTopic: (id, focus) => {
      setTopicId(id);
      setTopicFocus(focus ?? null);
    },
    topicId,
    topicFocus,
    openMission: (id) => {
      setPendingMission(id);
      setPage('trilha');
      try {
        history.replaceState(null, '', '#trilha');
      } catch {
        /* ignore */
      }
    },
    pendingMission,
    clearPendingMission: () => setPendingMission(null),
    openBook: (id, maceteId) => {
      setPendingBook(id);
      setPendingMacete(maceteId ?? null);
      setPage('biblioteca');
      try {
        history.replaceState(null, '', '#biblioteca');
      } catch {
        /* ignore */
      }
    },
    pendingBook,
    pendingMacete,
    clearPendingBook: () => setPendingBook(null),
    roomView,
    setRoomView,
    enqueue: (o) => setQueue((q) => (q.some((x) => JSON.stringify(x) === JSON.stringify(o)) ? q : [...q, o])),
    busy: !!cel || queue.length > 0,
    openRoom: (v) => {
      setRoomView(v);
      setPage('quarto');
      try {
        history.replaceState(null, '', '#quarto');
      } catch {
        /* ignore */
      }
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.tone}`}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              {t.tone === 'diva' && <span className="toast-spark">✦</span>}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>{cel && <CelebrationView c={cel} onClose={() => setCel(null)} />}</AnimatePresence>
      <AnimatePresence mode="wait">
        {!cel && queue[0]?.kind === 'image' && <ImagePop key={JSON.stringify(queue[0])} assetId={queue[0].assetId} onClose={shift} />}
        {!cel && queue[0]?.kind === 'voucher' && <VoucherReveal key={JSON.stringify(queue[0])} voucherId={queue[0].voucherId} onClose={shift} />}
        {!cel && queue[0]?.kind === 'letter' && <LetterOpen key={JSON.stringify(queue[0])} letterId={queue[0].letterId} onClose={shift} />}
        {!cel && queue[0]?.kind === 'event' && <EventCard key={JSON.stringify(queue[0])} eventId={queue[0].eventId} preview={queue[0].preview} onClose={shift} />}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

// ── Celebração ────────────────────────────────────────────────

const CONFETTI_COLORS = ['#F38CB8', '#D9EE76', '#FFF3B0', '#CFE4FF', '#E9D8FF', '#FFAEB1', '#2E4A7F', '#AFC47E'];

function Confetti({ count = 40 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const x = (i * 37) % 100;
        const delay = (i % 10) * 0.05;
        return (
          <motion.span
            key={i}
            style={{ left: `${x}%`, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], borderRadius: i % 3 ? 3 : 99 }}
            initial={{ y: -40, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 360 + i * 20, x: (i % 2 ? 1 : -1) * (20 + (i % 7) * 8), opacity: [1, 1, 0.8] }}
            transition={{ duration: 2.2 + (i % 5) * 0.3, delay, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}

function CelebrationView({ c, onClose }: { c: Celebration; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const big = c.kind === 'chapter';
  return (
    <motion.div className="celebration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <Confetti count={big ? 60 : 32} />
      <motion.div
        className={`cel-card ${big ? 'cel-big' : ''}`}
        role="dialog"
        aria-label={c.title}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, scale: 0.85, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.div
          className="cel-bubble"
          initial={{ scale: 0, rotate: -6 }}
          animate={{ scale: 1, rotate: -2 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 380, damping: 16 }}
        >
          {c.line}
        </motion.div>
        <motion.div
          className="cel-art"
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <Asset slot={big ? 'celebration.chapter' : 'celebration.mission'} />
        </motion.div>
        <p className="eyebrow">{big ? 'Capítulo concluído' : 'Missão cumprida'}</p>
        <h2 className="cel-title">{c.title}</h2>
        {c.extras.length > 0 && (
          <ul className="cel-extras">
            {c.extras.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        <button className="btn btn-primary btn-lg" onClick={onClose} autoFocus>
          Continuar
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Peças reutilizáveis ───────────────────────────────────────

export function ProgressRing({ pct, size = 44, stroke = 5, color = 'var(--rosa-medio)', track = 'var(--line)', children }: {
  pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, pct))) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <span className="ring-in">{children}</span>}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className={`modal ${wide ? 'modal-wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <header className="modal-head">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Fechar">
                <Icon name="close" />
              </button>
            </header>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay overlay-drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Botão com confirmação embutida (o app não usa confirm() do navegador). */
export function ConfirmButton({ label, confirmLabel, question, onConfirm, className = 'btn btn-ghost-danger' }: {
  label: React.ReactNode; confirmLabel: string; question: string; onConfirm: () => void; className?: string;
}) {
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button className={className} onClick={() => setAsk(true)}>
        {label}
      </button>
    );
  return (
    <span className="confirm-inline">
      <span>{question}</span>
      <button className="btn btn-danger btn-sm" onClick={() => { setAsk(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button className="btn btn-quiet btn-sm" onClick={() => setAsk(false)}>
        Cancelar
      </button>
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** Input que só salva ao sair do campo ou apertar Enter (evita uma escrita por tecla). */
export function LazyInput({ value, onCommit, className, placeholder, type = 'text', id, ariaLabel, min }: {
  value: string; onCommit: (v: string) => void; className?: string; placeholder?: string; type?: string; id?: string; ariaLabel?: string; min?: number;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => {
    if (v !== value) onCommit(v);
  };
  return (
    <input
      id={id}
      className={className}
      value={v}
      type={type}
      min={min}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setV(value);
      }}
    />
  );
}

export const numOrNull = (s: string) => {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};
