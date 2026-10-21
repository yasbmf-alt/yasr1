import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { Icon } from '../components/Icon';
import { ConceptMapEditor } from '../components/ConceptMap';
import { BIG_AREAS, CORRECTION_STATUS, REASONS, type BigArea, type CorrectionStatus, type ErrorGroup, type Simulado } from '../types';
import { fmtShort } from '../logic/dates';
import { areaWrong, isMistake, topicOccurrences } from '../logic/simErrors';
import { AREA_CHART } from './Simulados';

const KEY_SIM = 'yasr1-corr-sim';
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

  // ao trocar de simulado, abre a primeira área com erros detalhados
  useEffect(() => {
    if (!sim) return;
    if (!area || !BIG_AREAS.includes(area)) setArea(BIG_AREAS.find((a) => detailed(sim, a)) ?? 'clinica');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.id]);

  const entries = sim && area ? entriesOf(sim, area, topicName) : [];
  const entry = entries.find((e) => e.key === key) ?? null;
  useEffect(() => {
    if (!entry && entries.length && key == null) setKey(entries[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim?.id, area, entries.length]);

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
  };
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

      <div className="corr-body">
        <nav className="corr-nav" aria-label="Grandes áreas e temas">
          {BIG_AREAS.map((a) => {
            const sc = sim.areas?.[a];
            const w = areaWrong(sim, a);
            const list = a === area ? entries : [];
            const nTopics = new Set((sim.errors ?? []).filter((g) => g.area === a).map((g) => g.topicId ?? g.id)).size;
            return (
              <div key={a} className={`corr-area ${a === area ? 'is-on' : ''}`}>
                <button className="corr-area-btn" onClick={() => { setArea(a); setKey(null); }} aria-expanded={a === area}>
                  <i style={{ background: AREA_CHART[a].color }} />
                  <span className="corr-area-name">{AREA_CHART[a].short}</span>
                  <span className="corr-area-meta">
                    {sc?.total ? `${sc.correct ?? '—'}/${sc.total}` : ''}{w ? ` · ${w} erro${w > 1 ? 's' : ''}` : ''}
                  </span>
                  {nTopics > 0 && <span className="corr-area-n">{nTopics}</span>}
                </button>
                {a === area && (
                  <div className="corr-topics">
                    {list.length === 0 && <p className="muted small corr-empty">Nenhum tema anotado nesta área.</p>}
                    {list.map((e) => (
                      <button key={e.key} className={`corr-topic ${e.key === entry?.key ? 'is-on' : ''}`} onClick={() => setKey(e.key)}>
                        <span className={`corr-dot st-${e.status}`} title={CORRECTION_STATUS.find((x) => x.id === e.status)?.label} />
                        <span className="corr-topic-name">{e.name}</span>
                        <span className="corr-topic-n">{e.mistakes ? `${e.mistakes} erro${e.mistakes > 1 ? 's' : ''}` : 'revisar'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button className="btn btn-quiet btn-sm corr-edit" onClick={() => onEdit(sim)}><Icon name="edit" size={14} /> Editar erros do simulado</button>
        </nav>

        <section className="corr-main">
          {!anyDetailed ? (
            <div className="corr-hint">
              <h3>Este simulado ainda não tem erros por tema</h3>
              <p>Abra o simulado e use a setinha de cada grande área para anotar os temas, os motivos e o que faltou saber. Depois é só voltar aqui.</p>
              <button className="btn btn-primary btn-sm" onClick={() => onEdit(sim)}><Icon name="edit" size={15} /> Detalhar erros</button>
            </div>
          ) : !entry ? (
            <div className="corr-hint"><p>Escolha um tema à esquerda para abrir o mapa conceitual.</p></div>
          ) : (
            <TopicWork entry={entry} sim={sim} onStatus={(st) => setStatus(entry, st)} />
          )}
        </section>
      </div>
    </div>
  );
}

function TopicWork({ entry, sim, onStatus }: { entry: TopicEntry; sim: Simulado; onStatus: (s: CorrectionStatus) => void }) {
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
        <div className="seg corr-status" role="radiogroup" aria-label="Correção">
          {CORRECTION_STATUS.map((c) => (
            <button key={c.id} role="radio" aria-checked={entry.status === c.id} className={entry.status === c.id ? 'is-on' : ''} onClick={() => onStatus(c.id)}>
              {c.label}
            </button>
          ))}
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

      {entry.topicId ? (
        <ConceptMapEditor topicId={entry.topicId} height="min(640px, 72vh)" />
      ) : (
        <div className="corr-hint"><p>Este erro não tem tema. Edite o simulado e dê um nome ao tema para abrir o mapa conceitual.</p></div>
      )}
    </div>
  );
}
