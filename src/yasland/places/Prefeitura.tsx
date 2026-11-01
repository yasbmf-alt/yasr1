// Prefeitura: central da Yasland. Calendário geral, relatórios da semana e do
// mês (treinos, água, hábitos, gastos, desperdício, sono) e o Museu das conquistas.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { art, Place, PanelHead, Bars, MiniMonth, Ring, HBars, brl, fmtDate, lastDays, weekStartOf } from '../ui';
import { gauges } from '../logic';
import { useYl } from '../store';
import { BADGES, earned, SPECIES } from '../logic';
import { SPORT_LABEL, HAIR_LABEL, type YlDoc } from '../types';
import { addDays, today } from '../../logic/dates';

type Spot = 'metricas' | 'calendario' | 'relatorios' | 'museu';

export function Prefeitura({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const got = earned(yl.of, yl.cfg.waterGoal);
  const scene = (
    <div className="yl-hero">
      <motion.img className="yl-hero-img" src={art('b-prefeitura')} alt="" initial={{ scale: 0.92, rotate: -1 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} />
      <nav className="yl-menu" aria-label="Prefeitura">
        {([
          ['metricas', '📊', 'Métricas gerais', 'como está a sua rotina'],
          ['calendario', '📅', 'Calendário', 'tudo o que você registrou'],
          ['relatorios', '🧾', 'Relatórios', 'semana e mês'],
          ['museu', '🏛️', 'Museu da Yasland', `${got.size} de ${BADGES.length} conquistas`],
        ] as const).map(([id, e, t, sub], i) => (
          <motion.button key={id} className={`yl-menu-b ${spot === id ? 'is-on' : ''}`} onClick={() => pick(id)} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <span>{e}</span>
            <span>{t}<small>{sub}</small></span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
  const close = () => setSpot(null);
  const panel = spot === 'metricas' ? <Metrics onClose={close} /> : spot === 'calendario' ? <Calendar onClose={close} /> : spot === 'relatorios' ? <Reports onClose={close} /> : spot === 'museu' ? <Museum got={got} onClose={close} /> : null;
  return <Place title="Prefeitura" emoji="🏛️" onBack={onBack} scene={scene} spot={spot} panel={panel} />;
}

// ── Calendário geral ──────────────────────────────────────────

const KIND_INFO: Partial<Record<YlDoc['kind'], { color: string; label: string }>> = {
  cardio: { color: '#F08C5A', label: 'Cardio' }, lift: { color: '#E46AA5', label: 'Musculação' }, sport: { color: '#9FC46A', label: 'Esporte' },
  skin: { color: '#F4C430', label: 'Skincare' }, hair: { color: '#6FB0F2', label: 'Cabelo' }, sleep: { color: '#9C7FE0', label: 'Sono' },
  hcheck: { color: '#5FA36A', label: 'Hábito' }, purchase: { color: '#B98B64', label: 'Compra' }, chore: { color: '#9FB4CF', label: 'Casa' },
};

function describe(d: YlDoc): string {
  switch (d.kind) {
    case 'cardio': return `${d.modality} · ${d.minutes} min`;
    case 'lift': return `${d.sheetName} · ${d.minutes} min`;
    case 'sport': return `${SPORT_LABEL[d.modality]} · ${d.minutes} min`;
    case 'skin': return `Skincare ${d.period === 'manha' ? 'manhã' : 'noite'} (${d.done.length} passos)`;
    case 'hair': return HAIR_LABEL[d.type];
    case 'sleep': return `Sono: ${d.hours} h`;
    case 'purchase': return `Compra: ${brl(d.total)}`;
    case 'chore': return d.task;
    default: return '';
  }
}

function Calendar({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [sel, setSel] = useState<string | null>(today());
  const dated = yl.all.filter((d) => KIND_INFO[d.kind] && 'date' in d) as (YlDoc & { date: string })[];
  const habits = new Map(yl.of('habit').map((h) => [h.id, h]));
  const water = new Map<string, number>();
  for (const w of yl.of('water')) water.set(w.date, (water.get(w.date) ?? 0) + w.ml);
  const marks = (d: string) => {
    const kinds = [...new Set(dated.filter((x) => x.date === d).map((x) => x.kind))];
    const out = kinds.map((k) => ({ color: KIND_INFO[k]!.color, label: KIND_INFO[k]!.label }));
    if ((water.get(d) ?? 0) >= yl.cfg.waterGoal) out.unshift({ color: '#4F94E8', label: 'Meta de água' });
    return out;
  };
  const day = sel ? dated.filter((x) => x.date === sel) : [];
  return (
    <div>
      <PanelHead title="📅 Calendário da Yasland" sub="Cada bolinha é um tipo de cuidado registrado no dia." onClose={onClose} />
      <div className="yl-two">
        <MiniMonth marks={marks} onDay={setSel} sel={sel} />
        <div>
          {sel && <strong>{fmtDate(sel)}</strong>}
          {sel && (water.get(sel) ?? 0) > 0 && <p className="small">💧 {((water.get(sel) ?? 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L de água</p>}
          {sel && !day.length && !(water.get(sel) ?? 0) && <p className="muted small">Nada registrado neste dia.</p>}
          <ul className="yl-hlist">
            {day.map((x) => (
              <li key={x.id}>
                <i className="yl-sw" style={{ background: KIND_INFO[x.kind]!.color }} />
                <span>{x.kind === 'hcheck' ? `${habits.get(x.habitId)?.emoji ?? '✅'} ${habits.get(x.habitId)?.name ?? 'Hábito'}` : describe(x)}</span>
              </li>
            ))}
          </ul>
          <div className="yl-legend">{Object.values(KIND_INFO).map((k) => <span key={k!.label}><i style={{ background: k!.color }} />{k!.label}</span>)}<span><i style={{ background: '#4F94E8' }} />Água na meta</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Relatórios ────────────────────────────────────────────────

function Reports({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [period, setPeriod] = useState<'semana' | 'mes'>('semana');
  const t = today();
  const from = period === 'semana' ? weekStartOf(t) : `${t.slice(0, 7)}-01`;
  const prevFrom = period === 'semana' ? addDays(from, -7) : (() => { const d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
  const inP = (d: string) => d >= from && d <= t;
  const inPrev = (d: string) => d >= prevFrom && d < from;
  const nDays = Math.round((new Date(t).getTime() - new Date(from).getTime()) / 86400000) + 1;

  const train = [...yl.of('cardio').map((x) => ({ date: x.date, min: x.minutes, k: 'Cardio' })), ...yl.of('lift').map((x) => ({ date: x.date, min: x.minutes, k: 'Musculação' })), ...yl.of('sport').map((x) => ({ date: x.date, min: x.minutes, k: SPORT_LABEL[x.modality] }))];
  const tNow = train.filter((x) => inP(x.date));
  const tPrev = train.filter((x) => inPrev(x.date));
  const byKind = new Map<string, number>();
  for (const x of tNow) byKind.set(x.k, (byKind.get(x.k) ?? 0) + 1);

  const water = new Map<string, number>();
  for (const w of yl.of('water')) if (inP(w.date)) water.set(w.date, (water.get(w.date) ?? 0) + w.ml);
  const waterAvg = [...water.values()].reduce((a, b) => a + b, 0) / nDays;
  const waterGoalDays = [...water.values()].filter((v) => v >= yl.cfg.waterGoal).length;

  const habits = yl.of('habit').filter((h) => !h.archived);
  const checks = yl.of('hcheck').filter((c) => inP(c.date));
  const target = habits.reduce((a, h) => a + h.perWeek * (nDays / 7), 0);

  const purchases = yl.of('purchase').filter((p) => inP(p.date));
  const spent = purchases.reduce((a, p) => a + p.total, 0);
  const spentPrev = yl.of('purchase').filter((p) => inPrev(p.date)).reduce((a, p) => a + p.total, 0);
  const byCat = new Map<string, number>();
  for (const p of purchases) for (const it of p.items) byCat.set(it.category, (byCat.get(it.category) ?? 0) + (it.price ?? 0) * it.qty);
  const closed = yl.of('stock').filter((s) => s.closedAt && inP(s.closedAt.slice(0, 10)));
  const wasted = closed.filter((s) => s.status === 'descartado');
  const sleep = yl.of('sleep').filter((s) => inP(s.date));
  const made = yl.of('recipe').flatMap((r) => r.made).filter(inP).length;

  const delta = (a: number, b: number) => (b ? (a >= b ? `▲ ${a - b}` : `▼ ${b - a}`) : '');
  const weeks = Array.from({ length: 8 }, (_, i) => weekStartOf(addDays(t, -7 * (7 - i))));
  return (
    <div>
      <PanelHead title="📊 Relatórios" onClose={onClose}>
        <div className="seg">
          <button className={period === 'semana' ? 'is-on' : ''} onClick={() => setPeriod('semana')}>Esta semana</button>
          <button className={period === 'mes' ? 'is-on' : ''} onClick={() => setPeriod('mes')}>Este mês</button>
        </div>
      </PanelHead>
      <div className="yl-report">
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>🏋🏻‍♀️ Treinos</span><b>{tNow.length}</b><small>{tNow.reduce((a, x) => a + x.min, 0)} min · {delta(tNow.length, tPrev.length)} vs anterior</small><small className="muted">{[...byKind].map(([k, n]) => `${k} ${n}`).join(' · ') || '—'}</small></motion.div>
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>💧 Água</span><b>{(waterAvg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L</b><small>média por dia · meta em {waterGoalDays} de {nDays} dias</small></motion.div>
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>✅ Hábitos</span><b>{checks.length}</b><small>{target ? `${Math.round((checks.length / target) * 100)}% do planejado` : 'sem hábitos criados'}</small></motion.div>
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>🛒 Gastos</span><b>{brl(spent)}</b><small>{purchases.length} compras{spentPrev ? ` · antes: ${brl(spentPrev)}` : ''}</small><small className="muted">{[...byCat].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${brl(v)}`).join(' · ')}</small></motion.div>
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>♻️ Desperdício</span><b>{wasted.length}</b><small>descartados · {closed.length - wasted.length} consumidos</small><small className="muted">{wasted.slice(0, 3).map((s) => s.name).join(', ')}</small></motion.div>
        <motion.div className="yl-rep" whileHover={{ y: -3 }}><span>🌙 Sono</span><b>{sleep.length ? `${(sleep.reduce((a, s) => a + s.hours, 0) / sleep.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h` : '—'}</b><small>{sleep.length} noites registradas · {made} receita{made === 1 ? '' : 's'} feita{made === 1 ? '' : 's'}</small></motion.div>
      </div>
      <div className="yl-two">
        <div><span className="yl-k">Treinos por semana</span><Bars items={weeks.map((w) => ({ label: fmtDate(w).split(' ')[1] ?? w, value: train.filter((x) => x.date >= w && x.date < addDays(w, 7)).length }))} color="#E46AA5" /></div>
        <div><span className="yl-k">Gastos por semana</span><Bars items={weeks.map((w) => ({ label: fmtDate(w).split(' ')[1] ?? w, value: Math.round(yl.of('purchase').filter((p) => p.date >= w && p.date < addDays(w, 7)).reduce((a, p) => a + p.total, 0)) }))} color="#B98B64" fmt={(v) => `R$${v}`} /></div>
      </div>
    </div>
  );
}

// ── Museu ─────────────────────────────────────────────────────

function Museum({ got, onClose }: { got: Map<string, string>; onClose: () => void }) {
  const yl = useYl();
  const [sel, setSel] = useState<string | null>(null);
  const rooms = [...new Set(BADGES.map((b) => b.room))];
  const harvested = new Set(yl.of('plot').filter((p) => p.harvestedAt).map((p) => p.species));
  const b = BADGES.find((x) => x.id === sel);
  return (
    <div>
      <PanelHead title="🏆 Museu da Yasland" sub={`${got.size} de ${BADGES.length} peças no acervo. Os espaços vazios esperam por você.`} onClose={onClose} />
      {b && (
        <motion.div className={`yl-museum-sel ${got.has(b.id) ? 'is-got' : ''}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <span className="yl-badge-e">{got.has(b.id) ? b.emoji : '❔'}</span>
          <div>
            <strong>{b.name}</strong>
            <p className="small">{b.desc}</p>
            <span className="muted small">{got.has(b.id) ? `Conquistada ${fmtDate(got.get(b.id)!)}` : 'Ainda não conquistada'}</span>
          </div>
        </motion.div>
      )}
      {rooms.map((r) => (
        <div key={r} className="yl-vitrine">
          <span className="yl-vitrine-t">{r}</span>
          <div className="yl-vitrine-row">
            {BADGES.filter((x) => x.room === r).map((x, i) => {
              const on = got.has(x.id);
              return (
                <motion.button key={x.id} className={`yl-badge ${on ? 'is-got' : ''} ${sel === x.id ? 'is-sel' : ''}`} onClick={() => setSel(x.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -5, rotate: on ? -4 : 0 }}>
                  <span className="yl-badge-e">{on ? x.emoji : '?'}</span>
                  <strong>{x.name}</strong>
                  {!on && <small>{x.desc}</small>}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="yl-vitrine">
        <span className="yl-vitrine-t">Coleção da horta</span>
        <div className="yl-vitrine-row">
          {SPECIES.map((s) => <span key={s.id} className={`yl-badge is-mini ${harvested.has(s.id) ? 'is-got' : ''}`} title={harvested.has(s.id) ? s.name : '???'}><span className="yl-badge-e">{harvested.has(s.id) ? s.emoji : '?'}</span></span>)}
        </div>
      </div>
    </div>
  );
}

// ── Métricas gerais ───────────────────────────────────────────

/** um retrato da rotina dos últimos 7 dias: cada barra vai de 0 a 100% */
function Metrics({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const days = lastDays(7);
  const water = days.map((d) => yl.of('water').filter((w) => w.date === d).reduce((a, w) => a + w.ml, 0));
  const hidr = (water.reduce((a, v) => a + Math.min(1, v / yl.cfg.waterGoal), 0) / 7) * 100;
  const g = gauges(yl.of);
  const forca = g.find((x) => x.id === 'forca')!.value;
  const resist = Math.max(g.find((x) => x.id === 'cardio')!.value, g.find((x) => x.id === 'raquete')!.value);
  const habits = yl.of('habit').filter((h) => !h.archived);
  const target = habits.reduce((a, h) => a + h.perWeek, 0);
  const checks = yl.of('hcheck').filter((c) => days.includes(c.date)).length;
  const skinDays = new Set(yl.of('skin').filter((s) => days.includes(s.date) && s.done.length).map((s) => s.date)).size;
  const bem = ((target ? Math.min(1, checks / target) : 0) * 0.6 + (skinDays / 7) * 0.4) * 100;
  const sleep = yl.of('sleep').filter((s) => days.includes(s.date));
  const sono = sleep.length ? Math.min(1, sleep.reduce((a, s) => a + s.hours, 0) / sleep.length / 8) * 100 : 0;
  const items = [
    { label: 'Hidratação', emoji: '💧', value: hidr, color: '#6FB0F2', hint: 'dias com água na meta' },
    { label: 'Força', emoji: '💪', value: forca, color: '#E46AA5', hint: 'constância na musculação' },
    { label: 'Resistência', emoji: '❤️', value: resist, color: '#F08C5A', hint: 'cardio e raquete' },
    { label: 'Bem-estar', emoji: '🪷', value: bem, color: '#9C7FE0', hint: 'hábitos e skincare' },
    { label: 'Sono', emoji: '🌙', value: sono, color: '#7D97C9', hint: 'média de horas (8 h = 100%)' },
  ];
  const overall = items.reduce((a, x) => a + x.value, 0) / items.length;
  return (
    <div>
      <PanelHead title="📊 Métricas gerais" sub="Últimos 7 dias. Não é uma nota: é um retrato para você ver onde está fluindo." onClose={onClose} />
      <div className="yl-evo-top">
        <Ring value={overall} label="rotina da semana" emoji="✨" />
        <HBars items={items} />
      </div>
    </div>
  );
}
