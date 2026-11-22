// Véspera da prova: (1) Folha de bolso montada a partir dos seus erros e
// (2) Rodada relâmpago só com números de prova (doses, cortes, fórmulas).
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ISLANDS, last, zonaOf, type YqQuestion } from './data';
import { recoveryCards, type DossieCard, type YqDossie } from './dossie';
import type { YqRevisao } from './revisao';
import { shortWhy } from './battle/narrator';
import { sfx } from './battle/sfx';

/** destaca números com unidade (58 mmHg, 1 mg, 6 mL/kg, 7,20…) para o olho pegar rápido */
export function Numeros({ t }: { t: string }) {
  const parts = t.split(/(\d+(?:[.,]\d+)?(?:\s?(?:a|–|-)\s?\d+(?:[.,]\d+)?)?\s?(?:%|mmHg|mg\/kg|mcg\/kg\/min|mcg\/min|mg|g|mL\/kg|mL|L\/min|cmH₂O|mEq\/L|J\/kg|J|irpm|h|min|s|°C|kg)?)/g);
  return <>{parts.map((p, i) => (/\d/.test(p) ? <mark key={i} className="vs-num">{p}</mark> : p))}</>;
}

interface Tema { tema: string; short: string; boss: string; erros: YqQuestion[]; abertos: number; postits: { titulo: string; texto: string }[]; cartoes: DossieCard[]; porques: string[] }

export function FolhaVespera({ questions, dossies, revisao, onBack }: { questions: YqQuestion[]; dossies: YqDossie[]; revisao?: YqRevisao; onBack: () => void }) {
  const temas = useMemo<Tema[]>(() => {
    const out: Tema[] = [];
    for (const isl of ISLANDS) {
      const erros = questions.filter((q) => q.tema === isl.tema && q.hist.some((h) => !h.ok));
      if (!erros.length) continue;
      // primeiro as que continuam erradas, depois as já recuperadas
      erros.sort((a, b) => Number(last(a).ok) - Number(last(b).ok));
      const d = dossies.find((x) => x.tema === isl.tema);
      const postits = [...new Map(erros.map((q) => revisao?.itens[q.qid]).filter(Boolean).map((it) => [it!.texto, { titulo: it!.titulo, texto: it!.texto }])).values()];
      const cartoes = d ? recoveryCards(d, erros.map((q) => ({ qid: q.qid, zona: q.zona }))).slice(0, 6) : [];
      const porques = postits.length || cartoes.length ? [] : [...new Set(erros.slice(0, 4).map((q) => shortWhy(q as never)))];
      out.push({ tema: isl.tema, short: isl.short, boss: isl.boss, erros, abertos: erros.filter((q) => !last(q).ok).length, postits, cartoes, porques });
    }
    // os temas com mais erros ainda abertos vêm primeiro; desempate pela prioridade da prova
    const prio = (t: string) => ISLANDS.find((i) => i.tema === t)?.prio ?? 2;
    return out.sort((a, b) => b.abertos - a.abertos || prio(b.tema) - prio(a.tema) || b.erros.length - a.erros.length);
  }, [questions, dossies, revisao]);
  const totalErros = temas.reduce((a, t) => a + t.erros.length, 0);

  return (
    <div className="vs">
      <div className="vs-actions no-print">
        <button className="px-back" onClick={onBack}>◀ MAPA</button>
        <button className="px-mini" onClick={() => window.print()}>🖨️ imprimir / salvar PDF</button>
      </div>
      <header className="vs-head">
        <h2>📝 Folha de bolso da véspera</h2>
        <p>{temas.length ? `Só os seus pontos fracos: ${totalErros} ${totalErros === 1 ? 'questão errada' : 'questões erradas'} em ${temas.length} ${temas.length === 1 ? 'tema' : 'temas'}. Leia de cima para baixo: o que mais pesa vem primeiro.` : 'Você ainda não errou nenhuma questão no jogo. Jogue a Revanche ou a Ilha Final e a folha se monta sozinha.'}</p>
      </header>
      {temas.map((t, k) => (
        <motion.section key={t.tema} className="vs-tema" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 6) * 0.04 }}>
          <h3>{t.short} <small>{t.abertos ? `${t.abertos} ainda errada${t.abertos > 1 ? 's' : ''}` : 'todas recuperadas ✓'} · {t.erros.length} no total</small></h3>
          <div className="vs-zonas">{[...new Set(t.erros.map((q) => q.zona))].map((z) => <span key={z} className="vs-chip">{zonaOf(z).emoji} {zonaOf(z).nome}</span>)}</div>
          {t.postits.map((p, i) => <div key={i} className="vs-postit"><b>{p.titulo}</b><p><Numeros t={p.texto} /></p></div>)}
          {t.cartoes.length > 0 && (
            <ul className="vs-cards">{t.cartoes.map((c) => <li key={c.id}><b>{c.pergunta}</b><span><Numeros t={c.resposta} /></span></li>)}</ul>
          )}
          {t.porques.length > 0 && <ul className="vs-cards">{t.porques.map((w, i) => <li key={i}><span><Numeros t={w} /></span></li>)}</ul>}
        </motion.section>
      ))}
      {temas.length > 0 && <p className="vs-foot">Boa prova amanhã. Você treinou pra isso. 💛</p>}
    </div>
  );
}

