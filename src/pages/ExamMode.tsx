// Capítulo especial (modo prova): os dias de prova viram um jogo dentro da
// trilha. Cada dia é uma fase, cada bloco (tema, questões, flashcards, revisão,
// prova, correção, pausa, prêmio, bônus) é uma casinha com horário. A prova é o
// chefão; prêmios abrem quando os blocos antes deles acabam; bônus são extras.
// O plano pode vir pronto de um texto (feito em outro chat) — ele dita as regras.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { Field, Modal, useUI, type Page } from '../components/ui';
import { Icon } from '../components/Icon';
import { addDays, diffDays, fromKey, today, uid, DIAS_CURTOS } from '../logic/dates';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import { parsePlan, PLAN_PROMPT, type ParsedPlan } from '../logic/examPlan';
import type { Chapter, ExamRun, ExamStep, ExamStepKind } from '../types';

export const STEP_KINDS: { id: ExamStepKind; label: string; emoji: string; xp: number; color: string; page?: Page }[] = [
  { id: 'tema', label: 'Tema', emoji: '📚', xp: 30, color: 'var(--azul-claro)' },
  { id: 'questoes', label: 'Questões', emoji: '✍️', xp: 30, color: 'var(--rosa)' },
  { id: 'flashcards', label: 'Flashcards', emoji: '🃏', xp: 20, color: 'var(--lilas)', page: 'flashcards' },
  { id: 'revisao', label: 'Revisão', emoji: '🔁', xp: 25, color: '#E3F0C8', page: 'revisoes' },
  { id: 'prova', label: 'Prova / simulado', emoji: '👑', xp: 100, color: 'var(--manteiga)', page: 'simulados' },
  { id: 'correcao', label: 'Correção', emoji: '🔍', xp: 40, color: 'var(--lilas)', page: 'simulados' },
  { id: 'pausa', label: 'Pausa', emoji: '🧃', xp: 5, color: '#FFE6D6' },
  { id: 'premio', label: 'Prêmio', emoji: '🎁', xp: 0, color: 'var(--manteiga)' },
  { id: 'bonus', label: 'Bônus', emoji: '🌟', xp: 50, color: 'var(--lima)' },
  { id: 'outro', label: 'Outro', emoji: '⭐', xp: 15, color: 'var(--surface-2)' },
];
export const kindOf = (k: ExamStepKind) => STEP_KINDS.find((x) => x.id === k) ?? STEP_KINDS[STEP_KINDS.length - 1];

// a vibe esquenta com o combo do dia (blocos feitos hoje)
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
/** casinhas que contam para zerar (bônus é extra) */
const counted = (steps: ExamStep[]) => steps.filter((s) => s.kind !== 'bonus');

/** progresso do capítulo especial (para a aba da trilha) */
export function examProgress(run: ExamRun | undefined) {
  const c = counted(run?.steps ?? []);
  const done = c.filter((s) => s.done).length;
  return { total: c.length, done, pct: c.length ? done / c.length : 0, complete: c.length > 0 && done === c.length };
}
export const runOfChapter = (runs: ExamRun[] | undefined, chapterId: string) => (runs ?? []).find((r) => r.chapterId === chapterId);

/** prêmio fica trancado até os blocos antes dele (no mesmo dia) acabarem */
const isLocked = (run: ExamRun, s: ExamStep) => {
  if (s.kind !== 'premio' || s.done) return false;
  const sameDay = run.steps.filter((x) => x.day === s.day);
  const before = sameDay.slice(0, sameDay.findIndex((x) => x.id === s.id));
  return before.some((x) => !x.done && x.kind !== 'bonus' && x.kind !== 'premio');
};

// ── Capítulo especial na trilha ────────────────────────────────

