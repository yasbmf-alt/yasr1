// Cenário em pixel com camadas (céu, nuvens, longe, meio, perto) que deslizam
// em velocidades diferentes, dando profundidade (parallax). Arte em ./biomas,
// gerada por scripts/arte/biomas.py.
import { islandOf, FINAL, REVANCHE } from '../data';

export type BiomaId = 'resp' | 'emerg' | 'mente' | 'cuidado';
const files = import.meta.glob('./biomas/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const url = (b: BiomaId, l: string) => files[`./biomas/${b}-${l}.png`];

export const BIOMA_NOME: Record<BiomaId, string> = {
  resp: 'Floresta dos Ventos', emerg: 'Cidade do Plantão', mente: 'Vale dos Sonhos', cuidado: 'Campos da Lamparina',
};

export function biomaOf(tema: string): BiomaId {
  if (tema === FINAL) return 'emerg';
  if (tema === REVANCHE) return 'mente';
  return (islandOf(tema)?.regiao as BiomaId) ?? 'resp';
}

/** camadas absolutas; o pai precisa ser position: relative e overflow hidden */
export function Bioma({ b, still }: { b: BiomaId; still?: boolean }) {
  return (
    <div className={`bio bio-${b} ${still ? 'is-still' : ''}`} aria-hidden="true">
      <span className="bio-l bio-ceu" style={{ backgroundImage: `url(${url(b, 'ceu')})` }} />
      <span className="bio-l bio-nuvens" style={{ backgroundImage: `url(${url(b, 'nuvens')})` }} />
      <span className="bio-l bio-longe" style={{ backgroundImage: `url(${url(b, 'longe')})` }} />
      <span className="bio-l bio-meio" style={{ backgroundImage: `url(${url(b, 'meio')})` }} />
      <span className="bio-l bio-perto" style={{ backgroundImage: `url(${url(b, 'perto')})` }} />
      {b === 'cuidado' && <span className="bio-fx bio-vagalumes" />}
      {b === 'mente' && <span className="bio-fx bio-brilho" />}
    </div>
  );
}
