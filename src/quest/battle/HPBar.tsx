// Caixinha de HP do monstro (só ele tem HP; a Yas não perde nada).
export function HPBar({ name, hp, max }: { name: string; hp: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const tone = pct > 0.5 ? 'is-high' : pct > 0.2 ? 'is-mid' : 'is-low';
  return (
    <div className="bt-hpbox" role="group" aria-label={`${name}: ${hp} de ${max} de HP`}>
      <b className="bt-hpname">{name}</b>
      <div className="bt-hprow">
        <span className="bt-hplabel" aria-hidden="true">HP</span>
        <span className="bt-hptrack"><span className={`bt-hpfill ${tone}`} style={{ width: `${pct * 100}%` }} /></span>
      </div>
      <small className="bt-hpnum" aria-hidden="true">{hp}/{max}</small>
    </div>
  );
}
