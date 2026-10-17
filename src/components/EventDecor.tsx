// Decoração dos eventos especiais nos ambientes, a celebração do dia e a
// prévia. Tudo fica por cima dos cenários sem bloquear cliques.
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from './ui';
import { Asset } from '../assets/registry';
import { Icon } from './Icon';
import { play, type SoundName } from '../logic/sound';
import { rollMimo } from '../logic/rewards';
import { activeEvents, daysToGraduation, eventsOf, seenKey, THEMES, type EventScene, type SpecialEvent } from '../logic/events';
import { today } from '../logic/dates';
import { Party } from './Overlays';

// ── Prévia (só nesta janela, não salva nada) ─────────────────
let previewId: string | null = null;
const subs = new Set<() => void>();
export const eventPreview = {
  set(id: string | null) {
    previewId = id;
    subs.forEach((f) => f());
  },
  get: () => previewId,
};
const usePreview = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => previewId,
  );

export function useActiveEvents() {
  const { data } = useStore();
  const p = usePreview();
  return useMemo(() => activeEvents(data.settings, today(), p), [data.settings, p]);
}

// posições nas bordas de cada ambiente (x e y em %, tamanho em px)
const SPOTS: Record<EventScene, { x: number; y: number; s: number }[]> = {
  trilha: [
    { x: 7, y: 14, s: 64 }, { x: 91, y: 22, s: 58 }, { x: 6, y: 40, s: 58 }, { x: 91, y: 52, s: 62 },
    { x: 8, y: 68, s: 62 }, { x: 91, y: 80, s: 58 }, { x: 9, y: 92, s: 60 },
  ],
  jardim: [
    { x: 6, y: 84, s: 64 }, { x: 94, y: 86, s: 62 }, { x: 24, y: 92, s: 46 }, { x: 78, y: 93, s: 46 }, { x: 88, y: 16, s: 52 },
  ],
  quarto: [
    { x: 5, y: 88, s: 70 }, { x: 94, y: 90, s: 62 }, { x: 30, y: 95, s: 48 }, { x: 71, y: 95, s: 48 }, { x: 95, y: 18, s: 54 },
  ],
  biblioteca: [
    { x: 4, y: 88, s: 66 }, { x: 96, y: 88, s: 66 }, { x: 4, y: 40, s: 54 }, { x: 96, y: 44, s: 54 },
  ],
};

const GIFT_SPOT: Record<EventScene, { x: number; y: number }> = {
  trilha: { x: 91, y: 64 },
  jardim: { x: 66, y: 90 },
  quarto: { x: 12, y: 93 },
  biblioteca: { x: 96, y: 66 },
};

