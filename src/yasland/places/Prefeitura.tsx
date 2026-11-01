// Prefeitura: central da Yasland. Calendário geral, relatórios da semana e do
// mês (treinos, água, hábitos, gastos, desperdício, sono) e o Museu das conquistas.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { Hot, Place, PanelHead, Bars, MiniMonth, brl, fmtDate, weekStartOf } from '../ui';
import { useYl } from '../store';
import { BADGES, earned, SPECIES } from '../logic';
import { SPORT_LABEL, HAIR_LABEL, type YlDoc } from '../types';
import { addDays, today } from '../../logic/dates';

type Spot = 'calendario' | 'relatorios' | 'museu';

export function Prefeitura({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const got = earned(yl.of, yl.cfg.waterGoal);
  const scene = (
    <svg viewBox="0 0 1000 470" className="yl-room" role="img" aria-label="Prefeitura">
      <rect width="1000" height="340" fill="#F5F1FA" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={40 + i * 170} y="20" width="26" height="320" rx="10" fill="#fff" stroke="#E4DAF2" strokeWidth="3" />)}
      <rect y="340" width="1000" height="130" fill="#E4DAF2" />
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 100} y="340" width="50" height="130" fill="#DCD0EE" opacity=".6" />)}
      {/* quadro-calendário */}
      <Hot id="calendario" label="Calendário geral" on={spot === 'calendario'} onPick={pick}>
        <rect x="90" y="70" width="230" height="200" rx="12" fill="#fff" stroke="#C9B6EE" strokeWidth="4" />
        <rect x="90" y="70" width="230" height="40" rx="12" fill="#9C7FE0" />
        {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 7 }).map((_, c) => <rect key={`${r}${c}`} x={104 + c * 30} y={124 + r * 34} width="22" height="22" rx="5" fill={(r * 7 + c) % 4 === 0 ? '#9FC46A' : (r * 7 + c) % 5 === 0 ? '#6FB0F2' : '#F1EAFB'} />))}
      </Hot>
      {/* mesa de relatórios */}
      <Hot id="relatorios" label="Mesa de relatórios" on={spot === 'relatorios'} onPick={pick}>
        <rect x="390" y="230" width="240" height="20" rx="8" fill="#B98B64" />
        <rect x="405" y="250" width="16" height="90" fill="#9C6B45" /><rect x="600" y="250" width="16" height="90" fill="#9C6B45" />
        <rect x="430" y="150" width="160" height="82" rx="8" fill="#2E4A7F" />
        {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={448 + i * 28} y={220 - (i * 13 + 14) % 56} width="18" height={(i * 13 + 14) % 56} rx="3" fill={['#F38CB8', '#9FC46A', '#6FB0F2', '#F4C430', '#9C7FE0'][i]} />)}
        <rect x="500" y="232" width="20" height="10" fill="#2E4A7F" />
      </Hot>
      {/* porta do museu */}
      <Hot id="museu" label="Museu da Yasland" on={spot === 'museu'} onPick={pick}>
        <path d="M700 340 v-200 a100 100 0 0 1 200 0 v200z" fill="#5A3D99" />
        <path d="M720 340 v-190 a80 80 0 0 1 160 0 v190z" fill="#7D62C4" />
        <text x="800" y="210" textAnchor="middle" fontSize="40">🏆</text>
        <rect x="730" y="104" width="140" height="28" rx="14" fill="#F38CB8" />
        <text x="800" y="123" textAnchor="middle" className="yl-tag">MUSEU · {got.size}/{BADGES.length}</text>
      </Hot>
    </svg>
  );
  const close = () => setSpot(null);
  const panel = spot === 'calendario' ? <Calendar onClose={close} /> : spot === 'relatorios' ? <Reports onClose={close} /> : spot === 'museu' ? <Museum got={got} onClose={close} /> : null;
  return <Place title="Prefeitura" emoji="🏛️" onBack={onBack} scene={scene} spot={spot} panel={panel} hint="Calendário geral · Relatórios · Museu das conquistas." />;
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
