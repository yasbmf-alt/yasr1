// Yas Quest — modo jogo da maratona de prova: arquipélago de ilhas (temas), cada
// uma com 5 zonas; batalhas por ondas com as questões importadas no Porto;
// grimório dos erros (que viram cartas de feitiço no FSRS); pergaminho de
// reforço para pedir questões novas à IA; e o Doutor Bigode narrando tudo.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../data/store';
import { useUI } from '../components/ui';
import { burst } from '../logic/fx';
import { play } from '../logic/sound';
import { today, uid } from '../logic/dates';
import { newCardState } from '../logic/fsrs';
import { resolveAssetUrl, uploadFile } from '../platform/platform';
import type { YlDoc } from '../yasland/types';
import {
  ISLANDS, REGIOES, ZONAS, NIVEL, FINAL, REVANCHE, EXAM, SHOP, STATE_ID, SAMPLE,
  emptyState, islandOf, zonaOf, islandStat, routeOf, visitDone, frozen, buildWave, buildFinal, buildRevanche,
  xpFor, levelOf, levelXp, parseImport, isOld, reforcoPrompt, bigode, wearEmoji, last,
  type YqQuestion, type YqState, type Zona, type Why, type Island, type ImportResult, type PdfRef, type Deboche,
} from './data';

type Screen = { s: 'title' } | { s: 'map' } | { s: 'island'; tema: string } | { s: 'porto' } | { s: 'loja' } | { s: 'grimorio'; tema?: string } | { s: 'config' };
interface BattleSpec { kind: 'ilha' | 'zona' | 'final' | 'revanche'; tema?: string; zona?: Zona; qs: YqQuestion[] }

const WHY: { id: Why; emoji: string; nome: string }[] = [
  { id: 'naosabia', emoji: '🤷', nome: 'Não sabia' },
  { id: 'confundi', emoji: '🔀', nome: 'Confundi' },
  { id: 'pegadinha', emoji: '🪤', nome: 'Pegadinha' },
  { id: 'desatencao', emoji: '😵', nome: 'Desatenção' },
];
const stars = (n: number) => '⭐'.repeat(n);

