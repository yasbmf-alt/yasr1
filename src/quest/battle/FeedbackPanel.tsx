// Depois de cada resposta: o porquê em uma frase + botão para a explicação completa.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { shortWhy } from './narrator';
import type { BattleQuestion } from './types';

export function FeedbackPanel({ q, pick, ok, voltaDepois, onNext, nextLabel }: {
  q: BattleQuestion; pick: string; ok: boolean; voltaDepois: boolean; onNext: () => void; nextLabel: string;
}) {
  const [full, setFull] = useState(false);
  const why = shortWhy(q);
  const hasMore = !!q.comentario && q.comentario.replace(/\s+/g, ' ').trim() !== why;
  return (
    <motion.section className={`bt-feedback ${ok ? 'is-ok' : 'is-bad'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {!ok && (
        <p className="bt-fb-answer">
          <span>Você: <b>{pick})</b> {q.alternativas[pick]}</span>
          <span>Certa: <b>{q.gabarito})</b> {q.alternativas[q.gabarito]}</span>
        </p>
      )}
      <p className="bt-fb-why"><b>Por quê:</b> {why}</p>
      {hasMore && (
        <>
          <button className="bt-link" onClick={() => setFull((v) => !v)} aria-expanded={full}>{full ? 'Esconder explicação' : 'Ver explicação completa'}</button>
          {full && <p className="bt-fb-full">{q.comentario}</p>}
        </>
      )}
      {voltaDepois && <small className="bt-fb-note">Essa volta no fim da rodada, pra você tentar de novo.</small>}
      <button className="bt-btn" onClick={onNext} autoFocus>{nextLabel}</button>
    </motion.section>
  );
}
