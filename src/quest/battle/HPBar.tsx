// Caixinha de HP do monstro (só ele tem HP; a Yas não perde nada).
// A barra cai na hora do golpe e um "rastro" vermelho escoa logo depois.
import { useEffect, useState } from 'react';

export function HPBar({ name, hp, max, hit = 0 }: { name: string; hp: number; max: number; hit?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const [lag, setLag] = useState(pct);
  useEffect(() => {
    if (pct >= lag) { setLag(pct); return undefined; }
    const t = window.setTimeout(() => setLag(pct), 520);
    return () => window.clearTimeout(t);
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const tone = pct > 0.5 ? 'is-high' : pct > 0.2 ? 'is-mid' : 'is-low';
  return (
    <div key={hit} className={`bt-hpbox ${hit ? 'is-hit' : ''} ${pct <= 0.2 && pct > 0 ? 'is-danger' : ''}`} role="group" aria-label={`${name}: ${hp} de ${max} de HP`}>
      <b className="bt-hpname">{name}</b>
      <div className="bt-hprow">
        <span className="bt-hplabel" aria-hidden="true">HP</span>
        <span className="bt-hptrack">
          <span className="bt-hplag" style={{ width: `${lag * 100}%` }} />
          <span className={`bt-hpfill ${tone}`} style={{ width: `${pct * 100}%` }} />
        </span>
      </div>
      <small className="bt-hpnum" aria-hidden="true">{hp}/{max}</small>
    </div>
  );
}