export function YasQuest() {
  const store = useStore();
  const { data, saveYl, snapshot } = store;
  const ui = useUI();
  const docs = data.yasland ?? [];
  const questions = useMemo(() => (docs as unknown as { kind?: string }[]).filter((d) => d.kind === 'yq-q') as unknown as YqQuestion[], [docs]);
  const st: YqState = { ...emptyState(), ...((docs.find((d) => d.id === STATE_ID) as unknown as YqState) ?? {}) };
  const byTema = useMemo(() => {
    const m = new Map<string, YqQuestion[]>();
    for (const q of questions) m.set(q.tema, [...(m.get(q.tema) ?? []), q]);
    return m;
  }, [questions]);

  // sempre grava em cima da versão mais nova (várias gravações seguidas na batalha)
  const freshState = (): YqState => ({ ...emptyState(), ...((snapshot().yasland ?? []).find((d) => d.id === STATE_ID) as unknown as YqState) });
  const saveSt = (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => {
    const cur = freshState();
    const patch = typeof p === 'function' ? p(cur) : p;
    saveYl({ ...cur, ...patch } as unknown as YlDoc);
  };
  const saveQ = (q: YqQuestion) => saveYl(q as unknown as YlDoc);
  const markVisit = (tema: string, step: 'estudar' | 'batalha' | 'grimorio') => saveSt((s) => {
    const d = today();
    const day = { ...(s.visits[d] ?? {}) };
    day[tema] = { ...(day[tema] ?? {}), [step]: true };
    return { visits: { ...s.visits, [d]: day } };
  });

  const [screen, setScreen] = useState<Screen>(() => {
    try { return sessionStorage.getItem('yq-started') ? { s: 'map' } : { s: 'title' }; } catch { return { s: 'title' }; }
  });
  const [battle, setBattle] = useState<BattleSpec | null>(null);
  const [scroll, setScroll] = useState<{ tema: string; zona: Zona | null } | null>(null);
  const go = (s: Screen) => { setScreen(s); play('pop'); window.scrollTo({ top: 0 }); };

  const startBattle = (spec: Omit<BattleSpec, 'qs'>) => {
    const all = questions;
    const qs = spec.kind === 'final' ? buildFinal(all) : spec.kind === 'revanche' ? buildRevanche(all)
      : buildWave((byTema.get(spec.tema!) ?? []).filter((q) => !spec.zona || q.zona === spec.zona), spec.kind === 'zona' ? 6 : 7);
    if (!qs.length) {
      ui.toast(spec.kind === 'revanche' ? 'Nenhum erro pra revanche. Que audácia! 👑' : 'Sem questões aqui ainda: importe no ⚓ Porto ou peça reforço.');
      return;
    }
    play('ignite');
    setBattle({ ...spec, qs });
  };

  // cartas de feitiço → flashcards (FSRS) num baralho por ilha
  const makeCard = (q: YqQuestion) => {
    if (q.cardId && data.cards.some((c) => c.id === q.cardId)) { ui.toast('Essa já virou carta 🃏'); return; }
    const is = islandOf(q.tema)!;
    const s = freshState();
    let deckId = s.decks[q.tema];
    if (!deckId || !snapshot().decks.some((d) => d.id === deckId)) {
      deckId = uid();
      store.saveDeck({ id: deckId, name: `🃏 Yas Quest · ${is.short}`, area: 'clinica', topicId: null, createdAt: new Date().toISOString() });
    }
    const cardId = uid();
    const enun = q.enunciado.length > 420 ? `${q.enunciado.slice(0, 420)}…` : q.enunciado;
    store.saveCard({
      id: cardId, deckId, tags: ['yasquest', q.zona], fsrs: newCardState(), createdAt: new Date().toISOString(),
      front: `${zonaOf(q.zona).emoji} ${enun}`,
      back: `${q.gabarito}) ${q.alternativas[q.gabarito]}${q.comentario ? `\n\n${q.comentario}` : ''}`,
    });
    saveQ({ ...q, cardId });
    saveSt((cur) => ({ decks: { ...cur.decks, [q.tema]: deckId! } }));
    play('flip');
    ui.toast('🃏 Virou carta de feitiço! Ela aparece nos seus flashcards.');
  };

  const level = levelOf(st.xp);
  const lvFrom = levelXp(level);
  const lvTo = levelXp(level + 1);

  return (
    <div className="page yq">
      {screen.s !== 'title' && (
        <Hud st={st} level={level} pct={(st.xp - lvFrom) / (lvTo - lvFrom)} onGo={go} current={screen.s} />
      )}
      {screen.s === 'title' && <Title onStart={() => { try { sessionStorage.setItem('yq-started', '1'); } catch { /* ok */ } play('mission'); setScreen({ s: 'map' }); }} empty={!questions.length} />}
      {screen.s === 'map' && (
        <WorldMap st={st} byTema={byTema} total={questions.length} onIsland={(t) => go({ s: 'island', tema: t })} onBattle={startBattle} onPorto={() => go({ s: 'porto' })} saveSt={saveSt} />
      )}
      {screen.s === 'island' && (
        <IslandView
          island={islandOf(screen.tema)!}
          qs={byTema.get(screen.tema) ?? []}
          st={st}
          saveSt={saveSt}
          onBack={() => go({ s: 'map' })}
          onBattle={startBattle}
          onGrimorio={() => go({ s: 'grimorio', tema: screen.tema })}
          onScroll={(z) => setScroll({ tema: screen.tema, zona: z })}
          markVisit={markVisit}
        />
      )}
      {screen.s === 'grimorio' && <Grimorio qs={screen.tema ? byTema.get(screen.tema) ?? [] : questions} tema={screen.tema} onBack={() => go(screen.tema ? { s: 'island', tema: screen.tema } : { s: 'map' })} makeCard={makeCard} saveQ={saveQ} onDone={screen.tema ? () => { markVisit(screen.tema!, 'grimorio'); ui.toast('📜 Grimório revisado ✓'); } : undefined} st={st} />}
      {screen.s === 'porto' && <Porto questions={questions} onBack={() => go({ s: 'map' })} saveQ={saveQ} />}
      {screen.s === 'loja' && <Loja st={st} saveSt={saveSt} onBack={() => go({ s: 'map' })} />}
      {screen.s === 'config' && <Config st={st} saveSt={saveSt} onBack={() => go({ s: 'map' })} />}

      {battle && (
        <Battle
          spec={battle}
          st={st}
          all={questions}
          saveQ={saveQ}
          saveSt={saveSt}
          makeCard={makeCard}
          onScroll={(t, z) => setScroll({ tema: t, zona: z })}
          onExit={(won) => {
            const key = battle.kind === 'final' ? FINAL : battle.kind === 'revanche' ? REVANCHE : battle.tema!;
            markVisit(key, 'batalha');
            if (won && battle.tema) saveSt((s) => ({ bossesBeaten: s.bossesBeaten.includes(battle.tema!) ? s.bossesBeaten : [...s.bossesBeaten, battle.tema!] }));
            setBattle(null);
          }}
        />
      )}
      {scroll && <Pergaminho tema={scroll.tema} zona={scroll.zona} onClose={() => setScroll(null)} onPorto={() => { setScroll(null); go({ s: 'porto' }); }} />}
    </div>
  );
}

// ── HUD e Bigode ───────────────────────────────────────────────

function Hud({ st, level, pct, onGo, current }: { st: YqState; level: number; pct: number; onGo: (s: Screen) => void; current: string }) {
  const hat = wearEmoji(st, 'hat');
  return (
    <header className="yq-hud">
      <button className="yq-avatar" onClick={() => onGo({ s: 'map' })} aria-label="Mapa">
        <span className="yq-avatar-hat" aria-hidden="true">{hat}</span>
        <span aria-hidden="true">👩‍⚕️</span>
      </button>
      <div className="yq-hud-mid">
        <div className="yq-hud-top"><b>Nv {level}</b><span>🪙 {st.coins}</span><span>✨ {st.xp} XP</span></div>
        <div className="yq-xp"><span style={{ width: `${Math.max(3, Math.min(100, pct * 100))}%` }} /></div>
      </div>
      <nav className="yq-hud-nav" aria-label="Menu do jogo">
        {([['map', '🗺️', 'Mapa'], ['grimorio', '📜', 'Grimório'], ['porto', '⚓', 'Porto'], ['loja', '🛍️', 'Loja'], ['config', '⚙️', 'Ajustes']] as const).map(([s, e, l]) => (
          <button key={s} className={current === s ? 'is-on' : ''} onClick={() => onGo({ s } as Screen)} aria-label={l} title={l}>{e}</button>
        ))}
      </nav>
    </header>
  );
}

function Bigode({ st, ctx, serious, line }: { st: YqState; ctx: Parameters<typeof bigode>[1]; serious?: boolean; line?: string }) {
  const [txt, setTxt] = useState(() => line ?? bigode(st.deboche, ctx, serious));
  useEffect(() => { if (line) setTxt(line); }, [line]);
  const cat = wearEmoji(st, 'cat');
  return (
    <div className={`yq-bigode ${serious ? 'is-serious' : ''}`}>
      <button className="yq-cat" onClick={() => { play('meow'); setTxt(bigode(st.deboche, ctx, serious)); }} aria-label="Doutor Bigode">
        <span aria-hidden="true">🐱</span>{cat && <i aria-hidden="true">{cat}</i>}
      </button>
      <motion.p key={txt} initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <b>{serious ? 'Guia' : 'Doutor Bigode'}:</b> {txt}
      </motion.p>
    </div>
  );
}

// ── Tela título ────────────────────────────────────────────────

function Title({ onStart, empty }: { onStart: () => void; empty: boolean }) {
  return (
    <motion.button className="yq-title" onClick={onStart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label="Começar o jogo">
      <span className="yq-title-sea" aria-hidden="true">
        {['🏝️', '🌴', '🏝️', '🌋', '🏝️'].map((e, i) => <i key={i} style={{ left: `${8 + i * 19}%`, animationDelay: `${i * 0.4}s` }}>{e}</i>)}
        <b className="yq-title-boat">⛵</b>
      </span>
      <span className="yq-title-logo">YAS<br />QUEST</span>
      <span className="yq-title-sub">O Arquipélago da R1</span>
      <span className="yq-start">▶ PRESSIONE START</span>
      {empty && <span className="yq-title-hint">dica: comece pelo ⚓ Porto, importando as questões</span>}
    </motion.button>
  );
}

// ── Mapa-mundo ─────────────────────────────────────────────────

function WorldMap({ st, byTema, total, onIsland, onBattle, onPorto, saveSt }: {
  st: YqState; byTema: Map<string, YqQuestion[]>; total: number; onIsland: (t: string) => void; onBattle: (s: Omit<BattleSpec, 'qs'>) => void; onPorto: () => void; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void;
}) {
  const stats = useMemo(() => new Map(ISLANDS.map((i) => [i.tema, islandStat(byTema.get(i.tema) ?? [])])), [byTema]);
  const painted = ISLANDS.filter((i) => (stats.get(i.tema)?.pct ?? 0) >= 0.6).length;
  return (
    <div className="yq-map">
      <Bigode st={st} ctx="abrir" />
      {total === 0 && (
        <button className="yq-empty" onClick={onPorto}>
          <b>⚓ O arquipélago está vazio</b>
          <span>Vá ao Porto e importe o JSON com as questões. Os navios trazem os monstros!</span>
        </button>
      )}
      <Rota st={st} saveSt={saveSt} onIsland={onIsland} onBattle={onBattle} />
      <p className="yq-painted">🎨 Mapa pintado: <b>{painted}/{ISLANDS.length}</b> ilhas · {total} questões no arquipélago</p>
      {REGIOES.map((r) => (
        <section key={r.id} className="yq-region" style={{ ['--mar' as string]: r.mar }}>
          <h3>{r.emoji} {r.nome}</h3>
          <div className="yq-isles">
            {ISLANDS.filter((i) => i.regiao === r.id).map((i, k) => {
              const s = stats.get(i.tema)!;
              return (
                <motion.button
                  key={i.tema}
                  className={`yq-isle p${i.prio} ${i.capital ? 'is-capital' : ''} ${s.fog ? 'is-fog' : ''} ${s.conquered ? 'is-conquered' : ''}`}
                  style={{ ['--pct' as string]: `${Math.round(s.pct * 100)}%`, animationDelay: `${k * 0.3}s` }}
                  onClick={() => onIsland(i.tema)}
                  whileTap={{ scale: 0.93 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: k * 0.05 } }}
                >
                  {i.capital && <span className="yq-capital">👑 3 questões garantidas</span>}
                  <span className="yq-isle-blob" aria-hidden="true">
                    <span className="yq-isle-boss">{s.fog ? '☁️' : i.bossEmoji}</span>
                    {s.conquered && <span className="yq-flag">🚩</span>}
                    {s.alerts.length > 0 && <span className="yq-siren">🚨</span>}
                  </span>
                  <span className="yq-isle-name">{i.short}</span>
                  <span className="yq-isle-meta">{stars(i.prio)} · {Math.round(s.pct * 100)}%</span>
                  <span className="yq-dots" aria-hidden="true">
                    {s.zones.map((z) => <i key={z.zona} className={`lv-${z.nivel} ${z.alerta ? 'is-alert' : ''}`} />)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      ))}
      {!frozen() && <button className={`yq-final-isle ${today() === EXAM.date ? 'is-open' : ''}`} onClick={() => onBattle({ kind: 'final' })}>
        <span aria-hidden="true">🏥</span>
        <b>Ilha Final · Hospital da Prova</b>
        <small>SRAG + suas revanches + doses de todas as ilhas</small>
      </button>}
    </div>
  );
}

function Rota({ st, saveSt, onIsland, onBattle }: { st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void; onIsland: (t: string) => void; onBattle: (s: Omit<BattleSpec, 'qs'>) => void }) {
  const d = today();
  const r = routeOf(st, d);
  const fz = frozen();
  const nightRef = useRef(false);
  const visits = st.visits[d] ?? {};
  const doneAll = !!r && r.list.length > 0 && r.list.every((t) => visitDone(visits[t], t));
  useEffect(() => {
    if (doneAll && !nightRef.current && !st.nightShown?.[d]) {
      nightRef.current = true;
      play('chapter');
      saveSt((s) => ({ nightShown: { ...(s.nightShown ?? {}), [d]: true } }));
    }
  }, [doneAll, d, st.nightShown, saveSt]);
  if (fz) return <div className="yq-route is-zen"><b>🧘 Modo pré-prova</b><span>Nada novo agora. Almoça, respira e vai pra prova às {EXAM.start}. Você treinou pra isso. 👑</span></div>;
  if (!r) return <div className="yq-route"><b>🧭 Rota livre</b><span>Hoje não tem rota marcada. Escolha uma ilha (as ⭐⭐⭐ primeiro).</span></div>;
  const current = r.list.find((t) => !visitDone(visits[t], t));
  const label = (t: string) => (t === FINAL ? '🏥 Ilha Final' : t === REVANCHE ? '🔁 Revanche geral' : islandOf(t)?.short ?? t);
  const open = (t: string) => (t === FINAL ? onBattle({ kind: 'final' }) : t === REVANCHE ? onBattle({ kind: 'revanche' }) : onIsland(t));
  return (
    <div className={`yq-route ${doneAll ? 'is-night' : ''}`}>
      <div className="yq-route-head">
        <b>🗺️ Rota de {r.label}{d === '2026-11-23' ? ` · até ${EXAM.freezeAfter}` : ''}</b>
        {r.family.length > 0 && (
          <label className="yq-fam">
            <input type="checkbox" checked={r.fam} onChange={(e) => saveSt((s) => ({ family: { ...s.family, [d]: e.target.checked } }))} />
            dia com família
          </label>
        )}
      </div>
      {doneAll ? (
        <motion.div className="yq-night" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span aria-hidden="true">🌙</span>
          <b>Noite liberada!</b>
          <small>{bigode(st.deboche, 'noite')}</small>
        </motion.div>
      ) : (
        <ol className="yq-route-list">
          {r.list.map((t) => {
            const v = visits[t];
            const ok = visitDone(v, t);
            const cur = t === current;
            return (
              <li key={t} className={`${ok ? 'is-done' : ''} ${cur ? 'is-cur' : ''}`}>
                <button onClick={() => open(t)}>
                  <span className="yq-rl-ico">{ok ? '✅' : cur ? '⛵' : '○'}</span>
                  <span className="yq-rl-name">{label(t)}</span>
                  {t !== FINAL && t !== REVANCHE && !ok && (
                    <span className="yq-rl-steps" aria-hidden="true">{v?.estudar ? '📖' : '·'}{v?.batalha ? '⚔️' : '·'}{v?.grimorio ? '📜' : '·'}</span>
                  )}
                </button>
                {cur && r.list.length > 1 && (
                  <button className="yq-skip" onClick={() => saveSt((s) => ({ skipped: { ...s.skipped, [d]: [...(s.skipped[d] ?? []).filter((x) => x !== t), t] } }))}>pular ↓</button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <small className="yq-route-tip">Cada ilha: 📖 estudar → ⚔️ batalha → 📜 grimório. Pulou? Vai pro fim, sem drama.</small>
    </div>
  );
}

// ── Ilha ───────────────────────────────────────────────────────

function IslandView({ island, qs, st, saveSt, onBack, onBattle, onGrimorio, onScroll, markVisit }: {
  island: Island; qs: YqQuestion[]; st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void; onBack: () => void;
  onBattle: (s: Omit<BattleSpec, 'qs'>) => void; onGrimorio: () => void; onScroll: (z: Zona | null) => void; markVisit: (t: string, step: 'estudar' | 'batalha' | 'grimorio') => void;
}) {
  const ui = useUI();
  const s = islandStat(qs);
  const v = st.visits[today()]?.[island.tema] ?? {};
  const cfg = st.islands[island.tema] ?? {};
  const pdf = st.pdfs.find((p) => p.id === cfg.pdfId);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [taunt] = useState(() => island.taunts[Math.floor(Math.random() * island.taunts.length)]);
  const old = qs.filter(isOld).length;
  const fz = frozen();

  const openPdf = async (zona: Zona | null) => {
    if (!pdf) { setCfgOpen(true); ui.toast('Escolha o PDF desta ilha primeiro 👇'); return; }
    const page = (zona && cfg.pages?.[zona]) || cfg.page || null;
    const base = pdf.assetId ? await resolveAssetUrl(pdf.assetId) : pdf.url;
    if (!base) { ui.toast('Não consegui abrir o PDF. Confira o link nos ⚙️ Ajustes.'); return; }
    window.open(page ? `${base.split('#')[0]}#page=${page}` : base, '_blank', 'noopener');
  };

  return (
    <div className={`yq-island ${island.serious ? 'is-serious' : ''} ${island.capital ? 'is-capital' : ''}`}>
      <button className="yq-back" onClick={onBack}>← Mapa</button>
      <header className="yq-island-head">
        <motion.span className="yq-boss-big" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} aria-hidden="true">{island.bossEmoji}</motion.span>
        <div>
          <span className="yq-eyebrow">{stars(island.prio)} {island.capital ? '· 👑 ilha-capital · 3 questões garantidas' : ''}</span>
          <h2>{island.tema}</h2>
          <p className="yq-boss-line"><b>{island.boss}:</b> “{taunt}”</p>
          <span className="yq-island-meta">{qs.length} questões · {old} já caíram · {Math.round(s.pct * 100)}% dominada</span>
        </div>
      </header>

      <Bigode st={st} ctx={s.alerts.length ? 'reforco' : 'ilha'} serious={island.serious} />

      <section className="yq-steps" aria-label="Etapas da visita">
        <button className={v.estudar ? 'is-done' : ''} onClick={() => { void openPdf(null); if (!v.estudar && pdf) markVisit(island.tema, 'estudar'); }}>
          <span>📖</span><b>Estudar</b><small>{v.estudar ? 'feito ✓' : pdf ? '~45 min' : 'escolher PDF'}</small>
        </button>
        <button className={v.batalha ? 'is-done' : ''} disabled={fz} onClick={() => onBattle({ kind: 'ilha', tema: island.tema })}>
          <span>⚔️</span><b>Batalha</b><small>{v.batalha ? 'feito ✓' : '~30 min'}</small>
        </button>
        <button className={v.grimorio ? 'is-done' : ''} onClick={onGrimorio}>
          <span>📜</span><b>Grimório</b><small>{v.grimorio ? 'feito ✓' : '~15 min'}</small>
        </button>
      </section>
      {!v.estudar && pdf && <button className="yq-link" onClick={() => markVisit(island.tema, 'estudar')}>Já estudei por outro lugar ✓</button>}

      <section className="yq-zones">
        {s.zones.map((z) => {
          const zi = zonaOf(z.zona);
          return (
            <div key={z.zona} className={`yq-zone lv-${z.nivel} ${z.alerta ? 'is-alert' : ''}`}>
              <div className="yq-zone-top">
                <span className="yq-zone-ico" aria-hidden="true">{zi.emoji}</span>
                <span className="yq-zone-name"><b>{zi.lugar}</b><small>{NIVEL[z.nivel].emoji} {NIVEL[z.nivel].nome}{z.total ? ` · ${z.answered}/${z.total} · ${Math.round(z.acc * 100)}% acerto` : ' · sem questões'}</small></span>
                <span className="yq-zone-val" title="valor da zona">{'◆'.repeat(zi.valor)}</span>
              </div>
              <div className="yq-zone-bar"><span style={{ width: `${Math.round(z.score * 100)}%` }} /></div>
              {z.alerta && <p className="yq-invasion">🚨 INVASÃO! {zi.lugar} está sendo tomada.</p>}
              <div className="yq-zone-actions">
                {z.total > 0 && !fz && <button onClick={() => onBattle({ kind: 'zona', tema: island.tema, zona: z.zona })}>⚔️ Onda da zona</button>}
                {(z.alerta || z.nivel === 'explorada') && <button onClick={() => void openPdf(z.zona)}>📖 Estudar esta zona</button>}
                {(z.alerta || z.nivel === 'vazia') && <button className="is-scroll" onClick={() => onScroll(z.zona)}>📜 Pergaminho de reforço</button>}
              </div>
            </div>
          );
        })}
      </section>
      <button className="yq-link" onClick={() => onScroll(null)}>📜 Pedir reforço da ilha inteira</button>

      <details className="yq-cfg" open={cfgOpen} onToggle={(e) => setCfgOpen((e.target as HTMLDetailsElement).open)}>
        <summary>📚 PDF de estudo desta ilha</summary>
        <IslandPdfCfg island={island} st={st} saveSt={saveSt} />
      </details>
    </div>
  );
}

function IslandPdfCfg({ island, st, saveSt }: { island: Island; st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void }) {
  const cfg = st.islands[island.tema] ?? {};
  const set = (p: Partial<typeof cfg>) => saveSt((s) => ({ islands: { ...s.islands, [island.tema]: { ...(s.islands[island.tema] ?? {}), ...p } } }));
  const num = (v: string) => (v.trim() ? Math.max(1, Number(v.replace(/\D/g, '')) || 1) : null);
  return (
    <div className="yq-cfg-body">
      {st.pdfs.length === 0 && <p className="muted small">Nenhum PDF ainda. Adicione os seus (Urgência, Psiquiatria) aqui embaixo ou em ⚙️ Ajustes.</p>}
      <label className="yq-field">
        <span>PDF</span>
        <select value={cfg.pdfId ?? ''} onChange={(e) => set({ pdfId: e.target.value || null })}>
          <option value="">— escolher —</option>
          {st.pdfs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="yq-field"><span>Página onde começa o tema</span><input inputMode="numeric" value={cfg.page ?? ''} onChange={(e) => set({ page: num(e.target.value) })} placeholder="ex.: 42" /></label>
      <p className="muted small">Página de cada zona (opcional) — o atalho “estudar esta zona” abre direto nela:</p>
      <div className="yq-pages">
        {ZONAS.map((z) => (
          <label key={z.id}><span>{z.emoji} {z.nome}</span><input inputMode="numeric" value={cfg.pages?.[z.id] ?? ''} onChange={(e) => set({ pages: { ...(cfg.pages ?? {}), [z.id]: num(e.target.value) ?? undefined } })} placeholder="pág." /></label>
        ))}
      </div>
      <PdfAdder st={st} saveSt={saveSt} onAdded={(id) => set({ pdfId: id })} />
    </div>
  );
}

function PdfAdder({ st, saveSt, onAdded }: { st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void; onAdded?: (id: string) => void }) {
  const ui = useUI();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const add = (p: PdfRef) => { saveSt((s) => ({ pdfs: [...s.pdfs, p] })); onAdded?.(p.id); setName(''); setUrl(''); play('pop'); ui.toast(`📚 PDF “${p.name}” guardado.`); };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const r = await uploadFile(f, 'doc', f.name);
    setBusy(false);
    if ('error' in r) { ui.toast(`${r.error} Dica: cole o link do PDF (Drive, por exemplo).`); return; }
    add({ id: uid(), name: name.trim() || f.name.replace(/\.pdf$/i, ''), assetId: r.id });
  };
  void st;
  return (
    <div className="yq-pdf-add">
      <b>➕ Adicionar PDF</b>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex.: Urgência)" aria-label="Nome do PDF" />
      <div className="yq-pdf-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole o link do PDF" aria-label="Link do PDF" />
        <button className="btn btn-primary btn-sm" disabled={!url.trim()} onClick={() => add({ id: uid(), name: name.trim() || 'PDF', url: url.trim() })}>Guardar link</button>
      </div>
      <label className={`btn btn-quiet btn-sm ${busy ? 'is-busy' : ''}`}>
        {busy ? 'Enviando…' : '📎 Anexar o arquivo PDF'}
        <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void upload(e.target.files?.[0])} />
      </label>
    </div>
  );
}

// ── Batalha ────────────────────────────────────────────────────

function Battle({ spec, st, all, saveQ, saveSt, makeCard, onScroll, onExit }: {
  spec: BattleSpec; st: YqState; all: YqQuestion[]; saveQ: (q: YqQuestion) => void; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void;
  makeCard: (q: YqQuestion) => void; onScroll: (t: string, z: Zona | null) => void; onExit: (won: boolean) => void;
}) {
  const island = spec.tema ? islandOf(spec.tema) : islandOf('SRAG');
  const serious = !!island?.serious && spec.kind !== 'final' && spec.kind !== 'revanche';
  const title = spec.kind === 'final' ? '🏥 Ilha Final · Hospital da Prova' : spec.kind === 'revanche' ? '🔁 Revanche geral' : `${island!.bossEmoji} ${island!.short}${spec.zona ? ` · ${zonaOf(spec.zona).lugar}` : ''}`;
  const bossName = spec.kind === 'final' ? 'Chefão da Prova' : spec.kind === 'revanche' ? 'Fantasmas dos Erros' : island!.boss;
  const bossEmoji = spec.kind === 'final' ? '🏥' : spec.kind === 'revanche' ? '👻' : island!.bossEmoji;
  const qs = spec.qs;
  const before = useRef(new Map(ISLANDS.map((i) => [i.tema, islandStat(all.filter((q) => q.tema === i.tema)).zones.map((z) => z.nivel)])));
  const wasWrong = useRef(new Set(qs.filter((q) => q.hist.length && !last(q).ok).map((q) => q.id)));
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [charge, setCharge] = useState(0);
  const [shield, setShield] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [why, setWhy] = useState<Why | null>(null);
  const [faint, setFaint] = useState(false);
  const [gain, setGain] = useState({ xp: 0, coins: 0, ok: 0 });
  const [results, setResults] = useState<{ q: YqQuestion; ok: boolean }[]>([]);
  const [line, setLine] = useState(() => (serious ? 'Vamos com calma e atenção.' : island!.taunts[0]));
  const [hit, setHit] = useState(0);
  const [hurt, setHurt] = useState(0);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = qs[idx];
  const isBoss = idx === qs.length - 1;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => { boxRef.current?.scrollTo({ top: 0 }); }, [idx, done]);
  // depois de responder, desce até o grimório da questão
  useEffect(() => {
    if (!pick) return undefined;
    const t = window.setTimeout(() => boxRef.current?.querySelector('.yq-grim')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 650);
    return () => window.clearTimeout(t);
  }, [pick]);

  const answer = (k: string, e: React.MouseEvent) => {
    if (pick) return;
    setPick(k);
    const ok = k === q.gabarito;
    const nq: YqQuestion = { ...q, hist: [...q.hist, { at: new Date().toISOString(), pick: k, ok }] };
    saveQ(nq);
    setResults((r) => [...r, { q: nq, ok }]);
    if (ok) {
      const rev = wasWrong.current.has(q.id);
      const xp = xpFor(q, rev, isBoss);
      const coins = 1 + (isBoss ? 9 : 0);
      setGain((g) => ({ xp: g.xp + xp, coins: g.coins + coins, ok: g.ok + 1 }));
      saveSt((s) => ({ xp: s.xp + xp, coins: s.coins + coins }));
      const c = combo + 1;
      setCombo(c);
      setBest((b) => Math.max(b, c));
      setCharge((x) => Math.min(3, x + 1));
      setHit((h) => h + 1);
      burst(e, isBoss ? 'confete' : 'brilho', isBoss ? 26 : 12);
      play(isBoss ? 'mission' : 'check');
      setLine(c >= 3 && c % 3 === 0 ? bigode(st.deboche, 'combo', serious) : bigode(st.deboche, 'acerto', serious));
    } else {
      setCombo(0);
      setHurt((h) => h + 1);
      play('fizzle');
      if (shield) setShield(false);
      else setHearts((h) => { const n = h - 1; if (n <= 0) window.setTimeout(() => { setFaint(true); play('ghost'); }, 900); return Math.max(0, n); });
      setLine(q.zona === 'pegadinha' ? bigode(st.deboche, 'pegadinha', serious) : bigode(st.deboche, 'erro', serious));
    }
  };
  const setReason = (w: Why) => {
    setWhy(w);
    const cur = results[results.length - 1]?.q;
    if (!cur) return;
    const h = [...cur.hist];
    h[h.length - 1] = { ...h[h.length - 1], why: w };
    const nq = { ...cur, hist: h };
    saveQ(nq);
    setResults((r) => r.map((x, i) => (i === r.length - 1 ? { ...x, q: nq } : x)));
  };
  const next = () => {
    if (idx + 1 >= qs.length) { finish(); return; }
    setIdx(idx + 1); setPick(null); setHidden([]); setWhy(null);
    play('pop');
  };
  const finish = () => {
    setDone(true);
    const won = results[results.length - 1]?.ok ?? false;
    const coins = 5;
    setGain((g) => ({ ...g, coins: g.coins + coins }));
    saveSt((s) => ({ coins: s.coins + coins, waves: s.waves + 1, bestCombo: Math.max(s.bestCombo, best) }));
    play(won ? 'chapter' : 'page');
  };
  const usePower = (p: 'cafe' | 'dica' | 'escudo') => {
    if (charge < 3) return;
    setCharge(0);
    play('ignite');
    if (p === 'cafe') setHearts((h) => Math.min(3, h + 1));
    if (p === 'escudo') setShield(true);
    if (p === 'dica' && q && !pick) {
      const wrong = Object.keys(q.alternativas).filter((k) => k !== q.gabarito && !hidden.includes(k));
      if (wrong.length > 1) setHidden([...hidden, wrong[Math.floor(Math.random() * wrong.length)]]);
    }
  };

  const ok = pick === q?.gabarito;
  const remaining = qs.length - idx - (pick ? 1 : 0);
  const afterLv = done ? new Map(ISLANDS.map((i) => [i.tema, islandStat(all.filter((x) => x.tema === i.tema).map((x) => results.find((r) => r.q.id === x.id)?.q ?? x)).zones])) : null;

  return createPortal(
    <div className={`yq-battle ${serious ? 'is-serious' : ''}`} role="dialog" aria-label={`Batalha: ${title}`}>
      <div className="yq-battle-scroll" ref={boxRef}>
        <header className="yq-bhud">
          <button className="yq-flee" onClick={() => (done ? onExit(results[results.length - 1]?.ok ?? false) : window.confirm('Fugir da batalha? O que você já respondeu fica salvo.') && onExit(false))} aria-label="Sair">✕</button>
          <span className="yq-hearts" aria-label={`${hearts} corações`}>{[0, 1, 2].map((i) => <i key={i} className={i < hearts ? '' : 'is-lost'}>❤️</i>)}{shield && <i>🛡️</i>}</span>
          <span className="yq-combo">{combo >= 2 ? `⚡ x${combo}` : ''}</span>
          <span className="yq-gain">+{gain.xp} XP · 🪙{gain.coins}</span>
        </header>

        {!done ? (
          <>
            <section className="yq-arena">
              <motion.div className="yq-boss" key={`h${hit}-u${hurt}`} animate={hit ? { x: [0, -10, 10, -6, 0], rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
                <span className="yq-boss-emoji" aria-hidden="true">{isBoss ? '😈' : bossEmoji}</span>
                <div className="yq-boss-hp"><span style={{ width: `${(remaining / qs.length) * 100}%` }} /></div>
                <small>{isBoss ? `CHEFÃO · ${bossName}` : bossName} · {remaining} de vida</small>
              </motion.div>
              <motion.p className="yq-taunt" key={line} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <span aria-hidden="true">{serious ? '🧭' : '🐱'}</span> {line}
              </motion.p>
            </section>

            <motion.article key={q.id} className={`yq-q ${pick ? (ok ? 'is-ok' : 'is-bad') : ''}`} initial={{ opacity: 0, y: 16 }} animate={hurt && pick && !ok ? { opacity: 1, y: 0, x: [0, -8, 8, -4, 0] } : { opacity: 1, y: 0 }}>
              <div className="yq-q-tags">
                <span>{idx + 1}/{qs.length}</span>
                <span className="yq-tag-zona">{zonaOf(q.zona).emoji} {zonaOf(q.zona).nome}</span>
                <span className={isOld(q) ? 'yq-tag-old' : 'yq-tag-new'}>{isOld(q) ? `📌 já caiu · ${q.origem}` : '✨ inédita'}</span>
                {wasWrong.current.has(q.id) && <span className="yq-tag-rev">🔁 revanche x2</span>}
                {spec.kind !== 'ilha' && spec.kind !== 'zona' && <span>{islandOf(q.tema)?.bossEmoji} {islandOf(q.tema)?.short}</span>}
              </div>
              <p className="yq-enun">{q.enunciado}</p>
              <div className="yq-alts">
                {Object.entries(q.alternativas).map(([k, txt]) => (
                  <button
                    key={k}
                    className={`yq-alt ${hidden.includes(k) ? 'is-hidden' : ''} ${pick ? (k === q.gabarito ? 'is-right' : k === pick ? 'is-wrong' : 'is-dim') : ''}`}
                    disabled={!!pick || hidden.includes(k)}
                    onClick={(e) => answer(k, e)}
                  >
                    <b>{k}</b><span>{txt}</span>
                  </button>
                ))}
              </div>
            </motion.article>

            {!pick && (
              <section className={`yq-powers ${charge >= 3 ? 'is-ready' : ''}`}>
                <span className="yq-charge">{[0, 1, 2].map((i) => <i key={i} className={i < charge ? 'is-on' : ''} />)}</span>
                <button disabled={charge < 3 || hearts >= 3} onClick={() => usePower('cafe')}>☕ Supercafé</button>
                <button disabled={charge < 3} onClick={() => usePower('dica')}>🩺 Dica do preceptor</button>
                <button disabled={charge < 3 || shield} onClick={() => usePower('escudo')}>🛡️ Escudo</button>
              </section>
            )}

            <AnimatePresence>
              {pick && (
                <motion.section className={`yq-grim ${ok ? 'is-ok' : 'is-bad'}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h4>{ok ? (isBoss ? '💥 CHEFÃO DERROTADO!' : '✨ Golpe certeiro!') : `💥 Resposta: ${q.gabarito}`}</h4>
                  {q.comentario && <p className="yq-coment"><b>📜 Grimório:</b> {q.comentario}</p>}
                  {!ok && (
                    <div className="yq-why">
                      <span>Por que errou?</span>
                      <div>{WHY.map((w) => <button key={w.id} className={why === w.id ? 'is-on' : ''} onClick={() => setReason(w.id)}>{w.emoji} {w.nome}</button>)}</div>
                    </div>
                  )}
                  <div className="yq-grim-actions">
                    <button className="btn btn-quiet btn-sm" onClick={() => makeCard(results[results.length - 1]?.q ?? q)}>🃏 Virar carta de feitiço</button>
                    <button className="btn btn-primary" onClick={next}>{idx + 1 >= qs.length ? 'Ver relatório 🏁' : 'Próximo ▶'}</button>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        ) : (
          <Report spec={spec} results={results} gain={gain} best={best} st={st} serious={serious} before={before.current} after={afterLv!} onScroll={onScroll} makeCard={makeCard} onExit={() => onExit(results[results.length - 1]?.ok ?? false)} />
        )}
      </div>

      <AnimatePresence>
        {faint && (
          <motion.div className="yq-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span aria-hidden="true">😵</span>
            <b>{serious ? 'Pausa.' : 'Você desmaiou depois de um plantão de 36h.'}</b>
            <small>{bigode(st.deboche, 'desmaio', serious)}</small>
            <button className="btn btn-primary" onClick={() => { setFaint(false); setHearts(1); play('pop'); }}>☕ Acordar e continuar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function Report({ spec, results, gain, best, st, serious, before, after, onScroll, makeCard, onExit }: {
  spec: BattleSpec; results: { q: YqQuestion; ok: boolean }[]; gain: { xp: number; coins: number; ok: number }; best: number; st: YqState; serious: boolean;
  before: Map<string, string[]>; after: Map<string, ReturnType<typeof islandStat>['zones']>; onScroll: (t: string, z: Zona | null) => void; makeCard: (q: YqQuestion) => void; onExit: () => void;
}) {
  const total = results.length;
  const good = gain.ok / Math.max(1, total) >= 0.6 || !!results[results.length - 1]?.ok;
  const temas = [...new Set(results.map((r) => r.q.tema))];
  const changes: { tema: string; zona: Zona; de: string; para: string; alerta: boolean }[] = [];
  for (const t of temas) {
    const b = before.get(t) ?? [];
    (after.get(t) ?? []).forEach((z, i) => {
      if (z.answered && (b[i] !== z.nivel || z.alerta)) changes.push({ tema: t, zona: z.zona, de: b[i], para: z.nivel, alerta: z.alerta });
    });
  }
  const wrong = results.filter((r) => !r.ok);
  const bossWon = results[results.length - 1]?.ok;
  return (
    <motion.section className="yq-report" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
      <span className="yq-report-big" aria-hidden="true">{bossWon ? '🏆' : good ? '⚔️' : '📜'}</span>
      <h3>{bossWon ? 'Vitória!' : good ? 'Onda vencida!' : 'Onda difícil'}</h3>
      <p className="yq-report-score"><b>{gain.ok}/{total}</b> acertos · <b>+{gain.xp}</b> XP · <b>🪙 {gain.coins}</b> · combo máx. <b>{best}</b></p>
      <Bigode st={st} ctx={good ? 'onda-boa' : 'onda-ruim'} serious={serious} />
      {changes.length > 0 && (
        <ul className="yq-changes">
          {changes.map((c) => (
            <li key={`${c.tema}-${c.zona}`} className={c.alerta ? 'is-alert' : ''}>
              <span>{zonaOf(c.zona).emoji} {islandOf(c.tema)?.short} · {zonaOf(c.zona).nome}</span>
              <b>{NIVEL[c.de as keyof typeof NIVEL]?.emoji ?? '🌫️'} → {NIVEL[c.para as keyof typeof NIVEL].emoji} {NIVEL[c.para as keyof typeof NIVEL].nome}</b>
              {c.alerta && <button onClick={() => onScroll(c.tema, c.zona)}>🚨 invasão · pedir reforço</button>}
            </li>
          ))}
        </ul>
      )}
      {wrong.length > 0 && (
        <div className="yq-report-wrong">
          <b>📜 Grimório desta onda</b>
          {wrong.map(({ q }) => (
            <details key={q.id}>
              <summary>{zonaOf(q.zona).emoji} {q.enunciado.slice(0, 90)}…</summary>
              <p><b>Certa: {q.gabarito})</b> {q.alternativas[q.gabarito]}</p>
              {q.comentario && <p className="muted small">{q.comentario}</p>}
              <button className="btn btn-quiet btn-sm" onClick={() => makeCard(q)}>{q.cardId ? '🃏 já é carta' : '🃏 Virar carta de feitiço'}</button>
            </details>
          ))}
        </div>
      )}
      <button className="btn btn-primary yq-report-go" onClick={onExit}>{spec.kind === 'final' ? 'Voltar ao mapa' : 'Voltar à ilha'} ▶</button>
    </motion.section>
  );
}

// ── Grimório ───────────────────────────────────────────────────

function Grimorio({ qs, tema, onBack, makeCard, saveQ, onDone, st }: { qs: YqQuestion[]; tema?: string; onBack: () => void; makeCard: (q: YqQuestion) => void; saveQ: (q: YqQuestion) => void; onDone?: () => void; st: YqState }) {
  const [filtro, setFiltro] = useState<'agora' | 'sempre'>('agora');
  const list = qs.filter((q) => (filtro === 'agora' ? q.hist.length && !last(q).ok : q.hist.some((h) => !h.ok)))
    .sort((a, b) => (last(b)?.at ?? '').localeCompare(last(a)?.at ?? ''));
  const island = tema ? islandOf(tema) : null;
  void saveQ;
  return (
    <div className="yq-grimorio">
      <button className="yq-back" onClick={onBack}>← {island ? island.short : 'Mapa'}</button>
      <h2>📜 Grimório {island ? `· ${island.short}` : 'de todas as ilhas'}</h2>
      <p className="muted small">Os erros viram feitiço: leia o comentário, entenda o porquê e transforme em carta (vai pro seu FSRS).</p>
      <div className="seg">
        <button className={filtro === 'agora' ? 'is-on' : ''} onClick={() => setFiltro('agora')}>Ainda errando</button>
        <button className={filtro === 'sempre' ? 'is-on' : ''} onClick={() => setFiltro('sempre')}>Já errei alguma vez</button>
      </div>
      {list.length === 0 && <p className="yq-grim-empty">{qs.some((q) => q.hist.length) ? 'Nenhum erro aqui. O Bigode está desconfiado. 🐱' : 'Nada ainda: jogue uma batalha primeiro.'}</p>}
      <ul className="yq-grim-list">
        {list.map((q) => {
          const l = last(q);
          const why = WHY.find((w) => w.id === [...q.hist].reverse().find((h) => !h.ok)?.why);
          return (
            <li key={q.id}>
              <details>
                <summary>
                  <span className="yq-tag-zona">{zonaOf(q.zona).emoji} {zonaOf(q.zona).nome}</span>
                  {!island && <span className="muted small"> · {islandOf(q.tema)?.short}</span>}
                  <span className="yq-grim-enun">{q.enunciado.slice(0, 110)}{q.enunciado.length > 110 ? '…' : ''}</span>
                </summary>
                <p className="yq-enun">{q.enunciado}</p>
                <p><b>Você marcou:</b> {l?.pick}) {q.alternativas[l?.pick ?? ''] ?? '—'} {why ? `· ${why.emoji} ${why.nome}` : ''}</p>
                <p><b>Certa: {q.gabarito})</b> {q.alternativas[q.gabarito]}</p>
                {q.comentario && <p className="yq-coment">{q.comentario}</p>}
                <p className="muted small">{isOld(q) ? `📌 já caiu · ${q.origem}` : '✨ inédita'} · errou {q.hist.filter((h) => !h.ok).length}x</p>
                <button className="btn btn-quiet btn-sm" onClick={() => makeCard(q)}>{q.cardId ? '🃏 já é carta' : '🃏 Virar carta de feitiço'}</button>
              </details>
            </li>
          );
        })}
      </ul>
      {onDone && <button className="btn btn-primary yq-grim-done" onClick={onDone}>✓ Revisei o grimório desta ilha</button>}
      <Bigode st={st} ctx={list.length ? 'erro' : 'acerto'} serious={island?.serious} />
    </div>
  );
}

// ── Porto (importação) ─────────────────────────────────────────

function Porto({ questions, onBack, saveQ }: { questions: YqQuestion[]; onBack: () => void; saveQ: (q: YqQuestion) => void }) {
  const ui = useUI();
  const [text, setText] = useState('');
  const [res, setRes] = useState<ImportResult | null>(null);
  const existing = useMemo(() => new Map(questions.map((q) => [q.qid, q])), [questions]);
  const check = (t = text) => setRes(t.trim() ? parseImport(t, existing) : null);
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    const t = await f.text();
    setText(t);
    check(t);
  };
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
    <div className="yq-porto">
      <button className="yq-back" onClick={onBack}>← Mapa</button>
      <h2>⚓ Porto</h2>
      <p className="muted small">Cole o JSON (lista de questões) ou anexe o arquivo. Questão com o mesmo <code>id</code> é atualizada e mantém o seu histórico.</p>
      <textarea className="yq-porto-text" rows={8} value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} placeholder='[ { "id": "uesm-a-031", "tema": "SRAG", "zona": "conduta", … } ]' aria-label="JSON das questões" />
      <div className="btn-row">
        <label className="btn btn-quiet btn-sm">📎 Anexar .json<input type="file" accept=".json,application/json,text/plain" hidden onChange={(e) => void readFile(e.target.files?.[0])} /></label>
        <button className="btn btn-quiet btn-sm" onClick={() => { setText(SAMPLE); check(SAMPLE); }}>🧪 Usar 3 exemplos</button>
        <button className="btn btn-secondary btn-sm" disabled={!text.trim()} onClick={() => check()}>🔎 Conferir</button>
      </div>
      {res && (
        <div className="yq-porto-res">
          <p><b>{res.ok.length}</b> prontas pra desembarcar ({novos} novas, {res.ok.length - novos} atualizadas){res.out.length ? ` · ${res.out.length} ficaram de fora` : ''}</p>
          {Object.keys(res.perTema).length > 0 && (
            <ul className="yq-porto-temas">{Object.entries(res.perTema).map(([t, n]) => <li key={t}>{islandOf(t)?.bossEmoji} {islandOf(t)?.short}: <b>{n}</b></li>)}</ul>
          )}
          {res.out.length > 0 && (
            <details className="yq-porto-out" open>
              <summary>⚠️ Ficaram de fora ({res.out.length})</summary>
              <ul>{res.out.slice(0, 60).map((o, i) => <li key={i}><code>{o.id}</code>: {o.why}</li>)}</ul>
            </details>
          )}
          <button className="btn btn-primary" disabled={!res.ok.length} onClick={apply}>🚢 Desembarcar {res.ok.length} questões</button>
        </div>
      )}
      <h3 className="yq-h3">🏝️ Questões por ilha</h3>
      <ul className="yq-porto-count">
        {ISLANDS.map((i) => {
          const n = counts.get(i.tema) ?? 0;
          return <li key={i.tema} className={n < i.banco ? 'is-short' : ''}><span>{i.bossEmoji} {i.short}</span><b>{n}</b><small>/{i.banco} do banco</small></li>;
        })}
      </ul>
    </div>
  );
}

// ── Pergaminho de reforço ──────────────────────────────────────

function Pergaminho({ tema, zona, onClose, onPorto }: { tema: string; zona: Zona | null; onClose: () => void; onPorto: () => void }) {
  const ui = useUI();
  const [n, setN] = useState(10);
  const txt = reforcoPrompt(tema, zona, n);
  const copy = async () => {
    try { await navigator.clipboard.writeText(txt); play('paper'); ui.toast('📜 Pergaminho copiado! Cole na IA e traga o JSON pro Porto.'); } catch { ui.toast('Não deu para copiar: selecione o texto.'); }
  };
  return createPortal(
    <div className="yq-modal" role="dialog" aria-label="Pergaminho de reforço" onClick={onClose}>
      <motion.div className="yq-scroll" initial={{ scaleY: 0.2, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}>
        <h3>📜 Pergaminho de reforço</h3>
        <p className="small"><b>{islandOf(tema)?.bossEmoji} {islandOf(tema)?.short}</b>{zona ? ` · ${zonaOf(zona).emoji} ${zonaOf(zona).lugar}` : ' · ilha inteira'}</p>
        <label className="yq-field"><span>Quantas questões</span>
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>{[5, 10, 15, 20].map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
        <pre>{txt}</pre>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={copy}>📋 Copiar pergaminho</button>
          <button className="btn btn-secondary" onClick={onPorto}>⚓ Ir pro Porto</button>
          <button className="btn btn-quiet" onClick={onClose}>Fechar</button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── Loja ───────────────────────────────────────────────────────

function Loja({ st, saveSt, onBack }: { st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void; onBack: () => void }) {
  const ui = useUI();
  const buy = (id: string, preco: number) => {
    if (st.coins < preco) { play('fizzle'); ui.toast('Moedas insuficientes. Vai batalhar! ⚔️'); return; }
    saveSt((s) => ({ coins: s.coins - preco, owned: [...s.owned, id] }));
    play('jingle');
    ui.toast(bigode(st.deboche, 'loja'));
  };
  const wear = (slot: 'hat' | 'boat' | 'cat', id: string) => saveSt((s) => ({ wear: { ...s.wear, [slot]: s.wear[slot] === id ? undefined : id } }));
  return (
    <div className="yq-loja">
      <button className="yq-back" onClick={onBack}>← Mapa</button>
      <h2>🛍️ Lojinha do Porto</h2>
      <p className="yq-loja-coins">Você tem <b>🪙 {st.coins}</b></p>
      <div className="yq-shop">
        {SHOP.map((it) => {
          const own = st.owned.includes(it.id);
          const on = st.wear[it.slot] === it.id;
          return (
            <div key={it.id} className={`yq-item ${own ? 'is-own' : ''} ${on ? 'is-on' : ''}`}>
              <span className="yq-item-emoji" aria-hidden="true">{it.emoji}</span>
              <b>{it.nome}</b>
              <small>{it.slot === 'hat' ? 'pra Yas' : it.slot === 'boat' ? 'barco' : 'pro Bigode'}</small>
              {own ? <button className="btn btn-sm btn-secondary" onClick={() => wear(it.slot, it.id)}>{on ? 'Tirar' : 'Usar'}</button>
                : <button className="btn btn-sm btn-primary" onClick={() => buy(it.id, it.preco)}>🪙 {it.preco}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ajustes ────────────────────────────────────────────────────

function Config({ st, saveSt, onBack }: { st: YqState; saveSt: (p: Partial<YqState> | ((s: YqState) => Partial<YqState>)) => void; onBack: () => void }) {
  const LEVELS: { id: Deboche; nome: string; ex: string }[] = [
    { id: 'fofo', nome: '🧸 Fofo', ex: '“Tudo bem errar aqui 💛”' },
    { id: 'acido', nome: '🍋 Ácido', ex: '“O Dragão mandou um beijo.”' },
    { id: 'sem', nome: '🌶️ Sem filtro', ex: '“Não quer passar não, porra?”' },
  ];
  return (
    <div className="yq-config">
      <button className="yq-back" onClick={onBack}>← Mapa</button>
      <h2>⚙️ Ajustes do jogo</h2>
      <h3 className="yq-h3">🐱 Deboche do Doutor Bigode</h3>
      <div className="yq-deboche">
        {LEVELS.map((l) => (
          <button key={l.id} className={st.deboche === l.id ? 'is-on' : ''} onClick={() => { saveSt({ deboche: l.id }); play('meow'); }}>
            <b>{l.nome}</b><small>{l.ex}</small>
          </button>
        ))}
      </div>
      <p className="muted small">Na ilha da Tempestade da Crise ele fica sério, sempre.</p>
      <h3 className="yq-h3">📚 Seus PDFs de estudo</h3>
      <ul className="yq-pdfs">
        {st.pdfs.map((p) => (
          <li key={p.id}>
            <span>📄 {p.name}</span>
            <small>{p.url ? 'link' : 'arquivo'}</small>
            <button className="icon-btn icon-btn-sm" aria-label="Remover" onClick={() => saveSt((s) => ({ pdfs: s.pdfs.filter((x) => x.id !== p.id) }))}>✕</button>
          </li>
        ))}
      </ul>
      <PdfAdder st={st} saveSt={saveSt} />
      <p className="muted small">Depois, em cada ilha, abra “📚 PDF de estudo desta ilha” e escolha qual PDF e as páginas.</p>
    </div>
  );
}
