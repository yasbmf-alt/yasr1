// Modo prova: a semana/os dias de prova viram um jogo. Cada dia é uma fase,
// cada etapa (tema, flashcards, questões, simulado/prova, correção, pausa) é
// uma casinha do caminho, e a prova é o chefão no fim. Marcar etapas dá XP,
// combo do dia e uma "vibe" que vai esquentando (sem fogo: brilho, raio, arco-íris).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Field, Modal, ConfirmButton, useUI, type Page } from '../components/ui';
import { Icon } from '../components/Icon';
import { addDays, diffDays, fromKey, today, uid, DIAS_CURTOS } from '../logic/dates';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import type { ExamRun, ExamStep, ExamStepKind } from '../types';

export const STEP_KINDS: { id: ExamStepKind; label: string; emoji: string; xp: number; color: string; page?: Page }[] = [
  { id: 'tema', label: 'Tema', emoji: '📚', xp: 30, color: 'var(--azul-claro)' },
  { id: 'questoes', label: 'Questões', emoji: '✍️', xp: 30, color: 'var(--rosa)' },
  { id: 'flashcards', label: 'Flashcards', emoji: '🃏', xp: 20, color: 'var(--lilas)', page: 'flashcards' },
  { id: 'revisao', label: 'Revisão', emoji: '🔁', xp: 25, color: '#E3F0C8', page: 'revisoes' },
  { id: 'prova', label: 'Prova / simulado', emoji: '👑', xp: 100, color: 'var(--manteiga)', page: 'simulados' },
  { id: 'correcao', label: 'Correção', emoji: '🔍', xp: 40, color: 'var(--lilas)', page: 'simulados' },
  { id: 'pausa', label: 'Pausa', emoji: '🧃', xp: 5, color: '#FFE6D6' },
  { id: 'outro', label: 'Outro', emoji: '⭐', xp: 15, color: 'var(--surface-2)' },
];
const kindOf = (k: ExamStepKind) => STEP_KINDS.find((x) => x.id === k) ?? STEP_KINDS[STEP_KINDS.length - 1];

// a vibe esquenta com o combo do dia (etapas feitas hoje)
const HYPE = [
  { min: 0, name: 'Aquecendo', emoji: '🎧', line: 'bora começar, uma casinha de cada vez' },
  { min: 1, name: 'Embalada', emoji: '✨', line: 'primeira já foi, o resto vem!' },
  { min: 3, name: 'Elétrica', emoji: '⚡', line: 'combo ligado! ninguém te segura' },
  { min: 5, name: 'Imparável', emoji: '🌈', line: 'modo turbo ativado, que dia!' },
  { min: 7, name: 'LENDÁRIA', emoji: '👑', line: 'isso aqui já é lenda' },
];
const hypeOf = (n: number) => [...HYPE].reverse().find((h) => n >= h.min) ?? HYPE[0];
const hypeIdx = (n: number) => HYPE.indexOf(hypeOf(n));

