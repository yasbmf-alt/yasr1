// Academia: esteira (cardio com cronômetro), equipamentos (fichas A/B/C e treino
// em modo minijogo), quadra (beach tennis e tênis), estúdio de pilates e o
// painel "músculo time", que mostra a consistência recente de cada atividade.
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { Hot, Place, PanelHead, F, DateIn, Bars, MiniMonth, fmtDate, num, weekStartOf } from '../ui';
import { useYl, ylId, nowIso } from '../store';
import { gauges } from '../logic';
import { SPORT_LABEL, type Exercise, type SportKind, type YlSheet } from '../types';
import { useUI, ConfirmButton } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { addDays, today, uid } from '../../logic/dates';
import { play } from '../../logic/sound';
import { burst } from '../../logic/fx';

type Spot = 'esteira' | 'pesos' | 'quadra' | 'pilates' | 'painel';
const store = <T,>(k: string, v?: T): T | null => {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k) ?? 'null');
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
  return null;
};
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const useTick = (on: boolean, ms = 500) => {
  const [, f] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => f((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
};

export function Academia({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const g = gauges(yl.of);
  const cardioRun = !!store<{ running: boolean }>('yasr1-yl-cardio')?.running;
  const scene = (
    <svg viewBox="0 0 1000 480" className="yl-room" role="img" aria-label="Academia">
      <rect width="1000" height="480" fill="#EEF5FB" />
      {/* fundo: quadra e estúdio através do vidro */}
      <rect x="20" y="20" width="960" height="250" rx="16" fill="url(#ac-glass)" stroke="#fff" strokeWidth="6" />
      {[1, 2, 3, 4, 5].map((i) => <line key={i} x1={20 + i * 160} y1="20" x2={20 + i * 160} y2="270" stroke="#fff" strokeWidth="5" opacity=".9" />)}
      <Hot id="quadra" label="Quadra: beach tennis e tênis" on={spot === 'quadra'} onPick={pick}>
        <rect x="60" y="60" width="420" height="180" rx="8" fill="#F4B27D" />
        <rect x="80" y="76" width="380" height="148" fill="none" stroke="#fff" strokeWidth="4" />
        <line x1="270" y1="76" x2="270" y2="224" stroke="#fff" strokeWidth="4" />
        <line x1="270" y1="70" x2="270" y2="230" stroke="#2E4A7F" strokeWidth="3" strokeDasharray="4 4" />
        <circle className="yl-ball" cx="200" cy="140" r="8" fill="#E5F27A" stroke="#C7D45C" strokeWidth="2" />
      </Hot>
      <Hot id="pilates" label="Estúdio de pilates" on={spot === 'pilates'} onPick={pick}>
        <rect x="560" y="60" width="380" height="180" rx="8" fill="#EFE6FF" />
        <rect x="600" y="160" width="140" height="22" rx="8" fill="#9C7FE0" />
        <rect x="610" y="182" width="10" height="26" fill="#7D62C4" /><rect x="720" y="182" width="10" height="26" fill="#7D62C4" />
        <circle cx="830" cy="170" r="34" fill="#F38CB8" opacity=".85" />
        <rect x="780" y="210" width="130" height="10" rx="5" fill="#C7B3F2" />
        <path d="M600 100 q40 -30 80 0" fill="none" stroke="#C7B3F2" strokeWidth="5" />
      </Hot>
      {/* chão */}
      <rect y="300" width="1000" height="180" fill="#D9E3EE" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 100} y="300" width="50" height="180" fill="#CFDAE6" opacity=".6" />)}
      {/* esteira */}
      <Hot id="esteira" label="Esteira: cardio" on={spot === 'esteira'} onPick={pick}>
        <g transform="translate(70 300)">
          <rect x="0" y="110" width="230" height="30" rx="12" fill="#3B3F52" />
          <rect className={`yl-belt ${cardioRun ? 'is-on' : ''}`} x="12" y="114" width="206" height="14" rx="7" fill="#5B6074" />
          <rect x="190" y="10" width="14" height="104" rx="7" fill="#5B6074" />
          <rect x="150" y="0" width="80" height="34" rx="10" fill="#2E4A7F" />
          <rect x="160" y="8" width="60" height="18" rx="4" fill={cardioRun ? '#9FE07F' : '#9FB4CF'} />
        </g>
      </Hot>
      {/* equipamentos */}
      <Hot id="pesos" label="Equipamentos: musculação" on={spot === 'pesos'} onPick={pick}>
        <g transform="translate(360 320)">
          <rect x="0" y="60" width="200" height="12" rx="6" fill="#5B6074" />
          <rect x="20" y="40" width="22" height="52" rx="6" fill="#F38CB8" /><rect x="158" y="40" width="22" height="52" rx="6" fill="#F38CB8" />
          <rect x="60" y="92" width="10" height="38" fill="#5B6074" /><rect x="130" y="92" width="10" height="38" fill="#5B6074" />
          <rect x="40" y="118" width="120" height="16" rx="8" fill="#9C7FE0" />
          <g transform="translate(240 70)"><rect x="0" y="0" width="70" height="10" rx="5" fill="#3B3F52" /><circle cx="6" cy="5" r="14" fill="#2E4A7F" /><circle cx="64" cy="5" r="14" fill="#2E4A7F" /></g>
        </g>
      </Hot>
      {/* painel de evolução na parede */}
      <Hot id="painel" label="Painel: músculo time" on={spot === 'painel'} onPick={pick}>
        <g transform="translate(720 296)">
          <rect width="230" height="150" rx="14" fill="#fff" stroke="#C9D7EA" strokeWidth="3" />
          <text x="115" y="28" textAnchor="middle" className="yl-tag yl-tag-dark">MÚSCULO TIME</text>
          {g.map((x, i) => (
            <g key={x.id} transform={`translate(${24 + i * 50} 40)`}>
              <rect width="30" height="90" rx="10" fill="#EEF2F7" />
              <rect y={90 - (x.value / 100) * 90} width="30" height={(x.value / 100) * 90} rx="10" fill={x.color} />
              <text x="15" y="106" textAnchor="middle" fontSize="14">{x.emoji}</text>
            </g>
          ))}
        </g>
      </Hot>
      <defs><linearGradient id="ac-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F7FBFF" /><stop offset="1" stopColor="#DCEBFB" /></linearGradient></defs>
    </svg>
  );
  const close = () => setSpot(null);
  const panel =
    spot === 'esteira' ? <Cardio onClose={close} />
    : spot === 'pesos' ? <Lifting onClose={close} />
    : spot === 'quadra' ? <Sport kinds={['beach', 'tenis']} onClose={close} />
    : spot === 'pilates' ? <Sport kinds={['pilates']} onClose={close} />
    : spot === 'painel' ? <Gauges onClose={close} />
    : null;
  return <Place title="Academia" emoji="🏋🏻‍♀️" onBack={onBack} scene={scene} spot={spot} panel={panel} hint="Esteira: cardio · Equipamentos: musculação · Quadra e estúdio ao fundo · Painel: músculo time." />;
}

