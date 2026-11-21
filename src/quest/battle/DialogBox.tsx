// Caixa de texto estilo RPG: o texto "digita"; um toque completa, outro toque avança.
import { useEffect, useRef, useState } from 'react';
import { BattleSprite } from './BattleSprite';
import { sprites } from './sprites';

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function DialogBox({ text, speaker, onAdvance, onTyped, fast, canAdvance = true, serio }: {
  text: string;
  speaker: 'bigode' | 'questao';
  onAdvance?: () => void; // toque depois que o texto terminou
  onTyped?: () => void; // o texto acabou de aparecer
  fast?: boolean; // enunciados longos digitam mais rápido
  canAdvance?: boolean;
  serio?: boolean;
}) {
  const [n, setN] = useState(0);
  const typedFor = useRef('');
  const done = n >= text.length;

  useEffect(() => {
    if (reduced()) { setN(text.length); return undefined; }
    setN(0);
    const step = fast ? Math.max(3, Math.ceil(text.length / 90)) : 1;
    const t = window.setInterval(() => setN((x) => { if (x + step >= text.length) { window.clearInterval(t); return text.length; } return x + step; }), fast ? 16 : 24);
    return () => window.clearInterval(t);
  }, [text, fast]);

  useEffect(() => {
    if (done && typedFor.current !== text) { typedFor.current = text; onTyped?.(); }
  }, [done, text]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => {
    if (!done) { setN(text.length); return; }
    if (canAdvance) onAdvance?.();
  };
  const name = speaker === 'bigode' ? (serio ? 'Guia' : 'Dr. Bigode') : 'Questão';

  return (
    <div
      className={`bt-dialog ${speaker === 'questao' ? 'is-question' : ''}`}
      role="button"
      tabIndex={0}
      onClick={tap}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}
      aria-live="polite"
      aria-label={done ? text : undefined}
    >
      {speaker === 'bigode' && <BattleSprite src={sprites.bigode()} alt="" w={40} h={42} className="bt-dialog-face" />}
      <div className="bt-dialog-body">
        <span className="bt-dialog-name">{name}</span>
        <p className="bt-dialog-text">
          <span>{text.slice(0, n)}</span>
          <span className="bt-ghost" aria-hidden="true">{text.slice(n)}</span>
        </p>
      </div>
      {done && canAdvance && onAdvance && <span className="bt-dialog-next" aria-hidden="true">▼</span>}
    </div>
  );
}
