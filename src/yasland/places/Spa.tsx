// Spa: penteadeira (skincare manhã/noite), lavatório (cabelo e cronograma),
// sala de descanso (sono), mural de hábitos e um diário do corpo discreto.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlaceProps } from '../Yasland';
import { art, ImgScene, Place, PanelHead, Tiles, F, DateIn, Bars, MiniMonth, fmtDate, lastDays, num, over, weekStartOf } from '../ui';
import { useYl, ylId, nowIso } from '../store';
import { HAIR_LABEL, type HairType, type YlHabit } from '../types';
import { ConfirmButton } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { addDays, DIAS_CURTOS, fromKey, today } from '../../logic/dates';
import { play } from '../../logic/sound';
import { burst } from '../../logic/fx';

type Spot = 'penteadeira' | 'lavatorio' | 'descanso' | 'habitos' | 'corpo';

export function Spa({ onBack }: PlaceProps) {
  const yl = useYl();
  const [spot, setSpot] = useState<Spot | null>(null);
  const pick = (id: string) => setSpot((s) => (s === id ? null : (id as Spot)));
  const W = 904;
  const H = 629;
  const habits = yl.of('habit').filter((h) => !h.archived);
  const doneToday = new Set(yl.of('hcheck').filter((c) => c.date === today()).map((c) => c.habitId)).size;
  const skinToday = yl.of('skin').filter((x) => x.date === today()).reduce((n, x) => n + x.done.length, 0);
  const scene = (
    <ImgScene
      img="s-spa" w={W} h={H} on={spot} onPick={pick}
      areas={[
        { id: 'penteadeira', label: 'Penteadeira: skincare', box: [28, 140, 222, 380] },
        { id: 'lavatorio', label: 'Lavatório: cabelo', box: [262, 200, 205, 215] },
        { id: 'descanso', label: 'Sala de descanso: sono', box: [470, 240, 270, 185] },
        { id: 'habitos', label: 'Mural de hábitos', box: [732, 95, 165, 210] },
        { id: 'corpo', label: 'Diário do corpo', box: [400, 470, 150, 95] },
      ]}
    >
      {habits.length > 0 && <span className="yl-pin" style={over(W, H, 760, 300)}>✅ {doneToday}/{habits.length} hoje</span>}
      {skinToday > 0 && <span className="yl-pin" style={over(W, H, 70, 520)}>✨ {skinToday} passos hoje</span>}
    </ImgScene>
  );
  const tiles = (
    <Tiles
      on={spot}
      onPick={pick}
      items={[
        { id: 'penteadeira', label: 'Penteadeira', icon: 'i-penteadeira' },
        { id: 'lavatorio', label: 'Lavatório', icon: 'i-lavatorio' },
        { id: 'descanso', label: 'Descanso', icon: 'i-descanso' },
        { id: 'habitos', label: 'Hábitos', icon: 'i-habitos', badge: habits.length ? `${doneToday}/${habits.length}` : null },
        { id: 'corpo', label: 'Diário', icon: 'i-diario' },
      ]}
    />
  );
  const close = () => setSpot(null);
  const panel =
    spot === 'penteadeira' ? <Skincare onClose={close} />
    : spot === 'lavatorio' ? <Hair onClose={close} />
    : spot === 'descanso' ? <Sleep onClose={close} />
    : spot === 'habitos' ? <Habits onClose={close} />
    : spot === 'corpo' ? <Body onClose={close} />
    : null;
  return <Place title="Spa" emoji="🧖🏻‍♀️" onBack={onBack} scene={scene} tiles={tiles} spot={spot} panel={panel} hint="Autocuidado, bem-estar e rotina em um só lugar. 🪷" />;
}

// ── Penteadeira ───────────────────────────────────────────────

