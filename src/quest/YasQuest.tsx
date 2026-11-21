// Yas Quest — modo história em pixel. O Dr. Bigode (gato médico) abre o jogo,
// e cada tema vira uma missão: 📜 Chamado → 📖 Dojo (leitura, 45 min flexíveis)
// → ⚔️ Arena (questões do banco) → 🩹 Cicatrizes (os erros e o porquê) →
// 👑 Chefão (revanche + extras difíceis) → 🔮 Oráculo (reforço com IA: questões
// novas + duelo de perguntas e respostas, que viram cartas no FSRS).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import { diffDays, today, uid } from '../logic/dates';
import { newCardState } from '../logic/fsrs';
import { resolveAssetUrl, uploadFile } from '../platform/platform';
import type { Session } from '../types';
import type { YlDoc } from '../yasland/types';
import {
  ISLANDS, ZONAS, FINAL, REVANCHE, EXAM, SHOP, STATE_ID, SAMPLE, CHAMADO, DOJO_NAGS, CICATRIZ_LINE, WIN_LINES, INTRO, SNOOZE,
  emptyState, islandOf, zonaOf, islandStat, routeOf, visitDone, frozen, buildFinal, buildRevanche, bossExtras, missionKey,
  xpFor, levelOf, parseImport, parseOraculo, isOld, oraculoPrompt, bigode, wearEmoji, last,
  type YqQuestion, type YqState, type Zona, type Why, type Island, type ImportResult, type PdfRef, type Deboche, type MissionProg, type Res, type Duel,
} from './data';
import { dossieCardId, isDossiePack, parseDossies, recoveryCards, type DossieCard, type DossieImport, type YqDossie } from './dossie';
import { Recuperacao, ResumoMestre } from './DossieViews';
import { BattleScreen, DEMO_CAST, DEMO_QUESTIONS, type BattleCast, type BattleQuestion, type TurnResult } from './battle';

type Screen = { s: 'intro' } | { s: 'hub' } | { s: 'mission'; tema: string } | { s: 'porto' } | { s: 'loja' } | { s: 'caderno' } | { s: 'config' } | { s: 'demo'; n: number };
type SaveSt = (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void;

const WHY: { id: Why; emoji: string; nome: string }[] = [
  { id: 'naosabia', emoji: '🤷', nome: 'Não sabia' },
  { id: 'confundi', emoji: '🔀', nome: 'Confundi' },
  { id: 'pegadinha', emoji: '🪤', nome: 'Pegadinha' },
  { id: 'desatencao', emoji: '😵', nome: 'Desatenção' },
];
const DOJO_MIN = 45;
const labelOf = (t: string) => (t === FINAL ? 'Ilha Final' : t === REVANCHE ? 'Revanche geral' : islandOf(t)?.short ?? t);
const toBQ = (q: YqQuestion): BattleQuestion => ({ id: q.id, tema: q.tema, zona: q.zona, origem: q.origem, enunciado: q.enunciado, alternativas: q.alternativas, gabarito: q.gabarito, comentario: q.comentario });
const castOf = (tema: string, boss = false, d?: YqDossie): BattleCast => {
  const i = islandOf(tema);
  const f = d?.dialogos;
  return {
    tema: labelOf(tema), slug: i?.slug ?? 'srag', monstro: i?.boss ?? (tema === FINAL ? 'Chefão da Prova' : boss ? 'Rei dos Fantasmas' : 'Fantasmas dos Erros'), serio: !!i?.serious,
    ...(f ? {
      falas: { entrada: f.transicao, acerto: f.acerto, erro: f.erro, erroRepetido: f.erroRepetido, durante: [...f.durante, ...f.problema], vitoria: f.vitoria, derrota: f.derrota },
      cartoesDe: Object.fromEntries(Object.entries(d!.mapa.questoes).map(([qid, m]) => [`yl:yq:q:${qid}`, m.cartoes])),
    } : {}),
  };
};
const emojiOf = (t: string) => (t === FINAL ? '🏥' : t === REVANCHE ? '👻' : islandOf(t)?.bossEmoji ?? '⭐');

// ── Arte em pixel ──────────────────────────────────────────────

/** emoji grande e nítido dentro de um orbe (mesmo nome antigo para não mexer no resto) */
function PixelEmoji({ e, size = 64, className }: { e: string; size?: number; res?: number; className?: string }) {
  return <span className={`px-emoji ${className ?? ''}`} style={{ fontSize: Math.round(size * 0.82), width: size, height: size }} aria-hidden="true">{e}</span>;
}

/** Dr. Bigode: gato médico num orbe brilhante, com estetoscópio e o acessório da loja */
function BigodeSprite({ size = 72, st }: { size?: number; st?: YqState }) {
  const acc = st ? wearEmoji(st, 'cat') : '';
  return (
    <span className="px-bigode" style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }} aria-hidden="true">
      <span className="px-bigode-face">🐱</span>
      <span className="px-bigode-steth" style={{ fontSize: Math.round(size * 0.3) }}>🩺</span>
      {acc && <span className="px-bigode-acc" style={{ fontSize: Math.round(size * 0.34) }}>{acc}</span>}
    </span>
  );
}

/** caixa de diálogo de RPG com texto digitando; toque completa / avança */
function Dialog({ name = 'DR. BIGODE', lines, onDone, children, serious }: { name?: string; lines: string[]; onDone?: () => void; children?: React.ReactNode; serious?: boolean }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const line = lines[Math.min(i, lines.length - 1)] ?? '';
  const full = n >= line.length;
  useEffect(() => { setI(0); setN(0); }, [lines.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (full) return undefined;
    const t = window.setInterval(() => setN((x) => Math.min(line.length, x + 2)), 28);
    return () => window.clearInterval(t);
  }, [line, full]);
  const last = i >= lines.length - 1;
  const tap = () => {
    if (!full) { setN(line.length); return; }
    if (!last) { setI(i + 1); setN(0); play('pop'); return; }
    onDone?.();
  };
  return (
    <div className={`px-dialog ${serious ? 'is-serious' : ''}`}>
      <span className="px-dialog-name">{serious ? 'GUIA' : name}</span>
      <button className="px-dialog-text" onClick={tap} aria-label="Avançar diálogo">
        {line.slice(0, n)}
        {full && (!last || onDone) && <span className="px-dialog-next">▼</span>}
      </button>
      {full && last && children && <div className="px-dialog-choices">{children}</div>}
    </div>
  );
}

function PxBtn({ children, onClick, kind = 'main', disabled }: { children: React.ReactNode; onClick?: () => void; kind?: 'main' | 'alt' | 'ghost' | 'gold'; disabled?: boolean }) {
  return <button className={`px-btn px-btn-${kind}`} onClick={() => { play('pop'); onClick?.(); }} disabled={disabled}>{children}</button>;
}

