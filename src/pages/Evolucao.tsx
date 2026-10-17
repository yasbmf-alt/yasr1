import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { Icon } from '../components/Icon';
import { Asset } from '../assets/registry';
import { SPECIES_BY_AREA } from '../assets/art';
import { Garden } from './Garden';
import { Registros } from './Registros';
import { activityLabel, areaOf } from '../types';
import { dayVolumes, dominantArea, intensity, weeklyMinutes } from '../logic/progress';
import { DIAS_CURTOS, fmtMinutes, fmtShort, fromKey, MESES_LONGOS, pad, toKey, today } from '../logic/dates';

export function Evolucao() {
  const [day, setDay] = useState<string>(today());
  const [tab, setTab] = useState<'calendario' | 'registros'>(() => {
    try {
      return (localStorage.getItem('yasr1-jardim-tab') as 'calendario' | 'registros') || 'calendario';
    } catch {
      return 'calendario';
    }
  });
  const pickTab = (t: 'calendario' | 'registros') => {
    setTab(t);
    try {
      localStorage.setItem('yasr1-jardim-tab', t);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="page page-jardim">
      <header className="page-head">
        <h1 className="h1">Jardim</h1>
      </header>
      <Garden />
      <div className="seg seg-tabs" role="tablist" aria-label="Detalhes">
        <button role="tab" aria-selected={tab === 'calendario'} className={tab === 'calendario' ? 'is-on' : ''} onClick={() => pickTab('calendario')}>Calendário</button>
        <button role="tab" aria-selected={tab === 'registros'} className={tab === 'registros' ? 'is-on' : ''} onClick={() => pickTab('registros')}>Registros</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {tab === 'calendario' ? (
            <div className="evo-grid">
              <CalendarCard selected={day} onSelect={setDay} />
              <div className="evo-side">
                <DayDetail day={day} />
                <WeeklyHours />
              </div>
            </div>
          ) : (
            <Registros />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Calendário: intensidade ou jardim ─────────────────────────

function CalendarCard({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { data, saveSettings } = useStore();
  const [cursor, setCursor] = useState(() => today().slice(0, 7));
  const view = data.settings.gardenView === 'calendario' ? 'jardim' : 'intensidade';
  const [mode, setMode] = useState<'intensidade' | 'jardim'>(view);
  const vols = useMemo(() => dayVolumes(data.sessions, data.topics), [data.sessions, data.topics]);
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const t = today();
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setCursor(toKey(d).slice(0, 7));
  };
  const studied = cells.filter((k) => k && vols.get(k)).length;

  return (
    <section className="card cal-card">
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronL" /></button>
          <h2 className="h2 cal-month">{MESES_LONGOS[m - 1]} <span className="muted">{y}</span></h2>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevronR" /></button>
        </div>
        <div className="seg" role="tablist" aria-label="Visualização">
          {(['intensidade', 'jardim'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={mode === v}
              className={mode === v ? 'is-on' : ''}
              onClick={() => {
                setMode(v);
                saveSettings({ gardenView: v === 'jardim' ? 'calendario' : 'canteiros' });
              }}
            >
              {v === 'intensidade' ? 'Intensidade' : 'Jardim'}
            </button>
          ))}
        </div>
      </div>
      <div className="cal-grid" role="grid">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => (
          <span key={d} className="cal-dow">{d}</span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={`e${i}`} className="cal-cell is-empty" />;
          const v = vols.get(k);
          const lvl = intensity(v);
          const species = SPECIES_BY_AREA[dominantArea(v)];
          return (
            <motion.button
              key={k}
              className={`cal-cell lvl-${lvl} ${mode === 'jardim' ? 'is-garden' : ''} ${k === t ? 'is-today' : ''} ${k === selected ? 'is-sel' : ''} ${k > t ? 'is-future' : ''}`}
              onClick={() => onSelect(k)}
              whileHover={{ y: -2 }}
              aria-label={`${fromKey(k).getDate()} de ${MESES_LONGOS[m - 1]}: ${v ? `${v.sessions} sessões, ${fmtMinutes(v.minutes || null)}` : 'sem estudo'}`}
            >
              <span className="cal-n">{fromKey(k).getDate()}</span>
              <AnimatePresence mode="wait">
                {mode === 'jardim' && (
                  <motion.span
                    key={`${k}-${lvl}`}
                    className="cal-plant"
                    initial={{ scale: 0, y: 6 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ delay: (i % 7) * 0.02 + Math.floor(i / 7) * 0.03, type: 'spring', stiffness: 300, damping: 16 }}
                  >
                    {lvl > 0 ? <Asset slot={`garden.plant.${species}.${lvl}`} /> : <span className="cal-soil" />}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
      <div className="cal-foot">
        <span className="muted">{studied} {studied === 1 ? 'dia' : 'dias'} com estudo neste mês</span>
        <span className="cal-legend" aria-hidden="true">
          menos
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`cal-sw lvl-${l}`} />)}
          mais
        </span>
      </div>
    </section>
  );
}

function DayDetail({ day }: { day: string }) {
  const { data } = useStore();
  const ui = useUI();
  const list = data.sessions.filter((s) => s.date === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const total = list.reduce((a, s) => a + (s.minutes ?? 0), 0);
  const d = fromKey(day);
  return (
    <section className="card day-card">
      <h3 className="card-title">{DIAS_CURTOS[d.getDay()]}, {d.getDate()} de {MESES_LONGOS[d.getMonth()]}</h3>
      {list.length === 0 ? (
        <p className="muted">Nenhum registro neste dia.</p>
      ) : (
        <>
          <p className="muted">{list.length} sessão(ões) · {fmtMinutes(total || null)}</p>
          <ul className="day-list">
            {list.map((s) => {
              const tp = data.topics.find((x) => x.id === s.topicId);
              return (
                <li key={s.id}>
                  <button onClick={() => tp && ui.openTopic(tp.id)}>
                    <span className="review-dot" style={{ background: areaOf(tp?.area ?? 'geral').color }} />
                    <span className="day-name">{tp?.name ?? (s.topicId ? 'Tema removido' : 'Estudo livre')}</span>
                    <span className="muted">{activityLabel(s.type)}{s.minutes ? ` · ${fmtMinutes(s.minutes)}` : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function WeeklyHours() {
  const { data } = useStore();
  const weeks = weeklyMinutes(data.sessions, 8);
  const max = Math.max(60, ...weeks.map((w) => w.minutes));
  const niceMax = Math.ceil(max / 60) * 60;
  const H = 120;
  return (
    <section className="card">
      <h3 className="card-title">Horas por semana</h3>
      <svg viewBox={`0 0 320 ${H + 34}`} className="bars" role="img" aria-label="Horas estudadas nas últimas 8 semanas">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1="34" x2="316" y1={10 + H * (1 - f)} y2={10 + H * (1 - f)} stroke="var(--line)" />
            <text x="28" y={14 + H * (1 - f)} textAnchor="end" className="bars-axis">{Math.round((niceMax * f) / 60)}h</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const h = (w.minutes / niceMax) * H;
          const x = 42 + i * 34;
          const last = i === weeks.length - 1;
          return (
            <g key={w.week}>
              <motion.rect
                x={x}
                width="22"
                rx="6"
                fill={last ? 'var(--rosa-medio)' : 'var(--rosa)'}
                initial={{ y: 10 + H, height: 0 }}
                animate={{ y: 10 + H - h, height: h }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 160, damping: 20 }}
              />
              {w.minutes > 0 && (
                <text x={x + 11} y={4 + H - h} textAnchor="middle" className="bars-val">{(w.minutes / 60).toFixed(1).replace('.', ',')}</text>
              )}
              <text x={x + 11} y={H + 28} textAnchor="middle" className="bars-axis">{fmtShort(w.week)}</text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

