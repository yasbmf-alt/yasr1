import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { SimMapEditor } from '../components/ConceptMap';
import { MapSummary } from '../components/TopicStudy';
import { syncSimMap } from '../logic/conceptMap';
import { BIG_AREAS, REASONS, type BigArea, type CorrectionStatus, type ErrorGroup, type MapNode, type Simulado } from '../types';
import { fmtMinutes, fmtShort, today, uid } from '../logic/dates';
import { commitTimer, fmtClock, startTimer, timerMs } from '../logic/corrTimer';
import { play } from '../logic/sound';
import { ConfirmButton, numOrNull, useUI } from '../components/ui';
import type { Session } from '../types';
import { areaWrong, isMistake, topicOccurrences } from '../logic/simErrors';
import { AREA_CHART } from './Simulados';

const KEY_SIM = 'yasr1-corr-sim';
const KEY_WIDE = 'yasr1-corr-wide';
const remember = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};
const recall = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

interface TopicEntry {
  key: string; // topicId, ou o id do grupo quando não há tema
  topicId: string | null;
  name: string;
  groups: ErrorGroup[];
  mistakes: number;
  review: boolean;
  status: CorrectionStatus;
}

/** temas de uma área do simulado (vários grupos do mesmo tema viram um item só) */
function entriesOf(sim: Simulado, area: BigArea, topicName: (id: string) => string | undefined): TopicEntry[] {
  const m = new Map<string, TopicEntry>();
  for (const g of sim.errors ?? []) {
    if (g.area !== area) continue;
    const key = g.topicId ?? `g:${g.id}`;
    const e = m.get(key) ?? { key, topicId: g.topicId ?? null, name: (g.topicId && topicName(g.topicId)) || g.subject?.trim() || 'Sem tema', groups: [], mistakes: 0, review: false, status: 'nao' as CorrectionStatus };
    e.groups.push(g);
    if (isMistake(g)) e.mistakes += g.count;
    else e.review = true;
    m.set(key, e);
  }
  for (const e of m.values()) {
    const st = e.groups.map((g) => g.status ?? 'nao');
    e.status = st.every((s) => s === 'corrigido') ? 'corrigido' : st.some((s) => s !== 'nao') ? 'estudo' : 'nao';
  }
  return [...m.values()].sort((a, b) => b.mistakes - a.mistakes || a.name.localeCompare(b.name, 'pt-BR'));
}

/** quanto já foi escrito no mapa sobre o tema: conteúdo do próprio balão + ramos criados embaixo dele */
function notedCount(sim: Simulado, key: string) {
  const nodes = sim.map?.nodes ?? [];
  const node = nodes.find((n) => n.ref === key);
  if (!node) return 0;
  const has = (n: MapNode) => !!(n.notes?.trim() || n.explanation?.trim() || n.list?.some((x) => x.trim()) || n.images?.length || n.links?.length);
  let count = has(node) ? 1 : 0;
  const stack = [node.id];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of nodes) if (c.parentId === id) { count++; stack.push(c.id); }
  }
  return count;
}

const reasonLong = (r: string | null | undefined) => REASONS.find((x) => x.id === r)?.label;