// ── Músculo time ──────────────────────────────────────────────

function Gauges({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const g = gauges(yl.of);
  const all = [...yl.of('cardio'), ...yl.of('lift'), ...yl.of('sport')];
  const weeks = Array.from({ length: 8 }, (_, i) => weekStartOf(addDays(today(), -7 * (7 - i))));
  return (
    <div>
      <PanelHead title="💪 Músculo time" sub="Mostra a sua constância recente em cada atividade (não é medida do corpo). Treinar enche; parar por muito tempo esvazia devagar, sem apagar nada." onClose={onClose} />
      <div className="yl-gauges">
        {g.map((x, i) => (
          <div key={x.id} className="yl-gauge">
            <div className="yl-gauge-t">
              <motion.i style={{ background: x.color }} initial={{ height: 0 }} animate={{ height: `${x.value}%` }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 80, damping: 14 }} />
              <span>{x.emoji}</span>
            </div>
            <strong>{x.label}</strong>
            <b style={{ color: x.color }}>{x.value}%</b>
            <small className="muted">{x.last ? `último: ${fmtDate(x.last)}` : 'ainda sem registro'} · {x.count30} em 30 dias</small>
          </div>
        ))}
      </div>
      <span className="yl-k">Treinos por semana</span>
      <Bars items={weeks.map((w) => ({ label: fmtDate(w).split(' ')[1] ?? w, value: all.filter((x) => x.date >= w && x.date < addDays(w, 7)).length }))} color="#E46AA5" />
    </div>
  );
}