function Scene({ children, kind = 'day' }: { children: React.ReactNode; kind?: 'day' | 'night' | 'dojo' | 'arena' | 'oracle' }) {
  return (
    <div className={`px-scene px-sc-${kind}`}>
      <span className="px-cloud c1" aria-hidden="true" /><span className="px-cloud c2" aria-hidden="true" /><span className="px-cloud c3" aria-hidden="true" />
      <div className="px-scene-body">{children}</div>
      <span className="px-ground" aria-hidden="true" />
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────

export function YasQuest() {
  const store = useStore();
  const { data, saveYl, snapshot } = store;
  const ui = useUI();
  const docs = data.yasland ?? [];
  const questions = useMemo(() => (docs as unknown as { kind?: string }[]).filter((d) => d.kind === 'yq-q') as unknown as YqQuestion[], [docs]);
  const st: YqState = { ...emptyState(), ...((docs.find((d) => d.id === STATE_ID) as unknown as YqState) ?? {}) };
  const dossies = useMemo(() => (docs as unknown as { kind?: string }[]).filter((d) => d.kind === 'yq-dossie') as unknown as YqDossie[], [docs]);
  const dossieOf = (tema: string) => dossies.find((d) => d.tema === tema);
  const byTema = useMemo(() => {
    const m = new Map<string, YqQuestion[]>();
    for (const q of questions) m.set(q.tema, [...(m.get(q.tema) ?? []), q]);
    return m;
  }, [questions]);

  const freshState = (): YqState => ({ ...emptyState(), ...((snapshot().yasland ?? []).find((d) => d.id === STATE_ID) as unknown as YqState) });
  const saveSt: SaveSt = (p) => {
    const cur = freshState();
    const patch = typeof p === 'function' ? p(cur) : p;
    saveYl({ ...cur, ...patch } as unknown as YlDoc);
  };
  const saveQ = (q: YqQuestion) => saveYl(q as unknown as YlDoc);
  const markVisit = (tema: string, steps: ('estudar' | 'batalha' | 'grimorio')[]) => saveSt((s) => {
    const d = today();
    const day = { ...(s.visits[d] ?? {}) };
    day[tema] = { ...(day[tema] ?? {}), ...Object.fromEntries(steps.map((x) => [x, true])) };
    return { visits: { ...s.visits, [d]: day } };
  });
  // o tempo do jogo entra nas horas do dia (pote do Painel)
  const logSession = (type: 'leitura' | 'questoes', minutes: number, tema: string, q?: { n: number; ok: number }) => {
    if (minutes <= 0 && !q) return;
    const s: Session = {
      id: uid(), date: today(), topicId: '', missionId: null, activityId: null, type, minutes: Math.max(1, Math.round(minutes)),
      questions: q?.n ?? null, correct: q?.ok ?? null, errorTopics: [], notes: `Yas Quest · ${labelOf(tema)}`, createdAt: new Date().toISOString(),
    };
    store.saveSession(s);
  };
  const makeCard = (q: YqQuestion, silent = false) => {
    if (q.cardId && snapshot().cards.some((c) => c.id === q.cardId)) { if (!silent) ui.toast('Essa já virou carta 🃏'); return; }
    const deckId = ensureDeck(q.tema);
    const cardId = uid();
    const enun = q.enunciado.length > 420 ? `${q.enunciado.slice(0, 420)}…` : q.enunciado;
    store.saveCard({
      id: cardId, deckId, tags: ['yasquest', q.zona], fsrs: newCardState(), createdAt: new Date().toISOString(),
      front: `${zonaOf(q.zona).emoji} ${enun}`, back: `${q.gabarito}) ${q.alternativas[q.gabarito]}${q.comentario ? `\n\n${q.comentario}` : ''}`,
    });
    saveQ({ ...q, cardId });
    if (!silent) { play('flip'); ui.toast('🃏 Virou carta de feitiço! Ela está nos seus flashcards.'); }
  };
  const ensureDeck = (tema: string) => {
    const s = freshState();
    let deckId = s.decks[tema];
    if (!deckId || !snapshot().decks.some((d) => d.id === deckId)) {
      deckId = uid();
      store.saveDeck({ id: deckId, name: `🃏 Yas Quest · ${labelOf(tema)}`, area: 'clinica', topicId: null, createdAt: new Date().toISOString() });
      saveSt((c) => ({ decks: { ...c.decks, [tema]: deckId! } }));
    }
    return deckId;
  };
  // flashcards do dossiê → FSRS com id fixo: o que já existe não é duplicado nem perde a revisão
  const hasCard = (tema: string, c: DossieCard) => snapshot().cards.some((x) => x.id === dossieCardId(tema, c.id));
  const saveDossieCards = (tema: string, cards: DossieCard[], silent = false) => {
    const fresh = cards.filter((c) => !hasCard(tema, c));
    if (!fresh.length) { if (!silent) ui.toast('Esses cartões já estão nos seus flashcards 🃏'); return 0; }
    const deckId = ensureDeck(tema);
    for (const c of fresh) {
      const z = c.zonas[0];
      store.saveCard({ id: dossieCardId(tema, c.id), deckId, tags: ['yasquest', 'dossie', c.subtopico, ...c.zonas], fsrs: newCardState(), createdAt: new Date().toISOString(), front: `${z ? `${zonaOf(z).emoji} ` : ''}${c.pergunta}`, back: c.resposta });
    }
    if (!silent) { play('flip'); ui.toast(`🃏 ${fresh.length} cartões foram para os seus flashcards.`); }
    return fresh.length;
  };
  const saveDuelCards = (tema: string, duels: Duel[]) => {
    const deckId = ensureDeck(tema);
    for (const d of duels) store.saveCard({ id: uid(), deckId, tags: ['yasquest', 'oraculo', d.zona], fsrs: newCardState(), createdAt: new Date().toISOString(), front: `${zonaOf(d.zona).emoji} ${d.pergunta}`, back: d.resposta });
  };

  const [screen, setScreen] = useState<Screen>(() => {
    let seen = false;
    try { seen = !!sessionStorage.getItem('yq-intro'); } catch { /* ok */ }
    return seen ? { s: 'hub' } : { s: 'intro' };
  });
  const go = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0 }); };

  return (
    <div className="page yq px">
      {screen.s !== 'intro' && <Hud st={st} onGo={go} current={screen.s} />}
      {screen.s === 'intro' && <Intro st={st} onStart={() => { try { sessionStorage.setItem('yq-intro', '1'); } catch { /* ok */ } saveSt({ introDay: today() }); play('mission'); go({ s: 'hub' }); }} />}
      {screen.s === 'hub' && <Hub st={st} byTema={byTema} total={questions.length} saveSt={saveSt} onMission={(t) => { play('ignite'); go({ s: 'mission', tema: t }); }} onGo={go} />}
      {screen.s === 'mission' && (
        <Mission
          key={screen.tema}
          tema={screen.tema}
          st={st}
          all={questions}
          pool={screen.tema === FINAL || screen.tema === REVANCHE ? questions : byTema.get(screen.tema) ?? []}
          saveSt={saveSt}
          saveQ={saveQ}
          markVisit={markVisit}
          logSession={logSession}
          makeCard={makeCard}
          saveDuelCards={saveDuelCards}
          dossie={dossieOf(screen.tema)}
          saveDossieCards={saveDossieCards}
          hasCard={hasCard}
          onHub={() => go({ s: 'hub' })}
          onPorto={() => go({ s: 'porto' })}
          onNext={(t) => go({ s: 'mission', tema: t })}
        />
      )}
      {screen.s === 'porto' && <Porto questions={questions} dossies={dossies} onBack={() => go({ s: 'hub' })} saveQ={saveQ} saveDossie={(d) => saveYl(d as unknown as YlDoc)} saveDossieCards={saveDossieCards} />}
      {screen.s === 'loja' && <Loja st={st} saveSt={saveSt} onBack={() => go({ s: 'hub' })} />}
      {screen.s === 'caderno' && <Caderno qs={questions} st={st} onBack={() => go({ s: 'hub' })} makeCard={makeCard} />}
      {screen.s === 'config' && <Config st={st} saveSt={saveSt} onBack={() => go({ s: 'hub' })} onIntro={() => go({ s: 'intro' })} onDemo={() => go({ s: 'demo', n: 1 })} />}
      {screen.s === 'demo' && (
        // batalha de demonstração: questões de exemplo, nada é salvo
        <BattleScreen key={screen.n} cast={DEMO_CAST} questions={DEMO_QUESTIONS} title="Batalha de demonstração" onExit={() => go({ s: 'hub' })} onFinish={() => go({ s: 'hub' })} finishLabel="Voltar ao mapa" onAgain={() => go({ s: 'demo', n: screen.n + 1 })} />
      )}
    </div>
  );
}

// ── HUD ────────────────────────────────────────────────────────