const dayList = (a: string, b: string) => {
  const out: string[] = [];
  for (let d = a; d <= b && out.length < 31; d = addDays(d, 1)) out.push(d);
  return out;
};
const fmtDay = (k: string) => {
  const d = fromKey(k);
  return `${DIAS_CURTOS[d.getDay()]} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const xpOf = (steps: ExamStep[]) => steps.filter((s) => s.done).reduce((a, s) => a + kindOf(s.kind).xp, 0);

/** maratona ativa (ou a próxima até 14 dias) */
export function activeRun(runs: ExamRun[] | undefined) {
  const t = today();
  return (runs ?? []).filter((r) => r.endDate >= t && r.startDate <= addDays(t, 14) && !r.finishedAt).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

// ── Faixa na Minha Trilha ──────────────────────────────────────

export function ExamBanner() {
  const { data } = useStore();
  const [arena, setArena] = useState<string | null>(null);
  const [setup, setSetup] = useState<ExamRun | 'new' | null>(null);
  const run = activeRun(data.settings.examRuns);
  const t = today();

  if (!run)
    return (
      <>
        <button className="ex-cta" onClick={() => setSetup('new')}>
          <span className="ex-cta-pad" aria-hidden="true">🎮</span> Semana de prova? <b>Ligar o modo jogo</b>
        </button>
        <ExamSetup value={setup} onClose={() => setSetup(null)} onSaved={(id) => setArena(id)} />
        {arena && <ExamArena runId={arena} onClose={() => setArena(null)} onEdit={(r) => setSetup(r)} />}
      </>
    );

  const total = run.steps.length;
  const done = run.steps.filter((s) => s.done).length;
  const live = run.startDate <= t;
  const until = diffDays(run.startDate, t);
  const todayDone = run.steps.filter((s) => s.done && s.doneAt?.slice(0, 10) === t).length;
  const h = hypeOf(todayDone);
  return (
    <>
      <motion.button
        className={`ex-banner hype-${hypeIdx(todayDone)} ${live ? 'is-live' : ''}`}
        onClick={() => { play('ignite'); setArena(run.id); }}
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.015, rotate: -0.4 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="ex-banner-shine" aria-hidden="true" />
        <span className="ex-banner-ico" aria-hidden="true">🎮</span>
        <span className="ex-banner-txt">
          <span className="ex-banner-k">{live ? 'GAME ON · modo prova' : until === 1 ? 'amanhã começa!' : `começa em ${until} dias`}</span>
          <strong>{run.title}</strong>
          <span className="ex-banner-sub">{done}/{total} casinhas · {xpOf(run.steps)} XP{live ? ` · ${h.emoji} ${h.name}` : ''}</span>
        </span>
        <span className="ex-banner-go">{live ? 'JOGAR' : 'VER'} <Icon name="chevronR" size={16} /></span>
      </motion.button>
      {arena && <ExamArena runId={arena} onClose={() => setArena(null)} onEdit={(r) => setSetup(r)} />}
      <ExamSetup value={setup} onClose={() => setSetup(null)} onSaved={(id) => setArena(id)} />
    </>
  );
}

// ── Montar a maratona ─────────────────────────────────────────

const QUICK: ExamStepKind[] = ['tema', 'questoes', 'flashcards', 'revisao', 'prova', 'correcao', 'pausa'];

function ExamSetup({ value, onClose, onSaved }: { value: ExamRun | 'new' | null; onClose: () => void; onSaved: (id: string) => void }) {
  const { data, saveSettings } = useStore();
  const base = useMemo<ExamRun | null>(() => {
    if (!value) return null;
    if (value !== 'new') return value;
    const s = today();
    return { id: uid(), title: 'Maratona da prova', startDate: s, endDate: addDays(s, 1), steps: [], createdAt: new Date().toISOString() };
  }, [value]);
  const [draft, setDraft] = useState<ExamRun | null>(base);
  const [day, setDay] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState<ExamStepKind>('tema');
  useEffect(() => { setDraft(base); setDay(base?.startDate ?? ''); setText(''); setKind('tema'); }, [base]);
  if (!draft) return null;
  const days = dayList(draft.startDate, draft.endDate);
  const curDay = days.includes(day) ? day : days[0];
  const topicByName = (n: string) => data.topics.find((t) => t.name.toLowerCase() === n.trim().toLowerCase());

  const addStep = (k: ExamStepKind = kind, label = text) => {
    const v = label.trim() || kindOf(k).label;
    const tp = k === 'tema' ? topicByName(v) : undefined;
    setDraft({ ...draft, steps: [...draft.steps, { id: uid(), day: curDay, kind: k, label: v, topicId: tp?.id ?? null, done: false }] });
    setText('');
    play('pop');
  };
  const move = (id: string, dir: -1 | 1) => {
    const list = [...draft.steps];
    const i = list.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setDraft({ ...draft, steps: list });
  };
  const save = () => {
    const runs = data.settings.examRuns ?? [];
    // etapas fora das datas novas vão para o último dia
    const steps = draft.steps.map((s) => (days.includes(s.day) ? s : { ...s, day: s.day < draft.startDate ? draft.startDate : draft.endDate }));
    const next = { ...draft, steps };
    saveSettings({ examRuns: runs.some((r) => r.id === next.id) ? runs.map((r) => (r.id === next.id ? next : r)) : [...runs, next] });
    onSaved(next.id);
    onClose();
  };
  const del = () => {
    saveSettings({ examRuns: (data.settings.examRuns ?? []).filter((r) => r.id !== draft.id) });
    onClose();
  };

  return (
    <Modal open={!!value} onClose={onClose} title={value === 'new' ? '🎮 Novo modo prova' : '🎮 Editar modo prova'} wide>
      <form className="form ex-setup" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="register-grid">
          <Field label="Nome da maratona">
            <input id="ex-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </Field>
          <Field label="Começa">
            <input id="ex-s" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value, endDate: e.target.value > draft.endDate ? e.target.value : draft.endDate })} required />
          </Field>
          <Field label="Termina">
            <input id="ex-e" type="date" value={draft.endDate} min={draft.startDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} required />
          </Field>
        </div>

        <div className="ex-days" role="tablist" aria-label="Fases">
          {days.map((d, i) => (
            <button type="button" key={d} role="tab" aria-selected={d === curDay} className={d === curDay ? 'is-on' : ''} onClick={() => setDay(d)}>
              <b>Fase {i + 1}</b><span>{fmtDay(d)}</span><i>{draft.steps.filter((s) => s.day === d).length}</i>
            </button>
          ))}
        </div>

        <div className="ex-add">
          <div className="ex-kinds">
            {QUICK.map((k) => (
              <button type="button" key={k} className={`ex-kind ${kind === k ? 'is-on' : ''}`} style={{ ['--k' as string]: kindOf(k).color }} onClick={() => setKind(k)}>
                <span aria-hidden="true">{kindOf(k).emoji}</span> {kindOf(k).label}
              </button>
            ))}
          </div>
          <div className="ex-add-row">
            <input
              id="ex-step"
              list="ex-topics"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
              placeholder={kind === 'tema' ? 'Ex.: Pré-eclâmpsia (escreva ou escolha um tema)' : kind === 'prova' ? 'Ex.: Prova de GO' : `${kindOf(kind).label} (opcional: detalhe)`}
              aria-label="Nova etapa"
            />
            <datalist id="ex-topics">{data.topics.map((t) => <option key={t.id} value={t.name} />)}</datalist>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => addStep()}><Icon name="plus" size={15} /> Pôr na fase</button>
          </div>
        </div>

        <ol className="ex-plan">
          {draft.steps.filter((s) => s.day === curDay).length === 0 && <li className="ex-plan-empty">Fase vazia — escolha o tipo, escreva e “Pôr na fase”. Dica: termine o dia com a prova (o chefão 👑) ou uma pausa 🧃.</li>}
          {draft.steps.filter((s) => s.day === curDay).map((s) => (
            <li key={s.id} style={{ ['--k' as string]: kindOf(s.kind).color }}>
              <span className="ex-plan-ico" aria-hidden="true">{kindOf(s.kind).emoji}</span>
              <span className="ex-plan-txt">{s.label}<small>{kindOf(s.kind).label} · {kindOf(s.kind).xp} XP</small></span>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(s.id, -1)} aria-label="Subir"><Icon name="chevronL" size={14} /></button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(s.id, 1)} aria-label="Descer"><Icon name="chevronR" size={14} /></button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.id !== s.id) })} aria-label="Tirar"><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ol>

        <div className="register-actions spread">
          {value !== 'new' ? <ConfirmButton label={<><Icon name="trash" size={15} /> Apagar maratona</>} question="Apagar este modo prova?" confirmLabel="Apagar" onConfirm={del} /> : <span />}
          <div className="btn-row">
            <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">🎮 Salvar e jogar</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── A arena (tela cheia) ───────────────────────────────────────

function ExamArena({ runId, onClose, onEdit }: { runId: string; onClose: () => void; onEdit: (r: ExamRun) => void }) {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const run = (data.settings.examRuns ?? []).find((r) => r.id === runId);
  const [pop, setPop] = useState<{ id: string; text: string; n: number } | null>(null);
  const [combo, setCombo] = useState<{ name: string; emoji: string; n: number; id: number } | null>(null);
  const t = today();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  // abre já na fase de hoje
  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-day="${t}"]`);
    if (el) el.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!run) return null;
  const days = dayList(run.startDate, run.endDate);
  const total = run.steps.length;
  const done = run.steps.filter((s) => s.done).length;
  const xp = xpOf(run.steps);
  const maxXp = run.steps.reduce((a, s) => a + kindOf(s.kind).xp, 0) || 1;
  const level = Math.floor(xp / 100) + 1;
  const todayDone = run.steps.filter((s) => s.done && s.doneAt?.slice(0, 10) === t).length;
  const h = hypeOf(todayDone);
  const next = run.steps.find((s) => !s.done);
  const live = run.startDate <= t;
  const until = diffDays(run.startDate, t);

  const saveRun = (r: ExamRun) => saveSettings({ examRuns: (data.settings.examRuns ?? []).map((x) => (x.id === r.id ? r : x)) });
  const toggle = (s: ExamStep, e: React.MouseEvent) => {
    const nowDone = !s.done;
    const steps = run.steps.map((x) => (x.id === s.id ? { ...x, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null } : x));
    const allDone = steps.length > 0 && steps.every((x) => x.done);
    saveRun({ ...run, steps, finishedAt: allDone ? new Date().toISOString() : null });
    if (!nowDone) { play('uncheck'); return; }
    const k = kindOf(s.kind);
    burst(e, s.kind === 'prova' ? 'confete' : 'brilho', s.kind === 'prova' ? 28 : 14);
    play(s.kind === 'prova' ? 'mission' : 'check');
    setPop({ id: s.id, text: `+${k.xp} XP`, n: Date.now() });
    window.setTimeout(() => setPop((p) => (p?.id === s.id ? null : p)), 1100);
    const before = hypeIdx(todayDone);
    const after = hypeIdx(todayDone + 1);
    if (after > before) {
      const hh = HYPE[after];
      const id = Date.now();
      setCombo({ name: hh.name, emoji: hh.emoji, n: todayDone + 1, id });
      play('ignite');
      window.setTimeout(() => setCombo((c) => (c?.id === id ? null : c)), 1900);
    }
    if (allDone) {
      play('chapter');
      ui.celebrate({ kind: 'chapter', title: `${run.title}: zerada! 🏆`, extras: [`${xp + k.xp} XP no total`, 'Você jogou a maratona inteira. Lenda.'] });
    }
  };

  return createPortal(
    <div className={`ex-arena hype-${hypeIdx(todayDone)}`} role="dialog" aria-label={`Modo prova: ${run.title}`}>
      <div className="ex-bg" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.53) % 5}s`, animationDuration: `${5 + (i % 4)}s` }}>{['✦', '⚡', '★', '✧'][i % 4]}</i>)}
      </div>

      <header className="ex-hud">
        <button className="ex-x" onClick={onClose} aria-label="Sair do modo prova"><Icon name="close" size={20} /></button>
        <div className="ex-hud-title">
          <span className="ex-hud-k">🎮 MODO PROVA {live ? '· GAME ON' : `· começa ${until === 1 ? 'amanhã' : `em ${until} dias`}`}</span>
          <h2>{run.title}</h2>
        </div>
        <button className="ex-edit" onClick={() => onEdit(run)}><Icon name="edit" size={15} /> Montar</button>
      </header>

      <section className="ex-stats">
        <div className="ex-level"><span>NÍVEL</span><b>{level}</b></div>
        <div className="ex-xpbar">
          <div className="ex-xpbar-top"><b>{xp} XP</b><span>{done}/{total} casinhas</span></div>
          <div className="ex-xpbar-track"><motion.span animate={{ width: `${(xp / maxXp) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} /></div>
        </div>
        <motion.div className="ex-hype" key={h.name} initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
          <span className="ex-hype-emoji">{h.emoji}</span>
          <span className="ex-hype-txt"><b>{h.name}</b><small>combo hoje: {todayDone}</small></span>
        </motion.div>
      </section>
      <p className="ex-line">{total === 0 ? 'Monte as fases: toque em “Montar” e coloque temas, flashcards, a prova e a correção.' : done === total ? 'Maratona zerada! 🏆 Respira, se hidrata e se orgulha.' : h.line}</p>

      <div className="ex-path" ref={scroller}>
        {days.map((d, di) => {
          const steps = run.steps.filter((s) => s.day === d);
          const dDone = steps.filter((s) => s.done).length;
          return (
            <section key={d} className={`ex-phase ${d === t ? 'is-today' : ''} ${steps.length && dDone === steps.length ? 'is-clear' : ''}`} data-day={d}>
              <h3 className="ex-phase-h">
                <span className="ex-phase-n">FASE {di + 1}</span>
                <span>{fmtDay(d)}{d === t ? ' · hoje' : ''}</span>
                <span className="ex-phase-p">{steps.length ? (dDone === steps.length ? '⭐ completa' : `${dDone}/${steps.length}`) : '—'}</span>
              </h3>
              {steps.length === 0 && <p className="ex-phase-empty">Nada nesta fase ainda.</p>}
              <ol className="ex-nodes">
                {steps.map((s, i) => {
                  const k = kindOf(s.kind);
                  const isNext = next?.id === s.id;
                  const boss = s.kind === 'prova';
                  const topic = s.topicId ? data.topics.find((x) => x.id === s.topicId) : null;
                  return (
                    <motion.li
                      key={s.id}
                      className={`ex-node ${s.done ? 'is-done' : ''} ${isNext ? 'is-next' : ''} ${boss ? 'is-boss' : ''} ${i % 2 ? 'is-r' : 'is-l'}`}
                      style={{ ['--k' as string]: k.color }}
                      initial={{ opacity: 0, scale: 0.7, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, type: 'spring', stiffness: 320, damping: 18 }}
                    >
                      {isNext && <span className="ex-go">VAI!</span>}
                      <motion.button
                        className="ex-orb"
                        onClick={(e) => toggle(s, e)}
                        whileHover={{ scale: 1.08, rotate: i % 2 ? 4 : -4 }}
                        whileTap={{ scale: 0.88 }}
                        aria-pressed={s.done}
                        aria-label={`${s.label}: ${s.done ? 'feito, toque para desfazer' : 'marcar como feito'}`}
                      >
                        <span className="ex-orb-emoji" aria-hidden="true">{s.done ? '⭐' : k.emoji}</span>
                        {boss && !s.done && <span className="ex-crown" aria-hidden="true">👑</span>}
                      </motion.button>
                      <AnimatePresence>
                        {pop?.id === s.id && (
                          <motion.span key={pop.n} className="ex-xp-pop" initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: 1, y: -46, scale: 1.1 }} exit={{ opacity: 0, y: -70 }} transition={{ duration: 0.6 }}>
                            {pop.text}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <div className="ex-node-txt">
                        <strong>{boss ? `Chefão: ${s.label}` : s.label}</strong>
                        <span>{k.label} · {k.xp} XP</span>
                        {!s.done && (topic || k.page) && (
                          <button className="ex-node-link" onClick={() => { onClose(); if (topic) ui.openTopic(topic.id); else if (k.page) ui.go(k.page); }}>
                            {topic ? 'abrir tema' : k.id === 'correcao' ? 'ir para a correção' : `ir para ${k.label.toLowerCase()}`} →
                          </button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          );
        })}
        <div className={`ex-trophy ${total > 0 && done === total ? 'is-won' : ''}`}>
          <span aria-hidden="true">🏆</span>
          <b>{total > 0 && done === total ? 'ZERADA!' : 'Troféu da maratona'}</b>
          <small>{total > 0 && done === total ? 'você conseguiu, R1 vem aí' : `faltam ${total - done} casinha${total - done === 1 ? '' : 's'}`}</small>
        </div>
      </div>

      {combo && (
        <div className="ex-combo-wrap" key={combo.id} aria-live="polite">
          <div className="ex-combo">
            <span className="ex-combo-emoji">{combo.emoji}</span>
            <b>COMBO x{combo.n}</b>
            <span>{combo.name}!</span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