function Skincare({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [date, setDate] = useState(today());
  const [editing, setEditing] = useState(false);
  const logs = yl.of('skin');
  const steps = yl.cfg.skinSteps;
  const toggle = (period: 'manha' | 'noite', step: string, e: React.MouseEvent) => {
    const cur = logs.find((s) => s.date === date && s.period === period);
    const done = cur?.done ?? [];
    const next = done.includes(step) ? done.filter((x) => x !== step) : [...done, step];
    yl.save({ id: cur?.id ?? ylId('skin'), kind: 'skin', createdAt: cur?.createdAt ?? nowIso(), date, period, done: next });
    if (!done.includes(step)) {
      play('pop');
      if (next.length === steps[period].length) burst(e, 'brilho', 12);
    } else play('uncheck');
  };
  const days = lastDays(14);
  return (
    <div>
      <PanelHead title="🪞 Penteadeira" sub="Toque em cada passo da rotina. Os frasquinhos se enchem." onClose={onClose}>
        <DateIn id="sk-d" value={date} onChange={setDate} />
        <button className="btn btn-quiet btn-sm" onClick={() => setEditing(!editing)}><Icon name="edit" size={13} /> Rotinas</button>
      </PanelHead>
      {editing && (
        <div className="yl-form">
          {(['manha', 'noite'] as const).map((p) => (
            <F key={p} label={`Passos da ${p === 'manha' ? 'manhã' : 'noite'} (um por linha)`} grow>
              <textarea id={`sk-${p}`} rows={4} defaultValue={steps[p].join('\n')} onBlur={(e) => yl.setCfg({ skinSteps: { ...steps, [p]: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } })} />
            </F>
          ))}
        </div>
      )}
      <div className="yl-illu-row">
      <img className="yl-illu" src={art('c-penteadeira')} alt="" />
      <div className="yl-routines">
        {(['manha', 'noite'] as const).map((p) => {
          const done = logs.find((s) => s.date === date && s.period === p)?.done ?? [];
          return (
            <div key={p} className={`yl-routine r-${p}`}>
              <strong>{p === 'manha' ? '☀️ Manhã' : '🌙 Noite'} <small className="muted">{done.length}/{steps[p].length}</small></strong>
              <div className="yl-bottles">
                {steps[p].map((s, i) => {
                  const on = done.includes(s);
                  return (
                    <motion.button key={s} className={`yl-bottle ${on ? 'is-on' : ''}`} onClick={(e) => toggle(p, s, e)} whileHover={{ y: -4, rotate: -3 }} whileTap={{ scale: 0.9 }}>
                      <svg viewBox="0 0 40 60" aria-hidden="true">
                        <rect x="14" y="2" width="12" height="10" rx="2" fill={['#F38CB8', '#9C7FE0', '#9FC46A', '#F4C430', '#6FB0F2'][i % 5]} />
                        <rect x="6" y="12" width="28" height="44" rx="8" fill="#fff" stroke="#E2D4EE" strokeWidth="2" />
                        <motion.rect x="8" width="24" rx="6" fill={['#F8C9F1', '#E9D8FF', '#E6F3A6', '#FFF3B0', '#CFE4FF'][i % 5]} animate={{ y: on ? 16 : 54, height: on ? 38 : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} />
                      </svg>
                      <span>{s}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      <span className="yl-k">Últimos 14 dias</span>
      <div className="yl-dots">
        {days.map((d) => {
          const m = logs.find((s) => s.date === d && s.period === 'manha')?.done.length ?? 0;
          const n = logs.find((s) => s.date === d && s.period === 'noite')?.done.length ?? 0;
          return (
            <span key={d} className="yl-dot2" title={`${fmtDate(d)}: manhã ${m}/${steps.manha.length}, noite ${n}/${steps.noite.length}`}>
              <i style={{ opacity: m ? 0.3 + 0.7 * (m / Math.max(1, steps.manha.length)) : 0.12, background: '#F4C430' }} />
              <i style={{ opacity: n ? 0.3 + 0.7 * (n / Math.max(1, steps.noite.length)) : 0.12, background: '#9C7FE0' }} />
              <small>{fromKey(d).getDate()}</small>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Lavatório ─────────────────────────────────────────────────

const HAIR_COLOR: Record<HairType, string> = { lavagem: '#6FB0F2', hidratacao: '#9FC46A', nutricao: '#F4C430', reconstrucao: '#E46AA5' };

function Hair({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const [date, setDate] = useState(today());
  const [editing, setEditing] = useState(false);
  const logs = [...yl.of('hair')].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const plan = yl.cfg.hairPlan.length ? yl.cfg.hairPlan : (['hidratacao'] as HairType[]);
  // próximo do cronograma: depois do último tratamento feito
  const treatments = logs.filter((h) => h.type !== 'lavagem');
  const done = treatments.length;
  const next = plan[done % plan.length];
  const lastWash = logs[0];
  const add = (type: HairType) => {
    yl.save({ id: ylId('hair'), kind: 'hair', createdAt: nowIso(), date, type });
    play('pop');
  };
  return (
    <div>
      <PanelHead title="🚿 Lavatório" sub={lastWash ? `Última vez: ${fmtDate(lastWash.date)} (${HAIR_LABEL[lastWash.type]})` : 'Registre as lavagens e o cronograma capilar.'} onClose={onClose}>
        <DateIn id="hr-d" value={date} onChange={setDate} />
        <button className="btn btn-quiet btn-sm" onClick={() => setEditing(!editing)}><Icon name="edit" size={13} /> Cronograma</button>
      </PanelHead>
      {editing && (
        <div className="yl-plan-edit">
          <span className="muted small">Ordem do cronograma (toque para trocar; + para adicionar):</span>
          <div className="btn-row wrap">
            {plan.map((p, i) => (
              <button key={i} className="chip-mini is-on" style={{ background: HAIR_COLOR[p] }} onClick={() => { const order: HairType[] = ['hidratacao', 'nutricao', 'reconstrucao']; const n = [...plan]; n[i] = order[(order.indexOf(p) + 1) % 3]; yl.setCfg({ hairPlan: n }); }}>{i + 1}. {HAIR_LABEL[p]}</button>
            ))}
            <button className="chip-mini" onClick={() => yl.setCfg({ hairPlan: [...plan, 'hidratacao'] })}>+</button>
            {plan.length > 1 && <button className="chip-mini" onClick={() => yl.setCfg({ hairPlan: plan.slice(0, -1) })}>−</button>}
          </div>
        </div>
      )}
      <div className="yl-hair-plan">
        {plan.map((p, i) => <span key={i} className={`yl-hp ${i === done % plan.length ? 'is-next' : i < done % plan.length ? 'is-done' : ''}`} style={{ ['--c' as string]: HAIR_COLOR[p] }}>{HAIR_LABEL[p]}</span>)}
      </div>
      <div className="btn-row wrap">
        <button className="btn btn-secondary btn-sm" onClick={() => add('lavagem')}>🫧 Só lavei</button>
        <button className="btn btn-primary btn-sm" onClick={() => add(next)}>💆🏻‍♀️ Lavei + {HAIR_LABEL[next].toLowerCase()} (próximo)</button>
        {(['hidratacao', 'nutricao', 'reconstrucao'] as HairType[]).filter((x) => x !== next).map((x) => <button key={x} className="btn btn-quiet btn-sm" onClick={() => add(x)}>{HAIR_LABEL[x]}</button>)}
      </div>
      <div className="yl-two">
        <MiniMonth marks={(d) => logs.filter((h) => h.date === d).map((h) => ({ color: HAIR_COLOR[h.type], label: HAIR_LABEL[h.type] }))} />
        <ul className="yl-hlist">
          {logs.slice(0, 10).map((h) => (
            <li key={h.id}>
              <span className="yl-hdate">{fmtDate(h.date)}</span>
              <span><i className="yl-sw" style={{ background: HAIR_COLOR[h.type] }} /> {HAIR_LABEL[h.type]}</span>
              <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={13} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => yl.del(h.id)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Sala de descanso ──────────────────────────────────────────

function Sleep({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const logs = [...yl.of('sleep')].sort((a, b) => b.date.localeCompare(a.date));
  const [f, setF] = useState({ date: today(), hours: '7.5', quality: 3, notes: '' });
  const week = lastDays(7).map((d) => ({ label: fmtDate(d).split(' ')[0], value: logs.find((s) => s.date === d)?.hours ?? 0 }));
  const avg = logs.slice(0, 7).reduce((a, s) => a + s.hours, 0) / Math.max(1, logs.slice(0, 7).length);
  return (
    <div>
      <PanelHead title="🌙 Descanso" sub={logs.length ? `Média das últimas noites: ${avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h` : 'Registre como dormiu (a data é a da manhã em que acordou).'} onClose={onClose} />
      <img className="yl-banner" src={art('c-descanso')} alt="" />
      <form
        className="yl-form"
        onSubmit={(e) => {
          e.preventDefault();
          const h = num(f.hours);
          if (h == null) return;
          const cur = logs.find((s) => s.date === f.date);
          yl.save({ id: cur?.id ?? ylId('sleep'), kind: 'sleep', createdAt: cur?.createdAt ?? nowIso(), date: f.date, hours: h, quality: f.quality, notes: f.notes.trim() || undefined });
          play('check');
        }}
      >
        <F label="Acordei em"><DateIn id="sl-d" value={f.date} onChange={(d) => setF({ ...f, date: d })} /></F>
        <F label="Horas dormidas"><input id="sl-h" inputMode="decimal" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></F>
        <div className="yl-moons" role="radiogroup" aria-label="Qualidade do sono">
          {[1, 2, 3, 4, 5].map((q) => <button type="button" key={q} role="radio" aria-checked={f.quality === q} className={q <= f.quality ? 'is-on' : ''} onClick={() => setF({ ...f, quality: q })}>🌙</button>)}
        </div>
        <F label="Notas (pausas, cochilo…)" grow><input id="sl-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></F>
        <button className="btn btn-primary btn-sm" type="submit">Registrar noite</button>
      </form>
      <div className="yl-two">
        <div><span className="yl-k">Últimos 7 dias (h)</span><Bars items={week} color="#9C7FE0" fmt={(v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} /></div>
        <ul className="yl-hlist">
          {logs.slice(0, 10).map((s) => (
            <li key={s.id}>
              <span className="yl-hdate">{fmtDate(s.date)}</span>
              <span><strong>{s.hours} h</strong> <span className="muted small">{'🌙'.repeat(s.quality)}{s.notes ? ` · ${s.notes}` : ''}</span></span>
              <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={13} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => yl.del(s.id)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Mural de hábitos ──────────────────────────────────────────

const HABIT_COLORS = ['#9FC46A', '#F38CB8', '#9C7FE0', '#6FB0F2', '#F4C430', '#F08C5A'];

export function Habits({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const habits = yl.of('habit').filter((h) => !h.archived).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const checks = yl.of('hcheck');
  const [view, setView] = useState<'semana' | 'mes'>('semana');
  const [edit, setEdit] = useState<YlHabit | 'new' | null>(null);
  const [f, setF] = useState({ name: '', emoji: '✨', perWeek: '5', color: HABIT_COLORS[0] });
  const has = (hid: string, d: string) => checks.find((c) => c.habitId === hid && c.date === d);
  const toggle = (h: YlHabit, d: string, e: React.MouseEvent) => {
    const c = has(h.id, d);
    if (c) {
      yl.del(c.id);
      play('uncheck');
    } else {
      yl.save({ id: ylId('hcheck'), kind: 'hcheck', createdAt: nowIso(), habitId: h.id, date: d });
      play('pop');
      burst(e, 'brilho', 5);
    }
  };
  const ws = weekStartOf(today());
  const week = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const monthDays = (() => {
    const t = fromKey(today());
    const n = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => addDays(today(), i + 1 - t.getDate()));
  })();
  const openEdit = (h: YlHabit | 'new') => {
    setEdit(h);
    setF(h === 'new' ? { name: '', emoji: '✨', perWeek: '5', color: HABIT_COLORS[habits.length % HABIT_COLORS.length] } : { name: h.name, emoji: h.emoji, perWeek: String(h.perWeek), color: h.color });
  };
  return (
    <div>
      <PanelHead title="📌 Mural de hábitos" sub="Não precisa fazer tudo todo dia: cada hábito tem a sua meta da semana." onClose={onClose}>
        <div className="seg">
          <button className={view === 'semana' ? 'is-on' : ''} onClick={() => setView('semana')}>Semana</button>
          <button className={view === 'mes' ? 'is-on' : ''} onClick={() => setView('mes')}>Mês</button>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => openEdit('new')}><Icon name="plus" size={14} /> Hábito</button>
      </PanelHead>
      {edit && (
        <form
          className="yl-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name.trim()) return;
            const base = edit === 'new' ? null : edit;
            yl.save({ id: base?.id ?? ylId('habit'), kind: 'habit', createdAt: base?.createdAt ?? nowIso(), name: f.name.trim(), emoji: f.emoji || '✨', color: f.color, perWeek: Math.max(1, Math.min(7, num(f.perWeek) ?? 5)) });
            setEdit(null);
            play('check');
          }}
        >
          <F label="Emoji"><input id="hb-e" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} style={{ width: 60 }} /></F>
          <F label="Hábito" grow><input id="hb-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex.: ler 10 páginas" autoFocus /></F>
          <F label="Vezes por semana"><input id="hb-w" inputMode="numeric" value={f.perWeek} onChange={(e) => setF({ ...f, perWeek: e.target.value })} /></F>
          <div className="yl-colors">{HABIT_COLORS.map((c) => <button type="button" key={c} className={`yl-color ${f.color === c ? 'is-on' : ''}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={`Cor ${c}`} />)}</div>
          <div className="btn-row">
            {edit !== 'new' && <button type="button" className="btn btn-quiet btn-sm" onClick={() => { yl.save({ ...edit, archived: true }); setEdit(null); }}>Arquivar</button>}
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEdit(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" type="submit">Salvar</button>
          </div>
        </form>
      )}
      {!habits.length && !edit && <p className="muted">Nenhum hábito ainda. Crie um e marque os dias em que fez.</p>}
      <div className={`yl-habits v-${view}`}>
        {view === 'semana' && habits.length > 0 && (
          <div className="yl-hrow yl-hrow-head"><span /> {week.map((d) => <span key={d} className={d === today() ? 'is-today' : ''}>{DIAS_CURTOS[fromKey(d).getDay()].slice(0, 3)}</span>)}<span>semana</span></div>
        )}
        {habits.map((h) => {
          const days = view === 'semana' ? week : monthDays;
          const n = week.filter((d) => has(h.id, d)).length;
          return (
            <div key={h.id} className="yl-hrow" style={{ ['--c' as string]: h.color }}>
              <button className="yl-hname" onClick={() => openEdit(h)} title="Editar">{h.emoji} {h.name}</button>
              {days.map((d) => {
                const on = !!has(h.id, d);
                return (
                  <motion.button key={d} className={`yl-hc ${on ? 'is-on' : ''} ${d === today() ? 'is-today' : ''}`} disabled={d > today()} onClick={(e) => toggle(h, d, e)} whileTap={{ scale: 0.8 }} aria-label={`${h.name} em ${fmtDate(d)}${on ? ' (feito)' : ''}`} title={fmtDate(d)}>
                    <motion.i initial={false} animate={{ scale: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} />
                  </motion.button>
                );
              })}
              {view === 'semana' && <span className={`yl-hgoal ${n >= h.perWeek ? 'is-ok' : ''}`}>{n}/{h.perWeek}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Diário do corpo ───────────────────────────────────────────

const BRISTOL = ['1 · bolinhas duras', '2 · salsicha grumosa', '3 · salsicha com rachaduras', '4 · salsicha lisa', '5 · pedaços macios', '6 · pastoso', '7 · líquido'];

function Body({ onClose }: { onClose: () => void }) {
  const yl = useYl();
  const logs = [...yl.of('gut')].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  const [f, setF] = useState({ date: today(), bristol: null as number | null, symptoms: '', notes: '' });
  const [more, setMore] = useState(false);
  const week = lastDays(7).map((d) => ({ label: fmtDate(d).split(' ')[0], value: logs.filter((g) => g.date === d).length }));
  const month = today().slice(0, 7);
  return (
    <div className="yl-quiet">
      <PanelHead title="📓 Diário do corpo" sub="Só para você acompanhar. Sem metas nem pontos." onClose={onClose} />
      <form
        className="yl-form"
        onSubmit={(e) => {
          e.preventDefault();
          yl.save({ id: ylId('gut'), kind: 'gut', createdAt: nowIso(), date: f.date, at: nowIso(), bristol: f.bristol, symptoms: f.symptoms.trim() || undefined, notes: f.notes.trim() || undefined });
          setF({ ...f, bristol: null, symptoms: '', notes: '' });
          setMore(false);
          play('check');
        }}
      >
        <F label="Data"><DateIn id="gt-d" value={f.date} onChange={(d) => setF({ ...f, date: d })} /></F>
        <button type="submit" className="btn btn-secondary btn-sm">+ Registrar</button>
        <button type="button" className="link small" onClick={() => setMore(!more)}>{more ? 'menos detalhes' : 'detalhes (opcional)'}</button>
        {more && (
          <>
            <F label="Escala de Bristol (opcional)" grow>
              <select id="gt-b" value={f.bristol ?? ''} onChange={(e) => setF({ ...f, bristol: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {BRISTOL.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
              </select>
            </F>
            <F label="Sintomas" grow><input id="gt-s" value={f.symptoms} onChange={(e) => setF({ ...f, symptoms: e.target.value })} placeholder="ex.: inchaço" /></F>
            <F label="Observações" grow><input id="gt-o" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></F>
          </>
        )}
      </form>
      <div className="yl-two">
        <div>
          <MiniMonth marks={(d) => { const n = logs.filter((g) => g.date === d).length; return n ? Array.from({ length: Math.min(4, n) }, () => ({ color: '#AFC47E', label: `${n} registro${n > 1 ? 's' : ''}` })) : []; }} />
          <span className="muted small">Neste mês: {logs.filter((g) => g.date.startsWith(month)).length} registros em {new Set(logs.filter((g) => g.date.startsWith(month)).map((g) => g.date)).size} dias.</span>
        </div>
        <div>
          <span className="yl-k">Últimos 7 dias</span>
          <Bars items={week} color="#AFC47E" />
          <ul className="yl-hlist">
            {logs.slice(0, 8).map((g) => (
              <li key={g.id}>
                <span className="yl-hdate">{fmtDate(g.date)}</span>
                <span className="small">{g.bristol ? `Bristol ${g.bristol}` : 'registro'}{g.symptoms ? ` · ${g.symptoms}` : ''}{g.notes ? ` · ${g.notes}` : ''}</span>
                <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={13} />} question="Apagar?" confirmLabel="Apagar" onConfirm={() => yl.del(g.id)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