export function Correcao({ onEdit }: { onEdit: (s: Simulado) => void }) {
  const { data, saveSimulado } = useStore();
  const sims = useMemo(() => [...data.simulados].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [data.simulados]);
  const [simId, setSimId] = useState<string | null>(() => recall(KEY_SIM));
  const sim = sims.find((s) => s.id === simId) ?? sims[0] ?? null;
  const topicName = (id: string) => data.topics.find((t) => t.id === id)?.name;
  const detailed = (s: Simulado, a: BigArea) => (s.errors ?? []).some((g) => g.area === a);
  const [area, setArea] = useState<BigArea | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<'mapa' | 'resumo'>('mapa');
  // tela ampla: esconde o menu do app e a lista de temas (sem ir para tela cheia)
  const [wide, setWide] = useState(() => recall(KEY_WIDE) === '1');
  const [navOpen, setNavOpen] = useState(false);
  const [factsMin, setFactsMin] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('corr-wide', wide);
    remember(KEY_WIDE, wide ? '1' : '0');
    return () => document.documentElement.classList.remove('corr-wide');
  }, [wide]);

  // o mapa do simulado nasce (e ganha os temas novos) sozinho
  const errSig = JSON.stringify((sim?.errors ?? []).map((g) => [g.id, g.area, g.topicId]));
  useEffect(() => {
    if (!sim) return;
    const m = syncSimMap(sim, data.topics);
    if (m) saveSimulado({ ...sim, map: m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.id, errSig]);

  // ao trocar de simulado, abre a primeira área com erros detalhados
  useEffect(() => {
    if (!sim) return;
    if (!area || !BIG_AREAS.includes(area)) setArea(BIG_AREAS.find((a) => detailed(sim, a)) ?? 'clinica');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.id]);

  const entries = sim && area ? entriesOf(sim, area, topicName) : [];
  const entry = entries.find((e) => e.key === key) ?? null;

  if (!sims.length)
    return (
      <div className="empty-big">
        <h2>Nenhum simulado para corrigir</h2>
        <p>Registre um simulado e, em cada grande área, abra a setinha para anotar os temas que você errou. Eles aparecem aqui para a correção.</p>
      </div>
    );
  if (!sim) return null;

  const pickSim = (id: string) => {
    setSimId(id);
    remember(KEY_SIM, id);
    setArea(null);
    setKey(null);
    setTick((t) => t + 1);
  };
  const focusId = (entry && sim.map?.nodes.find((n) => n.ref === entry.key)?.id) || (area && sim.map?.nodes.find((n) => n.area === area)?.id) || null;
  const setStatus = (e: TopicEntry, st: CorrectionStatus) => {
    const ids = new Set(e.groups.map((g) => g.id));
    saveSimulado({ ...sim, errors: (sim.errors ?? []).map((g) => (ids.has(g.id) ? { ...g, status: st } : g)) });
  };
  const anyDetailed = BIG_AREAS.some((a) => detailed(sim, a));

  return (
    <div className="corr">
      <div className="corr-sims" role="listbox" aria-label="Simulados">
        {sims.map((s) => {
          const p = s.total && s.correct != null ? Math.round((s.correct / s.total) * 100) : null;
          const n = (s.errors ?? []).filter(isMistake).reduce((a, g) => a + g.count, 0);
          return (
            <button key={s.id} role="option" aria-selected={s.id === sim.id} className={`corr-sim ${s.id === sim.id ? 'is-on' : ''}`} onClick={() => pickSim(s.id)}>
              <span className="corr-sim-name">{s.name}</span>
              <span className="corr-sim-meta">{fmtShort(s.date)}{p != null ? ` · ${p}%` : ''}{n ? ` · ${n} erro${n > 1 ? 's' : ''} detalhado${n > 1 ? 's' : ''}` : ''}</span>
            </button>
          );
        })}
      </div>

      <CorrectionLog sim={sim} />

      <div className="corr-body">
        <nav className={`corr-nav ${navOpen ? 'is-open' : ''}`} aria-label="Grandes áreas e temas">
          {BIG_AREAS.map((a) => {
            const sc = sim.areas?.[a];
            const w = areaWrong(sim, a);
            const list = a === area ? entries : [];
            const areaEntries = entriesOf(sim, a, topicName);
            const nTopics = areaEntries.length;
            const nDone = areaEntries.filter((e) => e.status === 'corrigido').length;
            return (
              <div key={a} className={`corr-area ${a === area ? 'is-on' : ''}`}>
                <button className="corr-area-btn" onClick={() => { setArea(a); setKey(null); setTick((t) => t + 1); }} aria-expanded={a === area}>
                  <i style={{ background: AREA_CHART[a].color }} />
                  <span className="corr-area-name">{AREA_CHART[a].short}</span>
                  <span className="corr-area-meta">
                    {sc?.total ? `${sc.correct ?? '—'}/${sc.total}` : ''}{w ? ` · ${w} erro${w > 1 ? 's' : ''}` : ''}
                  </span>
                  {nTopics > 0 && <span className={`corr-area-n ${nDone === nTopics ? 'is-full' : ''}`} title={`${nDone} de ${nTopics} temas corrigidos`}>{nDone === nTopics ? '✓ ' : ''}{nDone}/{nTopics}</span>}
                </button>
                {a === area && (
                  <div className="corr-topics">
                    {list.length === 0 && <p className="muted small corr-empty">Nenhum tema anotado nesta área.</p>}
                    {list.map((e) => {
                      const ok = e.status === 'corrigido';
                      const n = notedCount(sim, e.key);
                      return (
                        <div key={e.key} className={`corr-todo ${ok ? 'is-done' : ''} ${e.key === entry?.key ? 'is-on' : ''}`}>
                          <button
                            className="corr-check"
                            role="checkbox"
                            aria-checked={ok}
                            aria-label={`${e.name}: ${ok ? 'corrigido' : 'marcar como corrigido'}`}
                            title={ok ? 'Corrigido! Toque para desmarcar' : 'Marcar como corrigido'}
                            onClick={() => { setStatus(e, ok ? 'nao' : 'corrigido'); if (!ok) play('check'); }}
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" /></svg>
                          </button>
                          <button className="corr-topic" onClick={() => { setKey(e.key); setTick((t) => t + 1); setNavOpen(false); }}>
                            <span className="corr-topic-name">{e.name}</span>
                            <span className="corr-topic-n">{e.mistakes ? `${e.mistakes} erro${e.mistakes > 1 ? 's' : ''}` : 'revisar'}{n > 0 ? ` · ✎ ${n}` : ''}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button className="btn btn-quiet btn-sm corr-edit" onClick={() => onEdit(sim)}><Icon name="edit" size={14} /> Editar erros do simulado</button>
        </nav>

        <section className="corr-main">
          {!anyDetailed && (
            <div className="corr-hint corr-hint-sm">
              <p>Este simulado ainda não tem erros por tema. Use a setinha de cada grande área no registro para anotar os temas; eles entram sozinhos no mapa.</p>
              <button className="btn btn-primary btn-sm" onClick={() => onEdit(sim)}><Icon name="edit" size={15} /> Detalhar erros</button>
            </div>
          )}
          {entry && !(sim.map && view === 'mapa') && <TopicFacts entry={entry} sim={sim} />}
          <div className="corr-viewbar">
            {wide && (
              <button className={`btn btn-sm ${navOpen ? 'btn-secondary' : 'btn-quiet'}`} onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen}>
                <Icon name="list" size={15} /> Temas{entry ? `: ${entry.name}` : ''}
              </button>
            )}
            <span className="corr-viewbar-gap" />
            <button className="btn btn-quiet btn-sm" onClick={() => { setWide(!wide); setNavOpen(false); }} title={wide ? 'Voltar ao layout normal' : 'Esconde o menu e a lista de temas para sobrar espaço'}>
              <Icon name={wide ? 'close' : 'grid'} size={15} /> {wide ? 'Sair da tela ampla' : 'Tela ampla'}
            </button>
            <div className="seg" role="tablist" aria-label="Ver como">
              <button role="tab" aria-selected={view === 'mapa'} className={view === 'mapa' ? 'is-on' : ''} onClick={() => setView('mapa')}>Mapa</button>
              <button role="tab" aria-selected={view === 'resumo'} className={view === 'resumo' ? 'is-on' : ''} onClick={() => setView('resumo')}>Resumo</button>
            </div>
          </div>
          {sim.map && view === 'mapa' && (
            <div className="corr-stage">
            <SimMapEditor
              sim={sim}
              focusNodeId={tick ? focusId : null} // ao abrir, mostra o mapa inteiro
              focusTick={tick}
              reserveRight={entry && !factsMin ? 410 : 0}
              height={wide ? 'calc(100vh - 92px)' : 'min(680px, 74vh)'}
              onSelect={(n) => {
                if (!n || !sim.map) return;
                if (n.ref) {
                  const parent = sim.map.nodes.find((x) => x.id === n.parentId);
                  if (parent?.area) setArea(parent.area);
                  setKey(n.ref);
                } else if (n.area) {
                  setArea(n.area);
                  setKey(null);
                }
              }}
            />
            {/* o tema aberto flutua por cima do mapa: o mapa não sai do lugar */}
            {entry && (
              <aside className={`corr-float ${factsMin ? 'is-min' : ''}`} aria-label="Tema aberto">
                <button className="corr-float-toggle" onClick={() => setFactsMin(!factsMin)} title={factsMin ? 'Mostrar o tema' : 'Esconder para ver o mapa'}>
                  {factsMin ? <><Icon name="chevronD" size={14} /> {entry.name}</> : <Icon name="close" size={14} />}
                </button>
                {!factsMin && <TopicFacts entry={entry} sim={sim} />}
              </aside>
            )}
            </div>
          )}
          {sim.map && view === 'resumo' && (
            <MapSummary sections={[{ key: sim.id, map: sim.map }]} onNode={(_, id) => { setView('mapa'); setKey(sim.map!.nodes.find((n) => n.id === id)?.ref ?? key); setTick((t) => t + 1); }} />
          )}
        </section>
      </div>
    </div>
  );
}

function TopicFacts({ entry, sim }: { entry: TopicEntry; sim: Simulado }) {
  const { data } = useStore();
  const others = entry.topicId ? topicOccurrences(data.simulados, entry.topicId).filter((o) => o.sim.id !== sim.id && isMistake(o.group)) : [];
  const otherSims = [...new Map(others.map((o) => [o.sim.id, o.sim])).values()];
  const mistakes = entry.groups.filter(isMistake);
  const reviews = entry.groups.filter((g) => !isMistake(g));
  return (
    <div className="corr-work">
      <header className="corr-head">
        <div>
          <h2 className="corr-title">{entry.name}</h2>
          {otherSims.length > 0 && (
            <p className="muted small">Também errado em: {otherSims.map((s) => `${s.name} (${fmtShort(s.date)})`).join(' · ')}</p>
          )}
        </div>
      </header>

      <div className="corr-facts">
        {mistakes.map((g) => (
          <div key={g.id} className="corr-fact">
            {g.subtopic?.trim() && <strong className="corr-sub">{g.subtopic}</strong>}
            <ul>
              {(g.items?.length ? g.items : Array.from({ length: g.count }, (_, i) => ({ id: String(i), question: '', reason: g.reasons[0] ?? null, gap: '' }))).map((it, i) => (
                <li key={it.id}>
                  <span className="corr-err">Erro {i + 1}{it.question ? ` · Q${it.question.replace(/^q/i, '')}` : ''}</span>
                  {it.reason && <span className={`chip-mini chip-reason r-${it.reason} is-on`}>{reasonLong(it.reason)}</span>}
                  {it.gap ? <span className="corr-gap">{it.gap}</span> : <span className="muted small">sem lacuna anotada</span>}
                </li>
              ))}
            </ul>
            {g.note?.trim() && <p className="muted small">{g.note}</p>}
          </div>
        ))}
        {reviews.map((g) => (
          <div key={g.id} className="corr-fact is-review">
            <strong className="corr-sub">Acertei, mas quero revisar{g.subtopic?.trim() ? `: ${g.subtopic}` : ''}</strong>
            {g.note?.trim() && <p className="muted small">{g.note}</p>}
          </div>
        ))}
      </div>

    </div>
  );
}

/**
 * Tempo de correção do simulado. Cada registro vira uma sessão de estudo do
 * tipo "Correção de simulado": entra no total do dia, nas estatísticas, na
 * sequência e no Jardim. O tempo da prova (do registro do simulado) fica à
 * parte, então nada é contado duas vezes.
 */
/** cronômetro desenhado: o ponteiro dá a volta a cada minuto e o anel enche a cada hora da sessão */
function Stopwatch({ ms, running }: { ms: number; running: boolean }) {
  const sec = (ms / 1000) % 60;
  const hourFrac = (ms % 3600000) / 3600000;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className={`cw-watch ${running ? 'is-running' : ''}`} viewBox="0 0 100 108" aria-hidden="true">
      <rect x="42" y="2" width="16" height="9" rx="4" className="cw-w-crown" />
      <rect x="46" y="9" width="8" height="8" className="cw-w-crown" />
      <rect x="78" y="18" width="12" height="7" rx="3.5" transform="rotate(45 84 21.5)" className="cw-w-crown" />
      <circle cx="50" cy="62" r="44" className="cw-w-body" />
      <circle cx="50" cy="62" r={r} className="cw-w-track" />
      <circle cx="50" cy="62" r={r} className="cw-w-fill" strokeDasharray={`${c * hourFrac} ${c}`} transform="rotate(-90 50 62)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1="50" y1="33" x2="50" y2={i % 3 ? 36 : 38} transform={`rotate(${i * 30} 50 62)`} className="cw-w-tick" />
      ))}
      <line x1="50" y1="62" x2="50" y2="36" className="cw-w-hand" transform={`rotate(${sec * 6} 50 62)`} />
      <circle cx="50" cy="62" r="4.5" className="cw-w-dot" />
    </svg>
  );
}

function CorrectionLog({ sim }: { sim: Simulado }) {
  const { data, saveSession, deleteSession, saveSimulado, snapshot } = useStore();
  const ui = useUI();
  const timer = sim.correctionTimer;
  const running = !!timer?.runningSince;
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState<{ id: string; hh: string; mm: string } | null>(null);
  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const logs = data.sessions.filter((s) => s.type === 'correcao' && s.simuladoId === sim.id).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const logged = logs.reduce((a, s) => a + (s.minutes ?? 0), 0);
  // sessão atual: desde o último Iniciar/Continuar (vai para as horas do dia ao parar)
  const sessionMs = timerMs(timer, now);
  // total dedicado: tudo o que já foi registrado nesta correção + a sessão atual
  const ms = logged * 60000 + sessionMs;
  const todayLogged = logs.filter((l) => l.date === today()).reduce((a, s) => a + (s.minutes ?? 0), 0);
  const done = !!sim.correctionDoneAt;
  // sempre grava em cima da versão mais nova do simulado
  const update = (p: Partial<Simulado>) => {
    const cur = snapshot().simulados.find((x) => x.id === sim.id);
    if (cur) saveSimulado({ ...cur, ...p });
  };
  /** para o cronômetro e registra o tempo no dia (somando no registro do mesmo dia) */
  const stopAndSave = (extra: Partial<Simulado> = {}) => {
    const snap = snapshot();
    const { rows, timer: next } = commitTimer(snap.simulados.find((x) => x.id === sim.id)?.correctionTimer);
    let added = 0;
    for (const [date, minutes] of rows) {
      added += minutes;
      const prev = snap.sessions.find((s) => s.type === 'correcao' && s.simuladoId === sim.id && s.date === date);
      if (prev) saveSession({ ...prev, minutes: (prev.minutes ?? 0) + minutes });
      else saveSession({
        id: uid(), date, topicId: '', missionId: null, activityId: null, type: 'correcao', minutes,
        questions: null, correct: null, errorTopics: [], notes: '', createdAt: new Date().toISOString(), simuladoId: sim.id,
      } as Session);
    }
    update({ correctionTimer: next, ...extra });
    return added;
  };
  const setDone = (v: boolean) => update({ correctionDoneAt: v ? today() : null });
  const start = () => { update({ correctionTimer: startTimer(timer), correctionDoneAt: null }); play('pop'); };
  const stop = () => {
    const m = stopAndSave();
    play('check');
    ui.toast(m ? `Sessão de ${fmtMinutes(m)} registrada nas horas de hoje.` : 'Parado. A sessão teve menos de 1 minuto.');
  };
  const finish = () => {
    const m = stopAndSave({ correctionDoneAt: today() });
    play('check');
    ui.toast(`Correção de ${sim.name} finalizada · ${fmtMinutes(logged + m)} no total.`);
  };
  const saveEdit = () => {
    if (!editing) return;
    const s = logs.find((l) => l.id === editing.id);
    const m = (numOrNull(editing.hh) ?? 0) * 60 + (numOrNull(editing.mm) ?? 0);
    if (s) { if (m > 0) saveSession({ ...s, minutes: m }); else deleteSession(s.id); }
    setEditing(null);
  };

  return (
    <section className={`corr-log ${done ? 'is-done' : ''}`} aria-label="Registro da correção">
      <div className="corr-log-head">
        <div>
          <strong>Correção de {sim.name}</strong>
          <span className="muted small">
            {done ? `Concluída em ${fmtShort(sim.correctionDoneAt!)}` : 'Em andamento'}
            {logged ? ` · ${fmtMinutes(logged)} registrados` : ''}
          </span>
        </div>
        <label className="corr-log-check">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
          Correção concluída
        </label>
      </div>
      <div className={`corr-timer cw ${running ? 'is-running' : ''} ${done ? 'is-done' : ''}`}>
        <Stopwatch ms={sessionMs} running={running} />
        <div className="cw-now">
          <span className="cw-label">{running ? 'Corrigindo agora' : 'Sessão atual'}</span>
          <span className="corr-clock cw-clock" aria-live="off">{fmtClock(sessionMs)}</span>
          <span className="cw-hint">{running ? 'ao parar, vai para as horas de hoje' : done ? 'correção finalizada 🎉' : ms > 0 ? 'pronta para a próxima sessão' : 'aperte o play quando começar'}</span>
        </div>
        <div className="cw-stats">
          <span className="cw-stat cw-total" title="Tudo o que você já dedicou a esta correção"><b>{fmtMinutes(Math.floor(ms / 60000))}</b><small>no total</small></span>
          <span className="cw-stat cw-today" title="O que já entrou nas horas de hoje"><b>{fmtMinutes(todayLogged)}</b><small>hoje</small></span>
        </div>
        <div className="cw-actions">
          {running ? (
            <button className="cw-btn cw-stop" onClick={stop} title="Parar e registrar a sessão">
              <span className="cw-ico"><i className="cw-sq" /></span> Parar e registrar
            </button>
          ) : (
            <button className="cw-btn cw-play" onClick={start} title={ms > 0 ? 'Continuar a correção' : 'Começar a corrigir'}>
              <span className="cw-ico"><i className="cw-tri" /></span> {ms > 0 ? 'Continuar' : 'Iniciar'}
            </button>
          )}
          {ms > 0 && !done && <button className="cw-finish" onClick={finish}>🏁 Finalizar</button>}
        </div>
      </div>
      {logs.length > 0 && <span className="muted small corr-log-cap">Registros desta correção por dia · toque no tempo para ajustar</span>}
      {logs.length > 0 && (
        <ul className="corr-log-list">
          {logs.map((l) => (
            <li key={l.id}>
              <span className="mono">{fmtShort(l.date)}</span>
              {editing?.id === l.id ? (
                <form className="time-pair" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                  <input inputMode="numeric" value={editing.hh} onChange={(e) => setEditing({ ...editing, hh: e.target.value.replace(/\D/g, '') })} aria-label="Horas" /> h
                  <input inputMode="numeric" value={editing.mm} onChange={(e) => setEditing({ ...editing, mm: e.target.value.replace(/\D/g, '') })} aria-label="Minutos" autoFocus /> min
                  <button type="submit" className="btn btn-primary btn-sm">Ok</button>
                </form>
              ) : (
                <button className="corr-log-min" title="Ajustar o tempo deste dia" onClick={() => setEditing({ id: l.id, hh: String(Math.floor((l.minutes ?? 0) / 60)), mm: String((l.minutes ?? 0) % 60) })}>{fmtMinutes(l.minutes)}</button>
              )}
              <ConfirmButton className="icon-btn icon-btn-sm" label={<Icon name="trash" size={14} />} question="Apagar este tempo?" confirmLabel="Apagar" onConfirm={() => deleteSession(l.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