function Hud({ st, onGo, current }: { st: YqState; onGo: (s: Screen) => void; current: string }) {
  const lv = levelOf(st.xp);
  return (
    <header className="px-hud">
      <button className="px-hud-score" onClick={() => onGo({ s: 'hub' })} aria-label="Mapa de missões">
        <span>SCORE</span><b>{String(st.xp).padStart(5, '0')}</b>
      </button>
      <span className="px-hud-lv">NV {lv}</span>
      <span className="px-hud-coins"><PixelEmoji e="🪙" size={18} res={12} /> {st.coins}</span>
      <nav className="px-hud-nav" aria-label="Menu do jogo">
        {([['hub', '🗺️', 'Missões'], ['caderno', '🩹', 'Cicatrizes'], ['porto', '⚓', 'Porto'], ['loja', '🛍️', 'Loja'], ['config', '⚙️', 'Ajustes']] as const).map(([s, e, l]) => (
          <button key={s} className={current === s || (s === 'hub' && current === 'mission') ? 'is-on' : ''} onClick={() => onGo({ s } as Screen)} aria-label={l} title={l}>
            <PixelEmoji e={e} size={22} res={12} />
          </button>
        ))}
      </nav>
    </header>
  );
}

// ── Abertura ───────────────────────────────────────────────────

function Intro({ st, onStart }: { st: YqState; onStart: () => void }) {
  const dias = diffDays(EXAM.date, today());
  const [snooze, setSnooze] = useState<string | null>(null);
  const lines = snooze ? [snooze, 'Vamos nos preparar pra prova?'] : INTRO(dias);
  return (
    <Scene kind="night">
      <div className="px-title">
        <span className="px-title-logo">YAS<br />QUEST</span>
        <span className="px-title-sub">O arquipélago da R1</span>
      </div>
      <motion.div className="px-hero" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        <BigodeSprite size={104} st={st} />
      </motion.div>
      <Dialog lines={lines}>
        <PxBtn onClick={onStart}>▶ BORA!</PxBtn>
        <PxBtn kind="ghost" onClick={() => { play('meow'); setSnooze(SNOOZE[Math.floor(Math.random() * SNOOZE.length)]); }}>Mais 5 minutinhos…</PxBtn>
      </Dialog>
    </Scene>
  );
}

// ── Mapa de missões (hub) ──────────────────────────────────────

const STEP_ICON: Record<string, string> = { chamado: '📜', dojo: '📖', arena: '⚔️', cicatrizes: '🩹', chefao: '👑', oraculo: '🔮', fim: '🏆' };

function Hub({ st, byTema, total, saveSt, onMission, onGo }: { st: YqState; byTema: Map<string, YqQuestion[]>; total: number; saveSt: SaveSt; onMission: (t: string) => void; onGo: (s: Screen) => void }) {
  const d = today();
  const r = routeOf(st, d);
  const fz = frozen();
  const visits = st.visits[d] ?? {};
  const doneAll = !!r && r.list.length > 0 && r.list.every((t) => visitDone(visits[t], t));
  const current = r?.list.find((t) => !visitDone(visits[t], t));
  const [line] = useState(() => bigode(st.deboche, 'abrir'));
  useEffect(() => {
    if (doneAll && !st.nightShown?.[d]) { play('chapter'); saveSt((s) => ({ nightShown: { ...(s.nightShown ?? {}), [d]: true } })); }
  }, [doneAll]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-hub">
      <Scene kind={doneAll || fz ? 'night' : 'day'}>
        <div className="px-hub-top">
          <BigodeSprite size={64} st={st} />
          <Dialog lines={[fz ? 'Modo pré-prova: nada novo agora. Almoça, respira e vai. Você treinou pra isso.' : doneAll ? bigode(st.deboche, 'noite') : total === 0 ? 'O arquipélago tá vazio. Passa no ⚓ Porto e traz as questões, senão eu jogo sozinho.' : current ? `${line} Próxima missão: ${labelOf(current)}.` : line]} />
        </div>
        {doneAll && (
          <motion.div className="px-nightok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <PixelEmoji e="🌙" size={72} res={16} />
            <b>NOITE LIBERADA!</b>
          </motion.div>
        )}
      </Scene>

      {r && !fz && (
        <section className="px-panel">
          <div className="px-panel-head">
            <b>🗺️ ROTA DE {r.label.toUpperCase()}</b>
            {r.family.length > 0 && (
              <label className="px-fam"><input type="checkbox" checked={r.fam} onChange={(e) => saveSt((s) => ({ family: { ...s.family, [d]: e.target.checked } }))} /> dia com família</label>
            )}
          </div>
          <ol className="px-path">
            {r.list.map((t, i) => {
              const ok = visitDone(visits[t], t);
              const prog = st.missions?.[missionKey(t, d)];
              const cur = t === current;
              return (
                <li key={t} className={`${ok ? 'is-done' : ''} ${cur ? 'is-cur' : ''}`}>
                  <button onClick={() => onMission(t)}>
                    <span className="px-stage-n">{i + 1}</span>
                    <PixelEmoji e={ok ? '🚩' : emojiOf(t)} size={40} res={16} />
                    <span className="px-stage-name">{labelOf(t)}{islandOf(t)?.capital ? <i> ★3 garantidas</i> : null}</span>
                    <span className="px-stage-st">{ok ? 'OK!' : prog ? STEP_ICON[prog.step] : cur ? '▶' : ''}</span>
                  </button>
                  {cur && r.list.length > 1 && <button className="px-skip" onClick={() => saveSt((s) => ({ skipped: { ...s.skipped, [d]: [...(s.skipped[d] ?? []).filter((x) => x !== t), t] } }))}>pular ↓</button>}
                </li>
              );
            })}
          </ol>
          {current && <PxBtn kind="gold" onClick={() => onMission(current)}>▶ JOGAR: {labelOf(current).toUpperCase()}</PxBtn>}
        </section>
      )}

      <section className="px-panel">
        <div className="px-panel-head"><b>🏝️ TODAS AS ILHAS</b><small>{total} monstros no arquipélago</small></div>
        <div className="px-isles">
          {ISLANDS.map((i) => {
            const s = islandStat(byTema.get(i.tema) ?? []);
            return (
              <button key={i.tema} className={`px-isle ${i.capital ? 'is-capital' : ''} ${s.fog ? 'is-fog' : ''}`} onClick={() => !fz && onMission(i.tema)} disabled={fz}>
                <PixelEmoji e={s.fog ? '☁️' : i.bossEmoji} size={40} res={16} />
                <b>{i.short}</b>
                <small>{'★'.repeat(i.prio)} · {Math.round(s.pct * 100)}%</small>
                <span className="px-bar"><span style={{ width: `${Math.round(s.pct * 100)}%` }} /></span>
              </button>
            );
          })}
        </div>
        {!fz && <PxBtn kind="alt" onClick={() => onMission(FINAL)}>🏥 ILHA FINAL</PxBtn>}
        <PxBtn kind="ghost" onClick={() => onGo({ s: 'demo', n: 1 })}>🎮 Batalha de demonstração</PxBtn>
      </section>
      {total === 0 && <PxBtn kind="gold" onClick={() => onGo({ s: 'porto' })}>⚓ IR PRO PORTO</PxBtn>}
    </div>
  );
}

// ── Missão ─────────────────────────────────────────────────────