export function ExamChapter({ chapter, onEditChapter }: { chapter: Chapter; onEditChapter: () => void }) {
  const { data, saveSettings } = useStore();
  const run = runOfChapter(data.settings.examRuns, chapter.id);
  const [setup, setSetup] = useState(false);
  const [importing, setImporting] = useState(false);
  const [full, setFull] = useState(false);

  // todo capítulo especial tem a sua maratona (cria vazia se faltar) e segue as datas do capítulo
  useEffect(() => {
    const runs = data.settings.examRuns ?? [];
    if (!run) {
      saveSettings({ examRuns: [...runs, { id: uid(), chapterId: chapter.id, title: chapter.title, startDate: chapter.startDate, endDate: chapter.endDate, steps: [], createdAt: new Date().toISOString() }] });
    } else if (run.startDate !== chapter.startDate || run.endDate !== chapter.endDate || run.title !== chapter.title) {
      saveSettings({ examRuns: runs.map((r) => (r.id === run.id ? { ...r, title: chapter.title, startDate: chapter.startDate, endDate: chapter.endDate } : r)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id, chapter.startDate, chapter.endDate, chapter.title, !!run]);

  if (!run) return null;
  const arena = (
    <Arena
      run={run}
      chapter={chapter}
      full={full}
      onFull={() => setFull(!full)}
      onSetup={() => setSetup(true)}
      onImport={() => setImporting(true)}
      onEditChapter={onEditChapter}
    />
  );
  return (
    <>
      {full ? createPortal(<div className="ex-full">{arena}</div>, document.body) : arena}
      <ExamSetup run={run} open={setup} onClose={() => setSetup(false)} />
      <ExamImport run={run} chapter={chapter} open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

// ── Montar as fases à mão ──────────────────────────────────────

const QUICK: ExamStepKind[] = ['tema', 'questoes', 'flashcards', 'revisao', 'prova', 'correcao', 'pausa', 'premio', 'bonus'];

function ExamSetup({ run, open, onClose }: { run: ExamRun; open: boolean; onClose: () => void }) {
  const { data, saveSettings } = useStore();
  const [draft, setDraft] = useState<ExamRun>(run);
  const [day, setDay] = useState(run.startDate);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [kind, setKind] = useState<ExamStepKind>('tema');
  const [rules, setRules] = useState('');
  useEffect(() => {
    if (open) { setDraft(run); setDay(run.startDate); setText(''); setTime(''); setKind('tema'); setRules((run.rules ?? []).join('\n')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const days = dayList(draft.startDate, draft.endDate);
  const curDay = days.includes(day) ? day : days[0];
  const topicByName = (n: string) => data.topics.find((t) => t.name.toLowerCase() === n.trim().toLowerCase());

  const addStep = () => {
    const v = text.trim() || kindOf(kind).label;
    const tp = kind === 'tema' ? topicByName(v) : undefined;
    setDraft({ ...draft, steps: [...draft.steps, { id: uid(), day: curDay, kind, label: v, time: time || null, topicId: tp?.id ?? null, done: false }] });
    setText('');
    play('pop');
  };
  const move = (id: string, dir: -1 | 1) => {
    const list = [...draft.steps];
    const i = list.findIndex((s) => s.id === id);
    // anda só entre as casinhas do mesmo dia
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].day !== list[i].day) j += dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setDraft({ ...draft, steps: list });
  };
  const save = () => {
    const next = { ...draft, rules: rules.split('\n').map((x) => x.trim()).filter(Boolean) };
    saveSettings({ examRuns: (data.settings.examRuns ?? []).map((r) => (r.id === next.id ? next : r)) });
    onClose();
  };
  const daySteps = draft.steps.filter((s) => s.day === curDay);

  return (
    <Modal open={open} onClose={onClose} title="🎮 Montar as fases" wide>
      <form className="form ex-setup" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Dia da prova" hint="Mostra a contagem regressiva no capítulo.">
          <input id="ex-prova" type="date" value={draft.examDate ?? ''} onChange={(e) => setDraft({ ...draft, examDate: e.target.value || null })} />
        </Field>
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
            <input id="ex-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Horário" className="ex-time-in" />
            <input
              id="ex-step"
              list="ex-topics"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
              placeholder={kind === 'tema' ? 'Ex.: Bronquiolite' : kind === 'premio' ? 'Ex.: almoço gostoso + 1 episódio' : kind === 'bonus' ? 'Ex.: 10 questões extras' : `${kindOf(kind).label} (detalhe)`}
              aria-label="Nova casinha"
            />
            <datalist id="ex-topics">{data.topics.map((t) => <option key={t.id} value={t.name} />)}</datalist>
            <button type="button" className="btn btn-primary btn-sm" onClick={addStep}><Icon name="plus" size={15} /> Pôr</button>
          </div>
        </div>
        <ol className="ex-plan">
          {daySteps.length === 0 && <li className="ex-plan-empty">Fase vazia. Dica: dá para importar o plano pronto de um texto (botão “Importar plano”).</li>}
          {daySteps.map((s) => (
            <li key={s.id} style={{ ['--k' as string]: kindOf(s.kind).color }}>
              <span className="ex-plan-ico" aria-hidden="true">{kindOf(s.kind).emoji}</span>
              <input className="ex-plan-time" type="time" value={s.time ?? ''} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x) => (x.id === s.id ? { ...x, time: e.target.value || null } : x)) })} aria-label="Horário" />
              <span className="ex-plan-txt">{s.label}<small>{kindOf(s.kind).label}{kindOf(s.kind).xp ? ` · ${kindOf(s.kind).xp} XP` : ''}</small></span>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(s.id, -1)} aria-label="Subir"><Icon name="chevronL" size={14} /></button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(s.id, 1)} aria-label="Descer"><Icon name="chevronR" size={14} /></button>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.id !== s.id) })} aria-label="Tirar"><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ol>
        <Field label="Regras do jogo" hint="Uma por linha. Aparecem no topo do capítulo.">
          <textarea id="ex-rules" rows={3} value={rules} onChange={(e) => setRules(e.target.value)} placeholder={'celular longe durante os blocos\nerrou questão? anota o porquê'} />
        </Field>
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">🎮 Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Importar o plano pronto (texto colado ou arquivo) ──────────

function ExamImport({ run, chapter, open, onClose }: { run: ExamRun; chapter: Chapter; open: boolean; onClose: () => void }) {
  const { data, saveSettings, saveChapter } = useStore();
  const ui = useUI();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'trocar' | 'somar'>('trocar');
  useEffect(() => { if (open) { setText(''); setMode(run.steps.length ? 'somar' : 'trocar'); } }, [open, run.steps.length]);
  const plan: ParsedPlan | null = useMemo(() => (text.trim() ? parsePlan(text) : null), [text]);
  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of plan?.steps ?? []) m.set(s.day, (m.get(s.day) ?? 0) + 1);
    return [...m.entries()].sort();
  }, [plan]);

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 400_000) { ui.toast('Arquivo grande demais: cole o texto do plano.'); return; }
    setText(await f.text());
  };
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(PLAN_PROMPT); ui.toast('Pedido copiado! Cole no outro chat junto com o material da prova.'); } catch { ui.toast('Não deu para copiar: selecione o texto do pedido.'); }
  };
  const apply = () => {
    if (!plan || !plan.steps.length) return;
    const start = plan.start && plan.start < chapter.startDate ? plan.start : chapter.startDate;
    const end = plan.end && plan.end > chapter.endDate ? plan.end : chapter.endDate;
    const steps: ExamStep[] = plan.steps.map((s) => {
      const tp = s.kind === 'tema' ? data.topics.find((t) => t.name.toLowerCase() === s.label.toLowerCase()) : undefined;
      return { id: uid(), day: s.day, time: s.time, kind: s.kind, label: s.label || kindOf(s.kind).label, topicId: tp?.id ?? null, done: false };
    });
    const next: ExamRun = {
      ...run,
      startDate: start,
      endDate: end,
      examDate: plan.examDate ?? run.examDate ?? null,
      rules: mode === 'trocar' ? plan.rules : [...(run.rules ?? []), ...plan.rules],
      steps: mode === 'trocar' ? steps : [...run.steps, ...steps],
      finishedAt: null,
    };
    if (start !== chapter.startDate || end !== chapter.endDate || (plan.title && plan.title !== chapter.title)) {
      saveChapter({ ...chapter, startDate: start, endDate: end, title: plan.title || chapter.title });
    }
    saveSettings({ examRuns: (data.settings.examRuns ?? []).map((r) => (r.id === run.id ? { ...next, title: plan.title || r.title } : r)) });
    play('mission');
    ui.toast(`Plano no jogo: ${steps.length} casinhas em ${byDay.length} fase${byDay.length > 1 ? 's' : ''}! 🎮`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="📜 Importar plano" wide>
      <div className="form ex-import">
        <ol className="ex-howto">
          <li><b>No outro chat</b>, mande o material da prova (temas, provas anteriores, onde você foi mal) e cole este pedido: <button type="button" className="btn btn-secondary btn-sm" onClick={copyPrompt}>📋 Copiar pedido</button></li>
          <li><b>Cole aqui</b> o plano que ele responder (ou anexe o arquivo .txt / .md).</li>
          <li>Confira a prévia e toque em <b>Pôr no jogo</b>. O app só segue as linhas: cada uma vira uma casinha.</li>
        </ol>
        <details className="ex-format">
          <summary>Ver o formato</summary>
          <pre>{PLAN_PROMPT.split('\n').slice(3, 21).join('\n')}</pre>
        </details>
        <textarea id="ex-import" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'titulo: Maratona de Pediatria\ninicio: 21/11/2026\nfim: 22/11/2026\nprova: 23/11/2026\n\n## Sábado 21/11\n07:00 | tema | Bronquiolite\n08:30 | questoes | 20 questões\n10:00 | pausa | café'} aria-label="Texto do plano" />
        <label className="btn btn-quiet btn-sm ex-file">
          📎 Anexar arquivo
          <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={(e) => readFile(e.target.files?.[0])} hidden />
        </label>

        {plan && (
          <div className="ex-preview">
            {plan.steps.length === 0 ? (
              <p className="muted">Não achei nenhuma casinha. Cada bloco precisa de uma linha tipo <code>07:00 | tema | Bronquiolite</code>.</p>
            ) : (
              <>
                <p><b>{plan.title ?? chapter.title}</b>{plan.examDate ? ` · prova em ${fmtDay(plan.examDate)}` : ''}</p>
                <ul>
                  {byDay.map(([d, n]) => <li key={d}>{fmtDay(d)}: <b>{n}</b> casinha{n > 1 ? 's' : ''} · {plan.steps.filter((s) => s.day === d && s.kind === 'premio').length} 🎁 · {plan.steps.filter((s) => s.day === d && s.kind === 'bonus').length} 🌟</li>)}
                </ul>
                {plan.rules.length > 0 && <p className="muted small">{plan.rules.length} regra{plan.rules.length > 1 ? 's' : ''} do jogo</p>}
                {plan.ignored.length > 0 && <p className="muted small">{plan.ignored.length} linha{plan.ignored.length > 1 ? 's' : ''} sem formato de casinha ficaram de fora.</p>}
                {run.steps.length > 0 && (
                  <div className="seg">
                    <button type="button" className={mode === 'somar' ? 'is-on' : ''} onClick={() => setMode('somar')}>Somar ao que já tem</button>
                    <button type="button" className={mode === 'trocar' ? 'is-on' : ''} onClick={() => setMode('trocar')}>Trocar tudo</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div className="register-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={!plan?.steps.length} onClick={apply}>🎮 Pôr no jogo</button>
        </div>
      </div>
    </Modal>
  );
}

// ── O jogo ─────────────────────────────────────────────────────

function Arena({ run, chapter, full, onFull, onSetup, onImport, onEditChapter }: {
  run: ExamRun; chapter: Chapter; full: boolean; onFull: () => void; onSetup: () => void; onImport: () => void; onEditChapter: () => void;
}) {
  const { data, saveSettings } = useStore();
  const ui = useUI();
  const [pop, setPop] = useState<{ id: string; text: string; n: number } | null>(null);
  const [combo, setCombo] = useState<{ name: string; emoji: string; n: number; id: number } | null>(null);
  const t = today();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onFull();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [full, onFull]);

  const days = dayList(run.startDate, run.endDate);
  const prog = examProgress(run);
  const xp = xpOf(run.steps);
  const level = Math.floor(xp / 100) + 1;
  const todayDone = run.steps.filter((s) => s.done && s.kind !== 'premio' && s.doneAt?.slice(0, 10) === t).length;
  const h = hypeOf(todayDone);
  const next = run.steps.find((s) => !s.done && s.kind !== 'bonus' && !isLocked(run, s));
  const live = run.startDate <= t;
  const until = diffDays(run.startDate, t);
  const toExam = run.examDate ? diffDays(run.examDate, t) : null;

  const saveRun = (r: ExamRun) => saveSettings({ examRuns: (data.settings.examRuns ?? []).map((x) => (x.id === r.id ? r : x)) });
  const toggle = (s: ExamStep, e: React.MouseEvent) => {
    if (isLocked(run, s)) {
      play('fizzle');
      ui.toast('🎁 Esse prêmio abre quando você terminar os blocos antes dele!');
      return;
    }
    const nowDone = !s.done;
    const steps = run.steps.map((x) => (x.id === s.id ? { ...x, done: nowDone, doneAt: nowDone ? new Date().toISOString() : null } : x));
    const allDone = examProgress({ ...run, steps }).complete;
    saveRun({ ...run, steps, finishedAt: allDone ? new Date().toISOString() : null });
    if (!nowDone) { play('uncheck'); return; }
    const k = kindOf(s.kind);
    if (s.kind === 'premio') {
      burst(e, 'coracoes', 18);
      play('jingle');
      setPop({ id: s.id, text: 'aproveita! 💛', n: Date.now() });
    } else {
      burst(e, s.kind === 'prova' || s.kind === 'bonus' ? 'confete' : 'brilho', s.kind === 'prova' ? 28 : 14);
      play(s.kind === 'prova' ? 'mission' : 'check');
      setPop({ id: s.id, text: `+${k.xp} XP`, n: Date.now() });
      const before = hypeIdx(todayDone);
      const after = hypeIdx(todayDone + 1);
      if (after > before) {
        const hh = HYPE[after];
        const id = Date.now();
        setCombo({ name: hh.name, emoji: hh.emoji, n: todayDone + 1, id });
        play('ignite');
        window.setTimeout(() => setCombo((c) => (c?.id === id ? null : c)), 1900);
      }
    }
    window.setTimeout(() => setPop((p) => (p?.id === s.id ? null : p)), 1100);
    if (allDone) {
      play('chapter');
      ui.celebrate({ kind: 'chapter', title: `${chapter.title}: zerado! 🏆`, extras: [`${xp + k.xp} XP no total`, 'Capítulo especial completo. Agora é com você na prova 👑'] });
    }
  };

  return (
    <div ref={wrap} className={`ex-arena ex-inline hype-${hypeIdx(todayDone)} ${full ? 'is-full' : ''}`} aria-label={`Capítulo especial: ${chapter.title}`}>
      <div className="ex-bg" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.53) % 5}s`, animationDuration: `${5 + (i % 4)}s` }}>{['✦', '⚡', '★', '✧'][i % 4]}</i>)}
      </div>

      <header className="ex-hud">
        <div className="ex-hud-title">
          <span className="ex-hud-k">✦ CAPÍTULO ESPECIAL · {live ? 'GAME ON' : `começa ${until === 1 ? 'amanhã' : `em ${until} dias`}`}</span>
          <h2>{chapter.title}</h2>
          {toExam != null && toExam >= 0 && <span className="ex-countdown">{toExam === 0 ? '👑 hoje é o dia da prova!' : `👑 prova em ${toExam} dia${toExam > 1 ? 's' : ''}`}</span>}
        </div>
        <div className="ex-tools">
          <button className="ex-edit" onClick={onImport}>📜 Importar plano</button>
          <button className="ex-edit" onClick={onSetup}><Icon name="edit" size={15} /> Montar</button>
          <button className="ex-edit" onClick={onEditChapter} title="Nome e datas do capítulo">⚙️</button>
          <button className="ex-edit" onClick={onFull} title={full ? 'Sair da tela cheia' : 'Tela cheia'} aria-label={full ? 'Sair da tela cheia' : 'Tela cheia'}>{full ? <Icon name="close" size={16} /> : '⛶'}</button>
        </div>
      </header>

      <section className="ex-stats">
        <div className="ex-level"><span>NÍVEL</span><b>{level}</b></div>
        <div className="ex-xpbar">
          <div className="ex-xpbar-top"><b>{xp} XP</b><span>{prog.done}/{prog.total} casinhas</span></div>
          <div className="ex-xpbar-track"><motion.span animate={{ width: `${prog.pct * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} /></div>
        </div>
        <motion.div className="ex-hype" key={h.name} initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
          <span className="ex-hype-emoji">{h.emoji}</span>
          <span className="ex-hype-txt"><b>{h.name}</b><small>combo hoje: {todayDone}</small></span>
        </motion.div>
      </section>
      <p className="ex-line">{prog.total === 0 ? 'Monte as fases: importe o plano pronto ou toque em “Montar”.' : prog.complete ? 'Capítulo zerado! 🏆 Respira, se hidrata e se orgulha.' : h.line}</p>

      {(run.rules ?? []).length > 0 && (
        <details className="ex-rules" open={prog.done === 0}>
          <summary>📜 Regras do jogo</summary>
          <ul>{run.rules!.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </details>
      )}

      <div className="ex-path">
        {days.map((d, di) => {
          const steps = run.steps.filter((s) => s.day === d);
          const cs = counted(steps);
          const dDone = cs.filter((s) => s.done).length;
          return (
            <section key={d} className={`ex-phase ${d === t ? 'is-today' : ''} ${cs.length && dDone === cs.length ? 'is-clear' : ''}`} data-day={d}>
              <h3 className="ex-phase-h">
                <span className="ex-phase-n">FASE {di + 1}</span>
                <span>{fmtDay(d)}{d === t ? ' · hoje' : ''}{d === run.examDate ? ' · 👑 prova' : ''}</span>
                <span className="ex-phase-p">{cs.length ? (dDone === cs.length ? '⭐ completa' : `${dDone}/${cs.length}`) : '—'}</span>
              </h3>
              {steps.length === 0 && <p className="ex-phase-empty">Nada nesta fase ainda.</p>}
              <ol className="ex-nodes">
                {steps.map((s, i) => {
                  const k = kindOf(s.kind);
                  const isNext = next?.id === s.id;
                  const boss = s.kind === 'prova';
                  const locked = isLocked(run, s);
                  const topic = s.topicId ? data.topics.find((x) => x.id === s.topicId) : null;
                  return (
                    <motion.li
                      key={s.id}
                      className={`ex-node ex-k-${s.kind} ${s.done ? 'is-done' : ''} ${isNext ? 'is-next' : ''} ${boss ? 'is-boss' : ''} ${locked ? 'is-locked' : ''} ${i % 2 ? 'is-r' : 'is-l'}`}
                      style={{ ['--k' as string]: k.color }}
                      initial={{ opacity: 0, scale: 0.7, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.03 * i, type: 'spring', stiffness: 320, damping: 18 }}
                    >
                      {isNext && <span className="ex-go">VAI!</span>}
                      <motion.button
                        className="ex-orb"
                        onClick={(e) => toggle(s, e)}
                        whileHover={{ scale: 1.08, rotate: i % 2 ? 4 : -4 }}
                        whileTap={{ scale: 0.88 }}
                        aria-pressed={s.done}
                        aria-label={`${s.label}: ${locked ? 'prêmio trancado' : s.done ? 'feito, toque para desfazer' : 'marcar como feito'}`}
                      >
                        <span className="ex-orb-emoji" aria-hidden="true">{locked ? '🔒' : s.done ? (s.kind === 'premio' ? '💝' : '⭐') : k.emoji}</span>
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
                        {s.time && <span className="ex-node-time">{s.time}</span>}
                        <strong>{boss ? `Chefão: ${s.label}` : s.kind === 'premio' ? `Prêmio: ${s.label}` : s.kind === 'bonus' ? `Bônus: ${s.label}` : s.label}</strong>
                        <span>{locked ? 'abre quando os blocos antes acabarem' : s.kind === 'premio' ? (s.done ? 'resgatado 💛' : 'liberado! toque para resgatar') : `${k.label} · ${k.xp} XP${s.kind === 'bonus' ? ' · extra' : ''}`}</span>
                        {!s.done && !locked && (topic || k.page) && (
                          <button className="ex-node-link" onClick={() => { if (full) onFull(); if (topic) ui.openTopic(topic.id); else if (k.page) ui.go(k.page); }}>
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
        <div className={`ex-trophy ${prog.complete ? 'is-won' : ''}`}>
          <span aria-hidden="true">🏆</span>
          <b>{prog.complete ? 'ZERADO!' : 'Troféu do capítulo'}</b>
          <small>{prog.complete ? 'você conseguiu, R1 vem aí' : `faltam ${prog.total - prog.done} casinha${prog.total - prog.done === 1 ? '' : 's'}`}</small>
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
    </div>
  );
}
