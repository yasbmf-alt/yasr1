// Tela final: acertos e o que vale revisar. Sem XP, sem nota, sem cobrança.
import { motion } from 'framer-motion';
import { zonaOf } from '../data';
import type { Zona } from '../data';
import type { BattleQuestion } from './types';

export function BattleEnd({ won, total, okFirst, recovered, toReview, zonas, onDone, doneLabel, onAgain }: {
  won: boolean; total: number; okFirst: number; recovered: number; toReview: BattleQuestion[]; zonas: string[];
  onDone: () => void; doneLabel: string; onAgain?: () => void;
}) {
  const temas = [...new Set(toReview.map((q) => q.tema))];
  return (
    <motion.section className="bt-end" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="bt-end-title">{won ? 'Vitória!' : 'Rodada concluída'}</h2>
      <p className="bt-end-score"><b>{okFirst}</b> de {total} de primeira{recovered ? <> · <b>{recovered}</b> na segunda chance</> : null}</p>
      {toReview.length === 0 ? (
        <p className="bt-end-empty">Nada para revisar desta vez.</p>
      ) : (
        <div className="bt-end-review">
          <h3>Para revisar</h3>
          {zonas.length > 0 && (
            <div className="bt-chips">{zonas.map((z) => { const zz = zonaOf(z as Zona); return <span key={z} className="bt-chip">{zz.emoji} {zz.nome}</span>; })}</div>
          )}
          {temas.length > 1 && <div className="bt-chips">{temas.map((t) => <span key={t} className="bt-chip is-tema">{t}</span>)}</div>}
          <ul>
            {toReview.map((q) => (
              <li key={q.id}>
                <details>
                  <summary>{q.enunciado.length > 110 ? `${q.enunciado.slice(0, 110)}…` : q.enunciado}</summary>
                  <p><b>Certa: {q.gabarito})</b> {q.alternativas[q.gabarito]}</p>
                  {q.comentario && <p className="bt-fb-full">{q.comentario}</p>}
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="bt-end-actions">
        <button className="bt-btn" onClick={onDone}>{doneLabel}</button>
        {onAgain && <button className="bt-btn is-ghost" onClick={onAgain}>Jogar de novo</button>}
      </div>
    </motion.section>
  );
}