// ── Esteira: cardio ───────────────────────────────────────────

const CARDIO = ['Caminhada', 'Corrida', 'Bike', 'Elíptico', 'Escada', 'Outro'];
interface CardioTimer { running: boolean; startedAt: number | null; acc: number }

function Cardio({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [t, setT] = useState<CardioTimer>(() => store<CardioTimer>('yasr1-yl-cardio') ?? { running: false, startedAt: null, acc: 0 });
  useTick(t.running);
  const save = (n: CardioTimer) => { setT(n); store('yasr1-yl-cardio', n.running || n.acc ? n : null); };
  const ms = t.acc + (t.running && t.startedAt ? Date.now() - t.startedAt : 0);
  const [f, setF] = useState({ modality: 'Caminhada', minutes: '', speed: '', incline: '', distance: '', kcal: '', date: today() });
  const list = [...yl.of('cardio')].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const finish = () => {
    const m = Math.max(1, Math.round(ms / 60000));
    save({ running: false, startedAt: null, acc: ms });
    setF({ ...f, minutes: String(m) });
    play('check');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = num(f.minutes);
    if (!minutes) return;
    yl.save({ id: ylId('cardio'), kind: 'cardio', createdAt: nowIso(), date: f.date, modality: f.modality, minutes, speed: num(f.speed), incline: num(f.incline), distance: num(f.distance), kcal: num(f.kcal) });
    save({ running: false, startedAt: null, acc: 0 });
    setF({ ...f, minutes: '', speed: '', incline: '', distance: '', kcal: '' });
    play('mission');
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'brilho', 14);
  };
  const weeks = Array.from({ length: 8 }, (_, i) => weekStartOf(addDays(today(), -7 * (7 - i))));
  return (
    <div>
      <PanelHead title="🏃🏻‍♀️ Esteira · cardio" onClose={onClose} />
      <div className="yl-timer">
        <motion.span className={`yl-timer-c ${t.running ? 'is-on' : ''}`} animate={t.running ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ repeat: t.running ? Infinity : 0, duration: 1 }}>{clock(ms)}</motion.span>
        <div className="btn-row">
          {!t.running && !ms && <button className="btn btn-primary" onClick={() => { save({ running: true, startedAt: Date.now(), acc: 0 }); play('pop'); }}>▶ Iniciar treino</button>}
          {t.running && <button className="btn btn-secondary" onClick={() => save({ running: false, startedAt: null, acc: ms })}>❚❚ Pausar</button>}
          {!t.running && ms > 0 && <button className="btn btn-primary" onClick={() => save({ running: true, startedAt: Date.now(), acc: t.acc })}>▶ Continuar</button>}
          {ms > 0 && <button className="btn btn-quiet" onClick={finish}>■ Finalizar</button>}
        </div>
      </div>
      <form className="yl-form" onSubmit={submit}>
        <F label="Modalidade"><select id="cd-m" value={f.modality} onChange={(e) => setF({ ...f, modality: e.target.value })}>{CARDIO.map((c) => <option key={c}>{c}</option>)}</select></F>
        <F label="Duração (min)"><input id="cd-t" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></F>
        <F label="Velocidade (km/h)"><input id="cd-v" inputMode="decimal" value={f.speed} onChange={(e) => setF({ ...f, speed: e.target.value })} /></F>
        <F label="Inclinação (%)"><input id="cd-i" inputMode="decimal" value={f.incline} onChange={(e) => setF({ ...f, incline: e.target.value })} /></F>
        <F label="Distância (km)"><input id="cd-d" inputMode="decimal" value={f.distance} onChange={(e) => setF({ ...f, distance: e.target.value })} /></F>
        <F label="Calorias (opcional)"><input id="cd-k" inputMode="numeric" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} /></F>
        <F label="Data"><DateIn id="cd-date" value={f.date} onChange={(d) => setF({ ...f, date: d })} /></F>
        <button className="btn btn-primary btn-sm" type="submit" disabled={!num(f.minutes)}>Registrar</button>
      </form>
      <div className="yl-two">
        <div>
          <span className="yl-k">Minutos por semana</span>
          <Bars items={weeks.map((w) => ({ label: fmtDate(w).split(' ')[1] ?? w, value: list.filter((x) => x.date >= w && x.date < addDays(w, 7)).reduce((a, x) => a + x.minutes, 0) }))} color="#F08C5A" />
        </div>
        <History items={list.map((x) => ({ id: x.id, date: x.date, text: `${x.modality} · ${x.minutes} min`, sub: [x.distance ? `${x.distance} km` : '', x.speed ? `${x.speed} km/h` : '', x.incline ? `${x.incline}% incl.` : '', x.kcal ? `${x.kcal} kcal` : ''].filter(Boolean).join(' · ') }))} onDel={yl.del} />
      </div>
    </div>
  );
}