// ── Rodada relâmpago de números ─────────────────────────────────

const temNumero = (c: DossieCard) => /\d/.test(c.resposta) && /(mg|mmHg|mL|%|J|irpm|cmH|mEq|×|÷|≥|≤|<|>|min|h\b|\d,\d)/.test(c.resposta);

export function Relampago({ dossies, questions, onBack }: { dossies: YqDossie[]; questions: YqQuestion[]; onBack: () => void }) {
  const [tema, setTema] = useState<string>('todos');
  const pool = useMemo(() => {
    const ds = tema === 'todos' ? dossies : dossies.filter((d) => d.tema === tema);
    // pesa mais os temas onde você errou
    const erros = new Map<string, number>();
    for (const q of questions) if (q.hist.some((h) => !h.ok)) erros.set(q.tema, (erros.get(q.tema) ?? 0) + 1);
    return ds.flatMap((d) => d.flashcards.filter(temNumero).map((c) => ({ c, tema: d.tema, peso: 1 + (erros.get(d.tema) ?? 0) })));
  }, [dossies, questions, tema]);
  const [deck, setDeck] = useState<{ c: DossieCard; tema: string }[] | null>(null);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [res, setRes] = useState<{ id: string; ok: boolean }[]>([]);
  const start = () => {
    const sorted = [...pool].map((x) => ({ ...x, r: Math.random() / x.peso })).sort((a, b) => a.r - b.r).slice(0, 12);
    setDeck(sorted); setI(0); setShow(false); setRes([]); sfx('entrada');
  };
  const answer = (ok: boolean) => {
    if (!deck) return;
    sfx(ok ? 'escolhe' : 'contra');
    const cur = deck[i];
    setRes((r) => [...r, { id: cur.c.id + cur.tema, ok }]);
    // errou: o cartão volta uma vez no fim da rodada
    if (!ok && !deck.slice(i + 1).some((x) => x.c.id === cur.c.id && x.tema === cur.tema)) setDeck([...deck, cur]);
    setI(i + 1); setShow(false);
  };
  const temas = [...new Set(dossies.map((d) => d.tema))];

  if (!dossies.length) {
    return (
      <div className="vs">
        <button className="px-back" onClick={onBack}>◀ MAPA</button>
        <p className="vs-empty">A rodada usa os flashcards dos dossiês. Importe os dossiês no ⚓ Porto e volte aqui.</p>
      </div>
    );
  }
  const done = deck && i >= deck.length;
  const card = deck && !done ? deck[i] : null;
  const acertos = res.filter((r) => r.ok).length;

  return (
    <div className="vs vs-rl">
      <button className="px-back" onClick={onBack}>◀ MAPA</button>
      <header className="vs-head">
        <h2>⚡ Relâmpago dos números</h2>
        <p>Doses, cortes e fórmulas que a banca adora trocar. Pense na resposta, vire o cartão e diga se sabia. O que errar volta no fim.</p>
      </header>
      {!deck && (
        <div className="rl-setup">
          <label>Tema: <select value={tema} onChange={(e) => setTema(e.target.value)}><option value="todos">Todos os dossiês</option>{temas.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <small>{pool.length} cartões com números disponíveis</small>
          <button className="bt-btn" disabled={!pool.length} onClick={start}>⚡ Começar rodada</button>
        </div>
      )}
      {card && (
        <motion.button key={`${i}-${card.c.id}`} className={`rl-card ${show ? 'is-open' : ''}`} onClick={() => { if (!show) { setShow(true); sfx('foco'); } }} initial={{ rotateY: -70, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <small>{i + 1}/{deck!.length} · {ISLANDS.find((x) => x.tema === card.tema)?.short ?? card.tema}</small>
          <b>{card.c.pergunta}</b>
          {show ? <span className="rl-ans"><Numeros t={card.c.resposta} /></span> : <i>toque para virar</i>}
        </motion.button>
      )}
      {card && show && (
        <div className="rl-btns">
          <button className="bt-btn is-ghost" onClick={() => answer(false)}>✗ Não sabia</button>
          <button className="bt-btn" onClick={() => answer(true)}>✓ Sabia</button>
        </div>
      )}
      {done && (
        <div className="rl-end">
          <b>{acertos}/{res.length} de primeira e de segunda chance</b>
          <p>{res.length - acertos === 0 ? 'Números afiadíssimos. O Bigodes está impressionado (e um pouco ofendido).' : 'Os que você errou já voltaram uma vez. Mais uma rodada fixa de vez.'}</p>
          <div className="rl-btns"><button className="bt-btn" onClick={start}>⚡ Outra rodada</button><button className="bt-btn is-ghost" onClick={() => setDeck(null)}>Trocar tema</button></div>
        </div>
      )}
    </div>
  );
}