function Mission({ tema, st, all, pool, saveSt, saveQ, markVisit, logSession, makeCard, saveDuelCards, dossie, saveDossieCards, hasCard, onHub, onPorto, onNext }: {
  tema: string; st: YqState; all: YqQuestion[]; pool: YqQuestion[]; saveSt: SaveSt; saveQ: (q: YqQuestion) => void;
  markVisit: (t: string, s: ('estudar' | 'batalha' | 'grimorio')[]) => void; logSession: (type: 'leitura' | 'questoes', min: number, tema: string, q?: { n: number; ok: number }) => void;
  makeCard: (q: YqQuestion, silent?: boolean) => void; saveDuelCards: (tema: string, d: Duel[]) => void; onHub: () => void; onPorto: () => void; onNext: (t: string) => void;
  dossie?: YqDossie; saveDossieCards: (tema: string, cs: DossieCard[], silent?: boolean) => number; hasCard: (tema: string, c: DossieCard) => boolean;
}) {
  const ui = useUI();
  const key = missionKey(tema);
  const special = tema === FINAL || tema === REVANCHE;
  const island: Island | undefined = islandOf(tema);
  const serious = !!island?.serious;
  const prog: MissionProg = st.missions?.[key] ?? { step: 'chamado' };
  const updProg = (f: (cur: MissionProg) => Partial<MissionProg>) => saveSt((s) => {
    const cur = (s.missions ?? {})[key] ?? { step: 'chamado' as const };
    return { missions: { ...(s.missions ?? {}), [key]: { ...cur, ...f(cur) } } };
  });
  const setProg = (p: Partial<MissionProg>) => updProg(() => p);
  const qmap = useMemo(() => new Map(all.map((q) => [q.id, q])), [all]);
  const wrongList = [...(prog.aRes ?? []), ...(prog.bRes ?? [])].filter((r) => !r.ok);
  const uniqWrong = [...new Map(wrongList.map((r) => [r.id, r])).values()].map((r) => ({ q: qmap.get(r.id)!, why: r.why, pick: r.pick })).filter((x) => x.q);

  const buildArena = () => {
    if (tema === FINAL) return buildFinal(all).map((q) => q.id);
    if (tema === REVANCHE) return buildRevanche(all).map((q) => q.id);
    // arena: as que você nunca fez e as que errou primeiro, até 12
    const fresh = pool.filter((q) => !q.hist.length);
    const wrong = pool.filter((q) => q.hist.length && !last(q).ok);
    const rest = pool.filter((q) => q.hist.length && last(q).ok);
    return [...fresh, ...wrong, ...rest].slice(0, 12).map((q) => q.id);
  };
  // cada resposta da batalha: histórico da questão + progresso da missão (XP e moedas seguem em silêncio)
  const answered = (r: TurnResult, boss: boolean) => {
    const q = qmap.get(r.q.id);
    if (!q) return;
    saveQ({ ...q, hist: [...q.hist, { at: new Date().toISOString(), pick: r.pick, ok: r.ok }] });
    if (r.ok) { const xp = xpFor(q, q.hist.some((h) => !h.ok), boss); saveSt((s) => ({ xp: s.xp + xp, coins: s.coins + 1 })); }
    const res: Res = { id: q.id, ok: r.ok, pick: r.pick };
    if (boss) updProg((c) => ({ bRes: [...(c.bRes ?? []), res] }));
    else if (!r.revisao) updProg((c) => ({ aRes: [...(c.aRes ?? []).filter((x) => x.id !== res.id), res] }));
  };
  const toArena = () => setProg({ step: 'arena', arena: buildArena(), aRes: [], arenaStart: new Date().toISOString() });
  const nextInRoute = () => {
    const r = routeOf(st);
    const v = st.visits[today()] ?? {};
    return r?.list.find((t) => t !== tema && !visitDone(v[t], t));
  };

  // 📜 Chamado
  if (prog.step === 'chamado') {
    const lines = special
      ? [tema === FINAL ? 'Ilha Final. O Hospital da Prova. SRAG, suas revanches e as doses de todas as ilhas.' : 'Revanche geral: todos os fantasmas dos seus erros, juntos. Que lindo.', 'Sem Dojo agora: direto pra Arena. Bora?']
      : dossie
        ? [...dossie.dialogos.apresentacao, ...dossie.story, `Primeiro o Dojo: resumo-mestre e ${DOJO_MIN} min de leitura (pode parar antes ou ir além). Depois a Arena.`]
        : [...(CHAMADO[tema] ?? [`Missão: ${tema}.`]).slice(0, 2), `Primeiro o Dojo: ${DOJO_MIN} min de leitura (pode parar antes ou ir além). Depois a Arena.`];
    const accept = () => (special ? toArena() : setProg({ step: 'dojo', dojoStart: new Date().toISOString() }));
    return (
      <Scene kind="day">
        <button className="px-back" onClick={onHub}>◀ MAPA</button>
        <div className="px-chamado">
          <span className="px-mission-tag">📜 O CHAMADO</span>
          <h2 className="px-h">{labelOf(tema).toUpperCase()}</h2>
          {dossie && <span className="px-ilha">{dossie.ilha}</span>}
          {island?.capital && <span className="px-gold">★ 3 QUESTÕES GARANTIDAS ★</span>}
          <div className="px-vs">
            <BigodeSprite size={80} st={st} />
            <span className="px-vs-x">VS</span>
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><PixelEmoji e={emojiOf(tema)} size={88} res={18} /></motion.span>
          </div>
          {island && <p className="px-boss-name">{island.boss}</p>}
        </div>
        {dossie && <button className="dz-skip" onClick={accept}>pular história ▸▸</button>}
        <Dialog lines={lines} serious={serious}>
          <PxBtn kind="gold" onClick={accept}>⚔️ ACEITAR MISSÃO</PxBtn>
          <PxBtn kind="ghost" onClick={onHub}>Depois</PxBtn>
        </Dialog>
      </Scene>
    );
  }

  // 📖 Dojo
  if (prog.step === 'dojo') {
    return <Dojo tema={tema} island={island!} st={st} dossie={dossie} saveSt={saveSt} start={prog.dojoStart ?? new Date().toISOString()} onBack={onHub} onDone={(min) => {
      logSession('leitura', min, tema);
      markVisit(tema, ['estudar']);
      setProg({ dojoMin: min });
      toArena();
      play('ignite');
    }} />;
  }

  // ⚔️ Arena
  if (prog.step === 'arena') {
    const qs = (prog.arena ?? []).map((id) => qmap.get(id)).filter(Boolean) as YqQuestion[];
    if (!qs.length) {
      return (
        <Scene kind="arena">
          <button className="px-back" onClick={onHub}>◀ MAPA</button>
          <Dialog lines={[special ? 'Não achei monstros pra essa arena ainda. Joga umas ilhas primeiro.' : 'Essa ilha ainda não tem monstros (questões). Importa no Porto, ou pede pro Oráculo criar do zero.']}>
            <PxBtn onClick={onPorto}>⚓ PORTO</PxBtn>
            {!special && <PxBtn kind="alt" onClick={() => setProg({ step: 'oraculo' })}>🔮 ORÁCULO</PxBtn>}
            <PxBtn kind="ghost" onClick={onHub}>Voltar</PxBtn>
          </Dialog>
        </Scene>
      );
    }
    const doneIds = new Set((prog.aRes ?? []).map((r) => r.id));
    const left = qs.filter((q) => !doneIds.has(q.id));
    return (
      <BattleScreen
        key="arena"
        cast={castOf(tema, false, dossie)}
        title={`Arena · ${labelOf(tema)}`}
        questions={left.map(toBQ)}
        onAnswer={(r) => answered(r, false)}
        onExit={onHub}
        finishLabel="Ver cicatrizes"
        onFinish={() => {
          const allRes = st.missions?.[key]?.aRes ?? [];
          const min = prog.arenaStart ? Math.min(120, (Date.now() - new Date(prog.arenaStart).getTime()) / 60000) : allRes.length * 2;
          logSession('questoes', min, tema, { n: allRes.length, ok: allRes.filter((r) => r.ok).length });
          setProg({ step: 'cicatrizes' });
          play('page');
        }}
      />
    );
  }

  // 🩹 Cicatrizes
  if (prog.step === 'cicatrizes') {
    const aRes = prog.aRes ?? [];
    const wrong = aRes.filter((r) => !r.ok).map((r) => ({ r, q: qmap.get(r.id)! })).filter((x) => x.q);
    const ok = aRes.length - wrong.length;
    const startBoss = () => {
      const wrongIds = wrong.map((x) => x.q.id);
      const extras = special ? (tema === FINAL ? bossExtras(all.filter((q) => q.tema === 'SRAG'), prog.arena ?? [], 2) : []) : bossExtras(pool, prog.arena ?? [], 3);
      const queue = [...wrongIds, ...extras.map((q) => q.id)];
      if (!queue.length) { setProg({ step: special ? 'fim' : 'oraculo' }); return; }
      setProg({ step: 'chefao', boss: queue, bRes: [] });
      play('ignite');
    };
    return (
      <Scene kind="dojo">
        <button className="px-back" onClick={onHub}>◀ MAPA</button>
        <div className="px-cic">
          <span className="px-mission-tag">🩹 CADERNO DAS CICATRIZES</span>
          <p className="px-score-line"><b>{ok}</b>/{aRes.length} acertos na Arena</p>
          {wrong.length === 0 ? <p className="px-empty">Nenhuma cicatriz. Pele de pêssego.</p> : (
            <ul className="px-cic-list">
              {wrong.map(({ r, q }) => {
                const w = WHY.find((x) => x.id === r.why);
                return (
                  <li key={q.id}>
                    <details>
                      <summary><span className="px-chip">{zonaOf(q.zona).emoji} {zonaOf(q.zona).nome}</span>{w && <span className="px-chip is-why">{w.emoji} {w.nome}</span>}<span className="px-cic-enun">{q.enunciado.slice(0, 100)}…</span></summary>
                      <p><b>Você:</b> {r.pick}) {q.alternativas[r.pick]}</p>
                      <p><b>Certa: {q.gabarito})</b> {q.alternativas[q.gabarito]}</p>
                      {q.comentario && <p className="px-coment">{q.comentario}</p>}
                      {!w && (
                        <div className="px-why">{WHY.map((x) => <button key={x.id} onClick={() => setProg({ aRes: aRes.map((y) => (y.id === q.id ? { ...y, why: x.id } : y)) })}>{x.emoji} {x.nome}</button>)}</div>
                      )}
                      <button className="px-mini" onClick={() => makeCard(q)}>{q.cardId ? '🃏 já é carta' : '🃏 virar carta de feitiço'}</button>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {dossie && wrong.length > 0 && (
          <Recuperacao d={dossie} cards={recoveryCards(dossie, wrong.map(({ q }) => ({ qid: q.qid, zona: q.zona })))} inDeck={(c) => hasCard(tema, c)} onToDeck={(cs) => saveDossieCards(tema, cs)} />
        )}
        <Dialog lines={[CICATRIZ_LINE(wrong.length), wrong.length ? 'O chefão vai usar exatamente essas contra você. E umas extras difíceis. Pronta?' : 'O chefão vai trazer umas difíceis extras. Pronta?']} serious={serious}>
          <PxBtn kind="gold" onClick={startBoss}>👑 ENFRENTAR O CHEFÃO</PxBtn>
        </Dialog>
      </Scene>
    );
  }

  // 👑 Chefão
  if (prog.step === 'chefao') {
    const queue = (prog.boss ?? []).map((id) => qmap.get(id)).filter(Boolean) as YqQuestion[];
    return (
      <BattleScreen
        key="chefao"
        cast={castOf(tema, true, dossie)}
        title={`Chefão · ${labelOf(tema)}`}
        questions={queue.map(toBQ)}
        onAnswer={(r) => answered(r, true)}
        onExit={onHub}
        onFinish={(sum) => {
          markVisit(tema, ['batalha', 'grimorio']);
          saveSt((s) => ({ waves: s.waves + 1, ...(island && sum.won ? { bossesBeaten: s.bossesBeaten.includes(tema) ? s.bossesBeaten : [...s.bossesBeaten, tema], coins: s.coins + 15 } : {}) }));
          setProg({ step: special ? 'fim' : 'oraculo', wins: (prog.wins ?? 0) + (sum.won ? 1 : 0) });
        }}
      />
    );
  }

  // 🔮 Oráculo
  if (prog.step === 'oraculo') {
    return <Oraculo tema={tema} st={st} wrong={uniqWrong} all={all} saveQ={saveQ} saveSt={saveSt} saveDuelCards={saveDuelCards} onBack={onHub} onDone={() => { setProg({ step: 'fim' }); markVisit(tema, ['estudar', 'batalha', 'grimorio']); }} />;
  }

  // 🏆 Fim
  const next = nextInRoute();
  return (
    <WinScreen st={st} title="MISSÃO COMPLETA!" sub={labelOf(tema)} onGo={() => { markVisit(tema, ['estudar', 'batalha', 'grimorio']); if (next) onNext(next); else onHub(); }} goLabel={next ? `▶ PRÓXIMA: ${labelOf(next).toUpperCase()}` : '▶ VOLTAR AO MAPA'}
      extra={<PxBtn kind="ghost" onClick={() => { setProg({ step: 'chamado', aRes: [], bRes: [], boss: [], arena: [] }); ui.toast('Missão reiniciada.'); }}>Jogar de novo</PxBtn>} />
  );
}

// ── Dojo (leitura) ─────────────────────────────────────────────

function Dojo({ tema, island, st, dossie, saveSt, start, onBack, onDone }: { tema: string; island: Island; st: YqState; dossie?: YqDossie; saveSt: SaveSt; start: string; onBack: () => void; onDone: (min: number) => void }) {
  const ui = useUI();
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState<string | null>(null);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const ms = Math.max(0, now - new Date(start).getTime());
  const min = ms / 60000;
  const over = min >= DOJO_MIN;
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const nag = DOJO_NAGS[Math.floor(min / 8) % DOJO_NAGS.length];
  const cfg = st.islands[tema] ?? {};
  const pdf = st.pdfs.find((p) => p.id === cfg.pdfId);
  const [cfgOpen, setCfgOpen] = useState(false);
  const openPdf = async () => {
    if (!pdf) { setCfgOpen(true); return; }
    const base = pdf.assetId ? await resolveAssetUrl(pdf.assetId) : pdf.url;
    if (!base) { ui.toast('Não consegui abrir o PDF. Confira o link.'); return; }
    window.open(cfg.page ? `${base.split('#')[0]}#page=${cfg.page}` : base, '_blank', 'noopener');
  };
  return (
    <Scene kind="dojo">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <div className="px-dojo">
        <span className="px-mission-tag">📖 TREINO NO DOJO</span>
        <h2 className="px-h">{island.short.toUpperCase()}</h2>
        <motion.span animate={{ rotate: over ? 0 : [0, 0, 180, 180] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.45, 0.5, 1] }}>
          <PixelEmoji e={over ? '⏰' : '⏳'} size={80} res={16} />
        </motion.span>
        <span className={`px-clock ${over ? 'is-over' : ''}`}>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span>
        <span className="px-bar px-bar-big"><span style={{ width: `${Math.min(100, (min / DOJO_MIN) * 100)}%` }} /></span>
        <small className="px-dojo-meta">{over ? `Passou dos ${DOJO_MIN} min. Pode continuar lendo ou ir pra Arena.` : `meta: ${DOJO_MIN} min · pode parar antes ou ir além`}</small>
        <div className="px-row">
          <PxBtn kind="alt" onClick={() => void openPdf()}>📖 ABRIR PDF</PxBtn>
          <PxBtn kind="gold" onClick={() => setEnding(String(Math.max(1, Math.round(Math.min(min, 180)))))}>✅ JÁ LI, BORA!</PxBtn>
        </div>
        {cfgOpen && <div className="px-cfg-inline"><IslandPdfCfg island={island} st={st} saveSt={saveSt} /></div>}
        {!cfgOpen && <button className="px-mini" onClick={() => setCfgOpen(true)}>📚 escolher PDF e página desta ilha</button>}
        {ending != null && (
          <div className="px-ending">
            <label>Tempo de leitura (entra nas suas horas): <input inputMode="numeric" value={ending} onChange={(e) => setEnding(e.target.value.replace(/\D/g, ''))} /> min</label>
            <PxBtn kind="gold" onClick={() => onDone(Number(ending) || 0)}>⚔️ IR PRA ARENA</PxBtn>
          </div>
        )}
      </div>
      <Dialog lines={[over ? 'Deu o tempo! Mas se tiver no embalo, continua. Eu espero. Reclamando, mas espero.' : dossie?.dialogos.preparacao[0] ?? nag]} serious={island.serious} />
      {dossie && dossie.resumo.length > 0 && <ResumoMestre d={dossie} />}
    </Scene>
  );
}

// ── YOU WIN ────────────────────────────────────────────────────

function WinScreen({ st, title, sub, onGo, goLabel, extra }: { st: YqState; title: string; sub: string; onGo: () => void; goLabel: string; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [line] = useState(() => WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]);
  useEffect(() => { const t = window.setTimeout(() => { setOpen(true); play('jingle'); }, 700); return () => window.clearTimeout(t); }, []);
  return (
    <Scene kind="day">
      <div className="px-win">
        <span className="px-sparkles" aria-hidden="true">{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 96}%`, top: `${(i * 23) % 60}%`, animationDelay: `${(i % 7) * 0.2}s` }}>✦</i>)}</span>
        <motion.b className="px-win-title" initial={{ scale: 0.3, y: -30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>{title}</motion.b>
        <span className="px-win-sub">{sub}</span>
        <motion.span className="px-chest" animate={open ? { y: [0, -10, 0] } : {}} transition={{ duration: 0.5 }}>
          <PixelEmoji e={open ? '💰' : '🎁'} size={110} res={18} />
          {open && <span className="px-coins-fly" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ animationDelay: `${i * 0.1}s`, left: `${20 + i * 15}%` }}>🪙</i>)}</span>}
        </motion.span>
        <span className="px-win-score">SCORE {String(st.xp).padStart(5, '0')}</span>
      </div>
      <Dialog lines={[line]}>
        <PxBtn kind="gold" onClick={onGo}>{goLabel}</PxBtn>
        {extra}
      </Dialog>
    </Scene>
  );
}

// ── Oráculo ────────────────────────────────────────────────────

function Oraculo({ tema, st, wrong, all, saveQ, saveSt, saveDuelCards, onBack, onDone }: {
  tema: string; st: YqState; wrong: { q: YqQuestion; why?: Why; pick?: string }[]; all: YqQuestion[]; saveQ: (q: YqQuestion) => void; saveSt: SaveSt; saveDuelCards: (tema: string, d: Duel[]) => void; onBack: () => void; onDone: () => void;
}) {
  const ui = useUI();
  const [text, setText] = useState('');
  const [duels, setDuels] = useState<Duel[] | null>(null);
  const prompt = oraculoPrompt(tema, wrong);
  const existing = useMemo(() => new Map(all.map((q) => [q.qid, q])), [all]);
  const parsed = useMemo(() => (text.trim() ? parseOraculo(text, existing) : null), [text, existing]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); play('paper'); ui.toast('🔮 Pedido copiado! Cole na IA e traga a resposta aqui.'); } catch { ui.toast('Não deu para copiar: selecione o texto.'); }
  };
  const invoke = () => {
    if (!parsed || parsed.error) return;
    parsed.q?.ok.forEach((q) => saveQ(q));
    if (parsed.duels.length) saveDuelCards(tema, parsed.duels);
    play('mission');
    ui.toast(`🔮 ${parsed.q?.ok.length ?? 0} questões novas na ilha · ${parsed.duels.length} cartas no FSRS`);
    if (parsed.duels.length) setDuels(parsed.duels); else onDone();
  };
  if (duels) return <DuelRun duels={duels} st={st} saveSt={saveSt} onDone={onDone} />;
  return (
    <Scene kind="oracle">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <div className="px-oracle">
        <span className="px-mission-tag">🔮 O ORÁCULO</span>
        <motion.span animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }} transition={{ repeat: Infinity, duration: 2.6 }}><PixelEmoji e="🔮" size={96} res={16} /></motion.span>
        <p className="px-oracle-txt">{wrong.length ? `O Oráculo leu suas ${wrong.length} cicatriz${wrong.length > 1 ? 'es' : ''} e vai criar um reforço sob medida: questões novas + duelo de perguntas e respostas.` : 'Sem cicatrizes, o Oráculo vai reforçar os pontos que mais caem e as pegadinhas clássicas.'}</p>
        <ol className="px-steps">
          <li><PxBtn kind="alt" onClick={copy}>📋 COPIAR PEDIDO</PxBtn> e cole numa IA (Claude, por exemplo).</li>
          <li>Cole aqui a resposta dela:</li>
        </ol>
        <textarea className="px-text" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "questoes": [ … ], "flashcards": [ … ] }' aria-label="Resposta da IA" />
        {parsed && (parsed.error ? <p className="px-err">⚠️ {parsed.error}</p> : (
          <p className="px-ok">✨ {parsed.q?.ok.length ?? 0} questões novas{parsed.q?.out.length ? ` (${parsed.q.out.length} de fora: ${parsed.q.out.slice(0, 2).map((o) => o.why).join('; ')})` : ''} · {parsed.duels.length} perguntas pro duelo</p>
        ))}
        <details className="px-prompt"><summary>ver o pedido</summary><pre>{prompt}</pre></details>
      </div>
      <Dialog lines={['O Oráculo não erra. Quem erra é você. Por isso ele existe.']}>
        <PxBtn kind="gold" disabled={!parsed || !!parsed.error || (!parsed.q?.ok.length && !parsed.duels.length)} onClick={invoke}>✨ INVOCAR REFORÇO</PxBtn>
        <PxBtn kind="ghost" onClick={onDone}>Pular por agora</PxBtn>
      </Dialog>
    </Scene>
  );
}

function DuelRun({ duels, st, saveSt, onDone }: { duels: Duel[]; st: YqState; saveSt: SaveSt; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [score, setScore] = useState(0);
  const d = duels[i];
  if (!d) {
    return <WinScreen st={st} title="DUELO VENCIDO!" sub={`${score}/${duels.length} relâmpagos certeiros · as cartas estão no FSRS`} onGo={onDone} goLabel="▶ FINALIZAR MISSÃO" />;
  }
  const rate = (ok: boolean) => {
    if (ok) { setScore((s) => s + 1); saveSt((s) => ({ xp: s.xp + 10 })); play('check'); } else play('fizzle');
    setFlip(false);
    setI(i + 1);
  };
  return (
    <Scene kind="oracle">
      <div className="px-duel">
        <span className="px-mission-tag">⚡ DUELO RELÂMPAGO · {i + 1}/{duels.length}</span>
        <motion.div key={`${i}-${flip}`} className={`px-card ${flip ? 'is-back' : ''}`} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.25 }}>
          <span className="px-chip">{zonaOf(d.zona).emoji} {zonaOf(d.zona).nome}</span>
          <p>{flip ? d.resposta : d.pergunta}</p>
        </motion.div>
        {!flip ? <PxBtn kind="gold" onClick={() => { setFlip(true); play('flip'); }}>🔄 PENSEI · VIRAR</PxBtn> : (
          <div className="px-row">
            <PxBtn kind="alt" onClick={() => rate(false)}>✗ ERREI</PxBtn>
            <PxBtn kind="gold" onClick={() => rate(true)}>✓ ACERTEI</PxBtn>
          </div>
        )}
      </div>
      <Dialog lines={[flip ? 'Seja honesta. Eu sei quando você mente.' : 'Pensa ou fala a resposta em voz alta ANTES de virar. Nada de espiar.']} />
    </Scene>
  );
}

// ── Caderno das Cicatrizes (todas as ilhas) ────────────────────

function Caderno({ qs, st, onBack, makeCard }: { qs: YqQuestion[]; st: YqState; onBack: () => void; makeCard: (q: YqQuestion) => void }) {
  const [filtro, setFiltro] = useState<'agora' | 'sempre'>('agora');
  const list = qs.filter((q) => (filtro === 'agora' ? q.hist.length && !last(q).ok : q.hist.some((h) => !h.ok))).sort((a, b) => (last(b)?.at ?? '').localeCompare(last(a)?.at ?? ''));
  return (
    <div className="px-page">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <h2 className="px-h">🩹 CADERNO DAS CICATRIZES</h2>
      <div className="px-seg">
        <button className={filtro === 'agora' ? 'is-on' : ''} onClick={() => setFiltro('agora')}>AINDA ERRANDO</button>
        <button className={filtro === 'sempre' ? 'is-on' : ''} onClick={() => setFiltro('sempre')}>JÁ ERREI</button>
      </div>
      {list.length === 0 && <p className="px-empty">{qs.some((q) => q.hist.length) ? 'Nenhuma cicatriz aqui. O Bigode desconfia.' : 'Nada ainda: jogue uma missão.'}</p>}
      <ul className="px-cic-list">
        {list.map((q) => {
          const w = WHY.find((x) => x.id === [...q.hist].reverse().find((h) => !h.ok)?.why);
          return (
            <li key={q.id}>
              <details>
                <summary><span className="px-chip">{islandOf(q.tema)?.bossEmoji} {islandOf(q.tema)?.short}</span><span className="px-chip">{zonaOf(q.zona).emoji} {zonaOf(q.zona).nome}</span>{w && <span className="px-chip is-why">{w.emoji} {w.nome}</span>}<span className="px-cic-enun">{q.enunciado.slice(0, 110)}…</span></summary>
                <p className="px-enun">{q.enunciado}</p>
                <p><b>Certa: {q.gabarito})</b> {q.alternativas[q.gabarito]}</p>
                {q.comentario && <p className="px-coment">{q.comentario}</p>}
                <small>errou {q.hist.filter((h) => !h.ok).length}x · {isOld(q) ? `já caiu (${q.origem})` : 'inédita'}</small>
                <button className="px-mini" onClick={() => makeCard(q)}>{q.cardId ? '🃏 já é carta' : '🃏 virar carta de feitiço'}</button>
              </details>
            </li>
          );
        })}
      </ul>
      <Dialog lines={[list.length ? `${list.length} cicatriz${list.length > 1 ? 'es' : ''} ainda abertas. O chefão e o Oráculo cuidam delas.` : 'Tudo cicatrizado. Por enquanto.']} />
      {void st}
    </div>
  );
}

// ── Porto ──────────────────────────────────────────────────────

function Porto({ questions, dossies, onBack, saveQ, saveDossie, saveDossieCards }: {
  questions: YqQuestion[]; dossies: YqDossie[]; onBack: () => void; saveQ: (q: YqQuestion) => void;
  saveDossie: (d: YqDossie) => void; saveDossieCards: (tema: string, cs: DossieCard[], silent?: boolean) => number;
}) {
  const ui = useUI();
  const [text, setText] = useState('');
  const [res, setRes] = useState<ImportResult | null>(null);
  const [dres, setDres] = useState<DossieImport | null>(null);
  const [toDeck, setToDeck] = useState(true);
  const existing = useMemo(() => new Map(questions.map((q) => [q.qid, q])), [questions]);
  const check = (t = text) => {
    setRes(null); setDres(null);
    if (!t.trim()) return;
    // pacote de dossiês (conteúdo das missões) ou lista de questões
    let raw: unknown = null;
    try { raw = JSON.parse(t.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch { /* o parseImport explica o erro */ }
    if (raw && isDossiePack(raw)) setDres(parseDossies(raw, questions, dossies));
    else setRes(parseImport(t, existing));
  };
  const applyDossies = () => {
    if (!dres?.ok.length) return;
    let n = 0;
    dres.ok.forEach((d) => { saveDossie(d); if (toDeck) n += saveDossieCards(d.tema, d.flashcards, true); });
    play('mission');
    ui.toast(`📜 ${dres.ok.length} dossiês guardados${toDeck ? ` · ${n} cartões novos nos flashcards` : ''}.`);
    setText(''); setDres(null);
  };
  const readFile = async (f: File | undefined) => { if (!f) return; const t = await f.text(); setText(t); check(t); };
  const apply = () => {
    if (!res?.ok.length) return;
    res.ok.forEach((q) => saveQ(q));
    play('mission');
    ui.toast(`🚢 Navio de suprimentos chegou! ${res.ok.length} monstros desembarcaram.`);
    setText(''); setRes(null);
  };
  const novos = res?.ok.filter((q) => !existing.has(q.qid)).length ?? 0;
  const counts = useMemo(() => new Map(ISLANDS.map((i) => [i.tema, questions.filter((q) => q.tema === i.tema).length])), [questions]);
  return (
    <div className="px-page">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <h2 className="px-h">⚓ PORTO</h2>
      <p className="px-small">Cole o JSON (lista de questões ou pacote de dossiês) ou anexe o arquivo. Mesmo <code>id</code> atualiza e mantém o seu histórico.</p>
      <textarea className="px-text" rows={8} value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} placeholder='[ { "id": "uesm-a-031", "tema": "SRAG", "zona": "conduta", … } ]' aria-label="JSON das questões" />
      <div className="px-row">
        <label className="px-btn px-btn-ghost">📎 ANEXAR .JSON<input type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => void readFile(e.target.files?.[0])} /></label>
        <PxBtn kind="ghost" onClick={() => { setText(SAMPLE); check(SAMPLE); }}>🧪 3 EXEMPLOS</PxBtn>
        <PxBtn kind="alt" disabled={!text.trim()} onClick={() => check()}>🔎 CONFERIR</PxBtn>
      </div>
      {dres && (
        <div className="px-box">
          <p><b>{dres.ok.length}</b> dossiês prontos{dres.out.length ? ` · ${dres.out.length} ficaram de fora` : ''}</p>
          <ul className="px-list">{dres.ok.map((d) => {
            const prev = dossies.find((x) => x.tema === d.tema);
            return <li key={d.tema}>{islandOf(d.tema)?.bossEmoji} {islandOf(d.tema)?.short}: {d.resumo.length} seções · {d.story.length} cenas · {d.flashcards.length} cartões · {Object.keys(d.mapa.questoes).length} questões mapeadas{prev ? ' (atualiza)' : ''}</li>;
          })}</ul>
          {dres.out.length > 0 && <ul className="px-list">{dres.out.map((o, i) => <li key={i}>⚠️ {o.tema}: {o.why}</li>)}</ul>}
          {dres.avisos.length > 0 && <details><summary>Avisos ({dres.avisos.length})</summary><ul className="px-list">{dres.avisos.slice(0, 40).map((a, i) => <li key={i}>{a}</li>)}</ul></details>}
          <label className="px-fam"><input type="checkbox" checked={toDeck} onChange={(e) => setToDeck(e.target.checked)} /> colocar os flashcards nos baralhos das ilhas (os que já existem não duplicam)</label>
          <PxBtn kind="gold" disabled={!dres.ok.length} onClick={applyDossies}>📜 GUARDAR {dres.ok.length} DOSSIÊS</PxBtn>
        </div>
      )}
      {res && (
        <div className="px-box">
          <p><b>{res.ok.length}</b> prontas ({novos} novas, {res.ok.length - novos} atualizadas){res.out.length ? ` · ${res.out.length} ficaram de fora` : ''}</p>
          {Object.keys(res.perTema).length > 0 && <ul className="px-list">{Object.entries(res.perTema).map(([t, n]) => <li key={t}>{islandOf(t)?.bossEmoji} {islandOf(t)?.short}: <b>{n}</b></li>)}</ul>}
          {res.out.length > 0 && <details open><summary>⚠️ FICARAM DE FORA ({res.out.length})</summary><ul className="px-list">{res.out.slice(0, 60).map((o, i) => <li key={i}><code>{o.id}</code>: {o.why}</li>)}</ul></details>}
          <PxBtn kind="gold" disabled={!res.ok.length} onClick={apply}>🚢 DESEMBARCAR {res.ok.length}</PxBtn>
        </div>
      )}
      <h3 className="px-h3">🏝️ MONSTROS POR ILHA</h3>
      <ul className="px-count">
        {ISLANDS.map((i) => { const n = counts.get(i.tema) ?? 0; return <li key={i.tema} className={n < i.banco ? 'is-short' : ''}><span>{i.bossEmoji} {i.short}{dossies.some((d) => d.tema === i.tema) ? ' 📜' : ''}</span><b>{n}</b><small>/{i.banco}</small></li>; })}
      </ul>
    </div>
  );
}

// ── PDF de estudo ──────────────────────────────────────────────

function IslandPdfCfg({ island, st, saveSt }: { island: Island; st: YqState; saveSt: SaveSt }) {
  const cfg = st.islands[island.tema] ?? {};
  const set = (p: Partial<typeof cfg>) => saveSt((s) => ({ islands: { ...s.islands, [island.tema]: { ...(s.islands[island.tema] ?? {}), ...p } } }));
  const num = (v: string) => (v.trim() ? Math.max(1, Number(v.replace(/\D/g, '')) || 1) : null);
  return (
    <div className="px-cfg">
      <label><span>PDF</span>
        <select value={cfg.pdfId ?? ''} onChange={(e) => set({ pdfId: e.target.value || null })}>
          <option value="">— escolher —</option>
          {st.pdfs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label><span>Página onde começa o tema</span><input inputMode="numeric" value={cfg.page ?? ''} onChange={(e) => set({ page: num(e.target.value) })} placeholder="ex.: 42" /></label>
      <PdfAdder saveSt={saveSt} onAdded={(id) => set({ pdfId: id })} />
    </div>
  );
}

function PdfAdder({ saveSt, onAdded }: { saveSt: SaveSt; onAdded?: (id: string) => void }) {
  const ui = useUI();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const add = (p: PdfRef) => { saveSt((s) => ({ pdfs: [...s.pdfs, p] })); onAdded?.(p.id); setName(''); setUrl(''); ui.toast(`📚 PDF “${p.name}” guardado.`); };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const r = await uploadFile(f, 'doc', f.name);
    setBusy(false);
    if ('error' in r) { ui.toast(`${r.error} Dica: cole o link do PDF.`); return; }
    add({ id: uid(), name: name.trim() || f.name.replace(/\.pdf$/i, ''), assetId: r.id });
  };
  return (
    <div className="px-pdf-add">
      <b>➕ ADICIONAR PDF</b>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Urgência)" aria-label="Nome do PDF" />
      <div className="px-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole o link do PDF" aria-label="Link do PDF" />
        <PxBtn kind="alt" disabled={!url.trim()} onClick={() => add({ id: uid(), name: name.trim() || 'PDF', url: url.trim() })}>GUARDAR</PxBtn>
      </div>
      <label className="px-btn px-btn-ghost">{busy ? 'ENVIANDO…' : '📎 ANEXAR PDF'}<input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>
    </div>
  );
}

// ── Loja ───────────────────────────────────────────────────────

function Loja({ st, saveSt, onBack }: { st: YqState; saveSt: SaveSt; onBack: () => void }) {
  const ui = useUI();
  const buy = (id: string, preco: number) => {
    if (st.coins < preco) { play('fizzle'); ui.toast('Moedas insuficientes. Vai batalhar! ⚔️'); return; }
    saveSt((s) => ({ coins: s.coins - preco, owned: [...s.owned, id] }));
    play('jingle');
    ui.toast(bigode(st.deboche, 'loja'));
  };
  const wear = (slot: 'hat' | 'boat' | 'cat', id: string) => saveSt((s) => ({ wear: { ...s.wear, [slot]: s.wear[slot] === id ? undefined : id } }));
  return (
    <div className="px-page">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <h2 className="px-h">🛍️ LOJINHA</h2>
      <p className="px-small">Você tem <b>🪙 {st.coins}</b></p>
      <div className="px-shop">
        {SHOP.filter((it) => it.slot !== 'boat').map((it) => {
          const own = st.owned.includes(it.id);
          const on = st.wear[it.slot] === it.id;
          return (
            <div key={it.id} className={`px-item ${on ? 'is-on' : ''}`}>
              <PixelEmoji e={it.emoji} size={52} res={14} />
              <b>{it.nome}</b>
              <small>{it.slot === 'cat' ? 'pro Bigode' : 'pra Yas'}</small>
              {own ? <PxBtn kind="alt" onClick={() => wear(it.slot, it.id)}>{on ? 'TIRAR' : 'USAR'}</PxBtn> : <PxBtn kind="gold" onClick={() => buy(it.id, it.preco)}>🪙 {it.preco}</PxBtn>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ajustes ────────────────────────────────────────────────────

function Config({ st, saveSt, onBack, onIntro, onDemo }: { st: YqState; saveSt: SaveSt; onBack: () => void; onIntro: () => void; onDemo: () => void }) {
  const LEVELS: { id: Deboche; nome: string; ex: string }[] = [
    { id: 'fofo', nome: '🧸 FOFO', ex: '“Tudo bem errar aqui 💛”' },
    { id: 'acido', nome: '🍋 ÁCIDO', ex: '“O Dragão mandou um beijo.”' },
    { id: 'sem', nome: '🌶️ SEM FILTRO', ex: '“Não quer passar não, porra?”' },
  ];
  return (
    <div className="px-page">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <h2 className="px-h">⚙️ AJUSTES</h2>
      <h3 className="px-h3">🐱 DEBOCHE DO DR. BIGODE</h3>
      <div className="px-deboche">
        {LEVELS.map((l) => <button key={l.id} className={st.deboche === l.id ? 'is-on' : ''} onClick={() => { saveSt({ deboche: l.id }); play('meow'); }}><b>{l.nome}</b><small>{l.ex}</small></button>)}
      </div>
      <p className="px-small">Na ilha da Tempestade da Crise ele fica sério, sempre.</p>
      <h3 className="px-h3">📚 SEUS PDFS</h3>
      <ul className="px-list">{st.pdfs.map((p) => <li key={p.id}>📄 {p.name} <small>({p.url ? 'link' : 'arquivo'})</small> <button className="px-mini" onClick={() => saveSt((s) => ({ pdfs: s.pdfs.filter((x) => x.id !== p.id) }))}>remover</button></li>)}</ul>
      <PdfAdder saveSt={saveSt} />
      <p className="px-small">No Dojo de cada missão você escolhe qual PDF e a página daquela ilha.</p>
      <PxBtn kind="ghost" onClick={onIntro}>🎬 REVER A ABERTURA</PxBtn>
      <PxBtn kind="ghost" onClick={onDemo}>🎮 BATALHA DE DEMONSTRAÇÃO</PxBtn>
      <p className="px-small">A demonstração usa questões de exemplo e não salva nada.</p>
    </div>
  );
}

// zonas importadas para usos futuros (mantém o import tipado)
void ZONAS;