function History({ items, onDel }: { items: { id: string; date: string; text: string; sub?: string }[]; onDel: (id: string) => void }) {
  if (!items.length) return <p className="muted small">Nenhum registro ainda.</p>;
  return (
    <ul className="yl-hlist">
      {items.slice(0, 12).map((x) => (
        <li key={x.id}>
          <span className="yl-hdate">{fmtDate(x.date)}</span>
          <span><strong>{x.text}</strong>{x.sub ? <small className="muted"> · {x.sub}</small> : null}</span>
          <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={13} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => onDel(x.id)} />
        </li>
      ))}
    </ul>
  );
}

// ── Musculação: fichas e minijogo ─────────────────────────────

interface LiveLift { sheetId: string; startedAt: number; sets: Record<string, { reps: string; load: number | null }[]>; rest: number | null }

function Lifting({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const sheets = [...yl.of('sheet')].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const [edit, setEdit] = useState<YlSheet | 'new' | null>(null);
  const [live, setLive] = useState<LiveLift | null>(() => store<LiveLift>('yasr1-yl-lift'));
  const setLiveS = (l: LiveLift | null) => { setLive(l); store('yasr1-yl-lift', l); };
  const lifts = [...yl.of('lift')].sort((a, b) => b.date.localeCompare(a.date));
  const sheet = live ? sheets.find((s) => s.id === live.sheetId) : null;

  if (live && sheet) return <LiftGame sheet={sheet} live={live} setLive={setLiveS} onClose={onClose} />;
  if (edit) return <SheetForm initial={edit === 'new' ? null : edit} existing={sheets.length} onDone={() => setEdit(null)} />;

  // evolução de carga por exercício (maior carga em cada treino)
  const evo = new Map<string, { date: string; load: number }[]>();
  for (const l of [...lifts].reverse()) for (const d of l.done) {
    const max = Math.max(0, ...d.sets.map((s) => s.load ?? 0));
    if (max) evo.set(d.name, [...(evo.get(d.name) ?? []), { date: l.date, load: max }]);
  }
  return (
    <div>
      <PanelHead title="🏋🏻‍♀️ Musculação" sub="Monte as fichas e comece o treino: cada série marcada enche a barra." onClose={onClose}>
        <button className="btn btn-secondary btn-sm" onClick={() => setEdit('new')}><Icon name="plus" size={14} /> Nova ficha</button>
      </PanelHead>
      {!sheets.length && <p className="muted">Nenhuma ficha ainda. Crie a Ficha A com seus exercícios.</p>}
      <div className="yl-sheets">
        {sheets.map((s) => {
          const last = lifts.find((l) => l.sheetId === s.id);
          return (
            <motion.div key={s.id} className="yl-sheet" whileHover={{ y: -4, rotate: -0.5 }}>
              <div className="yl-sheet-h"><strong>{s.name}</strong><button className="icon-btn icon-btn-sm" onClick={() => setEdit(s)} aria-label="Editar ficha"><Icon name="edit" size={13} /></button></div>
              <ul>{s.exercises.map((x) => <li key={x.id}>{x.name} <span className="muted small">{x.sets}×{x.reps}{x.load ? ` · ${x.load} kg` : ''}</span></li>)}</ul>
              <span className="muted small">{last ? `último: ${fmtDate(last.date)}` : 'ainda não feita'} · {lifts.filter((l) => l.sheetId === s.id).length} treinos</span>
              <button className="btn btn-primary btn-sm" disabled={!s.exercises.length} onClick={() => { setLiveS({ sheetId: s.id, startedAt: Date.now(), sets: {}, rest: null }); play('pop'); }}>▶ Começar treino</button>
            </motion.div>
          );
        })}
      </div>
      {evo.size > 0 && (
        <>
          <span className="yl-k">Evolução das cargas</span>
          <div className="yl-evo">
            {[...evo].map(([name, pts]) => (
              <div key={name} className="yl-evo-row">
                <span>{name}</span>
                <span className="yl-spark">{pts.slice(-10).map((p, i) => <i key={i} style={{ height: `${(p.load / Math.max(...pts.map((x) => x.load))) * 100}%` }} title={`${fmtDate(p.date)}: ${p.load} kg`} />)}</span>
                <strong>{pts.at(-1)!.load} kg</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {lifts.length > 0 && <History items={lifts.map((l) => ({ id: l.id, date: l.date, text: `${l.sheetName} · ${l.minutes} min`, sub: `${l.done.length}/${l.total} exercícios` }))} onDel={yl.del} />}
    </div>
  );
}

function SheetForm({ initial, existing, onDone }: { initial: YlSheet | null; existing: number; onDone: () => void }) {
  const yl = useYl();
  const [name, setName] = useState(initial?.name ?? `Ficha ${String.fromCharCode(65 + existing)}`);
  const [ex, setEx] = useState<Exercise[]>(initial?.exercises ?? [{ id: uid(), name: '', sets: 3, reps: '12', load: null, rest: 60 }]);
  const set = (i: number, p: Partial<Exercise>) => setEx(ex.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <form
      className="yl-form-col"
      onSubmit={(e) => {
        e.preventDefault();
        const list = ex.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim() }));
        yl.save({ id: initial?.id ?? ylId('sheet'), kind: 'sheet', createdAt: initial?.createdAt ?? nowIso(), name: name.trim() || 'Ficha', exercises: list });
        play('check');
        onDone();
      }}
    >
      <PanelHead title={initial ? 'Editar ficha' : 'Nova ficha'} onClose={onDone} />
      <F label="Nome da ficha"><input id="sh-n" value={name} onChange={(e) => setName(e.target.value)} /></F>
      <div className="yl-ex-head"><span>Exercício</span><span>Séries</span><span>Reps</span><span>Carga (kg)</span><span>Intervalo (s)</span><span /></div>
      {ex.map((x, i) => (
        <div key={x.id} className="yl-ex-row">
          <input aria-label="Exercício" value={x.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="ex.: Agachamento" />
          <input aria-label="Séries" inputMode="numeric" value={x.sets} onChange={(e) => set(i, { sets: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
          <input aria-label="Repetições" value={x.reps} onChange={(e) => set(i, { reps: e.target.value })} />
          <input aria-label="Carga" inputMode="decimal" value={x.load ?? ''} onChange={(e) => set(i, { load: num(e.target.value) })} />
          <input aria-label="Intervalo" inputMode="numeric" value={x.rest ?? ''} onChange={(e) => set(i, { rest: num(e.target.value) })} />
          <button type="button" className="icon-btn icon-btn-sm" onClick={() => setEx(ex.filter((_, k) => k !== i))} aria-label="Remover exercício"><Icon name="close" size={13} /></button>
        </div>
      ))}
      <div className="btn-row wrap">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEx([...ex, { id: uid(), name: '', sets: 3, reps: '12', load: null, rest: 60 }])}><Icon name="plus" size={14} /> Exercício</button>
        {initial && <ConfirmButton className="btn btn-quiet btn-sm" label={<><Icon name="trash" size={13} /> Apagar ficha</>} question="Apagar a ficha? (os treinos feitos continuam no histórico)" confirmLabel="Apagar" onConfirm={() => { yl.del(initial.id); onDone(); }} />}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" type="submit">Salvar ficha</button>
      </div>
    </form>
  );
}

/** treino em modo minijogo: cada série é uma bolinha para tocar; o haltere levanta e a barra enche */
function LiftGame({ sheet, live, setLive, onClose }: { sheet: YlSheet; live: LiveLift; setLive: (l: LiveLift | null) => void; onClose: () => void }) {
  const yl = useYl();
  const ui = useUI();
  const [date, setDate] = useState(today());
  const [lift, setLift] = useState(0);
  useTick(true, 1000);
  const total = sheet.exercises.reduce((a, x) => a + x.sets, 0);
  const done = Object.values(live.sets).reduce((a, l) => a + l.length, 0);
  const pct = total ? done / total : 0;
  const restLeft = live.rest ? Math.max(0, Math.ceil((live.rest - Date.now()) / 1000)) : 0;
  const tapSet = (x: Exercise, e: React.MouseEvent) => {
    const cur = live.sets[x.id] ?? [];
    if (cur.length >= x.sets) return;
    setLive({ ...live, sets: { ...live.sets, [x.id]: [...cur, { reps: x.reps, load: x.load }] }, rest: x.rest ? Date.now() + x.rest * 1000 : null });
    setLift((n) => n + 1);
    play('check');
    burst(e, cur.length + 1 === x.sets ? 'confete' : 'brilho', cur.length + 1 === x.sets ? 14 : 6);
  };
  const undo = (x: Exercise) => {
    const cur = live.sets[x.id] ?? [];
    if (!cur.length) return;
    setLive({ ...live, sets: { ...live.sets, [x.id]: cur.slice(0, -1) } });
    play('uncheck');
  };
  const setLoad = (x: Exercise, v: string) => {
    const cur = live.sets[x.id] ?? [];
    if (!cur.length) return;
    setLive({ ...live, sets: { ...live.sets, [x.id]: cur.map((s, i) => (i === cur.length - 1 ? { ...s, load: num(v) } : s)) } });
  };
  const finish = () => {
    const minutes = Math.max(1, Math.round((Date.now() - live.startedAt) / 60000));
    const doneEx = sheet.exercises.filter((x) => (live.sets[x.id] ?? []).length).map((x) => ({ exId: x.id, name: x.name, sets: live.sets[x.id] }));
    yl.save({ id: ylId('lift'), kind: 'lift', createdAt: nowIso(), date, sheetId: sheet.id, sheetName: sheet.name, minutes, done: doneEx, total: sheet.exercises.length, complete: done >= total });
    // carga nova vira a carga da ficha
    const loads = new Map(doneEx.map((d) => [d.exId, Math.max(0, ...d.sets.map((s) => s.load ?? 0))]));
    yl.save({ ...sheet, exercises: sheet.exercises.map((x) => (loads.get(x.id) ? { ...x, load: loads.get(x.id)! } : x)) });
    setLive(null);
    play('mission');
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.4 }, 'confete', 26);
    ui.toast(`${sheet.name} concluída: ${doneEx.length}/${sheet.exercises.length} exercícios em ${minutes} min 💪`, 'diva');
  };
  return (
    <div className="yl-game">
      <PanelHead title={`💪 ${sheet.name}`} sub={`${done}/${total} séries · ${clock(Date.now() - live.startedAt)}`} onClose={onClose}>
        <ConfirmButton className="btn btn-quiet btn-sm" label="Cancelar treino" question="Sair sem salvar?" confirmLabel="Sair" onConfirm={() => setLive(null)} />
      </PanelHead>
      <div className="yl-game-top">
        <motion.div className="yl-lifter" key={lift} animate={{ y: [0, -26, 0] }} transition={{ duration: 0.5 }} aria-hidden="true">
          <svg viewBox="0 0 120 50"><rect x="10" y="22" width="100" height="6" rx="3" fill="#3B3F52" /><rect x="6" y="8" width="16" height="34" rx="5" fill="#E46AA5" /><rect x="98" y="8" width="16" height="34" rx="5" fill="#E46AA5" /></svg>
        </motion.div>
        <div className="yl-game-bar"><motion.i animate={{ width: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 16 }} /><span>{Math.round(pct * 100)}%</span></div>
        <AnimatePresence>{restLeft > 0 && <motion.span className="yl-rest" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>⏱ descanso {restLeft}s</motion.span>}</AnimatePresence>
      </div>
      <div className="yl-game-list">
        {sheet.exercises.map((x) => {
          const cur = live.sets[x.id] ?? [];
          const full = cur.length >= x.sets;
          return (
            <motion.div key={x.id} className={`yl-game-ex ${full ? 'is-done' : ''}`} layout>
              <div className="yl-game-ex-h">
                <strong>{full ? '✅ ' : ''}{x.name}</strong>
                <span className="muted small">{x.sets}×{x.reps}{x.rest ? ` · ${x.rest}s` : ''}</span>
              </div>
              <div className="yl-sets">
                {Array.from({ length: x.sets }).map((_, i) => (
                  <motion.button key={i} className={`yl-set ${i < cur.length ? 'is-on' : ''}`} onClick={(e) => (i < cur.length ? undo(x) : tapSet(x, e))} whileTap={{ scale: 0.8 }} aria-label={`Série ${i + 1}${i < cur.length ? ' feita (toque para desfazer a última)' : ''}`}>
                    {i < cur.length ? '✓' : i + 1}
                  </motion.button>
                ))}
                <input className="yl-load" aria-label="Carga da última série (kg)" inputMode="decimal" placeholder="kg" value={cur.length ? cur[cur.length - 1].load ?? '' : x.load ?? ''} disabled={!cur.length} onChange={(e) => setLoad(x, e.target.value)} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="btn-row">
        <DateIn id="lf-d" value={date} onChange={setDate} />
        <button className="btn btn-primary" disabled={!done} onClick={finish}>🏁 Finalizar treino</button>
      </div>
    </div>
  );
}

// ── Quadra e pilates ──────────────────────────────────────────

function Sport({ kinds, onClose }: { kinds: SportKind[]; onClose: () => void }) {
  const yl = useYl();
  const [f, setF] = useState({ modality: kinds[0], minutes: kinds[0] === 'pilates' ? '50' : '60', notes: '', date: today() });
  const list = [...yl.of('sport')].filter((x) => kinds.includes(x.modality)).sort((a, b) => b.date.localeCompare(a.date));
  const [sel, setSel] = useState<string | null>(null);
  const isPilates = kinds[0] === 'pilates';
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i, 1); return d.toISOString().slice(0, 7); }), []);
  return (
    <div>
      <PanelHead title={isPilates ? '🧘🏻‍♀️ Estúdio de pilates' : '🎾 Quadra'} onClose={onClose} />
      <form
        className="yl-form"
        onSubmit={(e) => {
          e.preventDefault();
          const minutes = num(f.minutes);
          if (!minutes) return;
          yl.save({ id: ylId('sport'), kind: 'sport', createdAt: nowIso(), date: f.date, modality: f.modality, minutes, notes: f.notes.trim() || undefined });
          setF({ ...f, notes: '' });
          play('mission');
          burst({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, 'brilho', 12);
        }}
      >
        {kinds.length > 1 && (
          <div className="seg" role="radiogroup" aria-label="Modalidade">
            {kinds.map((k) => <button type="button" key={k} role="radio" aria-checked={f.modality === k} className={f.modality === k ? 'is-on' : ''} onClick={() => setF({ ...f, modality: k })}>{SPORT_LABEL[k]}</button>)}
          </div>
        )}
        <F label="Duração (min)"><input id="sp-m" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></F>
        <F label={isPilates ? 'Como foi a aula' : 'Notas (placar, parceria…)'} grow><input id="sp-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></F>
        <F label="Data"><DateIn id="sp-d" value={f.date} onChange={(d) => setF({ ...f, date: d })} /></F>
        <button className="btn btn-primary btn-sm" type="submit">Registrar {isPilates ? 'aula' : 'jogo'}</button>
      </form>
      <div className="yl-two">
        <div>
          <MiniMonth sel={sel} onDay={setSel} marks={(d) => list.filter((x) => x.date === d).map((x) => ({ color: x.modality === 'pilates' ? '#9C7FE0' : x.modality === 'beach' ? '#F4B27D' : '#9FC46A', label: `${SPORT_LABEL[x.modality]} ${x.minutes} min` }))} />
          <span className="yl-k">Por mês</span>
          <Bars items={months.map((m) => ({ label: m.slice(5), value: list.filter((x) => x.date.startsWith(m)).length }))} color={isPilates ? '#9C7FE0' : '#9FC46A'} />
        </div>
        <History items={(sel ? list.filter((x) => x.date === sel) : list).map((x) => ({ id: x.id, date: x.date, text: `${SPORT_LABEL[x.modality]} · ${x.minutes} min`, sub: x.notes }))} onDel={yl.del} />
      </div>
    </div>
  );
}
