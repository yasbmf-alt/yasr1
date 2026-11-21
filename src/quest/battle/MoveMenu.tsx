// Menu de "golpes": cada alternativa é um golpe. 2×2 no desktop (a 5ª ocupa a linha
// inteira); uma coluna em telas estreitas.
import { motion } from 'framer-motion';
import { sfx } from './sfx';

export function MoveMenu({ alternativas, gabarito, pick, locked, onPick }: {
  alternativas: Record<string, string>;
  gabarito: string;
  pick: string | null;
  locked: boolean; // depois da escolha: mostra certa/errada
  onPick: (k: string) => void;
}) {
  const keys = Object.keys(alternativas);
  return (
    <motion.div className={`bt-moves ${keys.length % 2 ? 'is-odd' : ''}`} role="group" aria-label="Escolha o golpe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {keys.map((k) => {
        const state = !locked ? '' : k === gabarito ? 'is-right' : k === pick ? 'is-wrong' : 'is-dim';
        return (
          <button key={k} className={`bt-move ${state}`} disabled={locked} onPointerEnter={() => !locked && sfx('foco')} onClick={() => onPick(k)} aria-label={`${k}) ${alternativas[k]}`}>
            <b className="bt-move-key">{locked && k === gabarito ? '✓' : locked && k === pick ? '✕' : k}</b>
            <span className="bt-move-txt">{alternativas[k]}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