export function EventDecor({ scene }: { scene: EventScene }) {
  const { data } = useStore();
  const ev = useActiveEvents();
  const reduce = useReducedMotion();
  const ambient = data.settings.ambient !== false;
  const layers = [ev.seasonal, ev.day].filter((e): e is SpecialEvent => !!e && e.scenes.includes(scene));
  if (!layers.length) return null;
  const spots = SPOTS[scene];
  // o evento do dia ganha destaque: pega as primeiras posições; o sazonal fica com o resto
  const dayEv = layers.find((e) => e.kind === 'dia');
  const seasonEv = layers.find((e) => e.kind === 'sazonal');
  const placed: { slot: string; x: number; y: number; s: number; key: string }[] = [];
  const dayProps = dayEv ? THEMES[dayEv.theme].props : [];
  const seasonProps = seasonEv ? THEMES[seasonEv.theme].props : [];
  spots.forEach((sp, i) => {
    let slot: string | undefined;
    if (dayEv && seasonEv) slot = i % 2 === 0 ? dayProps[(i / 2) % dayProps.length] : seasonProps[((i - 1) / 2) % seasonProps.length];
    else slot = (dayProps.length ? dayProps : seasonProps)[i % (dayProps.length || seasonProps.length)];
    if (slot) placed.push({ slot, ...sp, key: `${slot}-${i}` });
  });
  const garland = (dayEv && THEMES[dayEv.theme].garland) || (seasonEv && THEMES[seasonEv.theme].garland);
  const tint = (dayEv && THEMES[dayEv.theme].tint) || (seasonEv && THEMES[seasonEv.theme].tint);
  const particles = (dayEv && THEMES[dayEv.theme].particles) || (seasonEv && THEMES[seasonEv.theme].particles);
  const giftEv = layers.find((e) => e.hiddenGift);

  return (
    <div className={`ev-layer ev-${scene}`} aria-hidden={!giftEv}>
      {tint && <span className="ev-tint" style={{ background: tint }} />}
      {garland && (
        <motion.span className="ev-garland" initial={reduce ? false : { y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
          <Asset slot={garland} />
        </motion.span>
      )}
      {placed.map((p, i) => (
        <motion.span
          key={p.key}
          className={`ev-prop ${ambient && !reduce ? 'is-bob' : ''}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${i * -0.7}s` }}
          initial={reduce ? false : { scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Asset slot={p.slot} />
        </motion.span>
      ))}
      {particles && ambient && !reduce && (
        <span className={`ev-particles ev-p-${particles}`}>
          {Array.from({ length: 14 }).map((_, i) => (
            <i key={i} style={{ left: `${(i * 37 + 5) % 100}%`, animationDelay: `${(i * 1.3) % 9}s`, animationDuration: `${8 + (i % 5) * 1.6}s` }} />
          ))}
        </span>
      )}
      {giftEv && <HiddenGift ev={giftEv} scene={scene} />}
    </div>
  );
}

/** presente escondido: um por evento por ano, em um ambiente sorteado do dia */
function HiddenGift({ ev, scene }: { ev: SpecialEvent; scene: EventScene }) {
  const store = useStore();
  const ui = useUI();
  const { data } = store;
  const year = today().slice(0, 4);
  const key = `gift:${ev.id}:${year}`;
  const found = data.settings.eggsFound ?? {};
  const pv = usePreview();
  // escolhe o ambiente do presente de forma estável para o evento e o ano
  const scenes = ev.scenes;
  const where = scenes[(ev.id.length + Number(year)) % scenes.length];
  if (where !== scene || (found[key] && !pv)) return null;
  const spot = GIFT_SPOT[scene];
  return (
    <motion.button
      className="ev-gift"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      animate={{ rotate: [0, -6, 6, 0] }}
      transition={{ repeat: Infinity, duration: 2.4, repeatDelay: 3 }}
      whileHover={{ scale: 1.15 }}
      onClick={() => {
        play('candy');
        if (pv) {
          ui.toast('Na prévia o presente não é guardado. No dia de verdade, ele vira uma surpresa.', 'info');
          return;
        }
        store.saveSettings({ eggsFound: { ...found, [key]: new Date().toISOString() } });
        const v = rollMimo(store.snapshot(), `presente de ${ev.name}`, { force: true });
        if (v) {
          store.saveVoucher(v);
          ui.enqueue({ kind: 'voucher', voucherId: v.id });
        } else {
          ui.toast(`Você achou o presente de ${ev.name}!`, 'diva');
        }
      }}
      aria-label={`Um presente escondido de ${ev.name}`}
    >
      <Asset slot="event.natal.presente" />
    </motion.button>
  );
}

// ── Chip do evento (para rever a celebração) ─────────────────

export function EventChip() {
  const ev = useActiveEvents();
  const ui = useUI();
  const show = ev.day ?? ev.seasonal;
  if (!show) return null;
  return (
    <motion.button
      className="ev-chip"
      onClick={() => ui.enqueue({ kind: 'event', eventId: show.id })}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      title="Rever a celebração"
    >
      <span className="ev-chip-art"><Asset slot={THEMES[show.theme].props[0]} /></span>
      {show.name}
    </motion.button>
  );
}

// ── Barra da prévia ──────────────────────────────────────────

export function PreviewBar() {
  const pv = usePreview();
  const { data } = useStore();
  const ui = useUI();
  if (!pv) return null;
  const ev = eventsOf(data.settings).find((e) => e.id === pv);
  return (
    <motion.div className="ev-preview" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} role="status">
      <Icon name="eye" size={18} />
      <span>Pré-visualizando <strong>{ev?.name}</strong>. Nada foi salvo.</span>
      <button className="btn btn-sm btn-secondary" onClick={() => ev && ui.enqueue({ kind: 'event', eventId: ev.id, preview: true })}>Ver celebração</button>
      <button className="btn btn-sm btn-dark" onClick={() => eventPreview.set(null)}>Sair da prévia</button>
    </motion.div>
  );
}

// ── Vigia: mostra a celebração uma vez por ano ───────────────

export function EventWatcher() {
  const store = useStore();
  const { data, ready, mode } = store;
  const ui = useUI();
  const ev = useActiveEvents();
  useEffect(() => {
    if (!ready || mode === 'loading' || ev.preview || ui.busy) return;
    const seen = data.settings.eventsSeen ?? {};
    if (ev.day && !seen[seenKey(ev.day)]) {
      ui.enqueue({ kind: 'event', eventId: ev.day.id });
      return;
    }
    if (ev.seasonal && !seen[seenKey(ev.seasonal)]) {
      if (mode !== 'demo') store.saveSettings({ eventsSeen: { ...seen, [seenKey(ev.seasonal)]: new Date().toISOString() } });
      ui.toast(`${ev.seasonal.title}. Olhe os cenários!`, 'diva');
    }
  }, [ready, mode, ev.day?.id, ev.seasonal?.id, ev.preview]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Cartão da celebração ─────────────────────────────────────

const SOUND_OF: Record<string, SoundName | null> = { nenhum: null, chapter: 'chapter', mission: 'mission', musicbox: 'musicbox', kiss: 'kiss', candy: 'candy' };

export function EventCard({ eventId, preview, onClose }: { eventId: string; preview?: boolean; onClose: () => void }) {
  const store = useStore();
  const { data } = store;
  const ev = eventsOf(data.settings).find((e) => e.id === eventId);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ev) return;
    const s = SOUND_OF[ev.sound];
    if (s) play(s);
    if (!preview && store.mode !== 'demo') {
      const seen = data.settings.eventsSeen ?? {};
      if (!seen[seenKey(ev)]) store.saveSettings({ eventsSeen: { ...seen, [seenKey(ev)]: new Date().toISOString() } });
    }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ev) return null;
  const th = THEMES[ev.theme];
  const dtg = ev.countdown ? daysToGraduation(data.settings) : null;
  const festive = ev.theme !== 'natureza';
  const letter = ev.style === 'carta';
  return (
    <motion.div className="celebration ev-cel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      {festive && <Party kisses={ev.theme === 'praia' || ev.theme === 'coracoes' || ev.theme === 'aniversario-yas'} />}
      <motion.div
        className={`ev-card ev-card-${ev.theme} ${letter ? 'is-letter' : ''}`}
        role="dialog"
        aria-label={ev.title}
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { y: 60, scale: 0.85, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      >
        <div className="ev-card-art">
          {th.props.slice(0, 3).map((slot, i) => (
            <motion.span
              key={slot + i}
              className={`ev-card-prop p${i}`}
              initial={reduce ? false : { y: 30, scale: 0, rotate: i === 1 ? 0 : i ? 12 : -12 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 260, damping: 13 }}
            >
              <Asset slot={slot} />
            </motion.span>
          ))}
        </div>
        <p className="eyebrow">{ev.name}</p>
        <h2 className="cel-title">{ev.title}</h2>
        {ev.message.trim() ? (
          <motion.div className={letter ? 'ev-letter' : 'ev-message'} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {ev.message.split('\n').map((l, i) => <p key={i}>{l}</p>)}
          </motion.div>
        ) : null}
        {ev.countdown && (
          <p className="ev-countdown">
            {dtg == null
              ? 'Coloque a data da sua formatura em Configurações → Eventos para ver a contagem.'
              : dtg > 0
                ? <>Faltam <strong>{dtg}</strong> {dtg === 1 ? 'dia' : 'dias'} para a sua formatura.</>
                : dtg === 0
                  ? <>Hoje é o dia da sua formatura!</>
                  : <>Sua formatura já aconteceu. Que orgulho!</>}
          </p>
        )}
        <button className="btn btn-primary btn-lg" onClick={onClose} autoFocus>Obrigada!</button>
      </motion.div>
    </motion.div>
  );
}
