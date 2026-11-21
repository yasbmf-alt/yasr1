// Telas de conteúdo dos dossiês: resumo-mestre (antes da batalha) e recuperação
// direcionada (depois, nos subtópicos das questões erradas).
import { useState } from 'react';
import { zonaOf } from './data';
import type { DossieBloco, DossieCard, YqDossie } from './dossie';

function Bloco({ b }: { b: DossieBloco }) {
  if (b.t === 'h') return <h5 className="dz-h">{b.texto}</h5>;
  if (b.t === 'tabela') {
    return (
      <div className="dz-table-wrap">
        <table className="dz-table">
          <thead><tr>{b.cab.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>{b.linhas.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  const lvl = Math.min(3, b.nivel ?? 0);
  const num = b.t === 'li' && /^\d+\.\s/.test(b.texto);
  return <p className={`dz-${b.t} dz-l${lvl} ${num ? 'is-num' : ''}`}>{b.texto}</p>;
}

/** Resumo-mestre em seções recolhíveis (uma aberta por vez, para não poluir a tela) */
export function ResumoMestre({ d }: { d: YqDossie }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="dz" aria-label="Resumo-mestre">
      <header className="dz-head"><b>📜 Resumo-mestre</b><small>{d.ilha}</small></header>
      <ol className="dz-secs">
        {d.resumo.map((s, i) => {
          if (!s.blocos.length) return <li key={i} className="dz-group">{s.titulo}</li>;
          const z = s.zona ? zonaOf(s.zona) : null;
          return (
            <li key={i} className={open === i ? 'is-open' : ''}>
              <button className="dz-sec-btn" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {z && <span className={`dz-zona z-${s.zona}`}>{z.emoji} {z.nome}</span>}
                <span>{s.titulo || z?.nome}</span>
                <i aria-hidden="true">{open === i ? '−' : '+'}</i>
              </button>
              {open === i && <div className="dz-body">{s.blocos.map((b, k) => <Bloco key={k} b={b} />)}</div>}
            </li>
          );
        })}
      </ol>
      {d.referencias.length > 0 && (
        <details className="dz-refs"><summary>Referências</summary><ul>{d.referencias.map((r, i) => <li key={i}>{r}</li>)}</ul></details>
      )}
    </section>
  );
}

export function CardFlip({ c }: { c: DossieCard }) {
  const [shown, setShown] = useState(false);
  return (
    <button className={`dz-card ${shown ? 'is-open' : ''}`} onClick={() => setShown((v) => !v)} aria-expanded={shown}>
      <span className="dz-card-id">{c.id}</span>
      <b>{c.pergunta}</b>
      {shown ? <span className="dz-card-ans">{c.resposta}</span> : <small>toque para ver a resposta</small>}
    </button>
  );
}

/** Recuperação direcionada: cartões dos subtópicos que as questões erradas cobram */
export function Recuperacao({ d, cards, onToDeck, inDeck }: { d: YqDossie; cards: DossieCard[]; onToDeck: (cs: DossieCard[]) => void; inDeck: (c: DossieCard) => boolean }) {
  if (!cards.length) return null;
  const groups = new Map<string, DossieCard[]>();
  for (const c of cards) groups.set(c.subtopico, [...(groups.get(c.subtopico) ?? []), c]);
  const missing = cards.filter((c) => !inDeck(c));
  const fala = d.dialogos.recuperacao[0];
  return (
    <section className="dz dz-rec" aria-label="Recuperação direcionada">
      <header className="dz-head"><b>🧭 Recuperação direcionada</b><small>{cards.length} cartões</small></header>
      {fala && <p className="dz-fala"><b>Dr. Bigodes:</b> “{fala}”</p>}
      {[...groups].map(([sub, cs]) => (
        <div key={sub} className="dz-rec-group">
          <h5 className="dz-h">{sub}</h5>
          <div className="dz-cards">{cs.map((c) => <CardFlip key={c.id} c={c} />)}</div>
        </div>
      ))}
      <button className="px-mini" disabled={!missing.length} onClick={() => onToDeck(missing)}>
        {missing.length ? `🃏 levar ${missing.length} para os flashcards (FSRS)` : '🃏 todos já estão nos flashcards'}
      </button>
    </section>
  );
}
